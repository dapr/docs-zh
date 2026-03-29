---
type: docs
title: "Local file (for Development)"
linkTitle: "Local file"
description: Detailed information on the local file secret store component
aliases:
  - "/operations/components/setup-secret-store/supported-secret-stores/file-secret-store/"
---

此 Dapr 密钥存储组件从给定文件读取纯文本 JSON，不使用身份验证。

{{% alert title="Warning" color="warning" %}}
不推荐在生产环境中使用此密钥管理方式。
{{% /alert %}}

## Component format

要设置基于本地文件的密钥存储，请创建类型为 `secretstores.local.file` 的组件。在 `./components` 目录中创建具有以下内容的文件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secret-store
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: [path to the JSON file]
  - name: nestedSeparator
    value: ":"
  - name: multiValued
    value: "false"
```

## Spec metadata fields

| Field              | Required | Details                                                                 | Example                  |
|--------------------|:--------:|-------------------------------------------------------------------------|--------------------------|
| secretsFile        | Y        | 存储密钥的文件路径   | `"path/to/file.json"` |
| nestedSeparator    | N        | 在将 JSON 层级结构展平为 map 时由存储使用。默认为 `":"` | `":"` 
| multiValued        | N        | `"true"` 设置 `multipleKeyValuesPerSecret` 行为。允许在展平 JSON 层级结构之前具有一层多值键/值对。默认为 `"false"` | `"true"` |

## Setup JSON file to hold the secrets

给定以下从 `secretsFile` 加载的 JSON：

```json
{
    "redisPassword": "your redis password",
    "connectionStrings": {
        "sql": "your sql connection string",
        "mysql": "your mysql connection string"
    }
}
```

标志 `multiValued` 决定密钥存储是呈现[名称/值行为还是每个密钥多个键值的行为]({{% ref "secrets_api.md#response-body" %}})。

### Name/Value semantics

如果 `multiValued` 为 `false`，存储会加载 [JSON 文件]({{% ref "#setup-json-file-to-hold-the-secrets" %}}) 并创建具有以下键值对的 map：

| flattened key           | value                           |
| ---                     | ---                             |
|"redisPassword"          | `"your redis password"`           |
|"connectionStrings:sql"  | `"your sql connection string"`    |
|"connectionStrings:mysql"| `"your mysql connection string"`  |


如果将 `multiValued` 设置为 true，在键 `connectionStrings` 上调用 `GET` 请求将导致 500 HTTP 响应和错误消息。例如：

```shell
$ curl http://localhost:3501/v1.0/secrets/local-secret-store/connectionStrings
```
```json
{
  "errorCode": "ERR_SECRET_GET",
  "message": "failed getting secret with key connectionStrings from secret store local-secret-store: secret connectionStrings not found"
}
```

此错误是预期的，因为根据上表，不存在 `connectionStrings` 键。

但是，请求展平键 `connectionStrings:sql` 将成功响应，结果如下：

```shell
$ curl http://localhost:3501/v1.0/secrets/local-secret-store/connectionStrings:sql
```
```json
{
  "connectionStrings:sql": "your sql connection string"
}
```

### Multiple key-values behavior

如果 `multiValued` 为 `true`，密钥存储将启用每个密钥多个键值的行为：
- 顶层之后的嵌套结构将被展平。
- 它将[相同的 JSON 文件]({{% ref "#setup-json-file-to-hold-the-secrets" %}}) 解析为以下表格：

| key                | value                           |
| ---                | ---                             |
|"redisPassword"     | `"your redis password"`           |
|"connectionStrings" | `{"mysql":"your mysql connection string","sql":"your sql connection string"}`    |

请注意，在上表中：
- `connectionStrings` 现在是一个 JSON 对象，包含两个键：`mysql` 和 `sql`。 
- 来自[名称/值语义映射表]({{% ref "#namevalue-semantics" %}})的 `connectionStrings:sql` 和 `connectionStrings:mysql` 展平键已缺失。

现在在键 `connectionStrings` 上调用 `GET` 请求将成功返回 HTTP 响应，类似于以下内容：

```shell
$ curl http://localhost:3501/v1.0/secrets/local-secret-store/connectionStrings
```
```json
{
  "sql": "your sql connection string",
  "mysql": "your mysql connection string"
}
```

同时，现在请求展平键 `connectionStrings:sql` 将返回 500 HTTP 错误响应，内容如下：

```json
{
  "errorCode": "ERR_SECRET_GET",
  "message": "failed getting secret with key connectionStrings:sql from secret store local-secret-store: secret connectionStrings:sql not found"
}
```


#### Handling deeper nesting levels

请注意，如 [spec metadata fields table](#spec-metadata-fields) 中所述，`multiValued` 仅处理单个嵌套层级。

假设您有一个启用了 `multiValued` 的本地文件密钥存储，指向具有以下 JSON 内容的 `secretsFile`：

```json
{
    "redisPassword": "your redis password",
    "connectionStrings": {
        "mysql": {
          "username": "your mysql username",
          "password": "your mysql password"
        }
    }
}
```
`connectionStrings` 下键 `mysql` 的内容的嵌套层级大于 1，将被展平。

它在内存中的样子如下：

| key                | value                           |
| ---                | ---                             |
|"redisPassword"     | `"your redis password"`           |
|"connectionStrings" | `{ "mysql:username": "your mysql username", "mysql:password": "your mysql password" }`    |


同样，请求键 `connectionStrings` 将成功返回 HTTP 响应，但其内容如上表所示，将是展平的：

```shell
$ curl http://localhost:3501/v1.0/secrets/local-secret-store/connectionStrings
```
```json
{
  "mysql:username": "your mysql username",
  "mysql:password": "your mysql password"
}
```

这对于模拟 Vault 或 Kubernetes 等每个密钥键返回多个键/值对的密钥存储非常有用。

## Related links
- [Secrets building block]({{% ref secrets %}})
- [How-To: Retrieve a secret]({{% ref "howto-secrets.md" %}})
- [How-To: Reference secrets in Dapr components]({{% ref component-secrets.md %}})
- [Secrets API reference]({{% ref secrets_api.md %}})
