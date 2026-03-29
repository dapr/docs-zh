---
type: docs
title: "Azure Blob Storage 绑定规范"
linkTitle: "Azure Blob Storage"
description: "Azure Blob Storage 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/blobstorage/"
---

## 组件格式

若要设置 Azure Blob Storage 绑定，请创建类型为 `bindings.azure.blobstorage` 的组件。有关如何创建和应用绑定配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
  - name: accountName
    value: myStorageAccountName
  - name: accountKey
    value: ***********
  - name: containerName
    value: container1
# - name: decodeBase64
#   value: <bool>
# - name: getBlobRetryCount
#   value: <integer>
# - name: publicAccessLevel
#   value: <publicAccessLevel>
# - name: disableEntityManagement
#   value: <bool>
```
{{% alert title="Warning" color="warning" %}}
上述示例将密钥以纯文本字符串形式使用。建议使用 secret store 来管理密钥，具体请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 | 详情 | 示例 |
|--------------------|:--------:|--------|---------|---------|
| `accountName` | Y | Input/Output | Azure Storage 账户名称 | `"myexmapleaccount"` |
| `accountKey` | Y* | Input/Output | Azure Storage 账户访问密钥。仅在不使用 Microsoft Entra ID 身份验证时需要。 | `"access-key"` |
| `containerName` | Y | Output | 要写入的 Blob Storage 容器名称 | `myexamplecontainer` |
| `endpoint` | N | Input/Output | 可选的自定义 endpoint URL。在使用 [Azurite emulator](https://github.com/Azure/azurite) 或为 Azure Storage 使用自定义域时（尽管这不属于官方支持场景）这很有用。endpoint 必须是完整的基础 URL，包含协议（`http://` 或 `https://`）、IP 或 FQDN 以及可选端口。 | `"http://127.0.0.1:10000"` |
| `decodeBase64` | N | Output | 在保存到 Blob Storage 之前对 base64 文件内容进行解码的配置（用于保存包含二进制内容的文件）。默认为 `false` | `true`、`false` |
| `getBlobRetryCount` | N | Output | 指定在从 RetryReader 读取时最多发起的 HTTP GET 请求次数。默认为 `10` | `1`、`2` |
| `publicAccessLevel` | N | Output | 指定容器中的数据是否可以公开访问以及访问级别（仅在容器由 Dapr 创建时使用）。默认为 `none` | `blob`、`container`、`none` |
| `disableEntityManagement` | N | Output | 用于禁用实体管理的配置。设置为 `true` 时，绑定将跳过创建指定存储容器的尝试。在使用最小的 Azure AD 权限时这很有用。默认为 `false` | `true`、`false` |

### Microsoft Entra ID 身份验证

Azure Blob Storage 绑定组件支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息和根据所选的 Microsoft Entra ID 身份验证机制需要提供的组件元数据字段，请参阅[对 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})。

## 绑定支持

此组件支持**输出绑定**，包含以下操作：

