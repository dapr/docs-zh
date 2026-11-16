---
type: docs
title: "JavaScript 发布订阅的配置与用法"
linkTitle: "配置与用法"
weight: 3400
description: "配置发布订阅客户端的生命周期、端点、身份验证、序列化以及可靠的消息处理"
---

本指南介绍使用 `@dapr/dapr` 3.19.0 或更高版本进行发布订阅时的通用配置与运维指导。请参阅[概述]({{% ref js-pubsub %}})，以在服务端回调与流式订阅之间做出选择。

## 客户端生命周期

应复用长期存活的 `DaprClient`，而不是为每条消息创建一个。关闭时，在调用 `await client.stop()` 之前，先等待所有未完成的操作结束。

对于服务端订阅，使用 `await server.stop()` 停止应用的监听器。对于流式订阅，先关闭每个订阅，并等待其 `closed` Promise 完成，然后再停止客户端；`client.stop()` 不会关闭流。参见[流式生命周期指南]({{% ref "js-pubsub-streaming-howto.md#supervise-failures-and-shut-down" %}})。

## 端点与身份验证

默认协议为 HTTP。若要显式配置 gRPC 连接：

```javascript
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

const client = new DaprClient({
  daprHost: "127.0.0.1",
  daprPort: "50001",
  communicationProtocol: CommunicationProtocolEnum.GRPC,
  daprApiToken: process.env.DAPR_API_TOKEN,
});
```

若使用 HTTP，请选择 `CommunicationProtocolEnum.HTTP`，端口设为 `"3500"`。端口选项为字符串。应用回调的协议和端口需要在 `DaprServer` 上单独配置；参见[服务端订阅]({{% ref js-pubsub-subscribe-howto.md %}})。

若省略显式的连接设置，SDK 会使用所选协议对应的环境变量设置：

| 设置项 | 行为 |
| --- | --- |
| `DAPR_HTTP_ENDPOINT` / `DAPR_GRPC_ENDPOINT` | 在省略显式的主机与端口设置时，提供所选协议的边车端点。 |
| `DAPR_HTTP_PORT` / `DAPR_GRPC_PORT` | 在未另行配置时，提供边车端口；默认值分别为 `3500` 和 `50001`。 |
| `DAPR_API_TOKEN` | 在省略 `daprApiToken` 时，提供身份验证令牌。 |

## 自定义序列化

通过 `DaprClient` 的 `serializer` 选项配置 `IDaprSerializer`。它负责在应用负载与**字符串**之间相互转换，并可提供 `contentType`。它适用于单条发布、批量发布以及流式回调。对于服务端回调，请通过 `DaprServer` 的 `clientOptions.serializer` 进行配置。

```javascript
import { DaprClient, DaprServer } from "@dapr/dapr";

const serializer = {
  contentType: "application/json",
  serialize(value) {
    return JSON.stringify({ payload: value });
  },
  deserialize(data) {
    return JSON.parse(data).payload;
  },
};

const customClient = new DaprClient({ serializer });
const customServer = new DaprServer({
  serverHost: "127.0.0.1",
  serverPort: "50003",
  clientOptions: { serializer },
});
```

两端应使用兼容的序列化器。自定义序列化器会替换默认的负载编码，它不会自动保留所提供的 CloudEvent 封装。TypeScript 类型参数不提供运行时校验，也不会重新创建类实例。TypeScript 应用可以从 `@dapr/dapr` 以类型的方式导入 `IDaprSerializer`。

特定传输方式的序列化限制，记录在[批量发布]({{% ref "js-pubsub-publish-howto.md#bulk-publishing" %}})和[批量订阅]({{% ref "js-pubsub-subscribe-howto.md#bulk-subscriptions" %}})的相关说明旁。

## 可靠的消息处理

请在应用的错误边界内等待 SDK 操作完成。发布失败时的行为因传输方式而异，批量发布即使其 Promise 已解决，也可能部分失败；参见[发布错误处理]({{% ref "js-pubsub-publish-howto.md#publish-error-handling" %}})。

订阅者应保证幂等，并在返回确认之前等待所有处理完成。Dapr 发布订阅提供至少一次投递的语义，因此已成功处理的消息仍可能被重新投递。应通过 Dapr 弹性策略和组件设置来配置重试，不要假设 SDK 会重试每一次失败。

关于各投递模式的具体行为，请参见[服务端确认与重试配置]({{% ref "js-pubsub-subscribe-howto.md#acknowledge-retry-or-drop" %}})和[流式失败的监督]({{% ref "js-pubsub-streaming-howto.md#supervise-failures-and-shut-down" %}})。
