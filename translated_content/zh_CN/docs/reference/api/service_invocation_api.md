---
type: docs
title: "服务调用 API 参考"
linkTitle: "服务调用 API"
description: "服务调用 API 的详细文档"
weight: 1400
---

Dapr 为用户提供了使用唯一命名标识符（appId）调用其他正在使用 Dapr 的应用程序，或不使用 Dapr 的 HTTP 端点的能力。
这使得应用程序可以通过命名标识符相互交互，并将服务发现的负担交给 Dapr 运行时。

## 调用远程 Dapr 应用程序的方法

此端点允许您调用另一个启用了 Dapr 的应用程序中的方法。

### HTTP 请求

```
PATCH/POST/GET/PUT/DELETE http://localhost:<daprPort>/v1.0/invoke/<appID>/method/<method-name>
```

## 调用非 Dapr 端点的方法

此端点允许您使用 `HTTPEndpoint` 资源名称或完全限定域名（FQDN）URL 调用非 Dapr 端点上的方法。

### HTTP 请求

```
PATCH/POST/GET/PUT/DELETE http://localhost:<daprPort>/v1.0/invoke/<HTTPEndpoint name>/method/<method-name>

PATCH/POST/GET/PUT/DELETE http://localhost:<daprPort>/v1.0/invoke/<FQDN URL>/method/<method-name>
```

### HTTP 响应代码

当服务使用 Dapr 调用另一个服务时，被调用服务的状态代码将返回给调用者。
如果存在网络错误或其他瞬态错误，Dapr 将返回带有详细错误消息的 `500` 错误。

如果用户通过 HTTP 调用 Dapr 以与启用了 gRPC 的服务通信，来自被调用的 gRPC 服务的错误将返回为 `500`，成功响应将返回为 `200OK`。

代码 | 描述
---- | -----------
XXX  | 返回的上游状态
400  | 未提供方法名称
403  | 访问控制禁止调用
500  | 请求失败

### URL 参数

参数 | 描述
--------- | -----------
daprPort | Dapr 端口
appID | 与远程应用关联的 App ID
HTTPEndpoint name | 与外部端点关联的 HTTPEndpoint 资源
FQDN URL | 要在外部端点上调用的完全限定域名 URL
method-name | 要在远程应用上调用的方法或 url 的名称

> 注意，所有 URL 参数都区分大小写。

### 请求内容

在请求中，您可以传递标头：

```json
{
  "Content-Type": "application/json"
}
```

在请求正文中，放置您要发送到服务的数据：

```json
{
  "arg1": 10,
  "arg2": 23,
  "operator": "+"
}
```

### 被调用服务接收的请求

一旦您的服务代码调用另一个启用了 Dapr 的应用程序或非 Dapr 端点中的方法，Dapr 将连同标头和正文一起在 `<method-name>` 端点上发送请求。

被调用的 Dapr 应用程序或非 Dapr 端点需要在该端点上监听并响应请求。

### 跨命名空间调用

在支持命名空间的托管平台上，Dapr 应用 ID 符合包含目标命名空间的有效 FQDN 格式。
例如，以下字符串包含应用 ID（`myApp`）以及应用运行的命名空间（`production`）。

```
myApp.production
```

#### 支持命名空间的平台

- Kubernetes

### 示例

您可以通过发送以下内容来调用 `mathService` 服务上的 `add` 方法：

```shell
curl http://localhost:3500/v1.0/invoke/mathService/method/add \
  -H "Content-Type: application/json"
  -d '{ "arg1": 10, "arg2": 23}'
```

`mathService` 服务需要监听 `/add` 端点才能接收和处理请求。

对于 Node 应用，它看起来像这样：

```js
app.post('/add', (req, res) => {
  let args = req.body;
  const [operandOne, operandTwo] = [Number(args['arg1']), Number(args['arg2'])];

  let result = operandOne + operandTwo;
  res.send(result.toString());
});

app.listen(port, () => console.log(`Listening on port ${port}!`));
```

> 远程端点的响应将在响应正文中返回。

如果您的服务监听在更嵌套的路径（例如 `/api/v1/add`），Dapr 会实现完整的反向代理，因此您可以将所有必要的路径片段附加到您的请求 URL，如下所示：

`http://localhost:3500/v1.0/invoke/mathService/method/api/v1/add`

如果您在不同命名空间上调用 `mathService`，可以使用以下 URL：

`http://localhost:3500/v1.0/invoke/mathService.testing/method/api/v1/add`

在此 URL 中，`testing` 是 `mathService` 运行所在的命名空间。

### 服务调用请求中的标头

当 Dapr 调用服务时，它会自动向请求添加以下标头：

| 标头 | 描述 | 示例 |
|--------|-------------|---------|
| `dapr-caller-app-id` | 调用应用程序的 ID | `myapp` |
| `dapr-caller-namespace` | 调用应用程序的命名空间 | `production` |
| `dapr-callee-app-id` | 被调用应用程序的 ID | `mathService` |

这些标头在 HTTP 和 gRPC 服务调用请求中都可用。

#### 非 Dapr 端点示例

如果 `mathService` 服务是非 Dapr 应用程序，则可以通过 `HTTPEndpoint` 以及完全限定域名（FQDN）URL 使用服务调用对其进行调用。

```shell
curl http://localhost:3500/v1.0/invoke/mathHTTPEndpoint/method/add \
  -H "Content-Type: application/json"
  -d '{ "arg1": 10, "arg2": 23}'

curl http://localhost:3500/v1.0/invoke/http://mathServiceURL.com/method/add \
  -H "Content-Type: application/json"
  -d '{ "arg1": 10, "arg2": 23}'
```

## 后续步骤
- [操作指南：调用和发现服务]({{% ref howto-invoke-discover-services.md %}})
