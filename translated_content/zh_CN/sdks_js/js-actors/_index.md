---
type: docs
title: "用于 Actor 的 JavaScript SDK"
linkTitle: "Actor"
weight: 3000
description: 使用 Dapr JavaScript SDK 编写、托管和调用 virtual Actor
---

Dapr JavaScript SDK 允许 Node.js 应用程序托管 virtual Actor、通过代理或按方法名调用 Actor、管理 Actor 状态，并调度 timer 和持久化的 reminder。

这些指南面向 `@dapr/dapr` 3.19.0 或更高版本。请使用受支持的 Node.js LTS 版本，以及支持你所用 API 的 Dapr 运行时。[操作指南]({{% ref js-actors-howto.md %}}) 使用 HTTP Actor 托管和本地 Dapr environment。

## 选择指南

| 指南 | 学习内容 |
|------|----------|
| <span id="pre-requisites"></span><span id="scenario"></span>[运行并使用 virtual Actor]({{% ref js-actors-howto.md %}}) | 创建契约、实现 Actor、配置 state store，并运行宿主和客户端 |
| <span id="actor-interface"></span><span id="actor-implementation"></span><span id="configuring-actor-runtime"></span>[编写并托管 Actor]({{% ref js-actors-usage.md %}}) | 注册类型、使用生命周期钩子，并配置 Actor 运行时 |
| <span id="invoking-actor-methods"></span>[调用 Actor]({{% ref js-actors-client.md %}}) | 选择 Actor 标识、构建代理、动态调用方法，并了解序列化 |
| <span id="using-states-with-actor"></span>[管理 Actor 状态]({{% ref js-actors-state.md %}}) | 读取、更新、删除、缓存和显式保存 Actor 状态 |
| <span id="actor-timers-and-reminders"></span><span id="actor-timers"></span><span id="actor-reminders"></span>[使用 timer 和 reminder]({{% ref js-actors-timers-reminders.md %}}) | 调度回调、获取和列出 reminder，并执行限定范围或按类型的清理 |

## 协议与运行时支持

应用协议与调用 sidecar 所用的协议是两个独立的选择。

| 能力 | HTTP | gRPC |
|------|------|------|
| 使用 `DaprServer` 托管 JavaScript Actor | 支持 | 未实现 |
| 通过代理或更底层的 Actor 客户端调用 Actor 方法 | 支持 | 支持 |
| 读取 Actor 状态并执行事务；注册和注销 timer 以及单个 reminder | 支持 | 支持 |
| 使用 `getActorReminder` 获取单个 reminder | 支持 | 支持 |
| 使用 `listActorReminders` 列出某个 Actor 的 reminder | Dapr 1.19+ | Dapr 1.17+ |
| 列出某个 Actor 类型所有实例的 reminder | 不支持 | Dapr 1.17+ |
| 使用 `unregisterActorRemindersByType` 批量删除 reminder | 不支持 | Dapr 1.17+ |

gRPC 客户端可以调用由 HTTP 应用托管的 Actor，无需 gRPC Actor 宿主。JavaScript Actor 托管不实现运行时的[应用发起的流]({{% ref actors-app-initiated-streams.md %}})。

SDK 并未暴露运行时的 [Actors API]({{% ref actors_api.md %}}) 的全部功能。例如，本版本 SDK 没有高级的 timer 获取和列出方法，也没有 reminder 的 `overwrite` 和 `failurePolicy` 选项。序列化和重入的限制请参阅各个指南。

## 注册 Actor

请在 `await server.start()` 之前调用 `await server.actor.init()` 和 `await server.actor.registerActor(YourActor)`。注册时公布的是 Actor **类型**，并不会创建每个 Actor 实例。Dapr 会按需激活实例。

注册和配置的详细内容请参阅[编写并托管 Actor]({{% ref js-actors-usage.md %}})，或参考[完整示例]({{% ref js-actors-howto.md %}})。

## 相关链接

- [Actor 概述]({{% ref actors-overview.md %}})
- [Actor 功能与概念]({{% ref actors-features-concepts.md %}})
- [JavaScript SDK Actor 示例](https://github.com/dapr/js-sdk/tree/main/examples/http/actor)
- [停车传感器示例](https://github.com/dapr/js-sdk/tree/main/examples/http/actor-parking-sensor)
