---
type: docs
title: "使用 JavaScript SDK 进行 service invocation"
linkTitle: "service invocation"
weight: 2500
description: "使用 JavaScript SDK 通过 HTTP 或 gRPC 调用服务并接收调用请求"
no_list: true
---

使用 `DaprClient.invoker.invoke()` 通过本地 Dapr sidecar 调用其他应用，使用 `DaprServer.invoker.listen()` 接收调用请求。调用目标也可以是不使用 JavaScript SDK 的现有 HTTP 应用。

本组指南介绍 `@dapr/dapr` 3.19.0 或更高版本，包括 API 与传输方式的限制。

## 前提条件

- [Dapr CLI]({{% ref install-dapr-cli.md %}})，以及一个[已初始化的 Dapr environment]({{% ref install-dapr-selfhost.md %}})。
- 受支持的 Node.js LTS 版本。该包要求 Node.js 18 或更高版本。
- 一个正在运行的目标应用，并已配置 App ID 和应用端口。不需要 state store 或 pub/sub component。

安装 3.19.0 版本：

```sh
npm install @dapr/dapr@3.19.0
```

如需使用更新的版本，请替换为对应的版本号。示例使用 ES 模块导入；包含 `await` 的代码片段请在 async 函数或 ES 模块中运行。

## 选择协议

客户端的 `communicationProtocol` 选择**应用到 sidecar**的通信方式。接收方应用的 `--app-protocol` 选择**sidecar 到应用**的通信方式。两者相互独立：gRPC 客户端可以调用 HTTP 应用，HTTP 客户端也可以调用配置为 gRPC 的 `DaprServer`。

| 能力 | HTTP 客户端或服务端 | gRPC 客户端或服务端 |
| --- | --- | --- |
| `client.invoker.invoke()` | 调用 HTTP 调用 API | 调用 Dapr 的一元 `InvokeService` API |
| `server.invoker.listen()` | 注册一个 HTTP 路由 | 注册一个 `AppCallback.OnInvoke` handler |
| 请求动词 | `GET`、`POST`、`PUT`、`PATCH`、`DELETE` | 与 HTTP 相同的动词，通过 HTTP 扩展携带 |
| 自定义请求头 | 会转发 `options.headers` | 不会作为调用 metadata 转发 |
| SDK 客户端的查询参数 | 将编码后的查询字符串附加到 `methodName` | 没有单独的查询字符串选项 |
| 默认的响应解码 | 可解析时为 JSON，否则为文本 | 必须为 JSON；文本或空响应会导致解析错误 |
| 自定义应用序列化器 | 支持 | 支持 |
| 通过 `invoke()` 获取响应状态和响应头 | 不提供 | 不提供 |
| 通过 `invoke()` 进行流式传输 | 不支持；响应会被缓冲 | 不支持；为一元请求/响应 |
| `client.proxy.create()` | 不支持 | 在 SDK 的 ConnectRPC 传输下不支持 |

选择 gRPC 并不会使 `invoke()` 变成可调用任意 protobuf 服务的客户端。对于原生 gRPC 服务，请使用你生成的客户端，并配合 Dapr 的[gRPC 代理协议]({{% ref howto-invoke-services-grpc.md %}})。

## 指南

| 指南 | 内容 |
| --- | --- |
| [调用服务]({{% ref js-service-invocation-howto.md %}}) | HTTP 与 gRPC 客户端、动词、请求头、路径、查询字符串、namespace 以及 non-Dapr endpoint。 |
| [接收调用请求]({{% ref js-service-invocation-server.md %}}) | 一个完整的服务端、HTTP 与 gRPC 的启动命令、回调数据、返回值以及现有的 Express 应用。 |
| [配置与用法]({{% ref js-service-invocation-usage.md %}}) | 客户端生命周期、端点、身份验证、序列化、错误、resiliency 以及 API 限制。 |

## 实现参考

- [已发布的 3.19.0 版本包](https://www.npmjs.com/package/@dapr/dapr/v/3.19.0)
- [客户端调用实现：HTTP](https://github.com/dapr/js-sdk/blob/main/src/implementation/Client/HTTPClient/invoker.ts)和 [gRPC](https://github.com/dapr/js-sdk/blob/main/src/implementation/Client/GRPCClient/invoker.ts)
- [服务端调用实现：HTTP](https://github.com/dapr/js-sdk/blob/main/src/implementation/Server/HTTPServer/invoker.ts)和 [gRPC 回调](https://github.com/dapr/js-sdk/blob/main/src/implementation/Server/GRPCServer/GRPCServerImpl.ts)
- [调用序列化集成测试](https://github.com/dapr/js-sdk/blob/main/test/e2e/common/server.test.ts)
- [service invocation API 参考]({{% ref service_invocation_api.md %}})
