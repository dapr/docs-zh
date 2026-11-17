---
type: docs
title: "Google Cloud Storage Bucket"
linkTitle: "Google Cloud Storage"
description: "Google Cloud Storage Binary Store component 的配置"
aliases:
  - "/zh-hans/reference/components-reference/supported-binarystore/gcp-bucket/"
---

Google Cloud Storage Binary Store 会将每个文件作为一个对象存储到已配置的存储桶中。该 component 处于 alpha 阶段，并使用 Dapr 内置的 GCP 身份验证配置文件。

## Component 格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcp-files
spec:
  type: binarystore.gcp.bucket
  version: v1
  metadata:
  - name: bucket
    value: "binary-files"
  - name: prefix
    value: "uploads"
```

请使用 Google Cloud 的 [Application Default Credentials](https://cloud.google.com/docs/authentication/application-default-credentials) 或合适的工作负载身份为 sidecar 配置凭据。不要将 service account 密钥直接存储在 component manifest 中。

## 规范 metadata 字段

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| `bucket` | 是 | 要使用的 Google Cloud Storage 存储桶名称。 | `"binary-files"` |
| `prefix` | 否 | 添加到每个文件名前的前缀。如果配置，则不能以 `/` 开头。 | `"uploads"` |
| `partSize` | 否 | 可恢复上传的块大小，可以用字节数或字节大小字符串指定。默认为 `16Mi`，且必须是 256 KiB 的正整数倍。块越大，请求开销越低，但每个进行中的上传占用的内存越多。对象的最大大小仍为 5 TiB。 | `"64Mi"` |

大小值可以作为包含字节数的字符串提供（例如 `"16777216"`），也可以作为带单位的大小提供（例如 `"16Mi"`）。

## 相关链接

- [Google Cloud Storage 文档](https://cloud.google.com/storage/docs)
- [Dapr component 的基本架构]({{% ref "reference/resource-specs/component-schema.md" %}})
- [如何使用 Binary Store]({{% ref "developing-applications/building-blocks/binarystore/howto-use-binary-store.md" %}})
