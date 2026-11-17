---
type: docs
title: "State Management 概述"
linkTitle: "概述"
weight: 100
description: "State Management API building block 的概述"
---

你的应用可以使用 Dapr 的 State Management API，在[受支持的 state store]({{% ref supported-state-stores.md %}})中保存、读取和查询键值对。使用 state store component，你可以构建有状态的、长时间运行的应用程序，用于保存和检索其状态（例如购物车或游戏会话状态）。例如，在下图中：

- 使用 **HTTP POST** 来保存或查询键值对。
- 使用 **HTTP GET** 来读取特定键并获取其值。

{{< diagram state-management-overview >}}

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=2_xX6mkU3UCy2Plr&t=6607)展示了 Dapr State Management 的工作原理。

{{< youtube id=0y7ne6teHT4 start=6607 >}}

## 功能

通过 State Management API building block，你的应用可以利用通常构建起来复杂且容易出错的特性，包括：

- 设置并发控制和数据一致性选项。
- 执行批量更新操作 [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete)，包括多个事务性操作。
- 查询和过滤键值数据。

以下是 State Management API 提供的功能：

### 可插拔 state store

Dapr 数据存储被建模为 component，可以在不更改服务代码的情况下进行替换。请参阅[受支持的 state store]({{% ref supported-state-stores %}})查看列表。

### 可配置的 state store 行为

使用 Dapr，你可以在状态操作请求中包含额外的 metadata，用于描述你希望如何处理该请求。你可以附加：

- 并发要求
- 一致性要求

默认情况下，你的应用应假设数据存储是**最终一致**的，并使用**最后写入胜出（last-write-wins）**的并发模式。

[并非所有存储都是平等的]({{% ref supported-state-stores.md %}})。为了确保应用的可移植性，你可以查询存储的 metadata 功能，并使代码适应不同的存储功能。

#### 并发

Dapr 使用 ETag 支持乐观并发控制（OCC）。当请求状态值时，Dapr 始终将 ETag 属性附加到返回的状态。当用户代码：

- **更新状态**时，应通过请求正文附加 ETag。
- **删除状态**时，应通过 `If-Match` 标头附加 ETag。

当提供的 ETag 与 state store 中的 ETag 匹配时，`write` 操作成功。

##### 为什么 Dapr 选择乐观并发控制（OCC）

在许多应用程序中，数据更新冲突很少发生，因为客户端在业务上下文中自然分离，各自操作不同的数据。但是，如果你的应用选择使用 ETag，ETag 不匹配可能会导致请求被拒绝。建议你在代码中使用重试策略，以补偿使用 ETag 时产生的冲突。

如果你的应用在写入请求中省略 ETag，Dapr 在处理请求时将跳过 ETag 检查。这将启用**最后写入胜出**模式，而使用 ETag 则是**首次写入胜出（first-write-wins）**模式。

{{% alert title="关于 ETag 的说明" color="primary" %}}
对于本身不支持 ETag 的存储，相应的 Dapr state store 实现应模拟 ETag，并在处理状态时遵循 Dapr State Management API 规范。由于 Dapr state store 实现在技术上是底层数据存储的客户端，因此使用存储提供的并发控制机制进行模拟应该很简单。
{{% /alert %}}

阅读 [API 参考]({{% ref state_api.md %}})，了解如何设置并发选项。

#### 一致性

Dapr 同时支持**强一致性**和**最终一致性**，默认行为是最终一致性。

- **强一致性**：Dapr 等待所有副本（或指定的法定人数）确认后，才确认写入请求。
- **最终一致性**：Dapr 在底层数据存储接受写入请求后立即返回，即使只是单个副本。

阅读 [API 参考]({{% ref state_api.md %}})，了解如何设置一致性选项。

### 设置内容类型

