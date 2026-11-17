---
type: docs
title: "使用 JavaScript SDK 发布事件"
linkTitle: "发布事件"
weight: 3100
description: "发布单个事件与批量事件，配置 metadata 和 CloudEvents，并处理发布失败"
---

使用 `DaprClient.pubsub` 通过 HTTP 或 gRPC 发布事件，需要 `@dapr/dapr` 3.19.0 或更高版本。阅读本指南前，请先完成[pub/sub 的前置条件]({{% ref js-pubsub %}})。

## 配置发布者

示例使用以下 HTTP 客户端、component `pubsub` 和主题 `orders`：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "3500",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
});
```

若使用 gRPC，请选择 `CommunicationProtocolEnum.GRPC` 并将端口设为 `"50001"`。包含 `await` 的语句需要在 async 函数或 ES 模块中运行。复用客户端，并在应用关闭时停止它；参见[配置与用法]({{% ref js-pubsub-usage.md %}})。

## 单条消息与 metadata

```javascript
const response = await client.pubsub.publish(
  "pubsub",
  "orders",
  { orderId: "101", total: 49.99 },
  {
    contentType: "application/json",
    metadata: { ttlInSeconds: "60" },
  },
);

if (response.error) {
  throw response.error;
}
```

如果未指定自定义序列化器或显式的 `contentType`，SDK 会为对象和数组推断 `application/json`，为字符串推断 `text/plain`，为可识别的 CloudEvents 推断 `application/cloudevents+json`。

`metadata` 用于承载 Dapr 发布选项和 component 特定的设置，例如消息 TTL 或分区键。它不是用于添加 CloudEvent 属性或任意订阅者请求头的通用机制。支持的键取决于 component。

## 发布 CloudEvents

Dapr 通常会将发布的数据包装在 CloudEvent 中。如果要提供自己的事件属性，请显式发布一个 CloudEvent：

```javascript
const response = await client.pubsub.publish("pubsub", "orders", {
  specversion: "1.0",
  id: "order-101-created",
  source: "/checkout",
  type: "com.example.order.created",
  datacontenttype: "application/json",
  data: { orderId: "101", total: 49.99 },
});

if (response.error) {
  throw response.error;
}
```

有关信封属性和扩展，请参见 [CloudEvents]({{% ref pubsub-cloudevents.md %}})。

## 原始负载

若要在不包装 CloudEvent 信封的情况下发布：

```javascript
const response = await client.pubsub.publish("pubsub", "orders-raw", "order-101", {
  contentType: "text/plain",
  metadata: { rawPayload: "true" },
});

if (response.error) {
  throw response.error;
}
```

在接收端订阅中配置：[服务端订阅]({{% ref js-pubsub-subscribe-howto.md %}}) 使用 `metadata: { rawPayload: true }`，[streaming subscription]({{% ref js-pubsub-streaming-howto.md %}}) 使用 `metadata: { rawPayload: "true" }`。服务端订阅的 metadata 值在订阅发现（discovery）之前会先做 JSON 字符串化；streaming subscription 的 metadata 则直接以字符串映射的形式发送。这一区别对 `rawPayload` 等布尔选项很重要。

原始负载不提供与经 CloudEvent 信封封装的事件相同的 CloudEvent 属性。参见[原始负载]({{% ref pubsub-raw.md %}})。

## Bulk Publish

`publishBulk(pubSubName, topic, messages, metadata?)` 接受字符串、对象，或包含 `event`、可选的 `entryID` 和可选的 `contentType` 的显式条目。缺失的条目 ID 会自动生成为 UUID：

```javascript
const response = await client.pubsub.publishBulk(
  "pubsub",
  "orders",
  [
    { entryID: "order-101", event: { orderId: "101" }, contentType: "application/json" },
    { entryID: "order-102", event: { orderId: "102" }, contentType: "application/json" },
  ],
  { ttlInSeconds: "60" },
);

for (const failure of response.failedMessages) {
  console.error("Publish failed:", failure.message.entryID, failure.error);
}

if (response.failedMessages.length > 0) {
  throw new Error(`Failed to publish ${response.failedMessages.length} orders`);
}
```

Bulk Publish 不是事务性的。Promise 正常结束（resolve）后，结果中仍可能包含失败项，因此务必检查 `failedMessages`。每个失败项都包含原始的规范化 `message` 和一个 `error`。请求级别的失败通常会表现为每个条目都失败；而参数处理、序列化或客户端初始化仍可能导致 Promise 被拒绝（reject）。

Bulk Publish 在 Dapr 1.17 或更高版本上使用稳定 API，在较旧的运行时上会自动回退到已弃用的 alpha1 API。HTTP 通过 sidecar metadata 选择 API；gRPC 则在稳定 RPC 不受支持时回退。

无论使用哪种传输方式，请通过第四个参数传递请求 metadata。尽管显式条目类型提供了 `metadata` 字段，但此 SDK 版本不会在 gRPC 批量请求中转发逐条目的 metadata。另外，在没有自定义序列化器（serializer）的情况下，gRPC 批量路径会根据每个事件推断内容类型，而不会采用显式条目中指定的内容类型。请避免依赖这些字段来实现跨协议的行为。

参见[Bulk Publish 与发布和订阅]({{% ref pubsub-bulk.md %}})。

## 发布错误处理

在当前版本中，单条消息发布的失败行为因传输方式而异：

| 操作 | 失败行为 |
| --- | --- |
| HTTP `publish()` | 请求失败时通常以 `{ error }` 正常结束（resolve）。 |
| gRPC `publish()` | RPC 失败时以包含 `error` 的对象拒绝（reject）。 |
| `publishBulk()` | 通常以 `failedMessages` 正常结束（resolve）；预处理或设置阶段的失败可能导致拒绝（reject）。 |

请在应用的错误边界内 await 这些调用，**并且**检查其响应字段。不要假定 Promise 正常结束就代表发布成功，也不要假定每个拒绝（reject）都是 `Error` 实例。发布者成功只表示 Dapr 已接受发布请求，并不代表所有订阅者都已处理该事件。
