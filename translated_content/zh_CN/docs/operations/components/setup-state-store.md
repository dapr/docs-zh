---
type: docs
title: "状态存储组件"
linkTitle: "状态存储"
description: "为 Dapr 状态管理设置不同状态存储的指南"
weight: 600
aliases:
  - "/zh-hans/operations/components/setup-state-store/setup-state-store-overview/"
---

Dapr 与现有数据库集成，为应用提供状态管理能力，支持 CRUD 操作、事务等。它还支持*每个应用*配置多个命名的状态存储组件。

状态存储是可扩展的，可以在 [components-contrib repo](https://github.com/dapr/components-contrib) 中找到。

Dapr 中的状态存储使用 `Component` 文件描述：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.<DATABASE>
  version: v1
  metadata:
  - name: <KEY>
    value: <VALUE>
  - name: <KEY>
    value: <VALUE>
...
```

数据库类型由 `type` 字段决定，连接字符串和其他元数据放在 `.metadata` 部分。
尽管元数据值可以包含明文密钥，但建议您使用 [secret store]({{% ref component-secrets.md %}})。

访问[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何配置状态存储组件。

## 支持的状态存储

访问[此参考]({{% ref supported-state-stores %}})查看 Dapr 中所有支持的状态存储。

## 相关主题
- [组件概念]({{% ref components-concept.md %}})
- [状态管理概述]({{% ref state-management %}})
- [状态管理 API 规范]({{% ref state_api.md %}})
- [支持的状态存储]({{% ref supported-state-stores %}})
