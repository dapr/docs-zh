---
type: docs
title: "操作指南：调度和处理触发的作业"
linkTitle: "操作指南：调度和处理触发的作业"
weight: 5000
description: "了解如何使用作业 API 来调度和处理触发的作业"
---

既然你已经了解了[作业构建块]({{% ref jobs-overview %}})提供了什么，让我们来看一个如何使用该 API 的示例。下面的代码示例描述了一个为数据库备份应用程序调度作业并在触发时间处理它们的应用程序，触发时间也称为作业因其到达 dueTime 而被发送回应用程序的时间。

<!-- 
Include a diagram or image, if possible. 
-->

## 启动 Scheduler 服务

当你[在自托管模式或 Kubernetes 上运行 `dapr init`]({{% ref install-dapr-selfhost %}})时，Dapr Scheduler 服务会自动启动。

## 设置 Jobs API

在你的代码中，设置和调度应用程序内的作业。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

<!-- .NET -->

下面的 .NET SDK 代码示例调度名为 `prod-db-backup` 的作业。作业数据包含有关你将定期备份的数据库的信息。在本示例的整个过程中，你将：
- 定义本示例其余部分中使用的类型
- 在应用程序启动期间注册一个端点，用于处理服务上所有作业触发调用
- 向 Dapr 注册作业

在下面的示例中，你将创建记录，这些记录将与作业一起序列化和注册，以便在将来作业被触发时信息可用：
- 备份任务的名称（`db-backup`）
- 备份任务的 `Metadata`，包括：
  - 数据库名称（`DBName`）
  - 数据库位置（`BackupLocation`）

创建一个 ASP.NET Core 项目并从 NuGet 添加最新版本的 `Dapr.Jobs`。

> **注意：** 虽然你的项目不必严格使用 `Microsoft.NET.Sdk.Web` SDK 来创建作业，但在编写本文档时，只有调度作业的服务才会接收其触发调用。由于这些调用期望有一个可以处理作业触发的端点，并且需要 `Microsoft.NET.Sdk.Web` SDK，因此建议你为此目的使用 ASP.NET Core 项目。

首先定义类型以持久化我们的备份作业数据，并对属性应用我们自己的 JSON 属性名称属性，使其与其他语言示例保持一致。

```cs
//Define the types that we'll represent the job data with
internal sealed record BackupJobData([property: JsonPropertyName("task")] string Task, [property: JsonPropertyName("metadata")] BackupMetadata Metadata);
internal sealed record BackupMetadata([property: JsonPropertyName("DBName")]string DatabaseName, [property: JsonPropertyName("BackupLocation")] string BackupLocation);
```

接下来，作为应用程序设置的一部分，设置一个处理程序，该处理程序将在任何时候应用程序上触发作业时被调用。该处理程序负责根据提供的作业名称确定应如何处理作业。

这是通过在 `/job/<job-name>` 处向 ASP.NET Core 注册一个处理程序来实现的，其中 `<job-name>` 是参数化的，并传递给此处理程序委托，这满足了 Dapr 期望有一个端点来处理触发的命名作业的要求。

使用以下内容填充你的 `Program.cs` 文件：

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

//Registers an endpoint to receive and process triggered jobs
var cancellationTokenSource = new CancellationTokenSource(TimeSpan.FromSeconds(5));
app.MapDaprScheduledJobHandler((string jobName, ReadOnlyMemory<byte> jobPayload, ILogger logger, CancellationToken cancellationToken) => {
  logger?.LogInformation("Received trigger invocation for job '{jobName}'", jobName);
  switch (jobName)
  {
    case "prod-db-backup":
      // Deserialize the job payload metadata
      var jobData = JsonSerializer.Deserialize<BackupJobData>(jobPayload);
      
      // Process the backup operation - we assume this is implemented elsewhere in your code
      await BackupDatabaseAsync(jobData, cancellationToken);
      break;
  }
}, cancellationTokenSource.Token);

await app.RunAsync();
```

最后，作业本身需要向 Dapr 注册，以便它可以在以后的时间点被触发。你可以通过将 `DaprJobsClient` 注入到类中并作为应用程序的入站操作的一部分来执行此操作，但为了本示例的目的，它将放在你上面开始使用的 `Program.cs` 文件的底部。因为你将使用通过依赖注入注册的 `DaprJobsClient`，所以首先创建一个作用域以便你可以访问它。

```cs
//Create a scope so we can access the registered DaprJobsClient
await using scope = app.Services.CreateAsyncScope();
var daprJobsClient = scope.ServiceProvider.GetRequiredService<DaprJobsClient>();

//Create the payload we wish to present alongside our future job triggers
var jobData = new BackupJobData("db-backup", new BackupMetadata("my-prod-db", "/backup-dir")); 

//Serialize our payload to UTF-8 bytes
var serializedJobData = JsonSerializer.SerializeToUtf8Bytes(jobData);

//Schedule our backup job to run every minute, but only repeat 10 times
await daprJobsClient.ScheduleJobAsync("prod-db-backup", DaprJobSchedule.FromDuration(TimeSpan.FromMinutes(1)),
    serializedJobData, repeats: 10);
```

{{% /tab %}}

{{% tab "Go" %}}

<!--go-->

下面的 Go SDK 代码示例调度名为 `prod-db-backup` 的作业。作业数据位于备份数据库（`"my-prod-db"`）中，并使用 `ScheduleJobAlpha1` 进行调度。这提供了 `jobData`，包括：
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
    // Initialize the server
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

    // Set up backup location
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

作业通过设置的 `Schedule` 和所需的 `Repeats` 数量进行调度。这些设置确定作业应被触发并发送回应用程序的最大次数。

在此示例中，在触发时间（根据 `Schedule` 为 `@every 1s`），此作业被触发并发送回应用程序，直到达到最大 `Repeats`（`10`）。

```go	
    // ...
    // Set up the job
	job := daprc.Job{
		Name:     "prod-db-backup",
		Schedule: "@every 1s",
		Repeats:  10,
		Data: &anypb.Any{
			Value: jobData,
		},
	}
```

当作业被触发时，Dapr 会自动将作业路由到你在服务器初始化期间设置的事件处理程序。例如，在 Go 中，你会像这样注册事件处理程序：

```go
...
if err = server.AddJobEventHandler("prod-db-backup", prodDBBackupHandler); err != nil {
    log.Fatalf("failed to register job event handler: %v", err)
}
```

Dapr 处理底层路由。当作业被触发时，会使用触发的作业数据调用你的 `prodDBBackupHandler` 函数。以下是处理触发的作业的示例：

```go
// ...

// At job trigger time this function is called
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

一旦你在应用程序中设置了 Jobs API，在终端窗口中使用以下命令运行 Dapr 边车。

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
