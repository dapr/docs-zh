---
type: docs
title: "SQLite"
linkTitle: "SQLite"
description: SQLite 名称解析组件的详细信息
---

作为 mDNS 的替代方案，SQLite 名称解析组件可用于在单节点环境和本地开发场景中运行 Dapr。属于集群一部分的 Dapr 边车将其信息存储在本地机器上的 SQLite 数据库中。

{{% alert title="注意" color="primary" %}}

此组件已针对所有 Dapr 实例在同一台物理机上运行的场景进行了优化，数据库通过同一本地挂载磁盘访问。
在通过网络（包括 SMB/NFS）访问的数据库文件上使用 SQLite nameresolver 可能会导致数据损坏等问题，并且**不受支持**。
{{% /alert %}}

## 配置格式

名称解析通过 [Dapr Configuration]({{% ref configuration-overview.md %}}) 进行配置。

在 Configuration YAML 中，将 `spec.nameResolution.component` 属性设置为 `"sqlite"`，然后在 `spec.nameResolution.configuration` 字典中传递配置选项。

这是 Configuration 资源的基本示例：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "sqlite"
    version: "v1"
    configuration:
      connectionString: "/home/user/.dapr/nr.db"
```

## Spec 配置字段

使用 SQLite 名称解析器组件时，`spec.nameResolution.configuration` 字典包含以下选项：

| 字段        | 必填 | 类型 | 详情  | 示例 |
|--------------|:--------:|-----:|:---------|----------|
| `connectionString` | Y | `string` | SQLite 数据库的连接字符串。通常，这是磁盘上文件的路径，相对于当前工作目录，或绝对路径。 | `"nr.db"`（相对于工作目录），`"/home/user/.dapr/nr.db"` |
| `updateInterval` | N | [Go duration](https://pkg.go.dev/time#ParseDuration)（作为 `string`） | 活跃的 Dapr 边车更新其在数据库中的状态的间隔，该状态用作健康检查。<br>较小的间隔可降低应用程序离线时返回陈旧数据的可能性，但会增加数据库的负载。<br>必须至少比 `timeout` 大 1s。带小数秒的值会被截断（例如，`1500ms` 变为 `1s`）。默认值：`5s` | `"2s"` |
| `timeout` | N | [Go duration](https://pkg.go.dev/time#ParseDuration)（作为 `string`）。<br>必须至少为 1s。 | 数据库操作的超时时间。整数被解释为秒数。默认值为 `1s` | `"2s"`，`2` |
| `tableName` | N | `string` | 存储数据的表的名称。如果表不存在，则由 Dapr 创建该表。  默认值为 `hosts`。 | `"hosts"` |
| `metadataTableName` | N | `string` | Dapr 用于存储组件元数据的表的名称。如果表不存在，则由 Dapr 创建该表。默认值为 `metadata`。 | `"metadata"` |
| `cleanupInterval` | N | [Go duration](https://pkg.go.dev/time#ParseDuration)（作为 `string`） | 从数据库中删除陈旧记录的间隔。默认值：`1h`（1 小时） | `"10m"` |
| `busyTimeout` | N | [Go duration](https://pkg.go.dev/time#ParseDuration)（作为 `string`） | 在 SQLite 数据库当前正忙于服务另一个请求时，在返回"数据库繁忙"错误之前等待的间隔。这是一个高级设置。</br>`busyTimeout` 控制锁定在 SQLite 中如何工作。对于 SQLite，写入是独占的，因此每次任何应用程序写入时数据库都会被锁定。如果另一个应用程序尝试写入，它会等待最多 `busyTimeout`，然后返回"数据库繁忙"错误。但是 `timeout` 设置控制整个操作的超时时间。例如，如果查询在数据库获取锁定后"挂起"（因此繁忙超时被清除），那么 `timeout` 生效。默认值：`800ms`（800 毫秒） | `"100ms"` |
| `disableWAL` | N | `bool` | 如果设置为 true，则禁用 SQLite 数据库日志记录的预写日志记录。这仅适用于高级场景 | `true`，`false` |

## 相关链接

- [服务调用构建块]({{% ref service-invocation %}})
