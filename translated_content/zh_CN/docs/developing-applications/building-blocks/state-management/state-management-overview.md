---
type: docs
title: "状态管理概述"
linkTitle: "概述"
weight: 100
description: "状态管理 API 构建块的概述"
---

您的应用程序可以使用 Dapr 的状态管理 API 在[受支持的状态存储]({{% ref supported-state-stores.md %}})中保存、读取和查询键值对。使用状态存储组件，您可以构建有状态的、长时间运行的应用程序，用于保存和检索其状态（例如购物车或游戏会话状态）。例如，在下图中：

- 使用 **HTTP POST** 来保存或查询键值对。
- 使用 **HTTP GET** 来读取特定键并获取其值。

<img src="/images/state-management-overview.png" width=1000 style="padding-bottom:25px;">

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=2_xX6mkU3UCy2Plr&t=6607)展示了 Dapr 状态管理的工作原理。

{{< youtube id=0y7ne6teHT4 start=6607 >}}

## 功能

通过状态管理 API 构建块，您的应用程序可以利用通常构建复杂且容易出错的特性，包括：

- 设置并发控制和数据一致性选项。
- 执行批量更新操作 [CRUD](https://en.wikipedia.org/wiki/Create,_read,_update_and_delete)，包括多个事务性操作。
- 查询和过滤键值数据。

以下是状态管理 API 提供的功能：

### 可插拔状态存储

Dapr 数据存储被建模为组件，可以在不更改服务代码的情况下进行替换。请参阅[受支持的状态存储]({{% ref supported-state-stores %}})查看列表。

### 可配置的状态存储行为

使用 Dapr，您可以在状态操作请求中包含额外的元数据，用于描述您希望如何处理该请求。您可以附加：

- 并发要求
- 一致性要求

默认情况下，您的应用程序应假设数据存储是**最终一致**的，并使用**最后写入胜出（last-write-wins）**的并发模式。

[并非所有存储都是平等的]({{% ref supported-state-stores.md %}})。为了确保应用程序的可移植性，您可以查询存储的元数据功能，并使代码适应不同的存储功能。

#### 并发

Dapr 使用 ETags 支持乐观并发控制（OCC）。当请求状态值时，Dapr 始终将 ETag 属性附加到返回的状态。当用户代码：

- **更新状态**时，预期会通过请求正文附加 ETag。
- **删除状态**时，预期会通过 `If-Match` 标头附加 ETag。

当提供的 ETag 与状态存储中的 ETag 匹配时，`write` 操作成功。

##### 为什么 Dapr 选择乐观并发控制（OCC）

在许多应用程序中，数据更新冲突很少发生，因为客户端在业务上下文中自然分离以操作不同的数据。但是，如果您的应用程序选择使用 ETags，ETag 不匹配可能会导致请求被拒绝。建议您在代码中使用重试策略来补偿使用 ETags 时的冲突。

如果您的应用程序在写入请求中省略 ETags，Dapr 将在处理请求时跳过 ETag 检查。这将启用**最后写入胜出**模式，而使用 ETags 则是**首次写入胜出（first-write-wins）**模式。

{{% alert title="关于 ETags 的说明" color="primary" %}}
对于本身不支持 ETags 的存储，相应的 Dapr 状态存储实现应模拟 ETags，并在处理状态时遵循 Dapr 状态管理 API 规范。由于 Dapr 状态存储实现在技术上是底层数据存储的客户端，因此使用存储提供的并发控制机制进行模拟应该很简单。
{{% /alert %}}

阅读 [API 参考]({{% ref state_api.md %}})以了解如何设置并发选项。

#### 一致性

Dapr 支持**强一致性**和**最终一致性**，默认行为是最终一致性。

- **强一致性**：Dapr 等待所有副本（或指定的法定人数）确认后，才确认写入请求。
- **最终一致性**：Dapr 在底层数据存储接受写入请求后立即返回，即使只是单个副本。

阅读 [API 参考]({{% ref state_api.md %}})以了解如何设置一致性选项。

### 设置内容类型

状态存储组件可能根据内容类型以不同方式维护和操作数据。Dapr 支持在[状态管理 API](#state-management-api)中传递内容类型作为请求元数据的一部分。

设置内容类型是_可选的_，组件决定是否使用它。Dapr 只提供将此信息传递给组件的手段。

- **使用 HTTP API**：通过 URL 查询参数 `metadata.contentType` 设置内容类型。例如，`http://localhost:3500/v1.0/state/store?metadata.contentType=application/json`。
- **使用 gRPC API**：通过在请求元数据中添加键值对 `"contentType" : <content type>` 来设置内容类型。

### 多操作

Dapr 支持两种类型的多读或多写操作：**批量**或**事务**。阅读 [API 参考]({{% ref state_api.md %}})以了解如何使用批量和多选项。

#### 批量读取操作

您可以将多个读取请求分组到批量（或批处理）操作中。在批量操作中，Dapr 将读取请求作为单独的请求提交给底层数据存储，并将它们作为单个结果返回。

#### 事务操作

您可以将写入、更新和删除操作分组到一个请求中，然后作为原子事务处理。该请求将作为事务操作集成功或失败。

### Actor 状态

事务状态存储可用于存储 actor 状态。要指定用于 actor 的状态存储，请在状态存储组件的元数据部分将属性 `actorStateStore` 的值指定为 `true`。Actor 状态以特定方案存储在事务状态存储中，从而允许一致的查询。所有 actor 只能使用单个状态存储组件作为状态存储。如果您的状态存储由分布式数据库支持，您必须确保它提供强一致性。阅读[状态 API 参考]({{% ref state_api.md %}})和 [actor API 参考]({{% ref actors_api.md %}})以了解有关 actor 状态存储的更多信息。

#### Actor 状态的生存时间（TTL）
您在保存 actor 状态时，应始终设置 TTL 元数据字段（`ttlInSeconds`），或使用所选 SDK 中的等效 API 调用，以确保状态最终被删除。阅读 [actor 概述]({{% ref actors-overview.md %}})以获取更多信息。

### 状态加密

Dapr 支持应用程序状态的自动客户端加密，并支持密钥轮换。这适用于所有 Dapr 状态存储。有关更多信息，请阅读[如何：加密应用程序状态]({{% ref howto-encrypt-state.md %}})主题。

### 应用程序之间共享状态

不同的应用程序在共享状态方面的需求各不相同。在一种场景中，您可能希望将所有状态封装在给定的应用程序中，并让 Dapr 为您管理访问。在另一种场景中，您可能希望两个应用程序处理相同的状态以获取和保存相同的键。

Dapr 使状态能够：

- 隔离到应用程序。
- 在应用程序之间的状态存储中共享。
- 在不同状态存储之间的多个应用程序之间共享。

有关更多详细信息，请阅读[如何：在应用程序之间共享状态]({{% ref howto-share-state.md %}})

### 启用发件箱模式

Dapr 使开发者能够使用发件箱模式在事务状态存储和任何消息代理之间实现单个事务。有关更多信息，请阅读[如何启用事务性发件箱消息传递]({{% ref howto-outbox.md %}})

### 查询状态

有两种查询状态的方式：

- 使用 Dapr 运行时中提供的状态管理查询 API。
- 使用存储的原生 SDK 直接查询状态存储。

#### 查询 API

使用_可选的_状态管理[查询 API]({{% ref "reference/api/state_api.md#query-state" %}})，您可以查询保存在状态存储中的键值数据，而不管底层数据库或存储技术如何。使用状态管理查询 API，您可以过滤、排序和分页键值数据。有关更多详细信息，请阅读[如何：查询状态]({{% ref howto-state-query-api.md %}})。

#### 直接查询状态存储

Dapr 保存和检索状态值时不进行任何转换。您可以直接从[底层状态存储]({{% ref query-state-store %}})查询和聚合状态。
例如，要在 Redis 中获取与应用程序 ID "myApp" 关联的所有状态键，请使用：

```bash
KEYS "myApp*"
```

{{% alert title="关于直接查询的说明" color="primary" %}}
由于您不是通过 Dapr 运行时调用，因此状态存储的直接查询不受 Dapr 并发控制约束。您看到的是已提交数据的快照，可用于跨多个 actor 的只读查询。写入应通过 Dapr 状态管理或 actor API 完成。
{{% /alert %}}

##### 查询 actor 状态

如果数据存储支持 SQL 查询，您可以使用 SQL 查询 actor 的状态。例如：

```sql
SELECT * FROM StateTable WHERE Id='<app-id>||<actor-type>||<actor-id>||<key>'
```

您还可以通过跨 actor 实例执行聚合查询来避免 actor 框架的常见基于回合的并发限制。例如，要计算所有温度计 actor 的平均温度，请使用：

```sql
SELECT AVG(value) FROM StateTable WHERE Id LIKE '<app-id>||<thermometer>||*||temperature'
```

### 状态生存时间（TTL）

Dapr 支持[每个状态设置请求的生存时间（TTL）]({{% ref state-store-ttl.md %}})。这意味着应用程序可以为每个存储的状态设置生存时间，这些状态在过期后无法检索。

### 状态管理 API

状态管理 API 可在[状态管理 API 参考]({{% ref state_api.md %}})中找到，该参考描述了如何通过提供键来检索、保存、删除和查询状态值。

## 尝试状态管理

### 快速入门和教程

想要测试 Dapr 状态管理 API？通过以下快速入门和教程了解状态管理的实际应用：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [状态管理快速入门]({{% ref statemanagement-quickstart.md %}}) | 使用状态管理 API 创建有状态的应用程序。 |
| [Hello World](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-world)            | _推荐_ <br> 演示如何在本地运行 Dapr。突出显示服务调用和状态管理。  |
| [Hello World Kubernetes](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes)       | _推荐_ <br> 演示如何在 Kubernetes 中运行 Dapr。突出显示服务调用和_状态管理_。  |

### 直接在应用程序中开始使用状态管理

想跳过快速入门？没问题。您可以直接在应用程序中试用状态管理构建块。[安装 Dapr]({{% ref "getting-started/_index.md" %}})后，您可以从[状态管理操作指南]({{% ref howto-get-save-state.md %}})开始使用状态管理 API。

## 后续步骤

- 开始学习状态管理操作指南，从以下开始：
  - [如何：保存和获取状态]({{% ref howto-get-save-state.md %}})
  - [如何：构建有状态服务]({{% ref howto-stateful-service.md %}})
- 查看[状态存储组件]({{% ref supported-state-stores.md %}})列表
- 阅读[状态管理 API 参考]({{% ref state_api.md %}})
- 阅读[actor API 参考]({{% ref actors_api.md %}})
