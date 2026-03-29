---
type: docs
title: "Azure Cosmos DB"
linkTitle: "Azure Cosmos DB"
weight: 1000
description: "使用 Azure Cosmos DB 作为状态存储"
---

Dapr 在保存和检索状态时不会转换状态值。Dapr 要求所有状态存储实现遵守特定的键格式方案（参见[状态管理规范]({{% ref state_api.md %}}）。您可以直接与底层存储交互来操作状态数据，例如：

- 查询状态。
- 创建聚合视图。
- 制作备份。

{{% alert title="注意" color="primary" %}}
Azure Cosmos DB 是一个支持多种 API 的多模态数据库。默认的 Dapr Cosmos DB 状态存储实现使用 [Azure Cosmos DB SQL API](https://docs.microsoft.com/azure/cosmos-db/sql-query-getting-started)。

{{% /alert %}}

## 连接到 Azure Cosmos DB

要连接到您的 Cosmos DB 实例，您可以：

- 使用 [Azure 管理门户](https://portal.azure.com)上的数据资源管理器。
- 使用[各种 SDK 和工具](https://docs.microsoft.com/azure/cosmos-db/mongodb-introduction)。

{{% alert title="注意" color="primary" %}}
当您为 Dapr 配置 Azure Cosmos DB 时，请指定要使用的确切数据库和集合。以下 Cosmos DB [SQL API](https://docs.microsoft.com/azure/cosmos-db/sql-query-getting-started) 示例假设您已经连接到正确的数据库和一个名为 "states" 的集合。

{{% /alert %}}

## 按 App ID 列出键

要获取与应用程序 "myapp" 关联的所有状态键，请使用以下查询：

```sql
SELECT * FROM states WHERE CONTAINS(states.id, 'myapp||')
```

上述查询返回 id 包含 "myapp-" 的所有文档，这是状态键的前缀。

## 获取特定状态数据

要获取应用程序 "myapp" 中键为 "balance" 的状态数据，请使用以下查询：

```sql
SELECT * FROM states WHERE states.id = 'myapp||balance'
```

读取返回文档中的 **value** 字段。要获取状态版本/ETag，请使用以下命令：

```sql
SELECT states._etag FROM states WHERE states.id = 'myapp||balance'
```

## 读取 Actor 状态

要获取应用程序 ID 为 "mypets" 中 Actor 类型为 "cat" 且实例 ID 为 "leroy" 的 Actor 关联的所有状态键，请使用以下命令：

```sql
SELECT * FROM states WHERE CONTAINS(states.id, 'mypets||cat||leroy||')
```

而要获取特定的 Actor 状态（如 "food"），请使用以下命令：

```sql
SELECT * FROM states WHERE states.id = 'mypets||cat||leroy||food'
```

{{% alert title="警告" color="warning" %}}
不应手动更新或删除存储中的状态。所有写入和删除操作应通过 Dapr 运行时完成。**唯一的例外：** 通常需要删除状态存储中的 Actor 记录，_一旦您知道这些记录已不再使用_，以防止未使用的 Actor 实例堆积而可能永远无法再次加载。

{{% /alert %}}
