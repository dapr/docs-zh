---
type: docs
title: "Azure Blob Storage binding 规范"
linkTitle: "Azure Blob Storage"
description: "Azure Blob Storage binding component 的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/blobstorage/"
---

## component 格式

若要设置 Azure Blob Storage binding，请创建类型为 `bindings.azure.blobstorage` 的 component。有关如何创建和应用 binding 配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


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
上述示例以纯文本字符串形式使用 secrets。建议按[此处]({{% ref component-secrets.md %}})所述，使用 secret store 来管理 secrets。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | binding 支持 | 详情 | 示例 |
|--------------------|:--------:|--------|---------|---------|
| `accountName` | Y | Input/Output | Azure Storage 账户名称 | `"myexmapleaccount"` |
| `accountKey` | Y* | Input/Output | Azure Storage 账户访问密钥。仅在不使用 Microsoft Entra ID 身份验证时需要。 | `"access-key"` |
| `containerName` | Y | Output | 要写入的 Blob Storage 容器名称 | `myexamplecontainer` |
| `endpoint` | N | Input/Output | 可选的自定义 endpoint URL。在使用 [Azurite 模拟器](https://github.com/Azure/azurite)或为 Azure Storage 使用自定义域名（尽管这不属于官方支持的做法）时，此项很有用。endpoint 必须是完整的基础 URL，包括协议（`http://` 或 `https://`）、IP 或完全限定域名（FQDN），以及可选的端口。 | `"http://127.0.0.1:10000"` |
| `decodeBase64` | N | Output | 在保存到 Blob Storage 之前对 base64 文件内容进行解码的配置（用于保存包含二进制内容的文件）。默认为 `false` | `true`、`false` |
| `getBlobRetryCount` | N | Output | 指定从 RetryReader 读取时最多发出的 HTTP GET 请求次数。默认为 `10` | `1`、`2` |
| `publicAccessLevel` | N | Output | 指定容器中的数据是否可以公开访问以及访问级别（仅在容器由 Dapr 创建时使用）。默认为 `none` | `blob`、`container`、`none` |
| `disableEntityManagement` | N | Output | 用于禁用实体管理的配置。设置为 `true` 时，binding 将跳过创建指定存储容器的尝试。在使用最小 Azure AD 权限时，此项很有用。默认为 `false` | `true`、`false` |

### Microsoft Entra ID 身份验证

Azure Blob Storage binding component 支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息，以及根据所选 Microsoft Entra ID 身份验证机制需要提供的 component 元数据字段，请参阅[对 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})。

## binding 支持

此 component 支持**output binding**，包含以下操作：

