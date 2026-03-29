---
type: docs
title: "发布订阅概述"
linkTitle: "概述"
weight: 1000
description: "发布订阅 API 构建块概述"
---

发布订阅（pub/sub）使微服务能够使用消息进行通信，实现事件驱动架构。

- 生产者（**发布者**）将消息写入输入通道并发送到主题，但不知道哪个应用程序会接收它们。
- 消费者（**订阅者**）订阅主题并从输出通道接收消息，但不知道这些消息是由哪个服务产生的。

中间消息代理将每条消息从发布者的输入通道复制到所有对该消息感兴趣的订阅者的输出通道。当你需要将微服务相互解耦时，这种模式特别有用。

<img src="/images/pubsub-overview-pattern.png" width=1000 style="padding-bottom:25px;">

<br></br>

## 发布订阅 API

Dapr 中的发布订阅 API：
- 提供与平台无关的 API 来发送和接收消息。
- 提供至少一次消息传递保证。
- 集成各种消息代理和排队系统。

服务使用的特定消息代理是可插拔的，在运行时配置为 Dapr 发布订阅组件。这消除了服务对消息代理的依赖，使服务更具可移植性和灵活性。

使用 Dapr 中的发布订阅时：

1. 你的服务向 Dapr 发布订阅构建块 API 发起网络调用。
2. 发布订阅构建块调用封装了特定消息代理的 Dapr 发布订阅组件。
3. 为了接收主题上的消息，Dapr 代表你的服务订阅发布订阅组件上的主题，并在消息到达时将消息传递到你的服务端点。

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=FMg2Y7bRuljKism-&t=5384) 演示了 Dapr 发布订阅的工作原理。

{{< youtube id=0y7ne6teHT4 start=5384 >}}

在下图中，"shipping"服务和 "email" 服务都订阅了 "cart" 服务发布的主题。每个服务加载指向同一发布订阅消息代理组件的发布订阅组件配置文件；例如：Redis Streams、NATS Streaming、Azure Service Bus 或 GCP pub/sub。

<img src="/images/pubsub-overview-components.png" width=1000 style="padding-bottom:25px;">

在下图中，Dapr API 将来自发布 "cart" 服务的 "order" 主题发布到订阅服务 "shipping" 和 "email" 的 "order" 端点。

<img src="/images/pubsub-overview-publish-API.png" width=1000 style="padding-bottom:25px;">

[查看 Dapr 支持的完整发布订阅组件列表]({{% ref supported-pubsub %}})。

## 功能

发布订阅 API 构建块为你的应用程序带来多项功能。

### 使用 CloudEvents 发送消息

