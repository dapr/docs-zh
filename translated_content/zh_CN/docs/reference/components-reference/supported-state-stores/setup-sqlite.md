---
type: docs
title: "SQLite"
linkTitle: "SQLite"
description: SQLite 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-sqlite/"
---

该组件允许将 SQLite 3 用作 Dapr 的状态存储。

> 该组件目前使用 SQLite 版本 3.41.2 编译。

## 创建 Dapr 组件

创建一个名为 `sqlite.yaml` 的文件，粘贴以下内容，并将 `<CONNECTION STRING>` 值替换为你的连接字符串，即磁盘上文件的路径。

如果还想将 SQLite 配置为存储 actor，可以添加 `actorStateStore` 选项，如下所示。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.sqlite
  version: v1
  metadata:
  # 连接字符串
  - name: connectionString
    value: "data.db"
  # 数据库操作的超时时间，单位为秒（可选）
  #- name: timeoutInSeconds
  #  value: 20
  # 用于存储状态的表名（可选）
  #- name: tableName
  #  value: "state"
  # 清理间隔，单位为秒，用于删除过期行（可选）
  #- name: cleanupInterval
  #  value: "1h"
  # 为数据库操作设置 busy timeout
  #- name: busyTimeout
  #  value: "2s"
  # 如果你想将 SQLite 用作 actor 的状态存储，取消此行的注释（可选）
  #- name: actorStateStore
  #  value: "true"
```

## 规范元数据字段

| 字段 | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `connectionString` | Y | SQLite 数据库的连接字符串。更多详情见下文。 | `"path/to/data.db"`, `"file::memory:?cache=shared"` |
| `timeout` | N | 数据库操作的超时时间，格式为 [Go duration](https://pkg.go.dev/time#ParseDuration)。整数将被解释为秒数。默认为 `20s` | `"30s"`, `30` |
| `tableName` | N | 用于存储数据的表名。默认为 `state`。 | `"state"` |
| `metadataTableName` | N | Dapr 用于存储组件元数据的表名。默认为 `metadata`。 | `"metadata"` |
| `cleanupInterval` | N | 清理具有过期 TTL 的行的间隔，格式为 [Go duration](https://pkg.go.dev/time#ParseDuration)。将此值设置为 <=0 会禁用定期清理。默认：`0`（即禁用） | `"2h"`, `"30m"`, `-1` |
| `busyTimeout` | N | 当 SQLite 数据库正忙于处理另一个请求时，在返回"数据库忙碌"错误之前等待的间隔，格式为 [Go duration](https://pkg.go.dev/time#ParseDuration)。默认：`2s` | `"100ms"`, `"5s"` |
| `disableWAL` | N | 如果设置为 true，则禁用 SQLite 数据库日志的预写式日志记录。如果数据库存储在网络文件系统上（例如，挂载为 SMB 或 NFS 共享的文件夹），应将其设置为 `false`。对于只读或内存数据库，此选项将被忽略。 | `"true"`, `"false"` |
| `actorStateStore` | N | 将此状态存储用于 actor。默认为 `"false"` | `"true"`, `"false"` |

**`connectionString`** 参数配置如何打开 SQLite 数据库。

- 通常，这是磁盘上文件的路径，相对于当前工作目录或绝对路径。例如：`"data.db"`（相对于工作目录）或 `"/mnt/data/mydata.db"`。
- 路径由 SQLite 库解释，因此如果路径以 `file:` 开头，可以使用"URI 选项"向 SQLite 驱动程序传递其他选项。例如：`"file:path/to/data.db?mode=ro"` 以只读模式打开路径为 `path/to/data.db` 的数据库。[有关所有支持的 URI 选项，请参阅 SQLite 文档](https://www.sqlite.org/uri.html)。
- 特殊情况 `":memory:"` 会启动由内存 SQLite 数据库支持的组件。此数据库不会持久化到磁盘，不会在多个 Dapr 实例之间共享，并且当 Dapr 边车停止时所有数据都会丢失。使用内存数据库时，Dapr 会自动设置 `cache=shared` URI 选项。

## 高级

### TTL 和清理

此状态存储支持使用 Dapr 存储的记录的[生存时间 (TTL)]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，可以设置 `ttlInSeconds` 元数据属性来指示数据何时应被视为"已过期"。

由于 SQLite 没有内置的 TTL 支持，这是在 Dapr 中通过在状态表中添加一个列来实现的，该列指示数据何时应被视为"已过期"。"已过期"的记录不会返回给调用者，即使它们仍然物理存储在数据库中。后台"垃圾收集器"会定期扫描状态表以查找过期行并删除它们。

`cleanupInterval` 元数据属性设置过期记录的删除间隔，默认情况下禁用。

- 较长的间隔需要较少的过期行扫描频率，但可能导致数据库存储过期记录的时间更长，可能需要更多的存储空间。如果你计划在状态表中存储许多记录，且 TTL 较短，可以考虑将 `cleanupInterval` 设置为较小的值，例如 `5m`。
- 如果你不打算使用 Dapr 和 SQLite 状态存储的 TTL，应考虑将 `cleanupInterval` 设置为 <= 0 的值（例如 `0` 或 `-1`）以禁用定期清理并减少数据库负载。这是默认行为。

状态表中存储记录过期日期的 `expiration_time` 列**默认没有索引**，因此每次定期清理都必须执行全表扫描。如果你的表有大量记录，并且只有其中一些使用 TTL，你可能会发现在该列上创建索引很有用。假设你的状态表名称是 `state`（默认值），你可以使用以下查询：

```sql
CREATE INDEX idx_expiration_time
  ON state (expiration_time);
```

> Dapr 不会自动 [vacuum](https://www.sqlite.org/lang_vacuum.html) SQLite 数据库。

### 共享 SQLite 数据库和使用网络文件系统

虽然你可以有多个 Dapr 实例访问同一个 SQLite 数据库（例如，因为你的应用程序水平扩展或你有多个应用程序访问同一个状态存储），但你应该记住一些注意事项。

当所有客户端访问同一本地安装磁盘上的数据库文件时，SQLite 工作效果最佳。使用从 SAN（存储区域网络）挂载的虚拟磁盘，这是虚拟化或云环境中的常见做法，是可以的。

但是，将 SQLite 数据库存储在网络文件系统（例如通过 NFS 或 SMB，但这些示例并非详尽列表）中应该小心。SQLite 官方文档有一个专门的页面，介绍[在网络运行 SQLite 的建议和注意事项](https://www.sqlite.org/useovernet.html)。

鉴于通过网络文件系统（例如通过 NFS 或 SMB）运行 SQLite 会带来数据损坏的风险，我们不建议在生产环境中对 Dapr 执行此操作。但是，如果你确实想这样做，你应该将 SQLite Dapr 组件配置为将 `disableWAL` 设置为 `true`。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
