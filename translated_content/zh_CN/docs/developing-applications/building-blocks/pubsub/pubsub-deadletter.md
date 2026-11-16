---
type: docs
title: "死信主题"
linkTitle: "死信主题"
weight: 4000
description: "使用订阅死信主题转发无法投递的消息"
---

## 简介

应用程序有时可能因为各种原因无法处理消息。例如，在检索处理消息所需的数据时可能出现瞬时问题，或者应用程序的业务逻辑返回错误而失败。死信主题用于转发无法投递到订阅应用程序的消息。这样可以减轻应用程序的负担，使其无需处理这些失败的消息：开发者可以编写从死信主题读取消息的代码，修复消息后重新发送，或者直接放弃该消息。

死信主题通常与重试弹性策略以及死信订阅一起使用，死信订阅负责处理从死信主题转发过来的消息所需的逻辑。

设置了死信主题后，任何未能投递到应用程序已配置主题的消息，都会被放到死信主题上，转发给负责处理这些消息的订阅。处理这些消息的可以是同一个应用程序，也可以是完全不同的应用程序。

Dapr 为其所有发布订阅组件启用死信主题，即使底层系统本身不原生支持此功能。例如，[AWS SNS 组件]({{% ref "setup-aws-snssqs" %}})具有死信队列，[RabbitMQ]({{% ref "setup-rabbitmq" %}})具有死信主题。你需要确保正确配置此类组件。

下图是死信主题工作方式的示例。首先，`orders` 主题的发布者发送一条消息。Dapr 代表订阅应用程序接收该消息，但 orders 主题的消息即使经过重试，仍未能投递到应用程序的 `/checkout` 端点。由于投递失败，该消息被转发到 `poisonMessages` 主题，该主题再将其投递到 `/failedMessages` 端点进行处理，在本例中，该端点位于同一个应用程序上。`failedMessages` 的处理代码可以丢弃该消息，也可以重新发送一条新消息。

{{< diagram pubsub-deadletter >}}

## 使用声明式订阅配置死信主题

以下 YAML 展示了如何为从 `orders` 主题消费的消息配置名为 `poisonMessages` 的死信主题订阅。该订阅的作用域限定在 ID 为 `checkout` 的应用程序中。

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

从 `/subscribe` 端点返回的 JSON 展示了如何为从 `orders` 主题消费的消息配置名为 `poisonMessages` 的死信主题。

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

默认情况下，设置了死信主题后，任何失败的消息都会立即进入死信主题。因此，建议在订阅中使用死信主题时始终配置重试策略。要在消息被发送到死信主题之前启用重试，请将[重试弹性策略]({{% ref "retries-overview" %}})应用到发布订阅组件上。

此示例展示了如何为 `pubsub` 发布订阅组件设置名为 `pubsubRetry` 的恒定重试策略，最多投递尝试 10 次，每 5 秒一次。

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

请记得接下来配置一个订阅来处理死信主题。例如，你可以创建另一个声明式订阅，在同一个或不同的应用程序上接收这些消息。下面的示例展示了 checkout 应用程序通过另一个订阅订阅 `poisonMessages` 主题，并将这些消息交由 `/failedmessages` 端点处理。

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

观看[此视频，了解死信主题概览](https://youtu.be/wLYYOJLt_KQ?t=69)：

{{< youtube id=wLYYOJLt_KQ start=69 >}}

## 后续步骤

- 有关弹性策略的更多信息，请阅读[弹性策略概述]({{% ref resiliency-overview %}})。
- 有关主题订阅的更多信息，请阅读[声明式、流式和编程式订阅方法]({{% ref "pubsub-overview#message-subscription" %}})。
