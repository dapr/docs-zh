---
type: docs
title: "Azure Blob Storage"
linkTitle: "Azure Blob Storage"
description: "Azure Blob Storage Binary Store component 的配置"
aliases:
  - "/zh-hans/reference/components-reference/supported-binarystore/azure-blobstorage/"
---

Azure Blob Storage Binary Store 会将每个文件作为一个 Blob 存储在已配置的容器中。该 component 处于 alpha 阶段。

## component 格式

以下示例使用连接字符串进行身份验证：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-files
spec:
  type: binarystore.azure.blobstorage
  version: v1
  metadata:
  - name: connectionString
    value: "<AZURE_STORAGE_CONNECTION_STRING>"
  - name: containerName
    value: "binary-files"
```

{{% alert title="警告" color="warning" %}}
该示例将连接字符串显示为明文值。请使用 [Dapr secret store]({{% ref "operations/components/component-secrets.md" %}}) 将凭据排除在 component manifest 之外。
{{% /alert %}}

## 身份验证

该 component 支持三种身份验证方法：

- **连接字符串**：提供 `connectionString`。
- **帐户密钥**：提供 `accountName` 和 `accountKey`。
- **Microsoft Entra ID**：提供 `accountName`，并为 sidecar 的运行环境配置凭据。支持的凭据类型包括工作负载身份、托管标识、client secret 和证书。请参阅 [向 Azure 进行身份验证]({{% ref "integrations/Azure/azure-authentication/authenticating-azure.md" %}})。

## 规范 metadata 字段

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| `connectionString` | 使用连接字符串身份验证时必填 | Azure Blob 存储连接字符串。 | `"DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=<key>;EndpointSuffix=core.windows.net"` |
| `accountName` | 使用帐户密钥和 Entra ID 身份验证时必填 | 存储帐户名称。 | `"mystorageaccount"` |
| `accountKey` | 使用帐户密钥身份验证时必填 | Base64 编码的主或辅存储帐户密钥。 | `"<base64-encoded-key>"` |
| `containerName` | 是 | 要使用的 Blob 存储容器名称。 | `"binary-files"` |
| `publicAccessLevel` | 否 | 容器中数据的访问级别：`none`、`blob` 或 `container`。默认为 `none`。 | `"none"` |
| `prefix` | 否 | 添加到每个文件名前的前缀。如果配置，则不能以 `/` 开头。 | `"uploads"` |
| `partSize` | 否 | 上传块的大小，可以用字节数或字节大小字符串指定。默认为 `16Mi`；必须在 1 字节到 4000 MiB 之间。块 Blob 最多包含 50,000 个块；块越大，可上传的最大文件越大，但每个进行中的上传占用的内存也越多。 | `"64Mi"` |
| `endpoint` | 否 | 自定义端点 URL，例如 Azurite 模拟器或自定义存储域名。 | `"http://127.0.0.1:10000"` |
| `retryCount` | 否 | 因瞬时故障而进行的最大 HTTP 重试次数。默认为 `3`。 | `"5"` |
| `disableEntityManagement` | 否 | 默认为 `false`。设置为 `true` 时，component 在初始化期间不会尝试创建容器；请预先创建容器，并授予身份读写访问权限。 | `"true"` |

大小值可以作为包含字节数的字符串提供（例如 `"16777216"`），也可以作为带单位的大小提供（例如 `"16Mi"`）。

除非确实需要公开访问，否则请保持 `publicAccessLevel` 为其默认值。

## 相关链接

- [Azure Blob 存储文档](https://learn.microsoft.com/azure/storage/blobs/)
- [Dapr component 的基本架构]({{% ref "reference/resource-specs/component-schema.md" %}})
- [如何使用 Binary Store]({{% ref "developing-applications/building-blocks/binarystore/howto-use-binary-store.md" %}})
