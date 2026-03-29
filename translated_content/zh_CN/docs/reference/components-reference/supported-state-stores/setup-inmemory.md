---
type: docs
title: "In-memory"
linkTitle: "In-memory"
description: "内存状态组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-inmemory/"
---

内存状态存储组件将状态维护在 Dapr 边车的内存中。这主要用于开发目的。状态不会在多个边车之间复制，并且当 Dapr 边车重启时会丢失。

## 组件格式

要设置内存状态存储，请创建一个类型为 `state.in-memory` 的组件。请参阅[本指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.in-memory
  version: v1
  metadata: 
  # 如果您希望将 In-memory 用作 actor 的状态存储，请取消注释（可选）
  #- name: actorStateStore
  #  value: "true"
```

> 注意：虽然内存不需要任何特定元数据即可使组件工作，但 `spec.metadata` 是必需字段。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 了解[如何创建和配置状态存储组件]({{% ref howto-get-save-state.md %}}) 
- 阅读更多关于[状态管理构建块]({{% ref state-management %}})的内容
