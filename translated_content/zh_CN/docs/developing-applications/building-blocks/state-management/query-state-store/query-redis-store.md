---
type: docs
title: "Redis"
linkTitle: "Redis"
weight: 2000
description: "使用 Redis 作为状态存储"
---

Dapr 在保存和检索状态时不会转换状态值。Dapr 要求所有 state store 实现都遵循一定的键格式方案（参见[状态管理规范]({{% ref state_api.md %}})）。您可以直接与底层存储交互来操作状态数据，例如：

- 查询状态。
- 创建聚合视图。
- 进行备份。

{{% alert title="注意" color="primary" %}}
以下示例使用 Redis CLI，针对使用默认 Dapr state store 实现的 Redis 存储进行操作。

{{% /alert %}}

## 连接到 Redis

您可以使用官方的 [redis-cli](https://redis.io/topics/rediscli) 或任何其他兼容 Redis 的工具连接到 Redis state store，直接查询 Dapr 状态。如果您是在容器中运行 Redis，使用 redis-cli 的最简单方法是通过容器：

```bash
docker run --rm -it --link <Redis 容器的名称> redis redis-cli -h <Redis 容器的名称>
```

## 按 App ID 列出键

要获取与 App ID 为 "myapp" 的应用关联的所有状态键，请使用命令：

```bash
KEYS myapp*
```

上述命令返回现有键的列表，例如：

```bash
1) "myapp||balance"
2) "myapp||amount"
```

## 获取特定状态数据

Dapr 将状态值保存为哈希值。每个哈希值包含一个 "data" 字段，其中包含：

- 状态数据。
- 一个 "version" 字段，其中包含持续递增的版本号，用作 ETag。

例如，要获取 App ID 为 "myapp" 的应用中键 "balance" 对应的状态数据，请使用命令：

```bash
HGET myapp||balance data
```

要获取状态版本/ETag，请使用命令：

```bash
HGET myapp||balance version
```

## 读取 Actor 状态

要获取与 App ID 为 "mypets" 的应用中 actor 类型为 "cat"、实例 ID 为 "leroy" 的 actor 关联的所有状态键，请使用命令：

```bash
KEYS mypets||cat||leroy*
```

要获取特定的 actor 状态（如 "food"），请使用命令：

```bash
HGET mypets||cat||leroy||food value
```

{{% alert title="警告" color="warning" %}}
您不应手动更新或删除存储中的状态。所有写入和删除操作都应通过 Dapr 运行时完成。**唯一例外：**通常需要删除 state store 中的 actor 记录，_一旦您知道这些记录不再使用_，以防止从未被再次加载的未使用 actor 实例不断堆积。

{{% /alert %}}
