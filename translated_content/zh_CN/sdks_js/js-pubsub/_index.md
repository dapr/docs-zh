---
type: docs
title: "使用 JavaScript SDK 进行发布和订阅"
linkTitle: "发布和订阅"
weight: 3000
description: "选择 pub/sub 投递模式，开始使用事件发布、服务端订阅或 gRPC 流式传输"
no_list: true
---

JavaScript SDK 支持通过 HTTP 或 gRPC 发布事件，支持通过 `DaprServer` 进行 programmatic subscription，也支持通过 `DaprClient` 由客户端发起的 streaming subscription。本组指南介绍的是 `@dapr/dapr` 3.19.0 或更高版本。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}}) 以及[已初始化的 Dapr environment]({{% ref install-dapr-selfhost.md %}})。
- 受支持的 Node.js LTS 版本。该包要求 Node.js 18 或更高版本。
- 已配置的[pub/sub component]({{% ref supported-pubsub %}})。示例使用 component 名 `pubsub` 和主题 `orders`。

## 安装

安装 3.19.0 版本：

```sh
npm install @dapr/dapr@3.19.0
```

如需安装更新的版本，请替换为对应的版本号。

代码片段使用 ES 模块导入。包含 `await` 的语句请在 async 函数或 ES 模块中运行。每篇指南都会说明其示例所使用的客户端或服务端配置。

## 选择投递模式

| 能力 | HTTP | gRPC |
| --- | --- | --- |
| `client.pubsub.publish()` | 支持 | 支持 |
| `client.pubsub.publishBulk()` | 支持 | 支持 |
| `server.pubsub.subscribe()` 和 `subscribeWithOptions()` | 入站 HTTP 回调 | 入站 gRPC 回调 |
| 基于内容的路由和 `subscribeToRoute()` | 支持 | 支持 |
| `server.pubsub.subscribeBulk()` | 每批次中逐条消息的回调 | 每批次中逐条消息的回调 |
| `client.pubsub.subscribeStream()` | 不支持 | 由客户端发起的流，无需应用服务器 |

当 Dapr 需要将事件投递到应用的 HTTP 或 gRPC 监听器时，请选择服务端订阅。订阅会在应用启动时被发现。对于主动连接 Dapr、且不需要应用回调监听器的工作进程，请选择 streaming subscription。流可以在运行时创建和关闭，但不支持路由规则和批量订阅选项。

## 运行时兼容性

在 Dapr 1.17 或更高版本上，批量发布使用稳定 API；在较旧的运行时上，会自动回退到已弃用的 alpha1 API。

streaming subscription 使用 `SubscribeTopicEventsAlpha1`，这是一个处于 alpha 的 gRPC API。请使用实现了该 API 的运行时；仅安装 JavaScript 包并不会启用它。API 的可用性以及特定于 broker 的功能取决于 Dapr runtime 和 component。

## 指南

| 指南 | 内容 |
| --- | --- |
| [发布事件]({{% ref js-pubsub-publish-howto.md %}}) | 单条与批量发布、metadata、CloudEvents、原始负载以及发布失败。 |
| [服务端订阅]({{% ref js-pubsub-subscribe-howto.md %}}) | 注册、回调数据、确认、路由、通配符、批量投递以及死信主题。 |
| [streaming subscription]({{% ref js-pubsub-streaming-howto.md %}}) | 一个完整的工作进程示例、流式选项、取消、故障监督以及清理。 |
| [配置与用法]({{% ref js-pubsub-usage.md %}}) | 客户端生命周期、端点与身份验证设置、序列化以及可靠处理。 |

## 实现参考

有关实现细节，请参阅已发布的 [3.19.0 包](https://www.npmjs.com/package/@dapr/dapr/v/3.19.0) 以及上游 SDK 实现：

- [客户端 pub/sub 接口](https://github.com/dapr/js-sdk/blob/main/src/interfaces/Client/IClientPubSub.ts)
- [服务端 pub/sub 接口](https://github.com/dapr/js-sdk/blob/main/src/interfaces/Server/IServerPubSub.ts)
- [streaming subscription 类型](https://github.com/dapr/js-sdk/blob/main/src/types/pubsub/PubSubStreamingSubscription.type.ts)
- [流式集成示例](https://github.com/dapr/js-sdk/blob/main/test/e2e/grpc/pubsub-stream-client.test.ts)
- [Dapr pub/sub API 参考]({{% ref pubsub_api.md %}})
