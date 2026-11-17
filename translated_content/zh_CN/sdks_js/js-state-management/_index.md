---
type: docs
title: "使用 Dapr JavaScript SDK 进行 State Management"
linkTitle: "State Management"
weight: 1800
description: "使用 Dapr JavaScript SDK 保存、读取、删除、执行事务和查询应用状态"
---

使用 `DaprClient.state` 从 JavaScript 或 TypeScript 访问已配置的 Dapr state store component。该客户端支持单键读取与删除、批量保存、批量读取与删除、基于 ETag 的乐观并发控制、多键事务，以及通过 HTTP 或 gRPC 进行的 Query State。

本指南面向 [`@dapr/dapr`](https://www.npmjs.com/package/@dapr/dapr) 3.19.0 或更高版本。State Management 是该包的一部分，不存在单独的 State Management 包或客户端注册步骤。

| 指南 | 你将学到什么 |
|-------|---------------------|
| [操作指南：管理状态]({{% ref js-state-management-howto.md %}}) | 配置存储、保存和读取值、使用 ETag、执行批量操作，以及执行事务。 |
| [状态客户端用法]({{% ref js-state-management-client-usage.md %}}) | 配置客户端、理解响应结构、metadata、序列化、错误处理以及协议差异。 |
| [操作指南：Query State]({{% ref js-state-management-query.md %}}) | 使用 alpha 的 Query API 对状态进行过滤、排序和分页。 |

并非每个 state store 都支持 ETag、事务、TTL 或查询。在依赖这些功能之前，请先查看[支持的 state store]({{% ref "reference/components-reference/supported-state-stores/_index.md" %}})及 component 的参考文档。批量保存和批量删除不能替代原子事务。

本节介绍应用状态，而非 [Actor state manager]({{% ref js-actors %}})。JavaScript SDK 不提供 .NET SDK 那种由源代码生成、按存储划分作用域的状态接口；对每个 `client.state` 操作，都需要传入 component 名称。

## 相关链接

- [State Management 概述]({{% ref state-management-overview.md %}})
- [State Management API 参考]({{% ref state_api.md %}})
- [JavaScript 状态客户端接口](https://github.com/dapr/js-sdk/blob/v3.19.0/src/interfaces/Client/IClientState.ts)
- [HTTP 实现](https://github.com/dapr/js-sdk/blob/v3.19.0/src/implementation/Client/HTTPClient/state.ts) 和 [gRPC 实现](https://github.com/dapr/js-sdk/blob/v3.19.0/src/implementation/Client/GRPCClient/state.ts)
