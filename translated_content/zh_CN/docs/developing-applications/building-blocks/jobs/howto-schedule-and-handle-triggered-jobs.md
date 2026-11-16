---
type: docs
title: "操作指南：调度和处理触发的作业"
linkTitle: "操作指南：调度和处理触发的作业"
weight: 5000
description: "了解如何使用 Jobs API 来调度和处理触发的作业"
---

既然你已经了解了 [Jobs 构建块]({{% ref jobs-overview %}}) 提供了什么，让我们来看一个如何使用该 API 的示例。下面的代码示例描述了一个为数据库备份应用程序调度作业、并在触发时处理这些作业的应用程序。触发时间（trigger time）是指作业因到达其 dueTime 而被发回应用程序的时刻。

<!-- 
Include a diagram or image, if possible. 
-->

## 启动 Scheduler 服务

当你[在自托管模式或 Kubernetes 上运行 `dapr init`]({{% ref install-dapr-selfhost %}})时，Dapr Scheduler 服务会自动启动。

## 设置 Jobs API

在你的代码中，设置并调度应用程序内的作业。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

<!-- .NET -->

下面的 .NET SDK 代码示例调度名为 `prod-db-backup` 的作业。作业数据包含有关你将定期备份的数据库的信息。在本示例中，你将：
- 定义本示例其余部分中使用的类型
- 在应用程序启动期间注册一个端点，用于处理服务上所有作业的触发调用
- 向 Dapr 注册作业

在下面的示例中，你将创建一些记录，这些记录将与作业一起序列化并注册，以便将来作业被触发时可以使用其中的信息：
- 备份任务的名称（`db-backup`）
- 备份任务的 `Metadata`，包括：
  - 数据库名称（`DBName`）
  - 数据库位置（`BackupLocation`）

创建一个 ASP.NET Core 项目，并从 NuGet 添加最新版本的 `Dapr.Jobs`。

> **注意：** 虽然你的项目不必严格使用 `Microsoft.NET.Sdk.Web` SDK 来创建作业，但在撰写本文档时，只有调度作业的服务才会接收该作业的触发调用。由于这些调用需要一个能够处理作业触发的端点，并且需要 `Microsoft.NET.Sdk.Web` SDK，因此建议为此目的使用 ASP.NET Core 项目。

首先定义类型来持久化备份作业的数据，并为属性应用我们自己的 JSON 属性名称特性，使其与其他语言示例保持一致。

```cs
// 定义用于表示作业数据的类型
internal sealed record BackupJobData([property: JsonPropertyName("task")] string Task, [property: JsonPropertyName("metadata")] BackupMetadata Metadata);
internal sealed record BackupMetadata([property: JsonPropertyName("DBName")]string DatabaseName, [property: JsonPropertyName("BackupLocation")] string BackupLocation);
```

接下来，作为应用程序设置的一部分，设置一个处理程序，每当应用程序上有作业被触发时都会调用它。该处理程序负责根据提供的作业名称确定应如何处理该作业。

这是通过在 ASP.NET Core 中于 `/job/<job-name>` 注册一个处理程序来实现的，其中 `<job-name>` 是参数化的，并传递给此处理程序委托，从而满足 Dapr 对能够处理已触发的命名作业的端点的要求。

在 `Program.cs` 文件中填入以下内容：

```cs
using System.Text;
using System.Text.Json;
using Dapr.Jobs;
using Dapr.Jobs.Extensions;
using Dapr.Jobs.Models;
using Dapr.Jobs.Models.Responses;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprJobsClient();
var app = builder.Build();

// 注册一个端点，用于接收并处理已触发的作业
var cancellationTokenSource = new CancellationTokenSource(TimeSpan.FromSeconds(5));
app.MapDaprScheduledJobHandler((string jobName, ReadOnlyMemory<byte> jobPayload, ILogger logger, CancellationToken cancellationToken) => {
  logger?.LogInformation("Received trigger invocation for job '{jobName}'", jobName);
  switch (jobName)
  {
    case "prod-db-backup":
      // 反序列化作业载荷中的元数据
      var jobData = JsonSerializer.Deserialize<BackupJobData>(jobPayload);
      
      // 执行备份操作——假设该操作已在你的代码其他地方实现
      await BackupDatabaseAsync(jobData, cancellationToken);
      break;
  }
}, cancellationTokenSource.Token);

await app.RunAsync();
```

最后，作业本身需要向 Dapr 注册，以便它能够在之后的某个时间点被触发。你可以将 `DaprJobsClient` 注入到某个类中，并在应用程序的入站操作中执行注册，但为了本示例的目的，我们把注册代码放在你前面开始编辑的 `Program.cs` 文件末尾。由于你将使用通过依赖注入注册的 `DaprJobsClient`，因此首先创建一个作用域，以便访问它。

