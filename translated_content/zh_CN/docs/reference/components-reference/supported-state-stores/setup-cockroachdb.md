---
type: docs
title: "CockroachDB"
linkTitle: "CockroachDB"
description: CockroachDB 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-cockroachdb/"
---

## 创建 Dapr 组件

创建一个名为 `cockroachdb.yaml` 的文件，粘贴以下内容并将 `<CONNECTION STRING>` 值替换为您的连接字符串。CockroachDB 的连接字符串遵循与 PostgreSQL 连接字符串相同的标准。例如，`"host=localhost user=root port=26257 connect_timeout=10 database=dapr_test"`。有关如何定义连接字符串的信息，请参阅 CockroachDB [关于数据库连接的文档](https://www.cockroachlabs.com/docs/stable/connect-to-the-database.html)。

如果您还想配置 CockroachDB 来存储 actor，请添加 `actorStateStore` 选项，如下面的示例所示。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.cockroachdb
  version: v1
  metadata:
  # Connection string
  - name: connectionString
    value: "<CONNECTION STRING>"
  # Timeout for database operations, in seconds (optional)
  #- name: timeoutInSeconds
  #  value: 20
  # Name of the table where to store the state (optional)
  #- name: tableName
  #  value: "state"
  # Name of the table where to store metadata used by Dapr (optional)
  #- name: metadataTableName
  #  value: "dapr_metadata"
  # Cleanup interval in seconds, to remove expired rows (optional)
  #- name: cleanupIntervalInSeconds
  #  value: 3600
  # Max idle time for connections before they're closed (optional)
  #- name: connectionMaxIdleTime
  #  value: 0
  # Uncomment this if you wish to use CockroachDB as a state store for actors (optional)
  #- name: actorStateStore
  #  value: "true"
```

{{% alert title="Warning" color="warning" %}}
上面的示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的说明使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段 | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `connectionString` | Y | CockroachDB 的连接字符串 | `"host=localhost user=root port=26257 connect_timeout=10 database=dapr_test"`
| `timeoutInSeconds` | N | 所有数据库操作的超时时间（秒）。默认为 `20` | `30`
| `tableName` | N | 存储数据的表的名称。默认为 `state`。可以选择性地包含模式名称作为前缀，例如 `public.state` | `"state"`, `"public.state"`
| `metadataTableName` | N | Dapr 用于存储一些元数据属性的表的名称。默认为 `dapr_metadata`。可以选择性地包含模式名称作为前缀，例如 `public.dapr_metadata` | `"dapr_metadata"`, `"public.dapr_metadata"`
| `cleanupIntervalInSeconds` | N | 清理过期 TTL 行的间隔（秒）。默认值：`3600`（即 1 小时）。将此设置为 <=0 的值会禁用定期清理。 | `1800`, `-1`
| `connectionMaxIdleTime` | N | 未使用的连接在连接池中自动关闭前的最大空闲时间。默认情况下没有值，这由数据库驱动程序选择。 | `"5m"`
| `actorStateStore` | N | 将此状态存储用于 actor。默认为 `"false"` | `"true"`, `"false"`


## 设置 CockroachDB

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

1. 运行一个 CockroachDB 实例。您可以使用以下命令在 Docker CE 中运行 CockroachDB 的本地实例：

     此示例不描述生产配置，因为它设置的是单节点集群，仅推荐用于本地环境。

     ```bash
     docker run --name roach1 -p 26257:26257 cockroachdb/cockroach:v21.2.3 start-single-node --insecure
     ```

2. 为状态数据创建一个数据库。

    要在 CockroachDB 中创建新数据库，请在容器内运行以下 SQL 命令：

    ```bash
    docker exec -it roach1 ./cockroach sql --insecure -e 'create database dapr_test'
    ```
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 CockroachDB 最简单的方法是使用 [CockroachDB Operator](https://github.com/cockroachdb/cockroach-operator)：
{{% /tab %}}

{{< /tabpane >}}

## 高级

### TTL 和清理

此状态存储支持 Dapr 存储记录的 [Time-To-Live (TTL)]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，您可以设置 `ttlInSeconds` 元数据属性来指示数据应在多少秒后被视为"过期"。

由于 CockroachDB 没有内置的 TTL 支持，Dapr 通过在状态表中添加一个列来实现此功能，该列指示数据应被视为"过期"的时间。即使"过期"记录仍物理存储在数据库中，也不会返回给调用者。后台"垃圾收集器"会定期扫描状态表中的过期行并将其删除。

您可以使用 `cleanupIntervalInSeconds` 元数据属性设置删除过期记录的间隔，该属性默认为 3600 秒（即 1 小时）。

- 较长的间隔需要较少频率地扫描过期行，但可能需要存储过期记录更长时间，从而可能需要更多的存储空间。如果您计划在状态表中存储许多具有短 TTL 的记录，请考虑将 `cleanupIntervalInSeconds` 设置为较小的值 - 例如，`300`（300 秒，或 5 分钟）。
- 如果您不计划将 TTL 与 Dapr 和 CockroachDB 状态存储一起使用，您应该考虑将 `cleanupIntervalInSeconds` 设置为 <= 0 的值（例如 `0` 或 `-1`）以禁用定期清理并减少数据库负载。

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})获取配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
