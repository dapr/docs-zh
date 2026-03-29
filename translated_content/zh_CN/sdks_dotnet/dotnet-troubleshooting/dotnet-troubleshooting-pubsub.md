---
type: docs
title: "使用 .NET SDK 对发布订阅进行故障排查"
linkTitle: "发布订阅故障排查"
weight: 100000
description: 使用 .NET SDK 对发布订阅进行故障排查
---

# 发布订阅故障排查

发布订阅最常见的问题是应用程序中的发布订阅端点未被调用。

这个问题有几个层次，对应不同的解决方案：

- 应用程序未接收到来自 Dapr 的任何流量
- 应用程序未向 Dapr 注册发布订阅端点
- 发布订阅端点已向 Dapr 注册，但请求未到达预期的端点

## 步骤 1：提高日志级别

**这很重要。后续步骤将取决于你查看日志输出的能力。ASP.NET Core 在默认日志设置下几乎不输出任何内容，因此你需要更改它。**

按照[此处](https://docs.microsoft.com/aspnet/core/mvc/controllers/routing?view=aspnetcore-5.0#debug-diagnostics)的说明，调整日志详细程度以包含 ASP.NET Core 的 `Information` 级别日志。将 `Microsoft` 键设置为 `Information`。

## 步骤 2：验证你可以接收来自 Dapr 的流量

1. 按正常方式启动应用程序（`dapr run ...`）。确保你在命令行中包含了 `--app-port` 参数。Dapr 需要知道你的应用程序正在监听流量。默认情况下，ASP.NET Core 应用程序在本地开发中会在端口 5000 上监听 HTTP。

2. 等待 Dapr 完成启动

3. 检查日志

你应该会看到类似以下的日志条目：

```
info: Microsoft.AspNetCore.Hosting.Diagnostics[1]
      Request starting HTTP/1.1 GET http://localhost:5000/.....
```

在初始化期间，Dapr 会向你的应用程序发出一些配置请求。如果你找不到这些请求，说明出现了问题。请通过 issue 或 Discord 寻求帮助（并附上日志）。如果你看到向你的应用程序发出的请求，则继续执行步骤 3。

## 步骤 3：验证端点注册

1. 按正常方式启动应用程序（`dapr run ...`）。

2. 在命令行使用 `curl`（或其他 HTTP 测试工具）访问 `/dapr/subscribe` 端点。

以下是一个示例命令，假设你的应用程序监听端口是 5000：

```sh
curl http://localhost:5000/dapr/subscribe -v
```

对于正确配置的应用程序，输出应如下所示：

```txt
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 5000 (#0)
> GET /dapr/subscribe HTTP/1.1
> Host: localhost:5000
> User-Agent: curl/7.64.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Date: Fri, 15 Jan 2021 22:31:40 GMT
< Content-Type: application/json
< Server: Kestrel
< Transfer-Encoding: chunked
<
* Connection #0 to host localhost left intact
[{"topic":"deposit","route":"deposit","pubsubName":"pubsub"},{"topic":"withdraw","route":"withdraw","pubsubName":"pubsub"}]* Closing connection 0
```

特别注意 HTTP 状态码和 JSON 输出。

```txt
< HTTP/1.1 200 OK
```

200 状态码表示成功。


末尾包含的 JSON 数据块是 `/dapr/subscribe` 的输出，由 Dapr 运行时处理。在本例中，它使用的是此仓库中的 `ControllerSample` - 因此这是正确输出的示例。

```json
[
    {"topic":"deposit","route":"deposit","pubsubName":"pubsub"},
    {"topic":"withdraw","route":"withdraw","pubsubName":"pubsub"}
]
```

--- 

掌握了此命令的输出后，你就可以诊断问题或继续下一步。

### 选项 0：响应是 200 且包含一些发布订阅条目

**如果此测试的 JSON 输出中有条目，则问题出在其他地方，请继续执行步骤 2。**

### 选项 1：响应不是 200，或不包含 JSON

如果响应不是 200 或不包含 JSON，则表示未到达 `MapSubscribeHandler()` 端点。

确保你在 `Startup.cs` 中有类似以下的代码，然后重复测试。

```cs
app.UseRouting();

app.UseCloudEvents();

app.UseEndpoints(endpoints =>
{
    endpoints.MapSubscribeHandler(); // This is the Dapr subscribe handler
    endpoints.MapControllers();
});
```

**如果添加订阅处理程序未能解决问题，请在此仓库上提交 issue 并包含你的 `Startup.cs` 文件的内容。**

### 选项 2：响应包含 JSON 但为空（如 `[]`）

如果 JSON 输出是空数组（如 `[]`），则表示订阅处理程序已注册，但未注册任何主题端点。

---

如果你使用控制器进行发布订阅，你应该有一个类似以下的方法：

```C#
[Topic("pubsub", "deposit")]
[HttpPost("deposit")]
public async Task<ActionResult> Deposit(...)

// Using Pub/Sub routing
[Topic("pubsub", "transactions", "event.type == \"withdraw.v2\"", 1)]
[HttpPost("withdraw")]
public async Task<ActionResult> Withdraw(...)
```

在此示例中，`Topic` 和 `HttpPost` 特性是必需的，但其他细节可能不同。

---

如果你使用路由进行发布订阅，你应该有一个类似以下的端点：

```C#
endpoints.MapPost("deposit", ...).WithTopic("pubsub", "deposit");
```

在此示例中，调用 `WithTopic(...)` 是必需的，但其他细节可能不同。

---

**更正此代码并重新测试后，如果 JSON 输出仍然是空数组（如 `[]`），请在此仓库上提交 issue 并包含 `Startup.cs` 的内容和你的发布订阅端点。**

## 步骤 4：验证端点可达性

在此步骤中，我们将验证向发布订阅注册的条目是否可访问。上一步应该会给你一些类似以下的 JSON 输出：

```json
[
  {
    "pubsubName": "pubsub",
    "topic": "deposit",
    "route": "deposit"
  },
  {
    "pubsubName": "pubsub",
    "topic": "deposit",
    "routes": {
      "rules": [
        {
          "match": "event.type == \"withdraw.v2\"",
          "path": "withdraw"
        }
      ]
    }
  }
]
```

保留此输出，因为我们将使用 `route` 信息来测试应用程序。

1. 按正常方式启动应用程序（`dapr run ...`）。
   
2. 在命令行使用 `curl`（或其他 HTTP 测试工具）访问向发布订阅端点注册的路由之一。

以下是一个示例命令，假设你的应用程序监听端口是 5000，且你的发布订阅路由之一是 `withdraw`：

```sh
curl http://localhost:5000/withdraw -H 'Content-Type: application/json' -d '{}' -v
```

以下是针对示例运行上述命令的输出：

```txt
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 5000 (#0)
> POST /withdraw HTTP/1.1
> Host: localhost:5000
> User-Agent: curl/7.64.1
> Accept: */*
> Content-Type: application/json
> Content-Length: 2
>
* upload completely sent off: 2 out of 2 bytes
< HTTP/1.1 400 Bad Request
< Date: Fri, 15 Jan 2021 22:53:27 GMT
< Content-Type: application/problem+json; charset=utf-8
< Server: Kestrel
< Transfer-Encoding: chunked
<
* Connection #0 to host localhost left intact
{"type":"https://tools.ietf.org/html/rfc7231#section-6.5.1","title":"One or more validation errors occurred.","status":400,"traceId":"|5e9d7eee-4ea66b1e144ce9bb.","errors":{"Id":["The Id field is required."]}}* Closing connection 0
```

根据 HTTP 400 和 JSON 负载，此响应表示已到达端点，但由于验证错误而拒绝了请求。

你还应该查看运行中应用程序的控制台输出。这是示例输出，为清晰起见，去除了 Dapr 日志头。

```
info: Microsoft.AspNetCore.Hosting.Diagnostics[1]
      Request starting HTTP/1.1 POST http://localhost:5000/withdraw application/json 2
info: Microsoft.AspNetCore.Routing.EndpointMiddleware[0]
      Executing endpoint 'ControllerSample.Controllers.SampleController.Withdraw (ControllerSample)'
info: Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker[3]
      Route matched with {action = "Withdraw", controller = "Sample"}. Executing controller action with signature System.Threading.Tasks.Task`1[Microsoft.AspNetCore.Mvc.ActionResult`1[ControllerSample.Account]] Withdraw(ControllerSample.Transaction, Dapr.Client.DaprClient) on controller ControllerSample.Controllers.SampleController (ControllerSample).
info: Microsoft.AspNetCore.Mvc.Infrastructure.ObjectResultExecutor[1]
      Executing ObjectResult, writing value of type 'Microsoft.AspNetCore.Mvc.ValidationProblemDetails'.
info: Microsoft.AspNetCore.Mvc.Infrastructure.ControllerActionInvoker[2]
      Executed action ControllerSample.Controllers.SampleController.Withdraw (ControllerSample) in 52.1211ms
info: Microsoft.AspNetCore.Routing.EndpointMiddleware[1]
      Executed endpoint 'ControllerSample.Controllers.SampleController.Withdraw (ControllerSample)'
info: Microsoft.AspNetCore.Hosting.Diagnostics[2]
      Request finished in 157.056ms 400 application/problem+json; charset=utf-8
```

主要感兴趣的日志条目是来自路由的条目：

```txt
info: Microsoft.AspNetCore.Routing.EndpointMiddleware[0]
      Executing endpoint 'ControllerSample.Controllers.SampleController.Withdraw (ControllerSample)'
```

此条目显示：

- 路由已执行
- 路由选择了 `ControllerSample.Controllers.SampleController.Withdraw (ControllerSample)'` 端点

现在你拥有了对此步骤进行故障排查所需的信息。

### 选项 0：路由选择了正确的端点

如果路由日志条目中的信息正确，则表示你的应用程序在隔离状态下运行正常。

示例：

```txt
info: Microsoft.AspNetCore.Routing.EndpointMiddleware[0]
      Executing endpoint 'ControllerSample.Controllers.SampleController.Withdraw (ControllerSample)'
```

你可能希望尝试使用 Dapr CLI 直接发送发布订阅消息并比较日志输出。

示例命令：

```sh
dapr publish --pubsub pubsub --topic withdraw --data '{}'
```

**如果执行此操作后你仍不理解问题，请在此仓库上提交 issue 并包含你的 `Startup.cs` 的内容。**

### 选项 1：路由未执行

如果你在日志中未看到 `Microsoft.AspNetCore.Routing.EndpointMiddleware` 的条目，则表示请求由路由以外的其他组件处理。在这种情况下，问题通常是中间件行为异常。请求的其他日志可能会给你一些线索，让你了解正在发生什么。

**如果你需要帮助理解问题，请在此仓库上提交 issue 并包含你的 `Startup.cs` 的内容。**

### 选项 2：路由选择了错误的端点

如果你在日志中看到 `Microsoft.AspNetCore.Routing.EndpointMiddleware` 的条目，但它包含错误的端点，则表示你存在路由冲突。所选端点将出现在日志中，这应该会让你了解是什么导致了冲突。

**如果你需要帮助理解问题，请在此仓库上提交 issue 并包含你的 `Startup.cs` 的内容。**
