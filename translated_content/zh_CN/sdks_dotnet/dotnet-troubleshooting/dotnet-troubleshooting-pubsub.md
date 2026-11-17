---
type: docs
title: "使用 .NET SDK 对 pub/sub 进行故障排查"
linkTitle: "pub/sub 故障排查"
weight: 100000
description: 使用 .NET SDK 对 pub/sub 进行故障排查
---

pub/sub 最常见的问题是应用程序中的 pub/sub 端点未被调用。

这个问题有几个层次，各自对应不同的解决方案：

- 应用程序未收到来自 Dapr 的任何流量
- 应用程序未向 Dapr 注册 pub/sub 端点
- pub/sub 端点已向 Dapr 注册，但请求未到达预期的端点

## 步骤 1：提高日志级别

**这一点很重要。后续步骤都依赖于你能否看到日志输出。ASP.NET Core 在默认日志设置下几乎不输出任何内容，因此你需要修改这一设置。**

按照[此处](https://docs.microsoft.com/aspnet/core/mvc/controllers/routing?view=aspnetcore-5.0#debug-diagnostics)的说明调整日志详细程度，使其包含 ASP.NET Core 的 `Information` 级别日志。将 `Microsoft` 键设置为 `Information`。

## 步骤 2：验证你能够接收来自 Dapr 的流量

1. 按正常方式启动应用程序（`dapr run ...`）。确保在命令行中包含 `--app-port` 参数。Dapr 需要知道你的应用程序正在监听流量。在本地开发中，ASP.NET Core 应用程序默认会在端口 5000 上监听 HTTP。

2. 等待 Dapr 启动完成

3. 检查日志

你应该会看到类似下面的日志条目：

```
info: Microsoft.AspNetCore.Hosting.Diagnostics[1]
      Request starting HTTP/1.1 GET http://localhost:5000/.....
```

在初始化期间，Dapr 会向你的应用程序发出一些配置请求。如果找不到这些请求，说明出现了问题。请通过 issue 或 Discord 寻求帮助（并附上日志）。如果你看到了发往应用程序的请求，则继续执行步骤 3。

## 步骤 3：验证端点注册

1. 按正常方式启动应用程序（`dapr run ...`）。

2. 在命令行中使用 `curl`（或其他 HTTP 测试工具）访问 `/dapr/subscribe` 端点。

以下示例命令假设你的应用程序监听端口为 5000：

```sh
curl http://localhost:5000/dapr/subscribe -v
```

对于配置正确的应用程序，输出应类似于下面的内容：

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

请特别注意 HTTP 状态码和 JSON 输出。

```txt
< HTTP/1.1 200 OK
```

200 状态码表示成功。

末尾包含的 JSON 数据是 `/dapr/subscribe` 经 Dapr runtime 处理后的输出。本例使用的是本仓库中的 `ControllerSample`，因此这是正确输出的示例。

```json
[
    {"topic":"deposit","route":"deposit","pubsubName":"pubsub"},
    {"topic":"withdraw","route":"withdraw","pubsubName":"pubsub"}
]
```

---

拿到这条命令的输出后，你就可以开始诊断问题，或进入下一步了。

### 选项 0：响应为 200 且包含一些 pub/sub 条目

**如果此测试的 JSON 输出中包含条目，则问题出在其他地方，请进入步骤 4。**

### 选项 1：响应不是 200，或不包含 JSON

如果响应不是 200 或不包含 JSON，则说明没有到达 `MapSubscribeHandler()` 端点。

请确认你的 `Startup.cs` 中包含类似下面的代码，然后重新测试。

```cs
app.UseRouting();

app.UseCloudEvents();

app.UseEndpoints(endpoints =>
{
    endpoints.MapSubscribeHandler(); // 这是 Dapr 订阅处理程序
    endpoints.MapControllers();
});
```

**如果添加订阅处理程序后问题仍未解决，请在此仓库中提交 issue，并附上你的 `Startup.cs` 文件内容。**

### 选项 2：响应包含 JSON 但内容为空（如 `[]`）

如果 JSON 输出是空数组（如 `[]`），则说明订阅处理程序已注册，但没有注册任何主题端点。

---

如果你使用控制器实现 pub/sub，应当有类似下面的方法：

```C#
[Topic("pubsub", "deposit")]
[HttpPost("deposit")]
public async Task<ActionResult> Deposit(...)

// 使用 pub/sub 路由
[Topic("pubsub", "transactions", "event.type == \"withdraw.v2\"", 1)]
[HttpPost("withdraw")]
public async Task<ActionResult> Withdraw(...)
```

在此示例中，`Topic` 和 `HttpPost` 特性是必需的，其他细节可能有所不同。

---

如果你使用路由实现 pub/sub，应当有类似下面的端点：

```C#
endpoints.MapPost("deposit", ...).WithTopic("pubsub", "deposit");
```

在此示例中，`WithTopic(...)` 的调用是必需的，其他细节可能有所不同。

---

**修正此代码并重新测试后，如果 JSON 输出仍为空数组（如 `[]`），请在此仓库中提交 issue，并附上 `Startup.cs` 的内容以及你的 pub/sub 端点。**

## 步骤 4：验证端点可达性

在此步骤中，我们将验证已向 pub/sub 注册的条目是否可以访问。上一步应该会得到类似下面的 JSON 输出：

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

保留此输出，我们将使用其中的 `route` 信息来测试应用程序。

1. 按正常方式启动应用程序（`dapr run ...`）。

2. 在命令行中使用 `curl`（或其他 HTTP 测试工具）访问已注册到 pub/sub 端点的某个路由。

以下示例命令假设你的应用程序监听端口为 5000，且其中一个 pub/sub 路由为 `withdraw`：

```sh
curl http://localhost:5000/withdraw -H 'Content-Type: application/json' -d '{}' -v
```

下面是对示例运行上述命令的输出：

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

根据 HTTP 400 和 JSON 负载可知，该响应表明端点已被访问，但请求因验证错误而被拒绝。

你还应查看正在运行的应用程序的控制台输出。下面是示例输出，为清晰起见，已去除 Dapr 日志头。

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

最值得关注的是来自路由的日志条目：

```txt
info: Microsoft.AspNetCore.Routing.EndpointMiddleware[0]
      Executing endpoint 'ControllerSample.Controllers.SampleController.Withdraw (ControllerSample)'
```

此条目表明：

- 路由已执行
- 路由选择了 `ControllerSample.Controllers.SampleController.Withdraw (ControllerSample)'` 端点

现在你已经掌握了排查此步骤所需的信息。

### 选项 0：路由选择了正确的端点

如果路由日志条目中的信息正确，则说明你的应用程序在单独运行时行为正常。

示例：

```txt
info: Microsoft.AspNetCore.Routing.EndpointMiddleware[0]
      Executing endpoint 'ControllerSample.Controllers.SampleController.Withdraw (ControllerSample)'
```

你可以尝试使用 Dapr CLI 直接发送一条 pub/sub 消息，并比较日志输出。

示例命令：

```sh
dapr publish --pubsub pubsub --topic withdraw --data '{}'
```

**如果执行此操作后你仍然无法理解问题，请在此仓库中提交 issue，并附上你的 `Startup.cs` 内容。**

### 选项 1：路由未执行

如果在日志中看不到 `Microsoft.AspNetCore.Routing.EndpointMiddleware` 的条目，则说明该请求是由路由之外的其他组件处理的。这种情况通常是 middleware 行为异常导致的。该请求的其他日志可能会提供线索，帮助你了解具体发生了什么。

**如果你需要帮助理解问题，请在此仓库中提交 issue，并附上你的 `Startup.cs` 内容。**

### 选项 2：路由选择了错误的端点

如果日志中出现了 `Microsoft.AspNetCore.Routing.EndpointMiddleware` 的条目，但其中的端点不正确，则说明存在路由冲突。被选中的端点会出现在日志中，这应能帮助你判断是什么导致了冲突。

**如果你需要帮助理解问题，请在此仓库中提交 issue，并附上你的 `Startup.cs` 内容。**