- `create`：[创建 blob](#create-blob)
- `get`：[获取 blob](#get-blob)
- `delete`：[删除 blob](#delete-blob)
- `list`：[列出 blob](#list-blobs)

Blob storage 组件的**输入绑定**通过 [Azure Event Grid]({{% ref eventgrid.md %}}) 触发并推送事件。

有关更多设置和信息，请参阅[响应 Blob storage 事件](https://learn.microsoft.com/azure/storage/blobs/storage-blob-event-overview)指南。

### 创建 blob

要执行创建 blob 操作，请使用 `POST` 方法调用 Azure Blob Storage 绑定，并使用以下 JSON 请求体：

> 注意：默认情况下会生成一个随机 UUID。有关设置名称的元数据支持，请参阅下文

```json
{
  "operation": "create",
  "data": "YOUR_CONTENT"
}
```

#### 示例


##### 将文本保存到随机生成的 UUID blob

{{< tabpane text=true >}}
  {{% tab "Windows" %}}
  在 Windows 上，使用 cmd 提示符（PowerShell 具有不同的转义机制）
  ```bash
  curl -d "{ \"operation\": \"create\", \"data\": \"Hello World\" }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "create", "data": "Hello World" }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

##### 将文本保存到指定 blob

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"create\", \"data\": \"Hello World\", \"metadata\": { \"blobName\": \"my-test-file.txt\" } }" \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "create", "data": "Hello World", "metadata": { "blobName": "my-test-file.txt" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}


##### 将文件保存到 blob

要上传文件，将其编码为 Base64 并让 Binding 知道需要反序列化：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.blobstorage
  version: v1
  metadata:
  - name: accountName
    value: myStorageAccountName
  - name: accountKey
    value: ***********
  - name: containerName
    value: container1
  - name: decodeBase64
    value: true
```

然后您可以像平常一样上传：

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"create\", \"data\": \"YOUR_BASE_64_CONTENT\", \"metadata\": { \"blobName\": \"my-test-file.jpg\" } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "create", "data": "YOUR_BASE_64_CONTENT", "metadata": { "blobName": "my-test-file.jpg" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体将包含以下 JSON：

```json
{
   "blobURL": "https://<your account name>. blob.core.windows.net/<your container name>/<filename>"
}

```

### 获取 blob

要执行获取 blob 操作，请使用 `POST` 方法调用 Azure Blob Storage 绑定，并使用以下 JSON 请求体：

```json
{
  "operation": "get",
  "metadata": {
    "blobName": "myblob",
    "includeMetadata": "true"
  }
}
```

元数据参数为：

- `blobName` - blob 的名称
- `includeMetadata` -（可选）定义是否应返回用户定义的元数据，默认为：false

#### 示例

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"get\", \"metadata\": { \"blobName\": \"myblob\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "get", "metadata": { "blobName": "myblob" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含存储在 blob 对象中的值。如果已启用，用户定义的元数据将以以下形式的 HTTP 头返回：

`Metadata.key1: value1`
`Metadata.key2: value2`

### 删除 blob

要执行删除 blob 操作，请使用 `POST` 方法调用 Azure Blob Storage 绑定，并使用以下 JSON 请求体：

```json
{
  "operation": "delete",
  "metadata": {
    "blobName": "myblob"
  }
}
```

元数据参数为：

- `blobName` - blob 的名称
- `deleteSnapshots` -（可选）当 blob 有关联快照时需要。指定以下两个选项之一：
  - include：删除基础 blob 及其所有快照
  - only：仅删除 blob 的快照而不删除 blob 本身

#### 示例

##### 删除 blob

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"delete\", \"metadata\": { \"blobName\": \"myblob\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "delete", "metadata": { "blobName": "myblob" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

##### 仅删除 blob 快照

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"delete\", \"metadata\": { \"blobName\": \"myblob\", \"deleteSnapshots\": \"only\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "delete", "metadata": { "blobName": "myblob", "deleteSnapshots": "only" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

##### 删除 blob 及其快照

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"delete\", \"metadata\": { \"blobName\": \"myblob\", \"deleteSnapshots\": \"include\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "delete", "metadata": { "blobName": "myblob", "deleteSnapshots": "include" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

如果成功，将返回 HTTP 204（No Content）和空响应体。

### 列出 blob

要执行列出 blob 操作，请使用 `POST` 方法调用 Azure Blob Storage 绑定，并使用以下 JSON 请求体：

```json
{
  "operation": "list",
  "data": {
    "maxResults": 10,
    "prefix": "file",
    "marker": "2!108!MDAwMDM1IWZpbGUtMDgtMDctMjAyMS0wOS0zOC01NS03NzgtMjEudHh0ITAwMDAyOCE5OTk5LTEyLTMxVDIzOjU5OjU5Ljk5OTk5OTlaIQ--",
    "include": {
      "snapshots": false,
      "metadata": true,
      "uncommittedBlobs": false,
      "copy": false,
      "deleted": false
    }
  }
}
```

data 参数为：

- `maxResults` -（可选）指定最多返回的 blob 数量，包括所有 BlobPrefix 元素。如果请求未指定 maxresults，服务器将最多返回 5,000 个项目。
- `prefix` -（可选）过滤结果，仅返回名称以指定前缀开头的 blob。
- `marker` -（可选）一个字符串值，用于标识在下一次列表操作中要返回的列表部分。如果返回的列表不完整，操作会在响应体中返回一个 marker 值。然后可以在后续调用中使用该 marker 值来请求下一组列表项。
- `include` -（可选）指定要在响应中包含的一个或多个数据集：
  - snapshots：指定应在枚举中包含快照。快照在响应中按从最旧到最新的顺序列出。默认为：false
  - metadata：指定应在响应中返回 blob 元数据。默认为：false
  - uncommittedBlobs：指定响应中应包含已上传块但尚未使用 Put Block List 提交的 blob。默认为：false
  - copy：版本 2012-02-12 及更新版本。指定响应中应包含与任何当前或先前 Copy Blob 操作相关的元数据。默认为：false
  - deleted：版本 2017-07-29 及更新版本。指定响应中应包含已软删除的 blob。默认为：false

#### 响应

响应体包含找到的块列表以及以下 HTTP 头：

`Metadata.marker: 2!108!MDAwMDM1IWZpbGUtMDgtMDctMjAyMS0wOS0zOC0zNC04NjctMTEudHh0ITAwMDAyOCE5OTk5LTEyLTMxVDIzOjU5OjU5Ljk5OTk5OTlaIQ--`
`Metadata.number: 10`

- `marker` - 可在后续调用中用于请求下一组列表项的下一个 marker。请参阅绑定输入的 data 属性上的 marker 说明。
- `number` - 找到的 blob 数量

blob 列表将以以下形式的 JSON 数组返回：

```json
[
  {
    "XMLName": {
      "Space": "",
      "Local": "Blob"
    },
    "Name": "file-08-07-2021-09-38-13-776-1.txt",
    "Deleted": false,
    "Snapshot": "",
    "Properties": {
      "XMLName": {
        "Space": "",
        "Local": "Properties"
      },
      "CreationTime": "2021-07-08T07:38:16Z",
      "LastModified": "2021-07-08T07:38:16Z",
      "Etag": "0x8D941E3593C6573",
      "ContentLength": 1,
      "ContentType": "application/octet-stream",
      "ContentEncoding": "",
      "ContentLanguage": "",
      "ContentMD5": "xMpCOKC5I4INzFCab3WEmw==",
      "ContentDisposition": "",
      "CacheControl": "",
      "BlobSequenceNumber": null,
      "BlobType": "BlockBlob",
      "LeaseStatus": "unlocked",
      "LeaseState": "available",
      "LeaseDuration": "",
      "CopyID": null,
      "CopyStatus": "",
      "CopySource": null,
      "CopyProgress": null,
      "CopyCompletionTime": null,
      "CopyStatusDescription": null,
      "ServerEncrypted": true,
      "IncrementalCopy": null,
      "DestinationSnapshot": null,
      "DeletedTime": null,
      "RemainingRetentionDays": null,
      "AccessTier": "Hot",
      "AccessTierInferred": true,
      "ArchiveStatus": "",
      "CustomerProvidedKeySha256": null,
      "AccessTierChangeTime": null
    },
    "Metadata": null
  }
]
```

## 元数据信息

默认情况下，Azure Blob Storage 输出绑定会自动生成 UUID 作为 blob 文件名，并且不会为其分配任何系统或自定义元数据。可以在消息的元数据属性中配置（均为可选）。

向 Azure Blob Storage 输出绑定发布的应用程序应发送以下格式的消息：

```json
{
    "data": "file content",
    "metadata": {
        "blobName"           : "filename.txt",
        "contentType"        : "text/plain",
        "contentMD5"         : "vZGKbMRDAnMs4BIwlXaRvQ==",
        "contentEncoding"    : "UTF-8",
        "contentLanguage"    : "en-us",
        "contentDisposition" : "attachment",
        "cacheControl"       : "no-cache",
        "custom"             : "hello-world"
    },
    "operation": "create"
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
