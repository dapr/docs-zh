---
type: docs
title: "Bindings 概述"
linkTitle: "概述"
weight: 100
description: 绑定 API 构建块的概述
---

使用 Dapr 的绑定 API，您可以通过来自外部系统的事件触发您的应用程序，并与外部系统进行交互。通过绑定 API，您可以：

- 避免连接和轮询消息系统（如队列和消息总线）的复杂性。
- 专注于业务逻辑，而不是与系统交互的实现细节。
- 使您的代码不包含 SDK 或库。
- 处理重试和故障恢复。
- 在运行时切换绑定。
- 构建可移植的应用程序，使用特定环境的绑定设置，无需更改代码。

例如，通过绑定，您的应用程序可以响应传入的 Twilio/SMS 消息，而无需：

- 添加或配置第三方 Twilio SDK
- 担心从 Twilio 轮询（或使用 WebSockets 等）

<img src="/images/binding-overview.png" width=1000 alt="显示绑定的图表" style="padding-bottom:25px;">

在上图中：
- 输入绑定触发应用程序上的方法。
- 在组件上执行输出绑定操作，例如 `"create"`。

绑定是独立于 Dapr 运行时开发的。您可以[查看并贡献绑定](https://github.com/dapr/components-contrib/tree/master/bindings)。

{{% alert title="注意" color="primary" %}}
如果您使用 HTTP 绑定，则最好使用[服务调用]({{% ref service_invocation_api %}})代替。阅读[如何使用 HTTP 调用非 Dapr 端点]({{% ref "howto-invoke-non-dapr-endpoints" %}})以获取更多信息。
{{% /alert %}}

## 输入绑定

使用输入绑定，您可以在外部资源发生事件时触发您的应用程序。可选的有效负载和元数据可能会随请求一起发送。

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=wlmAi7BJBWS8KNK7&t=8261)演示了 Dapr 输入绑定的工作原理。

{{< youtube id=0y7ne6teHT4 start=8261 >}}

要接收来自输入绑定的事件：

1. 定义描述绑定类型及其元数据（连接信息等）的组件 YAML。
1. 使用以下方式监听传入事件：
   - HTTP 端点
   - gRPC proto 库以获取传入事件。

{{% alert title="注意" color="primary" %}}
 在启动时，Dapr 会向应用程序发送所有已定义输入绑定的 [OPTIONS 请求]({{% ref "bindings_api#invoking-service-code-through-input-bindings" %}})。如果应用程序想要订阅绑定，Dapr 期望状态代码为 2xx 或 405。

{{% /alert %}}

阅读[使用输入绑定创建事件驱动应用程序指南]({{% ref howto-triggers %}})以开始使用输入绑定。

## 输出绑定

使用输出绑定，您可以调用外部资源。可选的有效负载和元数据可以随调用请求一起发送。

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=PoA4NEqL5mqNj6Il&t=7668)演示了 Dapr 输出绑定的工作原理。

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/0y7ne6teHT4?si=PoA4NEqL5mqNj6Il&amp;start=7668" title="YouTube 视频播放器" style="padding-bottom:25px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

要调用输出绑定：

1. 定义描述绑定类型及其元数据（连接信息等）的组件 YAML。
1. 使用 HTTP 端点或 gRPC 方法调用绑定，可选择携带有效负载。
1. 指定输出操作。输出操作取决于您使用的绑定组件，可以包括：
   - `"create"`
   - `"update"`
   - `"delete"`
   - `"exec"`

阅读[使用输出绑定与外部资源交互指南]({{% ref howto-bindings %}})以开始使用输出绑定。

## 绑定方向（可选）

您可以提供 `direction` 元数据字段来指示绑定组件支持的方向。这样做可以避免 Dapr 边车处于`"等待应用程序就绪"`状态，从而减少 Dapr 边车与应用程序之间的生命周期依赖关系：

- `"input"`
- `"output"`
- `"input, output"`

{{% alert title="注意" color="primary" %}}
强烈建议所有输入绑定都应包含 `direction` 属性。
{{% /alert %}}

[查看绑定 `direction` 元数据的完整示例。]({{% ref "bindings_api#binding-direction-optional" %}})

## 尝试绑定

### 快速入门和教程

想要测试 Dapr 绑定 API？通过以下快速入门和教程来了解绑定的实际操作：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [绑定快速入门]({{% ref bindings-quickstart %}}) | 使用输入绑定响应事件，使用输出绑定调用操作，与外部系统协作。 |
| [绑定教程](https://github.com/dapr/quickstarts/tree/master/tutorials/bindings) | 演示如何使用 Dapr 为其他组件创建输入和输出绑定。使用 Kafka 绑定。 |

### 直接在您的应用程序中开始使用绑定

想要跳过快速入门？没问题。您可以直接在应用程序中尝试绑定构建块，以调用输出绑定和触发输入绑定。在[安装 Dapr]({{% ref "getting-started/_index.md" %}})后，您可以从[输入绑定操作指南]({{% ref howto-triggers %}})开始使用绑定 API。

## 后续步骤

- 阅读以下指南：
  - [操作指南：使用输入绑定从不同资源触发服务]({{% ref howto-triggers %}})
  - [操作指南：使用输出绑定与外部资源交互]({{% ref howto-bindings %}})
- 尝试[绑定教程](https://github.com/dapr/quickstarts/tree/master/tutorials/bindings/README.md)，以实验绑定到 Kafka 队列。
- 阅读[绑定 API 规范]({{% ref bindings_api %}})
