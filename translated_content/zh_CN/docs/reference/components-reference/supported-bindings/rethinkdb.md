---
type: docs
title: "RethinkDB 绑定规范"
linkTitle: "RethinkDB"
description: "RethinkDB 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/rethinkdb/"
---

## 组件格式

[RethinkDB 状态存储]({{%ref setup-rethinkdb.md%}}) 支持事务，这意味着它可用于支持 Dapr actors。Dapr 仅持久化 actor 的当前状态，不允许用户跟踪 actor 状态随时间如何变化。

为了使用户能够跟踪 actor 状态的变化，此绑定利用 RethinkDB 的内置能力来监控 RethinkDB 表以及在变化时同时包含 `old` 和 `new` 状态的事件。此绑定在 Dapr 状态表上创建一个订阅，并使用 Dapr 输入绑定接口流式传输这些变化。

要设置 RethinkDB 状态变更绑定，请创建类型为 `bindings.rethinkdb.statechange` 的组件。有关如何创建和应用绑定配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: changes
spec:
  type: bindings.rethinkdb.statechange
  version: v1
  metadata:
  - name: address
    value: "<REPLACE-RETHINKDB-ADDRESS>" # 必填，例如 127.0.0.1:28015 或 rethinkdb.default.svc.cluster.local:28015。
  - name: database
    value: "<REPLACE-RETHINKDB-DB-NAME>" # 必填，例如 dapr（仅限字母数字）
  - name: direction 
    value: "<DIRECTION-OF-RETHINKDB-BINDING>"
```

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详细信息 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `address` | Y | Input | RethinkDB 服务器地址 | `"27.0.0.1:28015"`, `"rethinkdb.default.svc.cluster.local:28015"` |
| `database` | Y | Input | RethinDB 数据库名称 | `"dapr"` |
| `direction` | N | Input | 绑定的方向 | `"input"` |

## 绑定支持

此组件仅支持**输入**绑定接口。

## 相关链接

- [将此绑定与 Dapr 发布订阅结合使用](https://github.com/mchmarny/dapr-state-store-change-handler)以将状态变更流式传输到 topic
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [如何：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [如何：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
