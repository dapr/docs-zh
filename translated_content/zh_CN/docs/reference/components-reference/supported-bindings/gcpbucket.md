---
type: docs
title: "GCP Storage Bucket binding 规范"
linkTitle: "GCP Storage Bucket"
description: "GCP Storage Bucket binding 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/gcpbucket/"
---

## 组件格式

要设置 GCP Storage Bucket binding，请创建类型为 `bindings.gcp.bucket` 的组件。有关如何创建和应用 binding 配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.gcp.bucket
  version: v1
  metadata:
  - name: bucket
    value: "mybucket"
  - name: type
    value: "service_account"
  - name: project_id
    value: "project_111"
  - name: private_key_id
    value: "*************"
  - name: client_email
    value: "name@domain.com"
  - name: client_id
    value: "1111111111111111"
  - name: auth_uri
    value: "https://accounts.google.com/o/oauth2/auth"
  - name: token_uri
    value: "https://oauth2.googleapis.com/token"
  - name: auth_provider_x509_cert_url
    value: "https://www.googleapis.com/oauth2/v1/certs"
  - name: client_x509_cert_url
    value: "https://www.googleapis.com/robot/v1/metadata/x509/<project-name>.iam.gserviceaccount.com"
  - name: private_key
    value: "PRIVATE KEY"
  - name: decodeBase64
    value: "<bool>"
  - name: encodeBase64
    value: "<bool>"
  - name: contentType
    value: "<string>"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯文本字符串使用。建议使用 secret store 来存储密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必需 | Binding 支持 |  详细说明 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `bucket` | Y | Output | bucket 名称 | `"mybucket"` |
| `project_id`     | Y | Output | GCP 项目 ID | `projectId` |
| `type` | N | Output | GCP 凭据类型 | `"service_account"` |
| `private_key_id` | N | Output | 如果使用显式凭据，此字段应包含服务账号 json 文档中的 `private_key_id` 字段 | `"privateKeyId"` |
| `private_key`    | N | Output | 如果使用显式凭据，此字段应包含服务账号 json 中的 `private_key` 字段。替换为 x509 证书 | `12345-12345` |
| `client_email`   | N | Output | 如果使用显式凭据，此字段应包含服务账号 json 中的 `client_email` 字段  | `"client@email.com"` |
| `client_id`      | N |  Output | 如果使用显式凭据，此字段应包含服务账号 json 中的 `client_id` 字段 | `0123456789-0123456789` |
| `auth_uri`       | N | Output | 如果使用显式凭据，此字段应包含服务账号 json 中的 `auth_uri` 字段 | `https://accounts.google.com/o/oauth2/auth` |
| `token_uri`      | N | Output | 如果使用显式凭据，此字段应包含服务账号 json 中的 `token_uri` 字段 | `https://oauth2.googleapis.com/token`|
| `auth_provider_x509_cert_url` | N | Output | 如果使用显式凭据，此字段应包含服务账号 json 中的 `auth_provider_x509_cert_url` 字段 | `https://www.googleapis.com/oauth2/v1/certs`|
| `client_x509_cert_url` | N | Output | 如果使用显式凭据，此字段应包含服务账号 json 中的 `client_x509_cert_url` 字段 | `https://www.googleapis.com/robot/v1/metadata/x509/<PROJECT_NAME>.iam.gserviceaccount.com`|
| `decodeBase64` | N | Output | 在保存到 bucket 存储之前解码 base64 文件内容的配置。（用于保存二进制内容的文件）。`true` 是唯一允许的肯定值。其他肯定变体如 `"True", "1"` 不可接受。默认为 `false` | `true`, `false` |
| `encodeBase64` | N | Output | 在返回内容之前编码 base64 文件内容的配置。（用于打开二进制内容的文件）。`true` 是唯一允许的肯定值。其他肯定变体如 `"True", "1"` 不可接受。默认为 `false` | `true`, `false` |
| `contentType` | N | Output | 为 bucket 中创建的对象设置的 MIME 类型。如果未指定，GCP 将尝试自动检测内容类型。 | `"text/csv"`, `"application/json"`, `"image/png"` |

## GCP 凭据