```cs
// 创建一个作用域，以便访问已注册的 DaprJobsClient
await using scope = app.Services.CreateAsyncScope();
var daprJobsClient = scope.ServiceProvider.GetRequiredService<DaprJobsClient>();

// 创建将与未来的作业触发一同提供的载荷
var jobData = new BackupJobData("db-backup", new BackupMetadata("my-prod-db", "/backup-dir")); 

// 将载荷序列化为 UTF-8 字节
var serializedJobData = JsonSerializer.SerializeToUtf8Bytes(jobData);

// 调度备份作业每分钟运行一次，但只重复 10 次
await daprJobsClient.ScheduleJobAsync("prod-db-backup", DaprJobSchedule.FromDuration(TimeSpan.FromMinutes(1)),
    serializedJobData, repeats: 10);
```

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

下面的 Go SDK 代码示例调度名为 `prod-db-backup` 的作业。作业数据保存在备份数据库（`"my-prod-db"`）中，并通过 `ScheduleJob` 进行调度。这提供了 `jobData`，其中包括：
- 备份 `Task` 名称
- 备份任务的 `Metadata`，包括：
  - 数据库名称（`DBName`）
  - 数据库位置（`BackupLocation`）


```go
package main

import (
    //...

	daprc "github.com/dapr/go-sdk/client"
	"github.com/dapr/go-sdk/examples/dist-scheduler/api"
	"github.com/dapr/go-sdk/service/common"
	daprs "github.com/dapr/go-sdk/service/grpc"
)

func main() {
    // 初始化服务器
	server, err := daprs.NewService(":50070")
    // ...

	if err = server.AddJobEventHandler("prod-db-backup", prodDBBackupHandler); err != nil {
		log.Fatalf("failed to register job event handler: %v", err)
	}

	log.Println("starting server")
	go func() {
		if err = server.Start(); err != nil {
			log.Fatalf("failed to start server: %v", err)
		}
	}()
    // ...

    // 设置备份位置
	jobData, err := json.Marshal(&api.DBBackup{
		Task: "db-backup",
		Metadata: api.Metadata{
			DBName:         "my-prod-db",
			BackupLocation: "/backup-dir",
		},
	},
	)
	// ...
}
```

作业通过设置 `Schedule` 和所需的 `Repeats` 数量进行调度。这两项设置决定了作业应被触发并发送回应用程序的最大次数。

在此示例中，触发时间根据 `Schedule` 为 `@every 1s`，此作业会被触发并发送回应用程序，直到达到最大 `Repeats`（`10`）次。

```go	
    // ...
    // 设置作业
	job := daprc.Job{
		Name:     "prod-db-backup",
		Schedule: "@every 1s",
		Repeats:  10,
		Data: &anypb.Any{
			Value: jobData,
		},
	}
```

当作业被触发时，Dapr 会自动将作业路由到你在服务器初始化期间设置的事件处理程序。例如，在 Go 中，你可以像这样注册事件处理程序：

```go
...
if err = server.AddJobEventHandler("prod-db-backup", prodDBBackupHandler); err != nil {
    log.Fatalf("failed to register job event handler: %v", err)
}
```

Dapr 负责底层路由。作业被触发时，会使用已触发的作业数据调用你的 `prodDBBackupHandler` 函数。以下是处理已触发作业的示例：

```go
// ...

// 作业触发时调用此函数
func prodDBBackupHandler(ctx context.Context, job *common.JobEvent) error {
	var jobData common.Job
	if err := json.Unmarshal(job.Data, &jobData); err != nil {
		// ...
	}

	var jobPayload api.DBBackup
	if err := json.Unmarshal(job.Data, &jobPayload); err != nil {
		// ...
	}
	fmt.Printf("job %d received:\n type: %v \n typeurl: %v\n value: %v\n extracted payload: %v\n", jobCount, job.JobType, jobData.TypeURL, jobData.Value, jobPayload)
	jobCount++
	return nil
}
```

{{% /tab %}}

{{< /tabpane >}}

## 运行 Dapr 边车

在应用程序中设置好 Jobs API 之后，在终端窗口中使用以下命令运行 Dapr 边车。

{{< tabpane text=true >}}

{{% tab "Go" %}}

```bash
dapr run --app-id=distributed-scheduler \
                --metrics-port=9091 \
                --dapr-grpc-port 50001 \
                --app-port 50070 \
                --app-protocol grpc \
                --log-level debug \
                go run ./main.go
```

{{% /tab %}}

{{< /tabpane >}}


## 后续步骤

- [详细了解 Scheduler 控制平面服务]({{% ref "concepts/dapr-services/scheduler" %}})
- [Jobs API 参考]({{% ref jobs_api %}})
