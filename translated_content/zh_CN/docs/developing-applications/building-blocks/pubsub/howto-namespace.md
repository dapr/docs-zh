---
type: docs
title: "如何操作：设置发布订阅命名空间消费者组"
linkTitle: "如何操作：命名空间消费者组"
weight: 5000
description: "了解如何在组件中使用基于元数据的命名空间消费者组" 
---

你已经设置了 [Dapr 的发布订阅 API 构建块]({{% ref pubsub-overview %}})，你的应用程序正在使用中心化的消息代理顺畅地发布和订阅主题。如果你想为应用程序执行简单的 A/B 测试、蓝绿部署，甚至金丝雀部署，该怎么办呢？即使使用 Dapr，这也可能变得很困难。

Dapr 通过其发布订阅命名空间消费者组构造解决了大规模的多租户问题。

## 没有命名空间消费者组

假设你有一个 Kubernetes 集群，两个应用程序（App1 和 App2）部署在同一个命名空间（namespace-a）中。App2 发布到名为 `order` 的主题，而 App1 订阅名为 `order` 的主题。这将创建两个消费者组，以你的应用程序名称命名（App1 和 App2）。

<img src="/images/howto-namespace/basic-pubsub.png" width=1000 alt="Diagram showing basic pubsub process.">

为了在使用中心化消息代理的同时执行简单的测试和部署，你创建了另一个命名空间，其中包含两个具有相同 `app-id` 的应用程序 App1 和 App2。

Dapr 使用单个应用程序的 `app-id` 创建消费者组，因此消费者组名称将保持为 App1 和 App2。

<img src="/images/howto-namespace/without-namespace.png" width=1000 alt="Diagram showing complications around multi-tenancy without Dapr namespace consumer groups.">

为了避免这种情况，你需要根据运行的命名空间，在代码中添加一些内容来更改 `app-id`。这种变通方法很繁琐，是一个显著的痛点。

## 使用命名空间消费者组

Dapr 不仅允许你通过 UUID 和 Pod 名称的 consumerID 更改消费者组的行为，还提供了一个存在于发布/订阅组件元数据中的**命名空间构造**。例如，使用 Redis 作为消息代理：

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

通过将 `consumerID` 配置为 `{namespace}` 值，你将能够从不同的命名空间使用相同的 `app-id` 和相同的主题。

<img src="/images/howto-namespace/with-namespace.png" width=1000 alt="Diagram showing how namespace consumer groups help with multi-tenancy.">

在上图中，你有两个命名空间，每个命名空间都有具有相同 `app-id` 的应用程序，发布和订阅到同一个中心化消息代理 `orders`。然而这一次，Dapr 创建了以其运行的命名空间为前缀的消费者组名称。

无需更改代码/`app-id`，命名空间消费者组允许你：
- 添加更多命名空间
- 保持相同的主题
- 在命名空间之间保持相同的 `app-id`
- 保持整个部署管道完整

只需在组件元数据中包含 `"{namespace}"` 消费者组构造即可。你不需要在元数据中编码命名空间。Dapr 理解它运行的命名空间，并为你完成命名空间值，就像运行时注入的动态元数据值一样。

{{% alert title="注意" color="primary" %}}
如果你之后将命名空间消费者组添加到元数据中，Dapr 会为你更新所有内容。这意味着你可以将命名空间元数据值添加到现有的发布/订阅部署中。
{{% /alert %}}

## 演示

观看[此视频了解发布订阅多租户的概述](https://youtu.be/eK463jugo0c?t=1188)：

{{< youtube id=eK463jugo0c start=1188 >}}

## 后续步骤

- 了解有关使用多个命名空间配置发布/订阅组件的更多信息 [发布/订阅命名空间]({{% ref pubsub-namespaces %}})。
