---
type: docs
title: "Huawei OBS binding 规范"
linkTitle: "Huawei OBS"
description: "Huawei OBS binding 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/huawei-obs/"
---

## 组件格式

要设置 Huawei Object Storage Service (OBS)（输出）binding，请创建类型为 `bindings.huawei.obs` 的组件。有关如何创建和应用 binding 配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.huawei.obs
  version: v1
  - name: bucket
    value: "<your-bucket-name>"
  - name: endpoint
    value: "<obs-bucket-endpoint>"
  - name: accessKey
    value: "<your-access-key>"
  - name: secretKey
    value: "<your-secret-key>"
  # optional fields
  - name: region
    value: "<your-bucket-region>"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体方法请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | Binding 支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `bucket` | Y | Output | 要写入的 Huawei OBS bucket 名称 | `"My-OBS-Bucket"` |
| `endpoint` | Y | Output | 特定的 Huawei OBS 端点 | `"obs.cn-north-4.myhuaweicloud.com"` |
| `accessKey` | Y | Output | 访问此资源的 Huawei Access Key (AK) | `"************"` |
| `secretKey` | Y | Output | 访问此资源的 Huawei Secret Key (SK) | `"************"` |
| `region` | N | Output | bucket 的特定华为区域 | `"cn-north-4"` |

## Binding 支持

此组件支持**输出 binding**，包含以下操作：

- `create`：[创建文件](#create-file)
- `upload`：[上传文件](#upload-file)
- `get`：[获取文件](#get-file)
- `delete`：[删除文件](#delete-file)
- `list`：[列出文件](#list-files)

### 创建文件

要执行创建操作，请使用 `POST` 方法调用 Huawei OBS binding，并传入以下 JSON 请求体：

> 注意：默认情况下会生成一个随机的 UUID。有关设置目标文件名的元数据支持，请参见下文

```json
{
  "operation": "create",
  "data": "YOUR_CONTENT"
}
```

#### 示例
##### 将文本保存到随机生成的 UUID 文件

{{< tabpane text=true >}}
  {{% tab "Windows" %}}
  在 Windows 上，请使用 cmd 提示符（PowerShell 具有不同的转义机制）
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

##### 将文本保存到特定文件

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

#### 响应

响应 JSON 请求体包含 `statusCode` 和 `versionId` 字段。仅当启用了 bucket 版本控制时，`versionId` 才会返回值，否则为空字符串。

### 上传文件

要上传二进制文件（例如 _.jpg_、_.zip_），请使用 `POST` 方法调用 Huawei OBS binding，并传入以下 JSON 请求体：

> 注意：如果您未指定 `key`，默认情况下会生成一个随机 UUID。有关设置目标文件名的元数据支持，请参见以下示例。此 API 可用于上传常规文件，例如纯文本文件。

```json
{
  "operation": "upload",
  "metadata": {
     "key": "DESTINATION_FILE_NAME"
   },
  "data": {
     "sourceFile": "PATH_TO_YOUR_SOURCE_FILE"
   }
}
```

#### 示例

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"upload\", \"data\": { \"sourceFile\": \".\my-test-file.jpg\" }, \"metadata\": { \"key\": \"my-test-file.jpg\" } }" \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "upload", "data": { "sourceFile": "./my-test-file.jpg" }, "metadata": { "key": "my-test-file.jpg" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应 JSON 请求体包含 `statusCode` 和 `versionId` 字段。仅当启用了 bucket 版本控制时，`versionId` 才会返回值，否则为空字符串。

### 获取对象

要执行获取文件操作，请使用 `POST` 方法调用 Huawei OBS binding，并传入以下 JSON 请求体：

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

响应请求体包含存储在对象中的值。

### 删除对象

要执行删除对象操作，请使用 `POST` 方法调用 Huawei OBS binding，并传入以下 JSON 请求体：

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

成功时返回 HTTP 204（No Content）和空请求体。

### 列出对象

要执行列出对象操作，请使用 `POST` 方法调用 Huawei OBS binding，并传入以下 JSON 请求体：

```json
{
  "operation": "list",
  "data": {
    "maxResults": 5,
    "prefix": "dapr-",
    "marker": "obstest",
    "delimiter": "jpg"
  }
}
```

数据参数包括：

- `maxResults` -（可选）设置响应中返回的最大键数。默认情况下，此操作最多返回 1,000 个键名。响应可能包含较少的键，但绝不会包含更多。
- `prefix` -（可选）将响应限制为以指定前缀开头的键。
- `marker` -（可选）marker 是您希望 Huawei OBS 开始列出的位置。Huawei OBS 从此指定的键之后开始列出。Marker 可以是 bucket 中的任何键。然后在后续调用中可以使用 marker 值来请求下一组列表项。
- `delimiter` -（可选）分隔符是用于对键进行分组的字符。它返回的对象/文件的键不同于由分隔符模式指定的键。

#### 示例

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"list\", \"data\": { \"maxResults\": 5, \"prefix\": \"dapr-\", \"marker\": \"obstest\", \"delimiter\": \"jpg\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "list", "data": { "maxResults": 5, "prefix": "dapr-", "marker": "obstest", "delimiter": "jpg" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应请求体包含找到的对象列表。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：通过输入 binding 触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
