---
type: docs
title: "Bindings 概述"
linkTitle: "概述"
weight: 100
description: Bindings API building block 概述
---

使用 Dapr 的 bindings API，你可以通过来自外部系统的事件触发你的应用程序，并与外部系统进行交互。通过 bindings API，你可以：

- 避免连接和轮询消息系统（如队列和 message buses）的复杂性。
- 专注于业务逻辑，而不是与系统交互的实现细节。
- 让你的代码不依赖 SDK 或库。
- 处理重试和故障恢复。
- 在运行时切换 bindings。
- 构建可移植的应用程序，为特定环境配置 bindings，且无需修改代码。

例如，通过 bindings，你的应用程序可以响应传入的 Twilio/SMS 消息，而无需：

- 添加或配置第三方 Twilio SDK
- 担心从 Twilio 轮询（或使用 WebSockets 等）

{{< diagram name="bindings-overview" width="65" >}}

在上图中：
- input binding 触发应用程序上的一个方法。
- 在 component 上执行 output binding 操作，例如 `"create"`。

Bindings 独立于 Dapr runtime 开发。你可以[查看并贡献 bindings](https://github.com/dapr/components-contrib/tree/master/bindings)。

{{% alert title="注意" color="primary" %}}
如果你使用 HTTP binding，则最好改用[service invocation]({{% ref service_invocation_api %}})。阅读[操作指南：使用 HTTP 调用 non-Dapr endpoints]({{% ref "howto-invoke-non-dapr-endpoints" %}})以获取更多信息。
{{% /alert %}}

## Input bindings

使用 input binding，你可以在外部资源发生事件时触发你的应用程序。可选的负载和 metadata 可以随请求一起发送。

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=wlmAi7BJBWS8KNK7&t=8261)演示了 Dapr input binding 的工作原理。

{{< youtube id=0y7ne6teHT4 start=8261 >}}

要接收来自 input binding 的事件：

1. 定义描述 binding 类型及其 metadata（连接信息等）的 component YAML。
1. 使用以下方式监听传入事件：
   - HTTP 端点
   - gRPC proto 库，用于获取传入事件。

{{% alert title="注意" color="primary" %}}
在启动时，Dapr 会通过探测应用程序（HTTP `OPTIONS` 请求或 gRPC `ListInputBindings` 调用）执行 [input binding 订阅发现]({{% ref "bindings_api#invoking-service-code-through-input-bindings" %}})。对于 HTTP 应用，如果应用程序希望订阅该 binding，Dapr 期望状态码为 2xx 或 405。对于 gRPC 应用，应用程序通过在其 `ListInputBindings` 响应中包含 binding 名称来订阅。

此发现探测默认在 `3s` 后超时。如果你的应用程序在启动时响应较慢（例如 JVM/JIT 工作负载），请使用 `--app-binding-options-timeout` daprd 标志或 `dapr.io/app-binding-options-timeout` 注解来增加超时时间。参阅[参数与注解概述]({{% ref arguments-annotations-overview %}})。
{{% /alert %}}

阅读[使用 input bindings 创建事件驱动应用程序指南]({{% ref howto-triggers %}})，开始使用 input bindings。

## Output bindings

使用 output binding，你可以调用外部资源。可选的负载和 metadata 可以随调用请求一起发送。

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=PoA4NEqL5mqNj6Il&t=7668)演示了 Dapr output binding 的工作原理。

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/0y7ne6teHT4?si=PoA4NEqL5mqNj6Il&amp;start=7668" title="YouTube 视频播放器" style="padding-bottom:25px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

要调用 output binding：

1. 定义描述 binding 类型及其 metadata（连接信息等）的 component YAML。
1. 使用 HTTP 端点或 gRPC 方法调用 binding，并可选择携带负载。
1. 指定输出操作。输出操作取决于你使用的 binding component，可以包括：
   - `"create"`
   - `"update"`
   - `"delete"`
   - `"exec"`

阅读[使用 output bindings 与外部资源交互指南]({{% ref howto-bindings %}})，开始使用 output bindings。

## Binding directions（可选）

你可以提供 `direction` metadata 字段，以指示 binding component 支持的方向。这样做可以避免 Dapr sidecar 处于 `"wait for the app to become ready"` 状态，从而减少 Dapr sidecar 与应用程序之间的生命周期依赖：

- `"input"`
- `"output"`
- `"input, output"`

{{% alert title="注意" color="primary" %}}
强烈建议所有 input bindings 都包含 `direction` 属性。
{{% /alert %}}

[查看 binding `direction` metadata 的完整示例。]({{% ref "bindings_api#binding-direction-optional" %}})

## 尝试 bindings

### Quickstarts 和教程

想要测试 Dapr bindings API？通过以下 Quickstarts 和教程，了解 bindings 的实际运行方式：

| Quickstart/教程 | 描述 |
| ------------------- | ----------- |
| [Bindings quickstart]({{% ref bindings-quickstart %}}) | 使用 input binding 响应事件，使用 output binding 调用操作，与外部系统协作。 |
| [Bindings tutorial](https://github.com/dapr/quickstarts/tree/master/tutorials/bindings) | 演示如何使用 Dapr 为其他 component 创建 input binding 和 output binding。使用 bindings 连接 Kafka。 |

### 直接在你的应用程序中开始使用 bindings

想跳过 Quickstarts？没问题。你可以直接在应用程序中尝试 bindings 构建块，以调用 output binding 和触发 input binding。在[安装 Dapr]({{% ref "getting-started/_index.md" %}})之后，你可以从[input bindings 操作指南]({{% ref howto-triggers %}})开始使用 bindings API。

## 后续步骤

- 阅读以下指南：
  - [操作指南：使用 input binding 从不同资源触发服务]({{% ref howto-triggers %}})
  - [操作指南：使用 output binding 与外部资源交互]({{% ref howto-bindings %}})
- 尝试 [Bindings tutorial](https://github.com/dapr/quickstarts/tree/master/tutorials/bindings/README.md)，体验 binding 连接 Kafka 队列。
- 阅读 [bindings API 规范]({{% ref bindings_api %}})