state store component 可能会根据内容类型以不同方式维护和处理数据。Dapr 支持在[State Management API](#state-management-api)中，将内容类型作为请求 metadata 的一部分进行传递。

设置内容类型是_可选的_，由 component 决定是否使用。Dapr 只提供将此信息传递给 component 的手段。

- **使用 HTTP API**：通过 URL 查询参数 `metadata.contentType` 设置内容类型。例如，`http://localhost:3500/v1.0/state/store?metadata.contentType=application/json`。
- **使用 gRPC API**：在请求 metadata 中添加键值对 `"contentType" : <content type>`，以设置内容类型。

### 多操作

Dapr 支持两种类型的多读或多写操作：**批量**或**事务**。阅读 [API 参考]({{% ref state_api.md %}})，了解如何使用批量和多操作选项。

#### 批量读取操作

你可以将多个读取请求分组到一个批量（或批处理）操作中。在批量操作中，Dapr 将读取请求作为单独的请求提交给底层数据存储，并将它们作为单个结果返回。

#### 事务操作

你可以将写入、更新和删除操作分组到一个请求中，这些操作将作为一个原子事务进行处理。该请求将作为一组事务性操作整体成功或失败。

### Actor 状态

事务 state store 可用于存储 Actor 状态。要指定 Actor 使用的 state store，请在 state store component 的 metadata 部分将属性 `actorStateStore` 的值设为 `true`。Actor 状态以特定方案存储在事务 state store 中，从而支持一致的查询。所有 Actor 只能使用单个 state store component 作为其 state store。如果你的 state store 由分布式数据库支持，必须确保它提供强一致性。阅读[状态 API 参考]({{% ref state_api.md %}})和 [Actor API 参考]({{% ref actors_api.md %}})，了解有关 Actor state store 的更多信息。

#### Actor 状态的生存时间（TTL）
保存 Actor 状态时，你应始终设置 TTL metadata 字段（`ttlInSeconds`），或使用所选 SDK 中的等效 API 调用，以确保状态最终会被移除。阅读 [Actor 概述]({{% ref actors-overview.md %}})了解更多信息。

### 状态加密

Dapr 支持对应用状态进行自动客户端加密，并支持密钥轮换。这适用于所有 Dapr state store。有关更多信息，请阅读[如何：加密应用状态]({{% ref howto-encrypt-state.md %}})主题。

### 应用程序之间共享状态

不同应用程序对共享状态的需求各不相同。在一种场景中，你可能希望将所有状态封装在给定的应用程序内，并让 Dapr 为你管理访问。在另一种场景中，你可能希望两个应用程序处理相同的状态，以获取和保存相同的键。

Dapr 使状态能够：

- 隔离到应用程序内。
- 在 state store 中于应用程序之间共享。
- 跨不同 state store 在多个应用程序之间共享。

有关更多详细信息，请阅读[如何：在应用程序之间共享状态]({{% ref howto-share-state.md %}})。

### 启用发件箱模式

Dapr 让开发者能够使用发件箱模式，在事务 state store 与任何消息代理之间实现单个事务。有关更多信息，请阅读[如何启用事务性发件箱消息传递]({{% ref howto-outbox.md %}})。

### 查询状态

有两种查询状态的方式：

- 使用 Dapr runtime 中提供的 State Management Query API。
- 使用存储自身的原生 SDK 直接查询 state store。

#### Query API

使用_可选的_ State Management [Query API]({{% ref "reference/api/state_api.md#query-state" %}})，你可以查询保存在 state store 中的键值数据，而无需关心底层数据库或存储技术。借助 State Management Query API，你可以对键值数据进行过滤、排序和分页。有关更多详细信息，请阅读[如何：Query State]({{% ref howto-state-query-api.md %}})。

#### 直接查询 state store

Dapr 保存和检索状态值时不进行任何转换。你可以直接从[底层 state store]({{% ref query-state-store %}})查询和聚合状态。
例如，要在 Redis 中获取与应用程序 ID "myApp" 关联的所有状态键，请使用：

```bash
KEYS "myApp*"
```

{{% alert title="关于直接查询的说明" color="primary" %}}
由于你不是通过 Dapr runtime 进行调用，因此 state store 的直接查询不受 Dapr 并发控制的约束。你看到的是已提交数据的快照，可用于跨多个 Actor 的只读查询。写入应通过 Dapr State Management 或 Actor API 完成。
{{% /alert %}}

##### 查询 Actor 状态

如果数据存储支持 SQL 查询，你可以使用 SQL 查询 Actor 的状态。例如：

```sql
SELECT * FROM StateTable WHERE Id='<app-id>||<actor-type>||<actor-id>||<key>'
```

你还可以通过跨 Actor 实例执行聚合查询，来避免 Actor 框架常见的基于轮次的并发限制。例如，要计算所有温度计 Actor 的平均温度，请使用：

```sql
SELECT AVG(value) FROM StateTable WHERE Id LIKE '<app-id>||<thermometer>||*||temperature'
```

### 状态生存时间（TTL）

Dapr 支持[每个状态设置请求的生存时间（TTL）]({{% ref state-store-ttl.md %}})。这意味着应用程序可以为每个存储的状态设置生存时间，这些状态在过期后将无法被检索。

### State Management API

State Management API 可在[State Management API 参考]({{% ref state_api.md %}})中找到，该参考描述了如何通过提供键来检索、保存、删除和查询状态值。

## 尝试 State Management

### Quickstart 和教程

想要测试 Dapr State Management API 吗？通过以下 Quickstart 和教程，了解 State Management 的实际应用：

| Quickstart/教程 | 描述 |
| ------------------- | ----------- |
| [State Management Quickstart]({{% ref statemanagement-quickstart.md %}}) | 使用 State Management API 创建有状态的应用程序。 |
| [Hello World](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world)            | _推荐_ <br> 演示如何在本地运行 Dapr。重点介绍 service invocation 和 State Management。  |
| [Hello World Kubernetes](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes)       | _推荐_ <br> 演示如何在 Kubernetes 中运行 Dapr。重点介绍 service invocation 和_State Management_。  |

### 直接在应用程序中开始使用 State Management

不想先看 Quickstart？没问题。你可以直接在应用程序中试用 State Management building block。[安装 Dapr]({{% ref "getting-started/_index.md" %}})后，即可从[State Management 操作指南]({{% ref howto-get-save-state.md %}})开始使用 State Management API。

### 在本地检查状态

在本地开发期间，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 浏览 state store 中的记录，包括 Dapr 写入的 `<app-id>||<key>` 前缀；解码 base64 编码的值；无需编写任何代码，即可添加或删除记录。

## 后续步骤

- 先从以下 State Management 操作指南开始学习：
  - [如何：保存和获取状态]({{% ref howto-get-save-state.md %}})
  - [如何：构建有状态服务]({{% ref howto-stateful-service.md %}})
- 查看[state store component]({{% ref supported-state-stores.md %}})列表
- 阅读[State Management API 参考]({{% ref state_api.md %}})
- 阅读 [Actor API 参考]({{% ref actors_api.md %}})
