---
type: docs
title: "死信主题"
linkTitle: "死信主题"
weight: 4000
description: "使用订阅死信主题转发无法投递的消息"
---

## 简介

应用程序有时可能因各种原因无法处理消息。例如，在检索处理消息所需的数据时可能存在瞬时问题，或者应用程序业务逻辑失败并返回错误。死信主题用于转发无法投递到订阅应用程序的消息。这减轻了应用程序的压力，使其无需处理这些失败的消息，允许开发者编写代码从死信主题读取消息，然后修复消息并重新发送，或完全放弃该消息。

死信主题通常与重试弹性策略以及死信订阅一起使用，死信订阅负责处理从死信主题转发来的消息所需的逻辑。

当设置了死信主题时，任何未能投递到已配置主题的应用程序的消息都会被放到死信主题上，以便转发给处理这些消息的订阅。这可能是同一个应用程序，也可能是完全不同的应用程序。

Dapr 为其所有发布/订阅组件启用死信主题，即使底层系统本身不支持此功能。例如，[AWS SNS 组件]({{% ref "setup-aws-snssqs" %}}) 具有死信队列，[RabbitMQ]({{% ref "setup-rabbitmq" %}}) 具有死信主题。你需要确保正确配置此类组件。

下图是死信主题如何工作的示例。首先，从 `orders` 主题上的发布者发送一条消息。Dapr 代表订阅应用程序接收该消息，但是 orders 主题消息未能投递到应用程序上的 `/checkout` 端点，即使经过重试也是如此。由于投递失败，该消息被转发到 `poisonMessages` 主题，该主题将其传递到 `/failedMessages` 端点进行处理，在本例中是在同一应用程序上。`failedMessages` 处理代码可以丢弃消息或重新发送新消息。

<img src="/images/pubsub_deadletter.png" width=1200>

## 使用声明式订阅配置死信主题

以下 YAML 显示如何为从 `orders` 主题消费的消息配置名为 `poisonMessages` 的死信主题的订阅。此订阅的作用域限定为具有 `checkout` ID 的应用程序。

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order
spec:
  topic: orders
  routes: 
    default: /checkout
  pubsubname: pubsub
  deadLetterTopic: poisonMessages
scopes:
- checkout
```

## 使用流式订阅配置死信主题

```go
	var deadLetterTopic = "poisonMessages"
	sub, err := cl.Subscribe(context.Background(), client.SubscriptionOptions{
		PubsubName:      "pubsub",
		Topic:           "orders",
		DeadLetterTopic: &deadLetterTopic,
	})
```

## 使用编程式订阅配置死信主题

从 `/subscribe` 端点返回的 JSON 显示如何为从 `orders` 主题消费的消息配置名为 `poisonMessages` 的死信主题。

```javascript
app.get('/dapr/subscribe', (_req, res) => {
    res.json([
        {
            pubsubname: "pubsub",
            topic: "orders",
            route: "/checkout",
            deadLetterTopic: "poisonMessages"
        }
    ]);
});
```

## 重试和死信主题

默认情况下，当设置了死信主题时，任何失败的消息都会立即进入死信主题。因此，建议在订阅中使用死信主题时始终设置重试策略。要在将消息发送到死信主题之前启用重试，请将[重试弹性策略]({{% ref "retries-overview" %}}) 应用于发布/订阅组件。

此示例显示如何为 `pubsub` 发布/订阅组件设置名为 `pubsubRetry` 的恒定重试策略，最大投递尝试次数为 10 次，每 5 秒应用一次。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: myresiliency
spec:
  policies:
    retries:
      pubsubRetry:
        policy: constant
        duration: 5s
        maxRetries: 10
  targets:
    components:
      pubsub:
        inbound:
          retry: pubsubRetry
```

## 配置用于处理死信主题的订阅

请记住，现在要配置一个订阅来处理死信主题。例如，你可以创建另一个声明式订阅，以在同一或不同的应用程序上接收这些消息。下面的示例显示 checkout 应用程序订阅 `poisonMessages` 主题，并通过另一个订阅将这些消息发送到 `/failedmessages` 端点进行处理。

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: deadlettertopics
spec:
  topic: poisonMessages
  routes:
    rules:
      - match:
        path: /failedMessages
  pubsubname: pubsub
scopes:
- checkout
```

## 演示

观看[此视频以了解死信主题的概述](https://youtu.be/wLYYOJLt_KQ?t=69)：

{{< youtube id=wLYYOJLt_KQ start=69 >}}

## 后续步骤

- 有关弹性策略的更多信息，请阅读[弹性概述]({{% ref resiliency-overview %}})。
- 有关主题订阅的更多信息，请阅读[声明式、流式和编程式订阅方法]({{% ref "pubsub-overview#message-subscription" %}})。
