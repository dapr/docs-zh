---
type: docs
title: "使用 JavaScript 应用服务器接收事件"
linkTitle: "服务端订阅"
weight: 3200
description: "注册 HTTP 或 gRPC 订阅、处理确认、路由事件，并配置批量投递与死信投递"
---

使用 `DaprServer.pubsub` 通过 HTTP 或 gRPC 回调接收事件，需要 `@dapr/dapr` 3.19.0 或更高版本。在按照本指南操作之前，请先完成[pub/sub 的前置条件]({{% ref js-pubsub %}})。对于没有应用回调监听器的工作进程，请改用[streaming subscription]({{% ref js-pubsub-streaming-howto.md %}})。

## 在启动前注册订阅

在 ES 模块应用中，将以下内容保存为 `subscriber.js`：

```javascript
import { CommunicationProtocolEnum, DaprPubSubStatusEnum, DaprServer } from "@dapr/dapr";

const server = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "50002",
  communicationProtocol: CommunicationProtocolEnum.HTTP,
  clientOptions: { daprHost: "127.0.0.1", daprPort: "3500" },
});

await server.pubsub.subscribe("pubsub", "orders", async (data, headers) => {
  console.log("Order received:", data, headers);
  return DaprPubSubStatusEnum.SUCCESS;
});

await server.start();
```

运行订阅者时，应用端口需与 `serverPort` 一致：

```sh
dapr run --app-id orders-subscriber --app-port 50002 --app-protocol http --dapr-http-port 3500 --resources-path ./components -- node subscriber.js
```

如果使用 gRPC 服务器，请选择 `CommunicationProtocolEnum.GRPC`，将客户端端口设为 `"50001"`，并使用 `--app-protocol grpc --dapr-grpc-port 50001` 运行 Dapr。

后续示例都假定已有此处的 `server` 和枚举导入。请在 `server.start()` **之前**添加它们的订阅注册。

HTTP 订阅通过 `/dapr/subscribe` 暴露；gRPC 订阅则使用 `ListTopicSubscriptions`。每个 component 与主题的组合只需配置一次。对已注册的组合重复调用 `subscribe()` 或 `subscribeWithOptions()` 会抛出异常。如需为现有路由添加另一个处理程序，请改用 `subscribeToRoute()`。

| 方法 | 用途 |
| --- | --- |
| `subscribe(pubSubName, topic, callback, route?, metadata?)` | 注册订阅及处理程序。 |
| `subscribeWithOptions(pubSubName, topic, options)` | 配置回调、metadata、路由、死信主题和批量投递。 |
| `subscribeToRoute(pubSubName, topic, route, callback)` | 为已注册的路由添加处理程序；不会创建运行时订阅。 |
| `subscribeBulk(pubSubName, topic, callback, options?)` | 注册批量投递，回调按条目逐个调用。 |
| `getSubscriptions()` | 按 component 和主题分组查看本地注册情况，包括路由和 Dapr 发现配置。 |

启动后仍可为现有路由附加处理程序，但添加处理程序不会让 Dapr 重新发现新的主题或路由。此接口没有服务端取消订阅的方法。关闭时，请使用 `await server.stop()` 停止应用侧监听器。有关客户端生命周期和序列化，请参阅[配置与使用]({{% ref js-pubsub-usage.md %}})。

## 回调数据与标头

回调接收 `(data, headers)` 两个参数，并应为异步函数。`data` 通常是反序列化后的事件负载，而不是完整的 CloudEvent 信封。

| 投递方式 | 回调的 `headers` |
| --- | --- |
| HTTP 服务端，单条消息 | 传入的 HTTP 请求标头。 |
| HTTP 服务端，批量 | 每个条目的 metadata。 |
| gRPC 服务端，单条或批量 | 传入的 gRPC 请求 metadata，转换为对象。 |

不要假定服务端回调会在 `headers` 中提供 CloudEvent 属性。如果你的应用需要这些属性，请使用[流式回调]({{% ref "js-pubsub-streaming-howto.md#callback-data-and-acknowledgements" %}})，它会明确提供这些属性。

如需接收原始负载，请使用 `subscribeWithOptions()` 并设置 `metadata: { rawPayload: true }`。服务端订阅的 metadata 值在发现之前会被 JSON 字符串化。有关发布端设置以及 streaming subscription 中不同的 metadata 表示形式，请参阅[发布原始负载]({{% ref "js-pubsub-publish-howto.md#raw-payloads" %}})。

## 确认、重试或丢弃

| 处理程序结果 | 确认方式 |
| --- | --- |
| 返回 `DaprPubSubStatusEnum.SUCCESS`，或无返回值地正常结束 | 处理成功。 |
| 返回 `DaprPubSubStatusEnum.RETRY` | 请求重新传递。 |
| 返回 `DaprPubSubStatusEnum.DROP` | 丢弃该消息。 |
| 抛出异常或拒绝 Promise | 记录错误并请求重新传递。 |

