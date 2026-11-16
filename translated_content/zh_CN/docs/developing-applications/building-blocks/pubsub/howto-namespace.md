---
type: docs
title: "如何操作：设置 pub/sub 命名空间消费者组"
linkTitle: "如何操作：命名空间消费者组"
weight: 5000
description: "了解如何在组件中使用基于元数据的命名空间消费者组"
---

你已经设置了 [Dapr 的 pub/sub API 构建块]({{% ref pubsub-overview %}})，你的应用程序正在使用中心化的消息代理顺畅地发布和订阅主题。如果你想为应用程序执行简单的 A/B 测试、蓝绿部署，甚至金丝雀部署，该怎么办呢？即使使用 Dapr，这也可能变得很困难。

Dapr 通过其 pub/sub 命名空间消费者组构造解决了大规模的多租户问题。

## 没有命名空间消费者组

假设你有一个 Kubernetes 集群，其中两个应用程序（App1 和 App2）部署在同一个命名空间（namespace-a）中。App1 发布到名为 `order` 的主题，而 App2 订阅名为 `order` 的主题。这将创建两个消费者组，以你的应用程序命名（App1 和 App2）。

{{< diagram name="pubsub-namespace-basic" width="60" >}}

为了在使用中心化消息代理的同时执行简单的测试和部署，你再创建一个命名空间，其中包含两个具有相同 `app-id` 的应用程序，即 App1 和 App2。

Dapr 使用各个应用程序的 `app-id` 创建消费者组，因此消费者组名称仍为 App1 和 App2。

{{< diagram pubsub-namespace-without >}}

两个命名空间现在都运行着一个 App2，而 Dapr 仅以 `app-id` 来命名消费者组。因此，两个订阅者会加入*同一个*消费者组，而消息代理会把每条消息只投递给该组中的一个成员。二者互相竞争：在 namespace-a 中发布的消息可能被交给 namespace-b 中的 App2，而在 namespace-b 中发布的消息也可能被交给 namespace-a 中的 App2。两个命名空间都无法保证收到属于自己的消息，上图中划掉的投递即表示这一点。

为避免这种情况，你就需要在代码中“悄悄”加入一些逻辑，根据运行所在的命名空间来改变 `app-id`。这种变通方法很繁琐，是一个显著的痛点。

## 使用命名空间消费者组

Dapr 不仅允许你通过为 consumerID 设置 UUID 和 Pod 名称来改变消费者组的行为，还提供了一种存在于 pub/sub 组件元数据中的 **命名空间构造**。例如，使用 Redis 作为消息代理：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
  - name: consumerID
    value: "{namespace}"
```

通过将 `consumerID` 配置为 `{namespace}` 值，你就可以在不同的命名空间中使用相同的 `app-id` 和相同的主题。

{{< diagram pubsub-namespace-with >}}

在上图中，你有两个命名空间，每个命名空间中都有具有相同 `app-id` 的应用程序，它们发布和订阅同一个逻辑主题 `order`。Dapr 会为底层的消息代理实体添加命名空间，因此两个命名空间不会相互干扰。

无需更改代码或 `app-id`，命名空间消费者组可以让你：
- 添加更多命名空间
- 在各命名空间之间，在**应用程序代码中**使用相同的主题名称
- 在各命名空间之间保持相同的 `app-id`
- 保持整个部署流水线完好无损

只需在组件元数据中包含 `"{namespace}"` 消费者组构造即可。你无需在元数据中编写命名空间。Dapr 会识别其运行所在的命名空间，并为你补全命名空间的值，就像运行时注入的动态元数据值一样。

{{% alert title="重要：命名空间如何体现在消息代理上" color="warning" %}}
当 `{namespace}` 出现在 pub/sub 组件元数据的任何位置时，Dapr 会对**整个组件**进行命名空间限定，而不仅仅是 `consumerID` 字段。在每次发布和订阅时，Kubernetes 命名空间都会同时作为前缀加在**主题**和**订阅 / 消费者组**上。

例如，命名空间为 `team-a`、逻辑主题为 `order` 时，在消息代理上创建的实体为：
- 主题：`team-aorder`
- 订阅 / 消费者组：`team-a.<appID>`

从应用程序代码的角度看，主题名称端到端保持不变：Dapr 在接收路径上会去掉前缀后再将消息投递给应用程序，而且边车日志中的 `app is subscribed to the following topics: [...]` 这一行也显示未加前缀的名称。前缀只存在于网络传输与消息代理上。

如果你希望使用**共享**的消息代理主题，并为每个应用使用唯一的订阅，请从组件元数据中去掉 `{namespace}`，并以其他方式使 `consumerID` 唯一（例如 `consumerID: "{appID}"`）。
{{% /alert %}}

{{% alert title="注意" color="primary" %}}
如果你之后再将命名空间消费者组添加到元数据中，Dapr 会为你更新所有内容。这意味着你可以为现有的 pub/sub 部署添加命名空间元数据值。
{{% /alert %}}

## 演示

观看[此视频，了解 pub/sub 多租户的概述](https://youtu.be/eK463jugo0c?t=1188)：

{{< youtube id=eK463jugo0c start=1188 >}}

## 后续步骤

- 了解更多关于为多个命名空间配置 pub/sub 组件的信息 [pub/sub 命名空间]({{% ref pubsub-namespaces %}})。
