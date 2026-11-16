---
type: docs
title: "In-memory"
linkTitle: "In-memory"
description: "In-memory Binary Store 组件的配置说明"
aliases:
  - "/zh-hans/reference/components-reference/supported-binarystore/in-memory/"
---

In-memory Binary Store 将文件保存在 Dapr 边车进程中。它适用于本地开发、测试和演示，但不具持久性：数据不会写入磁盘，进程停止时数据会丢失，并且不会在不同的边车实例之间共享。

## 组件格式

创建类型为 `binarystore.in-memory` 的组件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-files
spec:
  type: binarystore.in-memory
  version: v1
  metadata:
  - name: prefix
    value: "uploads"
  - name: maxSize
    value: "8Mi"
  - name: maxTotalSize
    value: "1Gi"
```

例如，应用程序请求存储 `report.pdf` 时，该文件会保存在组件 `uploads` 前缀之下。前缀是可选的。

## 规范元数据字段

| 字段 | 必填 | 详情 | 示例 |
|------|:----:|------|------|
| `prefix` | N | 可选前缀，会添加到存储中每个文件名之前。如果配置了前缀，则其不能以 `/` 开头。 | `"uploads"` |
| `maxSize` | N | 单个文件的最大大小，可以用字节数或带单位的字节大小字符串表示。默认为 `4Mi`；超过该限制的上传会被拒绝。必须大于零。 | `"8Mi"` |
| `maxTotalSize` | N | 已存储文件与进行中上传的总大小上限，可以用字节数或带单位的字节大小字符串表示。默认为 `512Mi`；超过该限制的上传会被拒绝。替换文件时，需要临时同时容纳旧内容与新内容。必须大于零。 | `"1Gi"` |

大小值可以以包含字节数的字符串形式提供（例如 `"16777216"`），也可以以带单位的大小形式提供，例如 `"16Mi"`。

## 相关链接

- [Dapr 组件的基础架构]({{% ref "reference/resource-specs/component-schema.md" %}})
- [Binary Store 构建块]({{% ref "developing-applications/building-blocks/binarystore/binarystore-overview.md" %}})
- [如何使用 Binary Store]({{% ref "developing-applications/building-blocks/binarystore/howto-use-binary-store.md" %}})
