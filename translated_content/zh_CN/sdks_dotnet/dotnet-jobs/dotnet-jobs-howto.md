---
type: docs
title: "操作指南：在 .NET SDK 中编写和管理 Dapr Jobs"
linkTitle: "操作指南：编写和管理任务"
weight: 51000
description: 了解如何使用 .NET SDK 编写和管理 Dapr Jobs
---

让我们创建一个在 Dapr Jobs 触发时会被调用的端点，然后在同一应用中调度该任务。我们将使用[此处提供的简单示例](https://github.com/dapr/dotnet-sdk/tree/master/examples/Jobs)进行以下演示，并以此作为说明，介绍如何使用间隔时间或 Cron 表达式来调度一次性或重复任务。在本指南中，你将：

- 部署一个 .NET Web API 应用程序 ([JobsSample](https://github.com/dapr/dotnet-sdk/tree/master/examples/Jobs/JobsSample))
- 使用 Dapr .NET Jobs SDK 来调度任务调用并设置要触发的端点

在 .NET 示例项目中：
- 主要的 [`Program.cs`](https://github.com/dapr/dotnet-sdk/tree/master/examples/Jobs/JobsSample/Program.cs) 文件包含了本演示的全部内容。

## 前置条件
- [Dapr CLI](https://docs.dapr.io/getting-started/install-dapr-cli/)
- [已初始化的 Dapr 环境](https://docs.dapr.io/getting-started/install-dapr-selfhost)
- 已安装 [.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0)、[.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0) 或 [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0)
- 已将 [Dapr.Jobs](https://www.nuget.org/packages/Dapr.Jobs) NuGet 包安装到你的项目中

## 设置环境
克隆 [.NET SDK 仓库](https://github.com/dapr/dotnet-sdk)。

```sh
git clone https://github.com/dapr/dotnet-sdk.git
```

从 .NET SDK 根目录导航到 Dapr Jobs 示例。

```sh
cd examples/Jobs
```

## 在本地运行应用程序

要运行 Dapr 应用程序，你需要启动 .NET 程序和 Dapr 边车。导航到 `JobsSample` 目录。

```sh
cd JobsSample
```

我们将运行一个同时启动 Dapr 边车和 .NET 程序的命令。

```sh
dapr run --app-id jobsapp --dapr-grpc-port 4001 --dapr-http-port 3500 -- dotnet run
```

> Dapr 在 `http://localhost:3500` 监听 HTTP 请求，在 `http://localhost:4001` 监听内部 Jobs gRPC 请求。

## 使用依赖注入注册 Dapr Jobs 客户端
Dapr Jobs SDK 提供了一个扩展方法来简化 Dapr Jobs 客户端的注册。在 `Program.cs` 中完成依赖注入注册之前，添加以下行：

```cs
var builder = WebApplication.CreateBuilder(args);

//Add anywhere between these two lines
builder.Services.AddDaprJobsClient();

var app = builder.Build();
```

> 请注意，在 Jobs API 的当前实现中，调度任务的应用也将是接收触发通知的应用。换句话说，你无法调度一个在另一个应用中运行的触发器。因此，虽然你不需要显式地在应用中注册 Dapr Jobs 客户端来调度触发器调用端点，但如果没有同一应用以某种方式调度任务（无论是通过此 Dapr Jobs .NET SDK 还是通过对边车的 HTTP 调用），你的端点永远不会被调用。

你可能希望为 Dapr Jobs 客户端提供一些配置选项，这些选项应在每次对边车的调用时都存在，例如 Dapr API 令牌，或者你想使用非标准的 HTTP 或 gRPC 端点。这可以通过使用注册方法的重载来实现，该重载允许配置 `DaprJobsClientBuilder` 实例：

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprJobsClient((_, daprJobsClientBuilder) =>
{
    daprJobsClientBuilder.UseDaprApiToken("abc123");
    daprJobsClientBuilder.UseHttpEndpoint("http://localhost:8512"); //非标准的边车 HTTP 端点
});

var app = builder.Build();
```

不过，你希望注入的任何值可能需要从其他来源获取，这些来源本身已注册为依赖。还有一个重载可以使用，它可以将 `IServiceProvider` 注入到配置操作方法中。在以下示例中，我们注册了一个虚构的单例，该单例可以从某个地方获取密钥，并将其传递给 `AddDaprJobClient` 的配置方法，这样我们就可以从其他地方检索 Dapr API 令牌以在此处进行注册：

```cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<SecretRetriever>();
builder.Services.AddDaprJobsClient((serviceProvider, daprJobsClientBuilder) =>
{
    var secretRetriever = serviceProvider.GetRequiredService<SecretRetriever>();
    var daprApiToken = secretRetriever.GetSecret("DaprApiToken").Value;
    daprJobsClientBuilder.UseDaprApiToken(daprApiToken);

    daprJobsClientBuilder.UseHttpEndpoint("http://localhost:8512");
});

var app = builder.Build();
```

## 使用 IConfiguration 配置 Dapr Jobs 客户端
也可以使用已注册的 `IConfiguration` 中的值来配置 Dapr Jobs 客户端，而无需像上一节演示的那样使用 `DaprJobsClientBuilder` 显式指定每个值覆盖。相反，通过填充通过依赖注入提供的 `IConfiguration`，`AddDaprJobsClient()` 注册将自动使用这些值而不是各自的默认值。

首先，在配置中填充值。这可以通过几种不同的方式来完成，如下所示。

### 通过 `ConfigurationBuilder` 进行配置
可以在不使用配置源的情况下配置应用程序设置，而是通过使用 `ConfigurationBuilder` 实例在内存中填充值：

```csharp
var builder = WebApplication.CreateBuilder();

//Create the configuration
var configuration = new ConfigurationBuilder()
    .AddInMemoryCollection(new Dictionary<string, string> {
            { "DAPR_HTTP_ENDPOINT", "http://localhost:54321" },
            { "DAPR_API_TOKEN", "abc123" }
        })
    .Build();

builder.Configuration.AddConfiguration(configuration);
builder.Services.AddDaprJobsClient(); //这将自动从 IConfiguration 填充 HTTP 端点和 API 令牌值
```

### 通过环境变量进行配置
可以从应用程序可用的环境变量中访问应用程序设置。

以下环境变量将用于填充注册 Dapr Jobs 客户端时使用的 HTTP 端点和 API 令牌。

| 键 | 值 |
| --- | --- |
| DAPR_HTTP_ENDPOINT | http://localhost:54321 |
| DAPR_API_TOKEN | abc123 |

```csharp
var builder = WebApplication.CreateBuilder();

builder.Configuration.AddEnvironmentVariables();
builder.Services.AddDaprJobsClient();
```

Dapr Jobs 客户端将被配置为使用 HTTP 端点 `http://localhost:54321`，并在所有出站请求中填充 API 令牌头 `abc123`。

### 通过带前缀的环境变量进行配置

然而，在多个应用程序在同一台机器上运行而不使用容器的共享主机场景或开发环境中，为环境变量添加前缀并不少见。以下示例假设 HTTP 端点和 API 令牌都将从前缀为 "myapp_" 的环境变量中提取。在此场景中使用的两个环境变量如下：

| 键 | 值 |
| --- | --- |
| myapp_DAPR_HTTP_ENDPOINT | http://localhost:54321 |
| myapp_DAPR_API_TOKEN | abc123 |

这些环境变量将在以下示例中加载到已注册的配置中，并在不带前缀的情况下可用。

```csharp
var builder = WebApplication.CreateBuilder();

builder.Configuration.AddEnvironmentVariables(prefix: "myapp_");
builder.Services.AddDaprJobsClient();
```

Dapr Jobs 客户端将被配置为使用 HTTP 端点 `http://localhost:54321`，并在所有出站请求中填充 API 令牌头 `abc123`。

## 在不依赖依赖注入的情况下使用 Dapr Jobs 客户端
虽然使用依赖注入简化了 .NET 中复杂类型的使用，并使处理复杂配置变得更加容易，但你并不需要以这种方式注册 `DaprJobsClient`。相反，你也可以选择从 `DaprJobsClientBuilder` 实例创建它的实例，如下所示：

```cs

public class MySampleClass
{
    public void DoSomething()
    {
        var daprJobsClientBuilder = new DaprJobsClientBuilder();
        var daprJobsClient = daprJobsClientBuilder.Build();

        //使用 `daprJobsClient` 做一些事情
    }
}
```

## 设置一个在任务触发时被调用的端点

如果你对 [ASP.NET Core 中的最小 API](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/overview) 有点熟悉，那么设置任务端点就很简单，因为两者的语法是相同的。

完成依赖注入注册后，像处理通过 ASP.NET Core 中的最小 API 功能映射 HTTP 请求那样配置应用程序。作为扩展方法实现，传入它应该响应的任务名称和一个委托。你可以根据需要将服务注入到委托的参数中，并且可以从最初提供给任务注册的 `ReadOnlyMemory<byte>` 访问任务负载。

这里可以使用两个委托。如果你需要将其他服务注入到处理程序中，其中一个提供 `IServiceProvider`：

```cs
//我们从上面的示例中得到这个
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprJobsClient();

var app = builder.Build();

//添加我们的端点注册
app.MapDaprScheduledJob("myJob", (IServiceProvider serviceProvider, string jobName, ReadOnlyMemory<byte> jobPayload) => {
    var logger = serviceProvider.GetService<ILogger>();
    logger?.LogInformation("Received trigger invocation for '{jobName}'", "myJob");

    //做一些事情...
});

app.Run();
```

如果没有必要，委托的另一个重载不需要 `IServiceProvider`：

```cs
//我们从上面的示例中得到这个
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprJobsClient();

var app = builder.Build();

//添加我们的端点注册
app.MapDaprScheduledJob("myJob", (string jobName, ReadOnlyMemory<byte> jobPayload) => {
    //做一些事情...
});

app.Run();
```

## 在处理映射调用时支持取消令牌
你可能希望确保在任务调用时处理超时，这样它们就不会无限期挂起并使用系统资源。在设置任务映射时，有一个可选的 `TimeSpan` 参数可以作为最后一个参数提供，以指定请求的超时时间。每次触发任务映射调用时，都会使用此超时参数创建一个新的 `CancellationTokenSource`，并从中创建一个 `CancellationToken` 来限制请求的处理时间。如果未提供超时，则默认为 `CancellationToken.None`，并且不会自动对映射应用超时。

```cs
//我们从上面的示例中得到这个
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDaprJobsClient();

var app = builder.Build();

//添加我们的端点注册
app.MapDaprScheduledJob("myJob", (string jobName, ReadOnlyMemory<byte> jobPayload) => {
    //做一些事情...
}, TimeSpan.FromSeconds(15)); //为处理调用请求分配最大 15 秒的超时时间

app.Run();
```

## 注册任务

最后，我们必须注册要调度的任务。请注意，从这里开始，所有 SDK 方法都支持取消令牌，如果未另外设置，则使用默认令牌。

有三种不同的方式来设置任务，具体取决于你想如何配置调度。以下显示了调度任务时可用的不同参数：

| 参数名称 | 类型 | 描述 | 必填 |
|---|---|---|---|
| jobName | string | 正在调度的任务的名称。 | 是 |
| schedule | DaprJobSchedule | 定义任务何时触发的调度。 | 是 |
| payload | ReadOnlyMemory<byte> | 在触发时提供给调用端点的任务数据。 | 否 |
| startingFrom | DateTime | 任务调度应开始的时间点。 | 否 |
| repeats | int | 任务应触发的最大次数。 | 否 |
| ttl | 任务何时应过期且不再触发。 | 否 |
| overwrite | bool | 一个标志，指示提交时是否应覆盖现有任务，如果为 false，则需要先删除同名的现有任务。 | 否 |
| cancellationToken | CancellationToken | 用于提前取消操作，例如由于操作超时。 | 否 |

### `DaprJobSchedule`
所有任务都是通过 SDK 使用 `DaprJobSchedule` 调度的，它创建一个传递给运行时的表达式来调度任务。`DaprJobSchedule` 上公开了几个静态方法，用于简化每种可用任务调度的注册，如下所示。这将指定任务调度本身与任何其他选项（如重复操作或提供取消令牌）分离开来。

### 一次性任务
一次性任务就是这样；它将在单个时间点运行，不会重复。

这种方法要求你选择一个任务名称并指定它应该被触发的时间。

`DaprJobSchedule.FromDateTime(DateTimeOffset scheduledTime)`

一次性任务可以从 Dapr Jobs 客户端调度，如下例所示：

```cs
public class MyOperation(DaprJobsClient daprJobsClient)
{
    public async Task ScheduleOneTimeJobAsync(CancellationToken cancellationToken)
    {
        var today = DateTimeOffset.UtcNow;
        var threeDaysFromNow = today.AddDays(3);

        var schedule = DaprJobSchedule.FromDateTime(threeDaysFromNow);
        await daprJobsClient.ScheduleJobAsync("job", schedule, cancellationToken: cancellationToken);
    }
}
```

### 基于间隔的任务
基于间隔的任务是在配置为固定时间的循环上运行的任务，就像今天 Actors 构建块中的 [提醒](https://docs.dapr.io/developing-applications/building-blocks/actors/actors-timers-reminders/#actor-reminders) 的工作方式一样。

`DaprJobSchedule.FromDuration(TimeSpan interval)`

基于间隔的任务可以从 Dapr Jobs 客户端调度，如下例所示：

```cs
public class MyOperation(DaprJobsClient daprJobsClient)
{

    public async Task ScheduleIntervalJobAsync(CancellationToken cancellationToken)
    {
        var hourlyInterval = TimeSpan.FromHours(1);

        //每小时触发一次任务，但最多 5 次
        var schedule = DaprJobSchedule.FromDuration(hourlyInterval);
        await daprJobsClient.ScheduleJobAsync("job", schedule, repeats: 5, cancellationToken: cancellationToken);
    }
}
```

### 基于 Cron 的任务
基于 Cron 的任务是使用 Cron 表达式调度的。这提供了更多基于日历的控制，因为可以在表达式中使用基于日历的值。

`DaprJobSchedule.FromCronExpression(string cronExpression)`

在 Dapr SDK 中，支持两种不同的方法来调度基于 Cron 的任务。

#### 提供你自己的 Cron 表达式
你可以通过 `DaprJobSchedule.FromExpression()` 通过字符串提供你自己的 Cron 表达式：

```csharp
public class MyOperation(DaprJobsClient daprJobsClient)
{
    public async Task ScheduleCronJobAsync(CancellationToken cancellationToken)
    {
        //在每月第五天的每隔一小时的顶部
        const string cronSchedule = "0 */2 5 * *";
        var schedule = DaprJobSchedule.FromExpression(cronSchedule);

        //直到下个月才开始
        var now = DateTime.UtcNow;
        var oneMonthFromNow = now.AddMonths(1);
        var firstOfNextMonth = new DateTime(oneMonthFromNow.Year, oneMonthFromNow.Month, 1, 0, 0, 0);

        await daprJobsClient.ScheduleJobAsync("myJobName", )
        await daprJobsClient.ScheduleCronJobAsync("myJobName", schedule, dueTime: firstOfNextMonth, cancellationToken: cancellationToken);
    }
}
```

#### 使用 `CronExpressionBuilder`
或者，你可以使用我们的流畅构建器来生成有效的 Cron 表达式：

```csharp
public class MyOperation(DaprJobsClient daprJobsClient)
{
    public async Task ScheduleCronJobAsync(CancellationToken cancellationToken)
    {
        //在每月第五天的每隔一小时的顶部
        var cronExpression = new CronExpressionBuilder()
            .Every(EveryCronPeriod.Hour, 2)
            .On(OnCronPeriod.DayOfMonth, 5)
            .ToString();
        var schedule = DaprJobSchedule.FromExpression(cronExpression);

        //直到下个月才开始
        var now = DateTime.UtcNow;
        var oneMonthFromNow = now.AddMonths(1);
        var firstOfNextMonth = new DateTime(oneMonthFromNow.Year, oneMonthFromNow.Month, 1, 0, 0, 0);

        await daprJobsClient.ScheduleJobAsync("myJobName", )
        await daprJobsClient.ScheduleCronJobAsync("myJobName", schedule, dueTime: firstOfNextMonth, cancellationToken: cancellationToken);
    }
}
```

## 获取已调度任务的详细信息
如果你知道已调度任务的名称，你可以检索其元数据而无需等待它被触发。返回的 `JobDetails` 暴露了一些有用的属性，用于从 Dapr Jobs API 使用信息：

- 如果 `Schedule` 属性包含 Cron 表达式，`IsCronExpression` 属性将为 true，表达式也可以在 `CronExpression` 属性中获得。
- 如果 `Schedule` 属性包含持续时间值，`IsIntervalExpression` 属性将为 true，该值将转换为可从 `Interval` 属性访问的 `TimeSpan` 值。

可以通过使用以下内容来完成：

```cs
public class MyOperation(DaprJobsClient daprJobsClient)
{
    public async Task<JobDetails> GetJobDetailsAsync(string jobName, CancellationToken cancellationToken)
    {
        var jobDetails = await daprJobsClient.GetJobAsync(jobName, canecllationToken);
        return jobDetails;
    }
}
```

## 删除已调度的任务
要删除已调度的任务，你需要知道它的名称。从那里，就像在 Dapr Jobs 客户端上调用 `DeleteJobAsync` 方法一样简单：

```cs
public class MyOperation(DaprJobsClient daprJobsClient)
{
    public async Task DeleteJobAsync(string jobName, CancellationToken cancellationToken)
    {
        await daprJobsClient.DeleteJobAsync(jobName, cancellationToken);
    }
}
```
