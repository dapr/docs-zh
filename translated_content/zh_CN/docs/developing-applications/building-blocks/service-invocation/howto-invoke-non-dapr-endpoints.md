---
type: docs
title: "操作指南：使用 HTTP 调用 non-Dapr endpoint"
linkTitle: "操作指南：调用 non-Dapr endpoint"
description: "从 Dapr 应用程序使用 service invocation 调用 non-Dapr endpoint"
weight: 40
---

本文演示如何使用 HTTP 通过 Dapr 调用 non-Dapr endpoint。

借助 Dapr 的 service invocation API，你可以与使用或不使用 Dapr 的端点进行通信。使用 Dapr 调用不使用 Dapr 的端点，不仅能获得一致的 API，还能获得以下 [Dapr service invocation]({{% ref service-invocation-overview %}}) 的优势：

- 能够应用 resiliency 策略
- 通过追踪与指标实现调用的可观测性
- 通过作用域实现安全访问控制
- 能够利用 middleware 流水线中的 component
- 服务发现
- 通过使用标头进行身份验证

## 调用外部服务或 non-Dapr endpoint 的 HTTP service invocation
有时你需要调用一个 non-Dapr HTTP endpoint。例如：
- 你可能选择只在整个应用程序的一部分中使用 Dapr，包括遗留系统开发
- 你可能无法访问代码，因而无法将现有应用迁移为使用 Dapr
- 你需要调用外部 HTTP 服务。

通过定义 `HTTPEndpoint` 资源，你可以声明式地定义与 non-Dapr endpoint 交互的方式。然后，使用 service invocation URL 来调用 non-Dapr endpoint。另外，你也可以直接将 non-Dapr endpoint 的完全限定域名（FQDN）URL 放入 service invocation URL 中。

### HTTPEndpoint、FQDN URL 与 appId 之间的优先级顺序
使用 service invocation 时，Dapr runtime 遵循以下优先级顺序：

1. 这是一个命名的 `HTTPEndpoint` 资源吗？
2. 这是一个带有 `http://` 或 `https://` 前缀的 FQDN URL 吗？
3. 这是一个 `appID` 吗？

## service invocation 与 non-Dapr HTTP endpoint
下图概述了 Dapr 的 service invocation 在调用 non-Dapr endpoint 时的工作方式。

{{< diagram name="service-invocation-non-dapr-endpoint" width="55" >}}

1. 服务 A 向服务 B（一个 non-Dapr endpoint）发起 HTTP 调用。该调用发送到本地 Dapr sidecar。
2. Dapr 通过 `HTTPEndpoint` 或 FQDN URL 发现服务 B 的位置，然后将消息转发给服务 B。
3. 服务 B 向服务 A 的 Dapr sidecar 发送响应。
4. 服务 A 接收响应。

## 为 non-Dapr endpoint 使用 HTTPEndpoint 资源或 FQDN URL
在与 Dapr 应用程序或非 Dapr 应用程序通信时，有两种方式可以调用 non-Dapr endpoint。Dapr 应用程序可以通过提供以下任一内容来调用 non-Dapr endpoint：

- 命名的 `HTTPEndpoint` 资源，包括定义 `HTTPEndpoint` 资源类型。示例请参阅 [HTTPEndpoint 参考]({{% ref httpendpoints-schema %}}) 指南。

    ```sh
    localhost:3500/v1.0/invoke/<HTTPEndpoint-name>/method/<my-method>
    ```

    例如，对于名为 "palpatine" 的 `HTTPEndpoint` 资源和名为 "Order66" 的方法，调用方式如下：
    ```sh
    curl http://localhost:3500/v1.0/invoke/palpatine/method/order66
    ```

- 指向 non-Dapr endpoint 的 FQDN URL。

    ```sh
    localhost:3500/v1.0/invoke/<URL>/method/<my-method>
    ```

    例如，对于名为 `https://darthsidious.starwars` 的 FQDN 资源，调用方式如下：
    ```sh
    curl http://localhost:3500/v1.0/invoke/https://darthsidious.starwars/method/order66
    ```

{{% alert title="注意" color="primary" %}}
`HTTPEndpoint` 资源默认会被“热重载”：更新会触发 Dapr sidecar 自动优雅重启，无需手动重启。若要退出该行为，请在 [Dapr 应用程序配置]({{% ref "configuration-overview.md" %}}) 中禁用 `HotReload` 功能：

```yaml
spec:
  features:
    - name: HotReload
      enabled: false
```

更多信息请参阅[更新资源]({{% ref "component-updates.md" %}})。
{{% /alert %}}

### 调用启用 Dapr 的应用程序时使用 appId
调用启用了 Dapr 的应用程序时，始终使用 `appID` 与 `my-method` 进行调用。更多信息请阅读[操作指南：使用 HTTP 调用服务]({{% ref howto-invoke-discover-services %}})。例如：

```sh
localhost:3500/v1.0/invoke/<appID>/method/<my-method>
```
```sh
curl http://localhost:3602/v1.0/invoke/orderprocessor/method/checkout
```

## TLS 身份验证

使用 [HTTPEndpoint 资源]({{% ref httpendpoints-schema %}})，你可以根据远程端点的身份验证要求，任意组合使用根证书、客户端证书和私钥。

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

SSE 支持与流式服务器和 MCP 服务器进行实时通信。
HTTP 端点支持[服务器发送事件（SSE）](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events)。
要使用 SSE，请在 `HTTPEndpoint` 资源或 service invocation 请求中将 `Accept` 标头设置为 `text/event-stream`。

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
- [service invocation 概述]({{% ref service-invocation-overview %}})
- [service invocation API 规范]({{% ref service_invocation_api %}})

## 社区会议演示
观看此[视频](https://youtu.be/BEXJgLsO4hA?t=364)，了解如何使用 service invocation 来调用 non-Dapr endpoint。

{{< youtube id=BEXJgLsO4hA start=364 >}}