由于 GCP Storage Bucket 组件使用 GCP Go 客户端库，默认情况下它使用 **Application Default Credentials** 进行身份验证。这在 [Authenticate to GCP Cloud services using client libraries](https://cloud.google.com/docs/authentication/client-libraries) 指南中有进一步说明。
此外，请参阅如何[设置 Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc)。

## GCP 凭据

由于 GCP Storage Bucket 组件使用 GCP Go 客户端库，默认情况下它使用 **Application Default Credentials** 进行身份验证。这在 [Authenticate to GCP Cloud services using client libraries](https://cloud.google.com/docs/authentication/client-libraries) 指南中有进一步说明。
此外，请参阅如何[设置 Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc)。

## Binding 支持

此组件支持以下操作的**输出 binding**：

- `create` : [创建文件](#create-file)
- `get` : [获取文件](#get-file)
- `bulkGet` : [批量获取对象](#bulk-get-objects)
- `delete` : [删除文件](#delete-file)
- `list`: [列出文件](#list-files)
- `copy`: [复制文件](#copy-files)
- `move`: [移动文件](#move-files)
- `rename`: [重命名文件](#rename-files)


### 创建文件

要执行 create 操作，使用 `POST` 方法调用 GCP Storage Bucket binding 并提供以下 JSON 请求体：

> 注意：默认情况下会生成一个随机 UUID。有关设置名称的元数据支持，请参见下文

```json
{
  "operation": "create",
  "data": "YOUR_CONTENT"
}
```
元数据参数包括：
- `key` - （可选）对象的名称
- `decodeBase64` - （可选）在保存到存储之前解码 base64 文件内容的配置
- `contentType` - （可选）正在创建的对象的 MIME 类型

#### 示例
##### 将文本保存到随机生成的 UUID 文件

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

##### 将文本保存到指定文件

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"create\", \"data\": \"Hello World\", \"metadata\": { \"key\": \"my-test-file.txt\" } }" \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "create", "data": "Hello World", "metadata": { "key": "my-test-file.txt" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

##### 保存具有正确内容类型的 CSV 文件

{{< tabpane text=true >}}

  {{% tab %}}
  ```bash
  curl -d "{ \"operation\": \"create\", \"data\": \"$(cat data.csv | base64)\", \"metadata\": { \"key\": \"data.csv\", \"contentType\": \"text/csv\", \"decodeBase64\": \"true\" } }" \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab %}}
  ```bash
  curl -d '{ "operation": "create", "data": "'"$(base64 < data.csv)"'", "metadata": { "key": "data.csv", "contentType": "text/csv", "decodeBase64": "true" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

##### 上传文件

要上传文件，将文件内容作为数据负载传递；对于二进制内容，您可能需要对其进行 Base64 编码。

然后您可以像往常一样上传它：

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"create\", \"data\": \"(YOUR_FILE_CONTENTS)\", \"metadata\": { \"key\": \"my-test-file.jpg\", \"contentType\": \"image/jpeg\" } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "create", "data": "$(cat my-test-file.jpg | base64)", "metadata": { "key": "my-test-file.jpg", "contentType": "image/jpeg", "decodeBase64": "true" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体将包含以下 JSON：

```json
{
    "objectURL":"https://storage.googleapis.com/<your bucket>/<key>",
}
```

### 获取对象

要执行 get 文件操作，使用 `POST` 方法调用 GCP bucket binding 并提供以下 JSON 请求体：

```json
{
  "operation": "get",
  "metadata": {
    "key": "my-test-file.txt"
  }
}
```

元数据参数包括：

- `key` - 对象的名称
- `encodeBase64` - （可选）在返回内容之前编码 base64 文件内容的配置。


#### 示例

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"get\", \"metadata\": { \"key\": \"my-test-file.txt\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "get", "metadata": { "key": "my-test-file.txt" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含存储在对象中的值。

### 批量获取对象

要执行一次性检索所有 bucket 文件的批量获取操作，使用 `POST` 方法调用 GCP bucket binding 并提供以下 JSON 请求体：

```json
{
  "operation": "bulkGet",
}
```

元数据参数包括：

- `encodeBase64` - （可选）在返回所有文件的内容之前编码 base64 文件内容的配置

#### 示例

{{< tabpane text=true >}}

  {{% tab header="Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"bulkget\"}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab header="Linux" %}}
  ```bash
  curl -d '{ "operation": "bulkget"}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含一个对象数组，其中每个对象代表 bucket 中的一个文件，具有以下结构：

```json
[
  {
    "name": "file1.txt",
    "data": "content of file1",
    "attrs": {
      "bucket": "mybucket",
      "name": "file1.txt",
      "size": 1234,
      ...
    }
  },
  {
    "name": "file2.txt",
    "data": "content of file2",
    "attrs": {
      "bucket": "mybucket",
      "name": "file2.txt",
      "size": 5678,
      ...
    }
  }
]
```

数组中的每个对象包含：
- `name`：文件名
- `data`：文件内容
- `attrs`：来自 GCP Storage 的对象属性，包括创建时间、大小、内容类型等元数据

### 删除对象

要执行 delete 对象操作，使用 `POST` 方法调用 GCP bucket binding 并提供以下 JSON 请求体：

```json
{
  "operation": "delete",
  "metadata": {
    "key": "my-test-file.txt"
  }
}
```

元数据参数包括：

- `key` - 对象的名称


#### 示例

##### 删除对象

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"delete\", \"metadata\": { \"key\": \"my-test-file.txt\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "delete", "metadata": { "key": "my-test-file.txt" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应
如果成功，将返回 HTTP 204 (No Content) 和空响应体。


### 列出对象

要执行 list 对象操作，使用 `POST` 方法调用 GCP bucket binding 并提供以下 JSON 请求体：

```json
{
  "operation": "list",
  "data": {
    "maxResults": 10,
    "prefix": "file",
    "delimiter": "i0FvxAn2EOEL6"
  }
}
```

数据参数包括：

- `maxResults` - （可选）设置响应中返回的键的最大数量。默认情况下，操作最多返回 1,000 个键名。响应可能包含较少的键，但绝不会包含更多。
- `prefix` - （可选）可用于过滤以 prefix 开头的对象。
- `delimiter` - （可选）可用于将结果限制为给定"目录"中的对象。如果没有 delimiter，则返回 prefix 下的整个树

#### 响应

响应体包含找到的对象列表。

对象列表将以以下形式的 JSON 数组返回：

```json
[
	{
		"Bucket": "<your bucket>",
		"Name": "02WGzEdsUWNlQ",
		"ContentType": "image/png",
		"ContentLanguage": "",
		"CacheControl": "",
		"EventBasedHold": false,
		"TemporaryHold": false,
		"RetentionExpirationTime": "0001-01-01T00:00:00Z",
		"ACL": null,
		"PredefinedACL": "",
		"Owner": "",
		"Size": 5187,
		"ContentEncoding": "",
		"ContentDisposition": "",
		"MD5": "aQdLBCYV0BxA51jUaxc3pQ==",
		"CRC32C": 1058633505,
		"MediaLink": "https://storage.googleapis.com/download/storage/v1/b/<your bucket>/o/02WGzEdsUWNlQ?generation=1631553155678071&alt=media",
		"Metadata": null,
		"Generation": 1631553155678071,
		"Metageneration": 1,
		"StorageClass": "STANDARD",
		"Created": "2021-09-13T17:12:35.679Z",
		"Deleted": "0001-01-01T00:00:00Z",
		"Updated": "2021-09-13T17:12:35.679Z",
		"CustomerKeySHA256": "",
		"KMSKeyName": "",
		"Prefix": "",
		"Etag": "CPf+mpK5/PICEAE="
	}
]
```

### 复制对象

要执行 copy 对象操作，使用 `POST` 方法调用 GCP bucket binding 并提供以下 JSON 请求体：

```json
{
  "operation": "copy",
  "metadata": {
    "key": "source-file.txt",
    "destinationBucket": "destination-bucket-name"
  }
}
```

元数据参数包括：

- `key` - 源对象的名称（必需）
- `destinationBucket` - 目标 bucket 的名称（必需）

### 移动对象

要执行 move 对象操作，使用 `POST` 方法调用 GCP bucket binding 并提供以下 JSON 请求体：

```json
{
  "operation": "move",
  "metadata": {
    "key": "source-file.txt",
    "destinationBucket": "destination-bucket-name"
  }
}
```

元数据参数包括：

- `key` - 源对象的名称（必需）
- `destinationBucket` - 目标 bucket 的名称（必需）

### 重命名对象

要执行 rename 对象操作，使用 `POST` 方法调用 GCP bucket binding 并提供以下 JSON 请求体：

```json
{
  "operation": "rename",
  "metadata": {
    "key": "old-name.txt",
    "newName": "new-name.txt"
  }
}
```

元数据参数包括：

- `key` - 对象的当前名称（必需）
- `newName` - 对象的新名称（必需）

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作方法：使用 input binding 触发应用程序]({{% ref howto-triggers.md %}})
- [操作方法：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
