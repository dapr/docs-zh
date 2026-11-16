---
type: docs
title: "发布订阅概述"
linkTitle: "概述"
weight: 1000
description: "发布订阅 API 构建块概述"
---

发布订阅（pub/sub）使微服务能够使用消息进行通信，从而实现事件驱动架构。

- 生产者（**发布者**）将消息写入输入通道并发送到主题，无需知道哪个应用程序会接收它们。
- 消费者（**订阅者**）订阅主题并从输出通道接收消息，无需知道是哪个服务产生了这些消息。

中间的消息代理会将每条消息从发布者的输入通道复制到输出通道，供所有对该消息感兴趣的订阅者使用。当你需要让微服务彼此解耦时，这种模式尤其有用。

{{< diagram pubsub-pattern >}}

<br></br>

## 发布订阅 API

Dapr 中的发布订阅 API：
- 提供与平台无关的 API，用于发送和接收消息。
- 提供至少一次（at-least-once）的消息投递保证。
- 与各种消息代理和队列系统集成。

你的服务所使用的具体消息代理是可插拔的，在运行时作为 Dapr 发布订阅组件进行配置。这使你的服务不再依赖特定的消息代理，也让服务更易于移植、更灵活地应对变化。

使用 Dapr 发布订阅时：

1. 你的服务向 Dapr 发布订阅构建块 API 发起网络调用。
1. 发布订阅构建块调用封装了特定消息代理的 Dapr 发布订阅组件。
1. 要接收某个主题上的消息，Dapr 会代表你的服务订阅发布订阅组件上的该主题，并在消息到达时将其投递到你的服务端点。

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=FMg2Y7bRuljKism-&t=5384) 展示了 Dapr 发布订阅的工作方式。

{{< youtube id=0y7ne6teHT4 start=5384 >}}

在下图中，"shipping" 服务和 "email" 服务都订阅了 "cart" 服务发布的主题。每个服务都加载指向同一个发布订阅消息代理组件的发布订阅组件配置文件，例如：Redis Streams、NATS Streaming、Azure Service Bus 或 RabbitMQ。

{{< diagram pubsub-components >}}

在下图中，Dapr API 将发布方 "cart" 服务的 "order" 主题发布到订阅方 "shipping" 和 "email" 服务的 "order" 端点。

{{< diagram pubsub-publish-api >}}

[查看 Dapr 支持的完整发布订阅组件列表]({{% ref supported-pubsub %}})。

## 功能

发布订阅 API 构建块为你的应用程序提供多项功能。

### 使用 CloudEvents 发送消息