返回枚举值，而不是 `{ status: "RETRY" }` 之类的对象。当多个服务端处理程序共享同一路由时，它们会依次执行，合并后的状态优先级为 `RETRY` > `DROP` > `SUCCESS`。

重试与死信转发由 Dapr resiliency 和 pub/sub component 控制，而不是由 SDK 的重试循环控制。请为你的消息代理配置合适的[入站重试策略]({{% ref resiliency-overview.md %}})。例如，将以下内容保存为 `components/resiliency.yaml`，并以 component 名 `pubsub` 为目标：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: pubsub-retries
spec:
  policies:
    retries:
      processing:
        policy: constant
        duration: 500ms
        maxRetries: 10
  targets:
    components:
      pubsub:
        inbound:
          retry: processing
```

处理程序需要具备幂等性：Dapr pub/sub 采用至少一次（at-least-once）的投递语义，消息在处理后可能会再次投递。

## 基于内容的路由

使用 `subscribeWithOptions()` 声明路由，然后用 `subscribeToRoute()` 附加处理程序。Dapr 会根据 CloudEvent 评估 CEL 表达式：

```javascript
await server.pubsub.subscribeWithOptions("pubsub", "routed-orders", {
  route: {
    default: "standard",
    rules: [{ match: 'event.type == "com.example.order.priority"', path: "priority" }],
  },
});

server.pubsub.subscribeToRoute("pubsub", "routed-orders", "standard", async (data) => {
  console.log("Standard order:", data);
});

server.pubsub.subscribeToRoute("pubsub", "routed-orders", "priority", async (data) => {
  console.log("Priority order:", data);
});
```

路由名称是逻辑标识符：SDK 会根据 component、主题和路由生成唯一的回调路径。与路由对象一起提供的 `callback` 会附加到其声明的所有路由上，而不仅是默认路由。

请参阅[消息路由]({{% ref howto-route-messages.md %}})。

## 通配符主题

通配符支持取决于消息代理和 component。对于 MQTT 风格的订阅，在分发 gRPC 回调时，SDK 识别 `#` 表示多级，`+` 表示单级：

```javascript
await server.pubsub.subscribe("pubsub", "sensors/#", async (data) => {
  console.log("Sensor event:", data);
});

await server.pubsub.subscribe("pubsub", "devices/+/temperature", async (data) => {
  console.log("Temperature:", data);
});
```

请使用支持这些主题模式的 component；它们并不是所有 pub/sub 代理都通用的通配符功能。

## 批量订阅

批量投递在 Dapr 与应用之间对消息进行批处理。SDK 仍然会为**每次一个条目**调用你的回调，而不是传入数组。它会为每个条目构造确认响应：

```javascript
await server.pubsub.subscribeBulk(
  "pubsub",
  "bulk-orders",
  async (data) => {
    console.log("Order from batch:", data);
    return DaprPubSubStatusEnum.SUCCESS;
  },
  { maxMessagesCount: 100, maxAwaitDurationMs: 40 },
);
```

选项还接受 `route` 和 `metadata`。省略的批处理上限会使用运行时或 component 的默认值。如需将路由或死信配置与批量投递结合使用，请通过 `subscribeWithOptions()` 设置 `bulkSubscribe: { enabled: true, maxMessagesCount: 100, maxAwaitDurationMs: 40 }`。

在当前版本中，未配置自定义序列化器的 HTTP 批量处理程序会提取 CloudEvent 的 `data`，并解码 `application/octet-stream` 条目，但不会为直接的 `application/json` 或 `text/plain` 条目填充回调数据。对于 HTTP 批量投递，建议使用常规的 Dapr CloudEvent 信封；如需消费这些直接的条目格式，请使用[自定义序列化器]({{% ref "js-pubsub-usage.md#custom-serialization" %}})或 gRPC。

请参阅[Bulk Publish 与订阅]({{% ref pubsub-bulk.md %}})。

## 死信主题

在源订阅上设置 `deadLetterTopic`（区分大小写），并注册一个**独立的订阅**来消费该主题：

```javascript
await server.pubsub.subscribeWithOptions("pubsub", "validated-orders", {
  deadLetterTopic: "orders-deadletter",
  callback: async (data) => {
    if (!data.orderId) {
      return DaprPubSubStatusEnum.RETRY;
    }
    console.log("Validated order:", data);
    return DaprPubSubStatusEnum.SUCCESS;
  },
});

await server.pubsub.subscribe("pubsub", "orders-deadletter", async (data) => {
  console.error("Order requires investigation:", data);
  return DaprPubSubStatusEnum.SUCCESS;
});
```

在处理失败且配置的重试策略耗尽后，由 Dapr 控制转发。

虽然 SDK 提供了 `deadLetterCallback`，但它只会在源订阅上注册一个额外的本地路由。它不会创建对死信主题的订阅，仅指定该回调也不会配置运行时的死信转发。请勿用它代替上面的独立订阅。

请参阅[死信主题]({{% ref pubsub-deadletter.md %}})。
