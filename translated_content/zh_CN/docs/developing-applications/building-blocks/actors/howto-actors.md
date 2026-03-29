---
type: docs
title: "如何：通过脚本与虚拟 actor 交互"
linkTitle: "如何：与虚拟 actor 交互"
weight: 70
description: 调用 actor 方法进行状态管理
---

学习如何通过调用 HTTP/gRPC 端点来使用虚拟 actor。

## 调用 actor 方法

您可以通过调用 HTTP/gRPC 端点与 Dapr 交互来调用 actor 方法。

```html
POST/GET/PUT/DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/method/<method>
```

在请求正文中提供 actor 方法的数据。请求的响应（来自 actor 方法调用的数据）位于响应正文中。

有关更多详细信息，请参阅 [Actor API 规范]({{% ref "actors_api#invoke-actor-method" %}})。

{{% alert title="注意" color="primary" %}}
或者，您可以使用 [Dapr SDK 来使用 actor]({{% ref "developing-applications/sdks/#sdk-languages" %}})。
{{% /alert %}}

## 使用 actor 保存状态

您可以通过 HTTP/gRPC 端点与 Dapr 交互，利用 Dapr actor 状态管理功能可靠地保存状态。

要使用 actor，您的状态存储必须支持多项目事务。这意味着您的状态存储组件必须实现 `TransactionalStore` 接口。

[查看支持事务/actor 的组件列表]({{% ref supported-state-stores %}})。所有 actor 只能使用单个状态存储组件作为状态存储。

## 后续步骤

{{< button text="Actor 重入 >>" page="actor-reentrancy.md" >}}

## 相关链接

- 参考 [Dapr SDK 文档和示例]({{% ref "developing-applications/sdks/_index.md#sdk-languages" %}})。
- [Actor API 参考]({{% ref actors_api %}})
- [Actor 概述]({{% ref actors-overview %}})