- `create`：[创建 blob](#创建-blob)
- `get`：[获取 blob](#获取-blob)
- `delete`：[删除 blob](#删除-blob)
- `list`：[列出 blob](#列出-blob)
- `presign`：[生成预签名 SAS URL](#预签名-blob)
- `bulkGet`：[批量获取 blob](#批量获取-blob)
- `bulkCreate`：[批量创建 blob](#批量创建-blob)
- `bulkDelete`：[批量删除 blob](#批量删除-blob)

Blob storage component 的**input binding**通过 [Azure Event Grid]({{% ref eventgrid.md %}}) 触发并推送事件。 
 
有关更多设置和信息，请参阅[响应 Blob storage 事件](https://learn.microsoft.com/azure/storage/blobs/storage-blob-event-overview)指南。

### 创建 blob

要执行创建 blob 操作，请使用 `POST` 方法调用 Azure Blob Storage binding，并使用以下 JSON 请求体：

> 注意：默认情况下会生成随机 UUID。有关使用元数据设置名称的支持，请参阅下文

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

要上传文件，请将其编码为 Base64，并告知 binding 需要进行反序列化：

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

然后可以像平常一样上传：

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

#### 使用预签名 SAS URL 共享 blob

若要在创建 blob 时生成预签名 SAS URL，请在 `create` 请求中添加 `signTTL` 元数据键。该 SAS URL 可提供对 blob 的临时只读访问。
`signTTL` 的有效值为 [Go duration strings](https://pkg.go.dev/time#ParseDuration)（例如 `"15m"`、`"1h"`、`"24h"`）。

> **注意：** 此功能要求 binding 使用账户密钥或连接字符串进行配置。生成 SAS URL 时不支持 Microsoft Entra ID 身份验证。

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"create\", \"data\": \"Hello World\", \"metadata\": { \"blobName\": \"my-test-file.txt\", \"signTTL\": \"15m\" } }" \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "create", "data": "Hello World", "metadata": { "blobName": "my-test-file.txt", "signTTL": "15m" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体将包含以下 JSON：

```json
{
   "blobURL": "https://<your account name>.blob.core.windows.net/<your container name>/<filename>",
   "blobName": "<filename>",
   "presignURL": "https://<your account name>.blob.core.windows.net/<your container name>/<filename>?sv=2023-11-03&se=2024-01-01T00%3A15%3A00Z&sr=b&sp=r&sig=<signature>"
}
```

> 仅当请求元数据中提供了 `signTTL` 时，才会包含 `presignURL` 字段。

### 获取 blob

要执行获取 blob 操作，请使用 `POST` 方法调用 Azure Blob Storage binding，并使用以下 JSON 请求体：

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
- `filePath` -（可选）如果设置，blob 内容将直接流式写入此本地文件路径，而不是在响应体中返回。对于大型 blob，建议使用此参数，以避免将整个内容加载到内存中。使用此参数时，响应体为空，写入文件的路径将通过 `Metadata.filePath` HTTP 头返回。

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

要执行删除 blob 操作，请使用 `POST` 方法调用 Azure Blob Storage binding，并使用以下 JSON 请求体：

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
- `deleteSnapshots` -（可选）当 blob 有关联快照时必需。请指定以下两个选项之一：
  - include：删除基础 blob 及其所有快照
  - only：仅删除 blob 的快照，而不删除 blob 本身

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

要执行列出 blob 操作，请使用 `POST` 方法调用 Azure Blob Storage binding，并使用以下 JSON 请求体：

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

- `maxResults` -（可选）指定最多返回的 blob 数量，包括所有 BlobPrefix 元素。如果请求未指定 maxresults，服务器最多返回 5,000 个项目。
- `prefix` -（可选）过滤结果，仅返回名称以指定前缀开头的 blob。
- `marker` -（可选）一个字符串值，用于标识下一次列表操作中要返回的列表部分。如果返回的列表不完整，操作会在响应体中返回一个 marker 值。随后可在后续调用中使用该 marker 值来请求下一组列表项。
- `include` -（可选）指定响应中要包含的一个或多个数据集：
  - snapshots：指定枚举中应包含快照。快照在响应中按从旧到新的顺序列出。默认为：false
  - metadata：指定响应中应返回 blob 元数据。默认为：false
  - uncommittedBlobs：指定响应中应包含已上传块但尚未通过 Put Block List 提交的 blob。默认为：false
  - copy：版本 2012-02-12 及更新版本。指定响应中应包含与任何当前或先前 Copy Blob 操作相关的元数据。默认为：false
  - deleted：版本 2017-07-29 及更新版本。指定响应中应包含已软删除的 blob。默认为：false

#### 响应

响应体包含找到的块列表以及以下 HTTP 头：

`Metadata.marker: 2!108!MDAwMDM1IWZpbGUtMDgtMDctMjAyMS0wOS0zOC0zNC04NjctMTEudHh0ITAwMDAyOCE5OTk5LTEyLTMxVDIzOjU5OjU5Ljk5OTk5OTlaIQ--`
`Metadata.number: 10`

- `marker` - 可在后续调用中用于请求下一组列表项的下一个 marker。请参阅 input binding 的 data 属性上的 marker 说明。
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

### 预签名 blob

要为现有 blob 生成预签名 SAS URL，请使用 `POST` 方法调用 Azure Blob Storage binding，并使用以下 JSON 请求体。该 SAS URL 可在无需身份验证的情况下提供对 blob 的临时只读访问。

> **注意：** 此操作要求 binding 使用账户密钥或连接字符串进行配置。生成 SAS URL 时不支持 Microsoft Entra ID 身份验证。

```json
{
  "operation": "presign",
  "metadata": {
    "blobName": "my-test-file.txt",
    "signTTL": "15m"
  }
}
```

元数据参数为：

- `blobName` - 要为其生成 SAS URL 的 blob 名称
- `signTTL` - SAS URL 的生存时间。有效值为 [Go duration strings](https://pkg.go.dev/time#ParseDuration)（例如 `"15m"`、`"1h"`、`"24h"`）

#### 示例

{{< tabpane text=true >}}

    {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"presign\", \"metadata\": { \"blobName\": \"my-test-file.txt\", \"signTTL\": \"15m\" } }" \
          http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "presign", "metadata": { "blobName": "my-test-file.txt", "signTTL": "15m" } }' \
          http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  {{% /tab %}}

{{< /tabpane >}}

#### Response

The response body contains the following JSON:

```json
{
    "presignURL": "https://<your account name>.blob.core.windows.net/<your container name>/my-test-file.txt?sv=2023-11-03&se=2024-01-01T00%3A15%3A00Z&sr=b&sp=r&sig=<signature>"
}
```

### 批量获取 blob

要执行批量获取操作，请使用 `POST` 方法调用 Azure Blob Storage binding，并使用以下 JSON 请求体。blob 可以检索到本地文件（流式模式），也可以在响应中以内联方式返回（内联模式）。

#### 流式模式（写入文件）

使用带 `filePath` 的显式 items 将每个 blob 直接流式写入文件，或使用 `prefix` 配合 `destinationDir` 下载所有匹配的 blob：

```json
{
  "operation": "bulkGet",
  "data": {
    "items": [
      { "blobName": "file1.txt", "filePath": "/tmp/downloads/file1.txt" },
      { "blobName": "file2.txt", "filePath": "/tmp/downloads/file2.txt" }
    ],
    "concurrency": 10
  }
}
```

或者使用前缀将所有匹配的 blob 下载到目录：

```json
{
  "operation": "bulkGet",
  "data": {
    "prefix": "logs/2024/",
    "destinationDir": "/tmp/downloads/logs",
    "concurrency": 10
  }
}
```

#### 内联模式（在响应中返回）

在 items 中省略 `filePath`，即可在响应中接收 base64 编码的 blob 内容：

```json
{
  "operation": "bulkGet",
  "data": {
    "items": [
      { "blobName": "config1.json" },
      { "blobName": "config2.json" }
    ]
  }
}
```

数据参数为：

- `items` -（可选）要检索的 blob 对象数组。每一项包含：
  - `blobName` - 要检索的 blob 名称
  - `filePath` -（可选）用于流式写入 blob 的本地文件路径。省略时，blob 内容将在响应中内联返回
- `prefix` -（可选）检索所有匹配此前缀的 blob。需要同时指定 `destinationDir`
- `destinationDir` -（使用 `prefix` 时必填）用于下载前缀匹配 blob 的本地目录
- `concurrency` -（可选）最大并行下载数。默认为 `10`

`items` 或 `prefix` 至少需要提供一个。两者可以在同一请求中组合使用。

{{% alert title="Note" color="primary" %}}
对于大文件，请使用流式模式（带 `filePath`），以避免将整个 blob 内容加载到内存中。文件路径会经过校验，以防止路径遍历攻击。
{{% /alert %}}

#### 示例

##### 将 blob 批量获取到文件

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"bulkGet\", \"data\": { \"items\": [{ \"blobName\": \"file1.txt\", \"filePath\": \"C:\\\\tmp\\\\file1.txt\" }, { \"blobName\": \"file2.txt\", \"filePath\": \"C:\\\\tmp\\\\file2.txt\" }] } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "bulkGet", "data": { "items": [{ "blobName": "file1.txt", "filePath": "/tmp/file1.txt" }, { "blobName": "file2.txt", "filePath": "/tmp/file2.txt" }] } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

##### 按前缀批量获取 blob

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"bulkGet\", \"data\": { \"prefix\": \"backups/\", \"destinationDir\": \"C:\\\\tmp\\\\backups\", \"concurrency\": 5 } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "bulkGet", "data": { "prefix": "backups/", "destinationDir": "/tmp/backups", "concurrency": 5 } }' \
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含结果的 JSON 数组：

```json
[
  {
    "blobName": "file1.txt",
    "filePath": "/tmp/file1.txt"
  },
  {
    "blobName": "file2.txt",
    "filePath": "/tmp/file2.txt"
  }
]
```

使用内联模式（不带 `filePath`）时，每一项都包含一个 `data` 字段，其中为 base64 编码的 blob 内容：

```json
[
  {
    "blobName": "config1.json",
    "data": "eyJrZXkiOiAidmFsdWUifQ=="
  }
]
```

如果某个 blob 失败，其条目将包含 `error` 字段，而不是 `filePath`/`data`：

```json
[
  {
    "blobName": "missing.txt",
    "error": "BlobNotFound"
  }
]
```

### 批量创建 blob

要执行批量创建操作，请使用 `POST` 方法调用 Azure Blob Storage binding，并使用以下 JSON 请求体。blob 可以从本地文件上传，也可以从内联数据上传。

#### 从文件创建

```json
{
  "operation": "bulkCreate",
  "data": {
    "items": [
      { "blobName": "file1.txt", "sourcePath": "/tmp/uploads/file1.txt" },
      { "blobName": "file2.jpg", "sourcePath": "/tmp/uploads/file2.jpg", "contentType": "image/jpeg" }
    ],
    "concurrency": 10
  }
}
```

#### 从内联数据创建

```json
{
  "operation": "bulkCreate",
  "data": {
    "items": [
      { "blobName": "greeting.txt", "data": "Hello World" },
      { "blobName": "config.json", "data": "{\"key\": \"value\"}", "contentType": "application/json" }
    ]
  }
}
```

数据参数为：

- `items` -（必填）要创建的 blob 对象数组。每一项包含：
  - `blobName` -（必填）要创建的 blob 名称
  - `sourcePath` -（可选）用作 blob 内容的本地文件路径。对于大文件，将直接流式上传，而无需加载到内存中
  - `data` -（可选）用作 blob 内容的内联字符串数据。`sourcePath` 或 `data` 必须提供其一
  - `contentType` -（可选）此特定 blob 的 MIME 类型（例如 `"image/jpeg"`、`"application/json"`）
- `concurrency` -（可选）最大并行上传数。默认为 `10`

{{% alert title="Note" color="primary" %}}
启用 component 配置中的 `decodeBase64` 时，内联 `data` 和基于文件的 `sourcePath` 内容都会在上传前进行 base64 解码。这意味着当 `decodeBase64` 为 `true` 时，`sourcePath` 应指向 base64 编码的文件。当 `decodeBase64` 为 `false`（默认值）时，内容将原样上传。
{{% /alert %}}

#### 示例

##### 从文件批量创建 blob

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"bulkCreate\", \"data\": { \"items\": [{ \"blobName\": \"report.pdf\", \"sourcePath\": \"C:\\\\tmp\\\\report.pdf\", \"contentType\": \"application/pdf\" }, { \"blobName\": \"data.csv\", \"sourcePath\": \"C:\\\\tmp\\\\data.csv\", \"contentType\": \"text/csv\" }] } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "bulkCreate", "data": { "items": [{ "blobName": "report.pdf", "sourcePath": "/tmp/report.pdf", "contentType": "application/pdf" }, { "blobName": "data.csv", "sourcePath": "/tmp/data.csv", "contentType": "text/csv" }] } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

##### 从内联数据批量创建 blob

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"bulkCreate\", \"data\": { \"items\": [{ \"blobName\": \"hello.txt\", \"data\": \"Hello World\" }, { \"blobName\": \"goodbye.txt\", \"data\": \"Goodbye World\" }] } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "bulkCreate", "data": { "items": [{ "blobName": "hello.txt", "data": "Hello World" }, { "blobName": "goodbye.txt", "data": "Goodbye World" }] } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含结果的 JSON 数组：

```json
[
  {
    "blobName": "report.pdf",
    "blobURL": "https://<account>.blob.core.windows.net/<container>/report.pdf"
  },
  {
    "blobName": "data.csv",
    "blobURL": "https://<account>.blob.core.windows.net/<container>/data.csv"
  }
]
```

如果某个 blob 失败，其条目将包含 `error` 字段：

```json
[
  {
    "blobName": "report.pdf",
    "error": "open /tmp/report.pdf: no such file or directory"
  }
]
```

### 批量删除 blob

要执行批量删除操作，请使用 `POST` 方法调用 Azure Blob Storage binding，并使用以下 JSON 请求体：

```json
{
  "operation": "bulkDelete",
  "data": {
    "blobNames": ["file1.txt", "file2.txt", "file3.txt"],
    "concurrency": 10
  }
}
```

或删除所有匹配前缀的 blob：

```json
{
  "operation": "bulkDelete",
  "data": {
    "prefix": "logs/2023/",
    "deleteSnapshots": "include"
  }
}
```

数据参数为：

- `blobNames` -（可选）要删除的 blob 名称数组
- `prefix` -（可选）删除所有匹配此前缀的 blob
- `deleteSnapshots` -（可选）删除时如何处理快照。取值之一：
  - `include` - 删除基础 blob 及其所有快照
  - `only` - 仅删除 blob 的快照，而不删除 blob 本身
- `concurrency` -（可选）最大并行删除操作数。默认为 `10`

`blobNames` 或 `prefix` 至少需要提供一个。两者可以组合使用。

{{% alert title="Note" color="primary" %}}
批量删除使用 Azure Blob Batch API 进行高效删除（每个批处理请求最多 256 个 blob）。如果批处理 API 不可用，则回退为并发的单个删除操作。
{{% /alert %}}

#### 示例

##### 按 blob 名称批量删除

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"bulkDelete\", \"data\": { \"blobNames\": [\"file1.txt\", \"file2.txt\", \"file3.txt\"] } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "bulkDelete", "data": { "blobNames": ["file1.txt", "file2.txt", "file3.txt"] } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

##### 按前缀批量删除

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"bulkDelete\", \"data\": { \"prefix\": \"temp/\", \"deleteSnapshots\": \"include\" } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "bulkDelete", "data": { "prefix": "temp/", "deleteSnapshots": "include" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含结果的 JSON 数组：

```json
[
  { "blobName": "file1.txt" },
  { "blobName": "file2.txt" },
  { "blobName": "file3.txt" }
]
```

如果某个 blob 删除失败，其条目将包含 `error` 字段：

```json
[
  { "blobName": "file1.txt" },
  { "blobName": "file2.txt", "error": "BlobNotFound" }
]
```

## 元数据信息

默认情况下，Azure Blob Storage output binding 会自动生成 UUID 作为 blob 文件名，并且不会为其分配任何系统或自定义元数据。可以通过消息的元数据属性进行配置（均为可选）。

向 Azure Blob Storage output binding 发布的应用程序应发送以下格式的消息：

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

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [binding building block]({{% ref bindings %}})
- [操作指南：使用 input binding 触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用 binding 与外部资源交互]({{% ref howto-bindings.md %}})
- [binding API 参考]({{% ref bindings_api.md %}})
