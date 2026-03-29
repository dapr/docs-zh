---
type: docs
title: "SQL Server"
linkTitle: "SQL Server"
weight: 3000
description: "使用 SQL Server 作为后端状态存储"
---

Dapr 在保存和检索状态时不会转换状态值。Dapr 要求所有状态存储实现都遵守一定的键格式方案（请参阅[状态管理规范]({{% ref state_api.md %}})）。你可以直接与底层存储交互来操作状态数据，例如：

- 查询状态。
- 创建聚合视图。
- 进行备份。

## 连接到 SQL Server

连接 SQL Server 实例最简单的方式是使用：

- [Azure Data Studio](https://docs.microsoft.com/sql/azure-data-studio/download-azure-data-studio)（Windows、macOS、Linux）
- [SQL Server Management Studio](https://docs.microsoft.com/sql/ssms/download-sql-server-management-studio-ssms)（Windows）

{{% alert title="注意" color="primary" %}}
为 Dapr 配置 Azure SQL 数据库时，需要指定要使用的确切表名。以下 Azure SQL 示例假设你已经连接到正确的数据库，且表中有一个名为 "states" 的表。

{{% /alert %}}


## 按 App ID 列出键

要获取与应用程序 "myapp" 关联的所有状态键，请使用以下查询：

```sql
SELECT * FROM states WHERE [Key] LIKE 'myapp||%'
```

上述查询返回所有 ID 包含 "myapp||" 的行，这是状态键的前缀。

## 获取特定状态数据

要获取应用程序 "myapp" 中键为 "balance" 的状态数据，请使用以下查询：

```sql
SELECT * FROM states WHERE [Key] = 'myapp||balance'
```

读取返回行的 **Data** 字段。要获取状态版本/ETag，请使用以下命令：

```sql
SELECT [RowVersion] FROM states WHERE [Key] = 'myapp||balance'
```

## 获取过滤后的状态数据

要获取 JSON 数据中 "color" 值等于 "blue" 的所有状态数据，请使用以下查询：

```sql
SELECT * FROM states WHERE JSON_VALUE([Data], '$.color') = 'blue'
```

## 读取 Actor 状态

要获取属于应用程序 ID 为 "mypets"、Actor 类型为 "cat"、实例 ID 为 "leroy" 的所有 Actor 状态键，请使用以下命令：

```sql
SELECT * FROM states WHERE [Key] LIKE 'mypets||cat||leroy||%'
```

要获取特定的 Actor 状态（如 "food"），请使用以下命令：

```sql
SELECT * FROM states WHERE [Key] = 'mypets||cat||leroy||food'
```

{{% alert title="警告" color="warning" %}}
你不应该手动更新或删除存储中的状态。所有写入和删除操作都应通过 Dapr 运行时完成。**唯一例外：**通常需要删除状态存储中的 Actor 记录，_一旦你确定这些记录不再使用_，以防止未使用的 Actor 实例堆积，而这些实例可能永远不会再次被加载。

{{% /alert %}}
