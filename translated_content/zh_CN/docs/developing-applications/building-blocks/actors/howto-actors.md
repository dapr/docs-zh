---
type: docs
title: "如何：通过脚本与虚拟 Actor 交互"
linkTitle: "如何：与虚拟 Actor 交互"
weight: 70
description: 调用 Actor 方法进行状态管理
---

学习如何通过调用 HTTP/gRPC 端点来使用虚拟 Actor。

## 调用 Actor 方法

你可以通过调用 HTTP/gRPC 端点与 Dapr 交互，以调用 Actor 方法。

```html
POST/GET/PUT/DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/method/<method>
```

在请求正文中提供 Actor 方法的数据。请求的响应（即来自 Actor 方法调用的数据）位于响应正文中。

有关更多详细信息，请参阅 [Actor API 规范]({{% ref "actors_api#invoke-actor-method" %}})。

{{% alert title="注意" color="primary" %}}
或者，你可以使用 [Dapr SDK 来使用 Actor]({{% ref "developing-applications/sdks/#sdk-languages" %}})。
{{% /alert %}}

## 使用 Actor 保存状态

你可以通过 HTTP/gRPC 端点与 Dapr 交互，利用 Dapr Actor 状态管理能力可靠地保存状态。

要使用 Actor，你的状态存储必须支持多项事务。这意味着你的状态存储组件必须实现 `TransactionalStore` 接口。

[查看支持事务/Actor 的组件列表]({{% ref supported-state-stores %}})。所有 Actor 只能使用单个状态存储组件作为状态存储。

## 在本地检查 Actor

在本地开发时，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看应用注册的 Actor 类型，以及每种类型的活跃 Actor 数量。在 **State** 页面中，选择 **Show internal keys**，即可查看存储在状态存储中的 Actor 状态。这有助于验证你的 Actor 方法是否按预期保存了状态。

## 后续步骤

{{< button text="Actor 重入 >>" page="actor-reentrancy.md" >}}

## 相关链接

- 参阅 [Dapr SDK 文档和示例]({{% ref "developing-applications/sdks/_index.md#sdk-languages" %}})。
- [Actor API 参考]({{% ref actors_api %}})
- [Actor 概述]({{% ref actors-overview %}})