为了实现消息路由并在服务之间提供每个消息的额外上下文，Dapr 使用 [CloudEvents 1.0 规范](https://github.com/cloudevents/spec/tree/v1.0) 作为其消息格式。任何使用 Dapr 发送到主题的应用程序消息都会自动包装在 Cloud Events 信封中，使用 [`Content-Type` 头值]({{% ref "pubsub-overview#content-types" %}}) 作为 `datacontenttype` 属性。

更多信息，请阅读 [使用 CloudEvents 进行消息传递]({{% ref pubsub-cloudevents %}}) 或 [发送不带 CloudEvents 的原始消息]({{% ref pubsub-raw %}})。

### 与未使用 Dapr 和 CloudEvents 的应用程序通信

如果你的一个应用程序使用 Dapr 而另一个不使用，你可以为发布者或订阅者禁用 CloudEvent 包装。这允许在无法同时采用 Dapr 的应用程序中部分采用 Dapr 发布订阅。

更多信息，请阅读 [如何在不使用 CloudEvents 的情况下使用发布订阅]({{% ref pubsub-raw %}})。

### 设置消息内容类型

发布消息时，指定正在发送的数据的内容类型非常重要。除非指定，否则 Dapr 将假定为 `text/plain`。

- HTTP 客户端：可以在 `Content-Type` 头中设置内容类型
- gRPC 客户端和 SDK：有专用的内容类型参数

### 消息传递

原则上，Dapr 认为订阅者处理消息并返回非错误响应后，消息即成功传递。为了更精细的控制，Dapr 的发布订阅 API 还提供明确的状态（在响应负载中定义），订阅者使用这些状态向 Dapr 指示特定的处理指令（例如，`RETRY` 或 `DROP`）。

### 使用主题订阅接收消息

Dapr 应用程序可以通过支持相同功能的三种订阅类型订阅已发布的主题：声明式、流式和编程式。

| 订阅类型 | 描述 |
| ------------------- | ----------- |
| **声明式** | 订阅在**外部文件**中定义。声明式方法从代码中移除 Dapr 依赖，允许现有应用程序订阅主题，而无需更改代码。 |
| **流式** | 订阅在**用户代码**中定义。流式订阅是动态的，意味着它们允许在运行时添加或移除订阅。它们不需要应用程序中的订阅端点（这是编程式和声明式订阅都需要的），使得在代码中配置变得简单。流式订阅也不需要应用程序配置边车来接收消息。使用流式订阅，由于消息被发送到消息处理程序代码，因此没有路由或批量订阅的概念。 |
| **编程式** | 订阅在**用户代码**中定义。编程式方法实现静态订阅，需要代码中的端点。 |

更多信息，请阅读 [关于订阅类型的订阅]({{% ref subscription-methods %}})。

### 重新加载主题订阅

要重新加载以编程方式或声明方式定义的主题订阅，需要重启 Dapr 边车。
通过启用 [`HotReload` 特性门控]({{% ref "support-preview-features" %}}) 可以使 Dapr 边车动态重新加载已更改的声明式主题订阅，而无需重启。
主题订阅的热重载目前是预览功能。
重新加载订阅时，正在传输的消息不受影响。

### 消息路由

Dapr 提供[基于内容的路由](https://www.enterpriseintegrationpatterns.com/ContentBasedRouter.html)模式。[发布订阅路由]({{% ref howto-route-messages %}}) 是此模式的实现，允许开发者使用表达式根据 [CloudEvents](https://cloudevents.io) 的内容将消息路由到应用程序中的不同 URI/路径和事件处理程序。如果没有路由匹配，则使用可选的默认路由。随着你的应用程序扩展以支持多个事件版本或特殊情况，这非常有用。

此功能适用于声明式和编程式订阅方法。

有关消息路由的更多信息，请阅读 [Dapr 发布订阅 API 参考]({{% ref "pubsub_api#provide-routes-for-dapr-to-deliver-topic-events" %}})。

### 使用死信主题处理失败消息

有时，消息由于多种可能的问题无法处理，例如生产者或消费者应用程序内部的错误条件或导致应用程序代码出现问题的意外状态更改。Dapr 允许开发者设置死信主题来处理无法传递到应用程序的消息。此功能在所有发布订阅组件上可用，可防止消费者应用程序无休止地重试失败的消息。更多信息，请阅读 [关于死信主题]({{% ref "pubsub-deadletter"%}}).

### 启用发件箱模式

Dapr 使开发者能够使用发件箱模式在事务性状态存储和任何消息代理之间实现单一事务。更多信息，请阅读 [如何启用事务性发件箱消息传递]({{% ref howto-outbox %}})。

### 命名空间消费者组

Dapr 通过[消费者组命名空间]({{% ref howto-namespace %}}) 在大规模场景下解决多租户问题。只需在组件元数据中包含 `"{namespace}"` 值，即可让具有相同 `app-id` 的多个命名空间的应用程序发布和订阅到同一消息代理。

### 至少一次保证

Dapr 保证消息传递的至少一次语义。当应用程序使用发布订阅 API 向主题发布消息时，Dapr 确保消息至少一次传递到每个订阅者。

即使消息传递失败或应用程序崩溃，Dapr 也会重试重新传递消息直到成功传递。

所有 Dapr 发布订阅组件都支持至少一次保证。

### 订阅启动可靠性

Dapr 自动重试失败的订阅启动，以提高部署场景下的可靠性。这确保了你的发布订阅应用程序即使在面临临时连接或权限问题时也能保持弹性。

当 Dapr 遇到启动订阅的错误时，它会在日志中显示错误消息并继续尝试启动订阅。

### 消费者组和竞争消费者模式

Dapr 处理消费者组和竞争消费者模式的负担。在竞争消费者模式中，使用单个消费者组的多个应用程序实例竞争消息。当副本使用相同的 `app-id` 而没有明确的消费者组覆盖时，Dapr 强制执行竞争消费者模式。

当同一应用程序的多个实例（具有相同的 `app-id`）订阅主题时，Dapr 将每条消息传递到**该应用程序的只有一个实例**。此概念如下图所示。

<img src="/images/pubsub-overview-pattern-competing-consumers.png" width=1000>
<br></br>

同样，如果两个不同的应用程序（具有不同的 `app-id`）订阅同一主题，Dapr 将每条消息传递到**每个应用程序的只有一个实例**。

并非所有 Dapr 发布订阅组件都支持竞争消费者模式。目前，以下（非详尽）发布订阅组件支持此功能：

- [Apache Kafka]({{% ref setup-apache-kafka %}})
- [Azure Service Bus Queues]({{% ref setup-azure-servicebus-queues %}})
- [RabbitMQ]({{% ref setup-rabbitmq %}})
- [Redis Streams]({{% ref setup-redis-pubsub %}})。

### 限制主题以增强安全性

默认情况下，与发布订阅组件实例关联的所有主题消息都可用于使用该组件配置的每个应用程序。你可以使用 Dapr 主题限制来限制哪些应用程序可以发布或订阅主题。更多信息，请阅读：[发布订阅主题限制]({{% ref pubsub-scopes %}})。

### 消息生存时间（TTL）

Dapr 可以按消息设置超时消息，这意味着如果消息未从发布订阅组件中读取，则消息将被丢弃。此超时消息可防止未读消息堆积。如果消息在队列中停留的时间超过配置的 TTL，它将被标记为死信。更多信息，请阅读 [发布订阅消息 TTL]({{% ref pubsub-message-ttl %}})。

### 发布和订阅批量消息

Dapr 支持在单个请求中发送和接收多条消息。编写需要发送或接收大量消息的应用程序时，使用批量操作可以减少请求总数来实现高吞吐量。更多信息，请阅读 [发布订阅批量消息]({{% ref pubsub-bulk %}})。

### 使用 StatefulSets 扩展订阅者

在 Kubernetes 上运行时，订阅者结合 StatefulSets 和 `{podName}` 标记可以拥有每个实例的粘性 `consumerID`。请参阅 [如何使用 StatefulSets 水平扩展订阅者]({{% ref "howto-subscribe-statefulset" %}})。

## 尝试发布订阅

### 快速入门和教程

想测试 Dapr 发布订阅 API？请完成以下快速入门和教程来了解发布订阅的实际应用：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [发布订阅快速入门]({{% ref pubsub-quickstart %}}) | 使用发布订阅 API 发送和接收消息。 |
| [发布订阅教程](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub) | 演示如何使用 Dapr 启用发布订阅应用程序。使用 Redis 作为发布订阅组件。 |

### 直接在应用程序中使用发布订阅

想跳过快速入门？没问题。你可以直接在应用程序中试用发布订阅构建块来发布消息和订阅主题。安装 [Dapr]({{% ref "getting-started/_index" %}}) 后，你可以从 [发布订阅操作指南]({{% ref howto-publish-subscribe %}}) 开始使用发布订阅 API。

## 下一步

- 了解 [使用 CloudEvents 进行消息传递]({{% ref pubsub-cloudevents %}}) 以及何时可能需要 [发送不带 CloudEvents 的消息]({{% ref pubsub-raw %}})。
- 遵循 [操作指南：使用多个命名空间配置发布订阅组件]({{% ref pubsub-namespaces %}})。
- 查看 [发布订阅组件]({{% ref setup-pubsub %}}) 列表。
- 阅读 [API 参考]({{% ref pubsub_api %}})。
