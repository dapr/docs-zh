---
type: docs
title: "使用 JavaScript streaming subscription 接收事件"
linkTitle: "streaming subscriptions"
weight: 3300
description: "无需应用服务器，使用 gRPC streaming 订阅，并支持取消、确认与故障监督"
---

在 `@dapr/dapr` 3.19.0 或更高版本中，使用 `DaprClient.pubsub.subscribeStream()` 打开一个从应用到 sidecar 的双向 gRPC 流。它不需要 `DaprServer`、应用回调端口或订阅发现。

请先完成[pub/sub 前提条件]({{% ref js-pubsub %}})。streaming subscription 使用 `SubscribeTopicEventsAlpha1`，这是一个 alpha 的 gRPC API，你的 Dapr runtime 必须实现该 API。HTTP 客户端会拒绝此操作，并抛出 `HTTPNotSupportedError`。streaming subscription 不支持路由规则或批量订阅选项。

## 运行流式工作进程

在 ES 模块应用中，将以下内容保存为 `worker.js`。工作进程会一直运行，直到收到 SIGINT 或 SIGTERM，或者流失败为止：

```javascript
import { CommunicationProtocolEnum, DaprClient, DaprPubSubStatusEnum } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
});

const controller = new AbortController();
const stop = () => controller.abort();
process.once("SIGINT", stop);
process.once("SIGTERM", stop);

try {
  const subscription = await client.pubsub.subscribeStream(
    "pubsub",
    "orders",
    async (data, headers) => {
      console.log("Order received:", data, "CloudEvent:", headers);
      return DaprPubSubStatusEnum.SUCCESS;
    },
    { signal: controller.signal, deadLetterTopic: "orders-deadletter" },
  );

  try {
    await subscription.closed;
  } finally {
    await subscription.close();
  }
} finally {
  process.removeListener("SIGINT", stop);
  process.removeListener("SIGTERM", stop);
  await client.stop();
}
```

运行时不要指定 `--app-port`：

```sh
dapr run --app-id orders-worker --dapr-grpc-port 50001 --resources-path ./components -- node worker.js
```

订阅的 Promise 只有在 Dapr 确认设置完成后才会解析。设置失败时，Promise 会被拒绝。有关连接设置、身份验证和自定义序列化，请参阅[配置与用法]({{% ref js-pubsub-usage.md %}})。

## 回调数据与确认

回调接收反序列化后的负载 `data`，以及 `headers` 中的 CloudEvent 属性。属性包括 `id`、`source`、`type`、`specversion`、`datacontenttype`、`topic`、`pubsubname` 和 `path`，以及展平的扩展属性。与[服务端回调标头]({{% ref "js-pubsub-subscribe-howto.md#callback-data-and-headers" %}})不同，这些属性会明确暴露 CloudEvent 属性。

回调在同一流内按顺序运行，并使用客户端的序列化器。返回 `DaprPubSubStatusEnum.SUCCESS`、`RETRY`、`DROP` 之一，或不返回值；不返回值即表示成功。回调异常、反序列化错误和无效返回值会被记录日志，并以 `RETRY` 确认。

重试与死信行为取决于运行时 resiliency 策略和 component。由于消息可能会被重复投递，请确保处理程序是幂等的。

## 流式选项与生命周期

| 成员 | 行为 |
| --- | --- |
| `options.metadata` | 以字符串映射形式发送的订阅 metadata。 |
| `options.deadLetterTopic` | 运行时死信转发的主题；需单独消费该主题。 |
| `options.signal` | 取消设置过程或正在进行的流。 |
| `subscription.close()` | 幂等地取消该流；可以在其回调中安全调用。不会等待正在执行的回调。 |
| `subscription.closed` | 在取消且正在执行的回调完成后解析。传输或协议失败，或流意外终止时拒绝。 |

发送原始负载时，请在订阅选项中传入 `metadata: { rawPayload: "true" }`。请参阅[发布原始负载]({{% ref "js-pubsub-publish-howto.md#raw-payloads" %}})。要消费失败的消息，请为 `deadLetterTopic` 单独创建一个订阅；设置该选项不会为该主题注册消费者。

TypeScript 应用可以将 `PubSubStreamingSubscription` 和 `PubSubStreamingSubscriptionOptions` 作为类型从 `@dapr/dapr` 导入。

## 监督故障与关闭

在订阅的整个生命周期中都应观察 `closed`。SDK 会记录流故障，但**不会自动重连**。如果需要重连，请实现一个受监督的重试策略：创建新的订阅，并遵循应用程序的关闭过程。

`client.stop()` 不会关闭这些订阅。在停止客户端之前，请显式关闭每个订阅，并等待其 `closed` Promise 完成。在回调过程中取消会导致该事件未被确认，因此可能会被重新投递。该 API 不提供 .NET 风格的队列容量、单条消息超时或自动重连选项。
