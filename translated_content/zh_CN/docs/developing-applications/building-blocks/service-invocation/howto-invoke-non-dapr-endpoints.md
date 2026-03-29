---
type: docs
title: "操作指南：使用 HTTP 调用非 Dapr 端点"
linkTitle: "操作指南：调用非 Dapr 端点"
description: "从 Dapr 应用程序使用服务调用调用非 Dapr 端点"
weight: 40
---

本文演示如何使用 HTTP 通过 Dapr 调用非 Dapr 端点。

使用 Dapr 的服务调用 API，您可以与使用或不使用 Dapr 的端点进行通信。使用 Dapr 调用不使用 Dapr 的端点不仅能提供一致的 API，还能带来以下 [Dapr 服务调用]({{% ref service-invocation-overview %}}) 优势：

- 能够应用弹性策略
- 通过追踪与指标实现可观测性调用
- 通过作用域实现安全访问控制
- 能够利用中间件管道组件
- 服务发现
- 通过使用标头进行身份验证

## 调用外部服务或非 Dapr 端点的 HTTP 服务调用
有时您需要调用非 Dapr HTTP 端点。例如：
- 您可能选择仅在整个应用程序的部分使用 Dapr，包括遗留开发
- 您可能无法访问代码来将现有应用程序迁移到使用 Dapr
- 您需要调用外部 HTTP 服务。

通过定义 `HTTPEndpoint` 资源，您可以声明式地定义与非 Dapr 端点交互的方式。然后使用服务调用 URL 来调用非 Dapr 端点。或者，您也可以直接将非 Dapr 的完全限定域名（FQDN）端点 URL 放入服务调用 URL 中。

### HTTPEndpoint、FQDN URL 与 appId 之间的优先级顺序
使用服务调用时，Dapr 运行时遵循以下优先级顺序：

1. 这是命名的 `HTTPEndpoint` 资源吗？
2. 这是带有 `http://` 或 `https://` 前缀的 FQDN URL 吗？
3. 这是 `appID` 吗？

## 服务调用与非 Dapr HTTP 端点
下图概述了 Dapr 的服务调用在调用非 Dapr 端点时的工作原理。

<img src="/images/service-invocation-overview-non-dapr-endpoint.png" width=800 alt="展示调用非 Dapr 端点的服务调用步骤的示意图">

1. 服务 A 向服务 B（一个非 Dapr 端点）发起 HTTP 调用。该调用发送到本地 Dapr 边车。
2. Dapr 使用 `HTTPEndpoint` 或 FQDN URL 发现服务 B 的位置，然后将消息转发给服务 B。
3. 服务 B 向服务 A 的 Dapr 边车发送响应。
4. 服务 A 接收响应。

## 为非 Dapr 端点使用 HTTPEndpoint 资源或 FQDN URL
在与 Dapr 应用程序或非 Dapr 应用程序通信时，有两种方法可以调用非 Dapr 端点。Dapr 应用程序可以通过提供以下内容之一来调用非 Dapr 端点：

- 命名的 `HTTPEndpoint` 资源，包括定义 `HTTPEndpoint` 资源类型。有关示例，请参阅 [HTTPEndpoint 参考]({{% ref httpendpoints-schema %}}) 指南。

    ```sh
    localhost:3500/v1.0/invoke/<HTTPEndpoint-name>/method/<my-method>
    ```

    例如，对于名为 "palpatine" 的 `HTTPEndpoint` 资源和名为 "Order66" 的方法，调用方式如下：
    ```sh
    curl http://localhost:3500/v1.0/invoke/palpatine/method/order66
    ```

- 指向非 Dapr 端点的 FQDN URL。

    ```sh
    localhost:3500/v1.0/invoke/<URL>/method/<my-method>
    ```

    例如，对于名为 `https://darthsidious.starwars` 的 FQDN 资源，调用方式如下：
    ```sh
    curl http://localhost:3500/v1.0/invoke/https://darthsidious.starwars/method/order66
    ```

### 调用启用 Dapr 的应用程序时使用 appId
调用使用 `appID` 的 Dapr 应用程序时，始终使用 AppID。有关更多信息，请阅读 [操作指南：使用 HTTP 调用服务]({{% ref howto-invoke-discover-services %}}) 指南。例如：

```sh
localhost:3500/v1.0/invoke/<appID>/method/<my-method>
```
```sh
curl http://localhost:3602/v1.0/invoke/orderprocessor/method/checkout
```

## TLS 身份验证

使用 [HTTPEndpoint 资源]({{% ref httpendpoints-schema %}}) 允许您根据远程端点的身份验证要求，使用根证书、客户端证书和私钥的任意组合。

### 使用根证书的示例

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: "external-http-endpoint-tls"
spec:
  baseUrl: https://service-invocation-external:443
  headers:
  - name: "Accept-Language"
    value: "en-US"
  clientTLS:
    rootCA:
      secretKeyRef:
        name: dapr-tls-client
        key: ca.crt
```

### 使用客户端证书和私钥的示例

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: "external-http-endpoint-tls"
spec:
  baseUrl: https://service-invocation-external:443
  headers:
  - name: "Accept-Language"
    value: "en-US"
  clientTLS:
    certificate:
      secretKeyRef:
        name: dapr-tls-client
        key: tls.crt
    privateKey:
      secretKeyRef:
        name: dapr-tls-key
        key: tls.key
```

### 服务器发送事件

SSE 支持与流服务器和 MCP 服务器进行实时通信。
HTTP 端点支持 [服务器发送事件（SSE）](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)。
要使用 SSE，请在 `HTTPEndpoint` 资源或服务调用请求中将 `Accept` 标头设置为 `text/event-stream`。

```yaml
apiVersion: dapr.io/v1alpha1
kind: HTTPEndpoint
metadata:
  name: "mcp-server"
spec:
  baseUrl: https://my-mcp-server:443
  headers:
  - name: "Accept"
    value: "test/event-stream"
```

## 相关链接

- [HTTPEndpoint 参考]({{% ref httpendpoints-schema %}})
- [服务调用概述]({{% ref service-invocation-overview %}})
- [服务调用 API 规范]({{% ref service_invocation_api %}})

## 社区电话演示
观看此 [视频](https://youtu.be/BEXJgLsO4hA?t=364)，了解如何使用服务调用调用非 Dapr 端点。

{{< youtube id=BEXJgLsO4hA start=364 >}}
