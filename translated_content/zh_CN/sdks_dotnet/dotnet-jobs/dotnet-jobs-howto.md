---
type: docs
title: "操作指南：在 .NET SDK 中编写和管理 Dapr Jobs"
linkTitle: "操作指南：编写和管理 job"
weight: 51000
description: "调度 job、接收 HTTP 或 gRPC 回调，并在 .NET 中管理 job 注册"
---

请使用 `Dapr.Jobs` 的 `1.19.0` 或更高版本，并配合运行中的 Dapr sidecar 与 Scheduler。本文描述的完整管理功能需要运行时支持相应操作；1.19 的功能请使用 Dapr 1.19。所有客户端操作都会在 Stable（稳定）与 alpha 版 API 之间按版本自动回退，但这并不意味着旧版运行时可以使用较新的管理操作。

```sh
dotnet add package Dapr.Jobs
```

job 的作用域限定在调度它的应用的 Dapr App ID 之内。调度触发器时，客户端不接受其他目标 App ID。参见 [Jobs 示例](https://github.com/dapr/dotnet-sdk/tree/v1.19.0/examples/Jobs/JobsSample)。

## 注册客户端和回调 handler

在构建主机之前注册客户端，并为动态命名的 job 映射一个 handler：

```csharp
using Dapr.Jobs;
using Dapr.Jobs.Extensions;
using Dapr.Jobs.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprJobsClient();

await using var app = builder.Build();

app.MapDaprScheduledJobHandler(
    async (string jobName, ReadOnlyMemory<byte> payload, CancellationToken cancellationToken) =>
    {
        app.Logger.LogInformation("Received job {JobName}", jobName);
        var text = Encoding.UTF8.GetString(payload.Span);
        await HandleJobAsync(jobName, text, cancellationToken);
    },
    timeout: TimeSpan.FromSeconds(30));

await app.RunAsync();
```

`HandleJobAsync` 代表你的应用逻辑。回调接收 job 名称和原始负载字节；其他服务可以从请求的依赖注入容器中解析。它的取消令牌包含已配置的 handler 超时。handler 必须自行检查该令牌；超时并不会强制终止任意代码。异步工作请返回 `Task`，使回调在确认触发之前等待其完成。

对于 HTTP 回调，映射器会注册 `POST /job/{jobName}`。请使用匹配的应用端口启动应用：

```sh
dapr run --app-id jobsapp --app-port 5000 -- dotnet run --urls http://localhost:5000
```

### gRPC 回调

`AddDaprJobsClient` 和 `MapDaprScheduledJobHandler` 同样会注册 gRPC 回调路径。使用 `--app-protocol grpc` 选择它。对于明文 gRPC，请在 `builder.Build()` 之前配置专用的 HTTP/2 监听器：

```csharp
using Microsoft.AspNetCore.Server.Kestrel.Core;

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(5000, listen => listen.Protocols = HttpProtocols.Http2);
});
```

仅支持 HTTP/1 的监听器，或未经协议协商的明文 `Http1AndHttp2`，无法提供此 gRPC 回调。如果同一应用还需要接收 HTTP/1 流量，请使用单独的监听器。

## 注册 job

解析 `DaprJobsClient`，并对每种调度类型使用 `ScheduleJobAsync`：

```csharp
var jobsClient = app.Services.GetRequiredService<DaprJobsClient>();
var schedule = DaprJobSchedule.FromDateTime(DateTimeOffset.UtcNow.AddMinutes(5));

await jobsClient.ScheduleJobAsync(
    "send-receipt", schedule,
    payload: Encoding.UTF8.GetBytes("order-42"),
    overwrite: false,
    cancellationToken: cancellationToken);
```

只有在回调就绪之后才进行调度，或使用将来的到期时间。注册 job 本身不会启动应用监听器。

| 参数 | 含义 |
| --- | --- |
| `jobName`, `schedule` | 必填的名称和 `DaprJobSchedule`。 |
| `payload` | 可选的 `ReadOnlyMemory<byte>`，原样传递给回调。 |
| `startingFrom` | 可选的 `DateTimeOffset`，控制第一次到期时间。 |
| `repeats` | 可选的重复次数。 |
| `ttl` | 可选的绝对 `DateTimeOffset` 过期时间，同时提供 `startingFrom` 时须晚于该时间。 |
| `overwrite` | 默认为 `false`；需要显式开启才会替换同名的现有注册。 |
| `failurePolicyOptions` | 针对失败触发器的丢弃策略或固定间隔 retry policy。 |
| `cancellationToken` | 取消等待客户端操作；它不是回调的取消令牌。 |

### 一次性、间隔与预定义调度

```csharp
var oneTime = DaprJobSchedule.FromDateTime(DateTimeOffset.UtcNow.AddHours(1));
var interval = DaprJobSchedule.FromDuration(TimeSpan.FromMinutes(15));
var daily = DaprJobSchedule.Daily;

await jobsClient.ScheduleJobAsync("refresh-cache", interval, repeats: 5,
    cancellationToken: cancellationToken);
```

预定义调度还包括 `Hourly`、`Midnight`、`Weekly`、`Monthly` 和 `Yearly`。

### 基于 Cron 的 job 与时区

使用 `FromExpression` 传入字符串表达式，或使用 `FromCronExpression` 传入 `CronExpressionBuilder`：

```csharp
var schedule = DaprJobSchedule.FromExpression("CRON_TZ=America/New_York 0 9 * * *");
await jobsClient.ScheduleJobAsync("morning-report", schedule,
    cancellationToken: cancellationToken);
```

构建器还支持 `WithTimeZone(string)` 与 `WithTimeZone(TimeZoneInfo)`。`DaprJobSchedule.TimeZone` 会暴露内嵌的 `CRON_TZ` 标识符。请使用有效的 IANA 时区 ID，并在选择日历类调度时考虑夏令时的变化。

### JSON 与字符串负载辅助方法

`Dapr.Jobs.Extensions` 中的 `ScheduleJobWithPayloadAsync` 接受相同的调度方式：

```csharp
await jobsClient.ScheduleJobWithPayloadAsync(
    "create-report", DaprJobSchedule.Daily,
    new { AccountId = "42", Format = "pdf" },
    cancellationToken: cancellationToken);
```

对象重载会使用 Web 默认设置进行 JSON 序列化，除非你传入 `jsonSerializerOptions`。字符串重载会以 UTF-8 编码文本，不加 JSON 引号。请按相同约定反序列化回调字节。本版本中没有单独的 `ScheduleCronJobAsync` 或 `ScheduleOneTimeJobWithPayloadAsync` 辅助方法。

## 配置触发器失败策略

```csharp
await jobsClient.ScheduleJobAsync(
    "refresh-catalog", DaprJobSchedule.Hourly,
    failurePolicyOptions: new JobFailurePolicyConstantOptions(TimeSpan.FromSeconds(10))
    {
        MaxRetries = 5
    },
    cancellationToken: cancellationToken);
```

`JobFailurePolicyConstantOptions` 按指定间隔重试；未设置 `MaxRetries` 时会无限重试。`JobFailurePolicyDropOptions` 会丢弃失败的触发器。省略策略时，将沿用运行时默认值。该策略与 job 的周期性调度和重复次数相互独立。由于触发器可能被多次投递，请让回调的副作用保持幂等。

## 获取已调度 job 的详细信息

```csharp
var details = await jobsClient.GetJobAsync("refresh-catalog", cancellationToken);
```

`DaprJobDetails` 暴露 `Name`、`Schedule`、`DueTime`、`Ttl`、`RepeatCount`、`Payload`、`FailurePolicy` 和 `Overwrite`。对于手动构造的结果或旧版运行时返回的结果，`Name` 可能为 null。请检查 `details.Schedule.ExpressionValue`，以及 `IsCronExpression`、`IsPointInTimeExpression` 等调度分类属性。响应中不提供顶层的 `Interval` 或 `CronExpression` 属性。

## 列出所有已注册的 job

```csharp
var registered = await jobsClient.ListJobsAsync(cancellationToken);
foreach (var job in registered)
{
    Console.WriteLine($"{job.Name}: {job.Schedule.ExpressionValue}");
}
```

结果为 `IReadOnlyList<DaprJobDetails>`，范围限定为当前 App ID。空列表通常表示没有 job；另请考虑下文描述的特定版本取消行为。

## 删除已调度的 job

```csharp
await jobsClient.DeleteJobAsync("refresh-catalog", cancellationToken);
```

## 按名称前缀删除多个 job

```csharp
await jobsClient.DeleteJobsByPrefixAsync("report-", cancellationToken);
```

前缀匹配区分大小写。**null、空字符串或仅含空白的前缀会删除该 App ID 下的所有 job。** 调用此操作之前，请先校验用户提供的前缀。

## 清除所有 job

```csharp
await jobsClient.PurgeAllJobsAsync(cancellationToken);
```

此操作会明确请求删除与当前 App ID 关联的全部 job，而不是集群中的所有 job。

## 错误与取消

运行时失败会包装在 `DaprException` 中；请检查 `InnerException`。无效参数可能抛出标准的参数异常。在 `1.19.0` 中，多个 Jobs 方法会捕获调用方的取消，而不是抛出 `OperationCanceledException`：写入和删除可能在未确认的情况下返回，列表操作可能返回空结果。`GetJobAsync` 在取消后若缺少预期结果，会报告为 `DaprException`。客户端配置和负载约定请参阅 [DaprJobsClient 用法]({{< ref dotnet-jobsclient-usage.md >}})。

## 分析器

`Dapr.Jobs.Analyzers` 包提供诊断 `DAPR1501`（警告，类别为 Usage）。当 `ScheduleJobAsync` 使用字面量 job 名称调用，而同一源文件中不存在 `MapDaprScheduledJobHandler` 调用时，它会触发。诊断消息为 “Job invocations require the MapDaprScheduledJobHandler be set and configured for job name '{name}' on IEndpointRouteBuilder”。请添加 handler 映射；如果 handler 有意映射在其他位置，可以用 `#pragma warning disable DAPR1501` 或 `.editorconfig` 规则抑制该诊断。
