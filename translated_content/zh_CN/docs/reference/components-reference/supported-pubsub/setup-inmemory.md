---
type: docs
title: "In-memory"
linkTitle: "In-memory"
description: "In Memory 发布订阅组件的详细文档"
aliases:
  - "/operations/components/setup-pubsub/supported-pubsub/setup-inmemory/"
---

内存中的发布订阅组件在单个 Dapr 边车内运行。这主要用于开发目的。状态不会在多个边车之间复制，当 Dapr 边车重启时，状态会丢失。

## 组件格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.in-memory
  version: v1
  metadata: []
```

> 注意：内存中不需要任何特定的元数据即可使组件工作，但是 spec.metadata 是必填字段。

## 相关链接

- 相关链接部分的 [Dapr 组件基本架构]({{% ref component-schema %}})
- 阅读配置发布订阅组件的[指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})，了解相关说明
- [发布订阅构建块]({{% ref pubsub %}})
