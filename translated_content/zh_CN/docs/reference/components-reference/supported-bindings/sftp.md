---
type: docs
title: "SFTP binding spec"
linkTitle: "SFTP"
description: "Secure File Transfer Protocol (SFTP) binding 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/sftp/"
---

## 组件格式

要设置 SFTP binding，请创建一个类型为 `bindings.sftp` 的组件。请参阅[本指南]({{% ref bindings-overview.md %}})了解如何创建和应用 binding 配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.sftp
  version: v1
  metadata:
  - name: rootPath
    value: "<string>"
  - name: address
    value: "<string>"
  - name: username
    value: "<string>"
  - name: password
    value: "*****************"
  - name: privateKey
    value: "*****************"
  - name: privateKeyPassphrase
    value: "*****************"
  - name: hostPublicKey
    value: "*****************"
  - name: knownHostsFile
    value: "<string>"
  - name: insecureIgnoreHostKey
    value: "<bool>"
  - name: sequentialMode
    value: "<bool>"
```

## 规范元数据字段

| Field              | Required | Binding support |  Details | Example |
|--------------------|:--------:|------------|-----|---------|
| `rootPath` | Y | Output | 默认工作目录的根路径 | `"/path"` |
| `address`             | Y        | Output |  SFTP 服务器地址 | `"localhost:22"` |
| `username`           | Y        | Output | 用于认证的用户名 | `"username"` |
| `password`          | N        | Output | 用于用户名/密码认证的密码 | `"password"` |
| `privateKey`          | N        | Output | 用于公钥认证的私钥 | <pre>"\|-<br>-----BEGIN OPENSSH PRIVATE KEY-----<br>*****************<br>-----END OPENSSH PRIVATE KEY-----"</pre> |
| `privateKeyPassphrase`       | N        | Output | 用于公钥认证的私钥密码 | `"passphrase"`    |
| `hostPublicKey`       | N        | Output | 用于主机验证的主机公钥 | `"ecdsa-sha2-nistp256 *** root@openssh-server"`    |
| `knownHostsFile`       | N        | Output | 用于主机验证的已知主机文件 | `"/path/file"` |
| `insecureIgnoreHostKey`       | N        | Output | 允许跳过主机验证。默认为 `"false"` | `"true"`, `"false"` |
| `sequentialMode`       | N        | Output | 用于指定单个 SFTP 连接内是否允许多个并发操作。将此设置为 true 可以防止可能干扰严格 SFTP 服务器的并发操作。默认为 `"false"` | `"true"`, `"false"` |

## Binding 支持

此组件支持**输出 binding**，包含以下操作：

- `create`：[创建文件](#create-file)
- `get`：[获取文件](#get-file)
- `list`：[列出文件](#list-files)
- `delete`：[删除文件](#delete-file)

### 创建文件

要执行创建文件操作，请使用 `POST` 方法调用 SFTP binding，并附带以下 JSON 请求体：

```json
{
  "operation": "create",
  "data": "<YOUR_BASE_64_CONTENT>",
  "metadata": {
    "fileName": "<filename>",
  }
}
```

#### 示例

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d "{ \"operation\": \"create\", \"data\": \"YOUR_BASE_64_CONTENT\", \"metadata\": { \"fileName\": \"my-test-file.jpg\" } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "create", "data": "YOUR_BASE_64_CONTENT", "metadata": { "fileName": "my-test-file.jpg" } }' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含以下 JSON：

```json
{
   "fileName": "<filename>"
}

```

### 获取文件

要执行获取文件操作，请使用 `POST` 方法调用 SFTP binding，并附带以下 JSON 请求体：

```json
{
  "operation": "get",
  "metadata": {
    "fileName": "<filename>"
  }
}
```

#### 示例

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"get\", \"metadata\": { \"fileName\": \"filename\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "get", "metadata": { "fileName": "filename" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应体包含文件中存储的值。

### 列出文件

要执行列出文件操作，请使用 `POST` 方法调用 SFTP binding，并附带以下 JSON 请求体：

```json
{
  "operation": "list"
}
```

如果您只想列出 `rootPath` 下某个特定目录中的文件，请在元数据中将相对目录名称指定为 `fileName`。

```json
{
  "operation": "list",
  "metadata": {
    "fileName": "my/cool/directory"
  }
}
```

#### 示例

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"list\", \"metadata\": { \"fileName\": \"my/cool/directory\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "list", "metadata": { "fileName": "my/cool/directory" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

响应是一个文件名的 JSON 数组。

### 删除文件

要执行删除文件操作，请使用 `POST` 方法调用 SFTP binding，并附带以下 JSON 请求体：

```json
{
  "operation": "delete",
  "metadata": {
    "fileName": "myfile"
  }
}
```

#### 示例

{{< tabpane text=true >}}

  {{% tab "Windows" %}}
  ```bash
  curl -d '{ \"operation\": \"delete\", \"metadata\": { \"fileName\": \"myfile\" }}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

  {{% tab "Linux" %}}
  ```bash
  curl -d '{ "operation": "delete", "metadata": { "fileName": "myfile" }}' \
        http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
  ```
  {{% /tab %}}

{{< /tabpane >}}

#### 响应

如果成功，返回 HTTP 204（No Content）和空响应体。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [如何-To：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
