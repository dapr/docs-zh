---
type: docs
title: "AWS S3 存储桶"
linkTitle: "AWS S3"
description: "AWS S3 和兼容 S3 的 Binary Store 组件的配置"
aliases:
  - "/zh-hans/reference/components-reference/supported-binarystore/s3/"
---

AWS S3 Binary Store 会将文件作为对象存储在 Amazon S3 存储桶中。它也可以连接到 MinIO、Ceph 或 Cloudflare R2 等兼容 S3 的服务。该组件处于 Alpha 阶段，并使用 Dapr 内置的 AWS 身份验证配置文件。

## 组件格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: s3-files
spec:
  type: binarystore.aws.s3
  version: v1
  metadata:
  - name: bucket
    value: "binary-files"
  - name: prefix
    value: "uploads"
```

通过 AWS 身份验证配置文件，以及你的 AWS 环境或工作负载身份，为边车配置 AWS 凭据。请避免将访问密钥直接写入组件清单。

## 规范元数据字段

| 字段 | 必填 | 详情 | 示例 |
|-------|:--------:|---------|---------|
| `bucket` | Y | S3 存储桶的名称。该组件需要 `s3:PutObject` 和 `s3:DeleteObject` 权限；检索以及删除时的存在性检查还需要 `s3:GetObject` 权限。若要在删除时将缺失的对象报告为未找到，还需授予 `s3:ListBucket` 权限。若缺少存在性检查所需的权限，删除操作可能在未确认对象是否存在的情况下就报告成功。 | `"binary-files"` |
| `prefix` | N | 添加到每个文件名前的前缀。如果配置了该项，则不能以 `/` 开头。 | `"uploads"` |
| `partSize` | N | 分段上传的分片大小，可以字节数或字节大小字符串指定。默认为 `16Mi`；必须介于 5 MiB 与 5 GiB 之间。S3 将上传限制为 10,000 个分片；更大的分片可以提高最大上传大小（最高可达 50 TB），但每个进行中的上传会占用更多内存。 | `"64Mi"` |
| `endpoint` | N | 兼容 S3 的服务或模拟器的自定义端点。生产环境的 Amazon S3 请勿设置此项。 | `"http://localhost:9000"` |
| `forcePathStyle` | N | 默认为 `false`（虚拟主机风格）。设置为 `true` 时使用路径风格请求；许多兼容 S3 的服务需要此设置。 | `"true"` |
| `disableSSL` | N | 默认为 `false`。允许连接非 HTTPS 端点。 | `"true"` |
| `insecureSSL` | N | 默认为 `false`。接受 HTTPS 端点上的自签名或无效证书。这会削弱传输安全性。 | `"true"` |

大小值可以提供为包含字节数的字符串（例如 `"16777216"`），也可以提供为带单位的大小（例如 `"16Mi"`）。

{{% alert title="警告" color="warning" %}}
在未启用覆盖的情况下创建文件时，该组件依赖端点遵守条件写入（`If-None-Match`）。AWS S3 支持此行为，但部分兼容 S3 的服务商可能会忽略该条件并覆盖已有对象。在依赖此行为保护已有数据之前，请先确认你的服务商支持条件写入。
{{% /alert %}}

## 相关链接

- [AWS S3 文档](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html)
- [Dapr 组件的基础结构]({{% ref "reference/resource-specs/component-schema.md" %}})
- [如何使用 Binary Store]({{% ref "developing-applications/building-blocks/binarystore/howto-use-binary-store.md" %}})
