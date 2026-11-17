---
type: docs
title: "Azure Data Lake Storage Gen2"
linkTitle: "Azure Data Lake Storage Gen2"
description: "Azure Data Lake Storage Gen2 Binary Store component 的配置"
aliases:
  - "/zh-hans/reference/components-reference/supported-binarystore/azure-datalake/"
---

Azure Data Lake Storage Gen2 Binary Store 会将每个文件存储到已配置的文件系统中。该 component 处于 alpha 阶段。

## component 格式

以下示例使用连接字符串进行身份验证：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: data-lake-files
spec:
  type: binarystore.azure.datalake
  version: v1
  metadata:
  - name: connectionString
    value: "<AZURE_STORAGE_CONNECTION_STRING>"
  - name: fileSystemName
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
| `connectionString` | 使用连接字符串身份验证时必填 | Azure Storage 连接字符串。 | `"DefaultEndpointsProtocol=https;AccountName=mystorageaccount;AccountKey=<key>;EndpointSuffix=core.windows.net"` |
| `accountName` | 使用帐户密钥和 Entra ID 身份验证时必填 | 存储帐户名称。 | `"mystorageaccount"` |
| `accountKey` | 使用帐户密钥身份验证时必填 | Base64 编码的主或辅存储帐户密钥。 | `"<base64-encoded-key>"` |
| `fileSystemName` | 是 | 要使用的 Data Lake Storage Gen2 文件系统名称。 | `"binary-files"` |
| `prefix` | 否 | 添加到每个文件名前的前缀。如果配置，则不能以 `/` 开头。 | `"uploads"` |
| `partSize` | 否 | 上传分块的大小，可以用字节数或字节大小字符串指定。默认为 `16Mi`；必须在 1 字节到 4000 MiB 之间。分块越大，请求开销越低，但每个进行中的上传占用的内存越多。文件的最大大小仍为 5 TB。 | `"64Mi"` |
| `retryCount` | 否 | 因瞬时故障而进行的最大 HTTP 重试次数。默认为 `3`。 | `"5"` |
| `endpoint` | 否 | 自定义端点 URL。 | `"https://mystorageaccount.dfs.core.windows.net"` |
| `disableEntityManagement` | 否 | 默认为 `false`。设置为 `true` 时，component 在初始化期间不会尝试创建文件系统；请预先创建文件系统，并授予身份读写访问权限。 | `"true"` |

大小值可以作为包含字节数的字符串提供（例如 `"16777216"`），也可以作为带单位的大小提供（例如 `"16Mi"`）。

## 相关链接

- [Azure Data Lake Storage 文档](https://learn.microsoft.com/azure/storage/blobs/data-lake-storage-introduction)
- [Dapr component 的基本架构]({{% ref "reference/resource-specs/component-schema.md" %}})
- [如何使用 Binary Store]({{% ref "developing-applications/building-blocks/binarystore/howto-use-binary-store.md" %}})