为了实现消息路由，并在服务之间为每条消息提供额外的上下文，Dapr 使用 [CloudEvents 1.0 规范](https://github.com/cloudevents/spec/tree/v1.0) 作为其消息格式。应用程序通过 Dapr 发送到主题的任何消息都会自动包装在 Cloud Events 信封中，并使用 [`Content-Type` 头值]({{% ref "pubsub-overview#content-types" %}}) 作为 `datacontenttype` 属性。

更多信息，请阅读[使用 CloudEvents 进行消息传递]({{% ref pubsub-cloudevents %}})，或[发送不带 CloudEvents 的原始消息]({{% ref pubsub-raw %}})。

### 与未使用 Dapr 和 CloudEvents 的应用程序通信

如果你的一个应用程序使用 Dapr，而另一个不使用，你可以为发布者或订阅者禁用 CloudEvents 包装。这使得无法一次性全面采用 Dapr 的应用程序也能部分采用 Dapr 发布订阅。

更多信息，请阅读[如何在不使用 CloudEvents 的情况下使用发布订阅]({{% ref pubsub-raw %}})。

### 设置消息内容类型

发布消息时，指定所发送数据的内容类型非常重要。除非另行指定，Dapr 会假定为 `text/plain`。

- HTTP 客户端：可以在 `Content-Type` 头中设置内容类型
- gRPC 客户端和 SDK：提供专用的内容类型参数

### 消息传递

原则上，订阅者处理消息并返回非错误响应后，Dapr 即认为该消息已成功传递。若需要更精细的控制，Dapr 的发布订阅 API 还提供明确的状态（定义在响应负载中），订阅者可借此向 Dapr 指示具体的处理指令，例如 `RETRY` 或 `DROP`。

### 使用主题订阅接收消息

Dapr 应用程序可以通过三种订阅类型订阅已发布的主题，这三种类型支持相同的功能：声明式、流式和编程式。

| 订阅类型 | 描述 |
| ------------------- | ----------- |
| **声明式** | 订阅定义在**外部文件**中。声明式方法使代码不再依赖 Dapr，并允许现有应用程序无需修改代码即可订阅主题。 |
| **流式** | 订阅定义在**用户代码**中。流式订阅是动态的，意味着可以在运行时添加或移除订阅。它们不需要应用程序中的订阅端点（编程式和声明式订阅都需要），因此在代码中配置非常简便。流式订阅也不要求应用程序配置边车即可接收消息。由于消息会被发送到消息处理程序代码，流式订阅中没有路由和批量订阅的概念。 |
| **编程式** | 订阅定义在**用户代码**中。编程式方法实现静态订阅，并且需要代码中提供端点。 |

更多信息，请了解[订阅类型中的各种订阅方式]({{% ref subscription-methods %}})。

### 重新加载主题订阅

编程式主题订阅需要重启 Dapr 边车才能重新加载。
Dapr 边车会动态重新加载已更改的声明式主题订阅，无需重启。该功能默认启用；如需关闭，请在 [Dapr 应用程序配置]({{% ref "preview-features.md" %}}) 中禁用 `HotReload` 特性。
重新加载订阅时，正在传输中的消息不受影响。

### 消息路由

Dapr 提供了[基于内容的路由](https://www.enterpriseintegrationpatterns.com/ContentBasedRouter.html)模式。[发布订阅路由]({{% ref howto-route-messages %}})是该模式的一种实现，允许开发者使用表达式，根据 [CloudEvents](https://cloudevents.io) 的内容将其路由到应用程序中不同的 URI/路径和事件处理程序。如果没有任何路由匹配，则使用可选的默认路由。当你的应用程序扩展到支持多个事件版本或特殊情况时，这一点非常有用。

此功能同时适用于声明式和编程式订阅方式。

更多关于消息路由的信息，请阅读 [Dapr 发布订阅 API 参考]({{% ref "pubsub_api#provide-routes-for-dapr-to-deliver-topic-events" %}})。

### 使用死信主题处理失败消息

有时，消息会因各种可能的问题而无法处理，例如生产者或消费者应用程序中的错误状况，或导致应用程序代码出错的意外状态变化。Dapr 允许开发者设置死信主题，以处理无法投递到应用程序的消息。此功能适用于所有发布订阅组件，可防止消费者应用程序无休止地重试失败的消息。更多信息，请阅读[关于死信主题]({{% ref "pubsub-deadletter"%}})。

### 启用发件箱模式

Dapr 让开发者可以使用发件箱模式，在事务性状态存储与任意消息代理之间实现单一事务。更多信息，请阅读[如何启用事务性发件箱消息]({{% ref howto-outbox %}})。

### 命名空间消费者组

Dapr 通过[消费者组命名空间]({{% ref howto-namespace %}})解决大规模下的多租户问题。只需在组件元数据中为消费者组包含 `"{namespace}"` 值，即可让多个命名空间中具有相同 `app-id` 的应用程序发布和订阅同一个消息代理。

### 至少一次保证

Dapr 保证消息投递的至少一次（at-least-once）语义。当应用程序使用发布订阅 API 向某个主题发布消息时，Dapr 会确保该消息*至少一次*投递给每个订阅者。

即使消息投递失败或应用程序崩溃，Dapr 也会尝试重新投递该消息，直到投递成功。

所有 Dapr 发布订阅组件都支持至少一次保证。

### 订阅启动可靠性

Dapr 会自动重试失败的订阅启动，以提高部署场景下的可靠性。即使遇到临时的连接或权限问题，这也能确保你的发布订阅应用程序保持弹性。

当 Dapr 在启动订阅时遇到错误，它会在日志中显示错误信息，并继续尝试启动该订阅。

### 消费者组和竞争消费者模式

Dapr 承担了处理消费者组和竞争消费者模式的工作。在竞争消费者模式中，使用同一个消费者组的多个应用程序实例会竞争同一条消息。当副本使用相同的 `app-id` 且没有显式的消费者组覆盖配置时，Dapr 会强制执行竞争消费者模式。

当同一应用程序的多个实例（具有相同的 `app-id`）订阅某个主题时，Dapr 会将每条消息只投递给**该应用程序的一个实例**。下图展示了这一概念。

{{< diagram name="pubsub-competing-consumers" width="65" >}}
<br></br>

同样，如果两个不同的应用程序（具有不同的 `app-id`）订阅同一个主题，Dapr 会将每条消息分别投递给**每个应用程序的一个实例**。

并非所有 Dapr 发布订阅组件都支持竞争消费者模式。目前，以下（非穷举）发布订阅组件支持该模式：

- [Apache Kafka]({{% ref setup-apache-kafka %}})
- [Azure Service Bus Queues]({{% ref setup-azure-servicebus-queues %}})
- [RabbitMQ]({{% ref setup-rabbitmq %}})
- [Redis Streams]({{% ref setup-redis-pubsub %}})

### 限制主题以增强安全性

默认情况下，与某个发布订阅组件实例关联的所有主题消息，对配置了该组件的每个应用程序都可用。你可以使用 Dapr 主题限制来限制哪些应用程序可以发布或订阅主题。更多信息，请阅读：[发布订阅主题限制]({{% ref pubsub-scopes %}})。

### 消息生存时间（TTL）

Dapr 可以为每条消息设置超时消息，这意味着如果消息未从发布订阅组件中读取，则该消息会被丢弃。这一超时消息机制可防止未读消息的堆积。如果消息在队列中停留的时间超过了配置的 TTL，它将被标记为死信。更多信息，请阅读[发布订阅消息 TTL]({{% ref pubsub-message-ttl %}})。

### 发布和订阅批量消息

Dapr 支持在单个请求中发送和接收多条消息。在编写需要发送或接收大量消息的应用程序时，使用批量操作可以减少请求总数，从而实现高吞吐量。更多信息，请阅读[发布订阅批量消息]({{% ref pubsub-bulk %}})。

### 使用 StatefulSets 扩展订阅者

在 Kubernetes 上运行时，订阅者可以结合 StatefulSets 与 `{podName}` 标记，为每个实例设置粘性的 `consumerID`。请参阅[如何使用 StatefulSets 水平扩展订阅者]({{% ref "howto-subscribe-statefulset" %}})。

## 尝试发布订阅

### 快速入门和教程

想测试 Dapr 发布订阅 API 吗？请完成以下快速入门和教程，了解发布订阅的实际应用：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [发布订阅快速入门]({{% ref pubsub-quickstart %}}) | 使用发布订阅 API 发送和接收消息。 |
| [发布订阅教程](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub) | 演示如何使用 Dapr 启用发布订阅应用程序。使用 Redis 作为发布订阅组件。 |

### 直接在应用程序中使用发布订阅

想跳过快速入门？没问题。你可以直接在应用程序中试用发布订阅构建块，发布消息并订阅主题。[安装 Dapr]({{% ref "getting-started/_index" %}})后，即可从[发布订阅操作指南]({{% ref howto-publish-subscribe %}})开始使用发布订阅 API。

### 在本地检查发布订阅

在本地开发期间，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看每个应用程序注册的订阅，包括发布订阅组件、主题和路由。你还可以从仪表板向某个订阅发布测试消息，这是在无需运行发布者的情况下快速测试订阅者的方法。

## 下一步

- 了解[使用 CloudEvents 进行消息传递]({{% ref pubsub-cloudevents %}})，以及何时可能需要[发送不带 CloudEvents 的消息]({{% ref pubsub-raw %}})。
- 遵循[操作指南：使用多个命名空间配置发布订阅组件]({{% ref pubsub-namespaces %}})。
- 查看[发布订阅组件]({{% ref setup-pubsub %}})列表。
- 阅读 [API 参考]({{% ref pubsub_api %}})。
