---
type: docs
title: "HashiCorp Vault"
linkTitle: "HashiCorp Vault"
description: HashiCorp Vault 密钥存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/hashicorp-vault/"
---

## 创建 Vault 组件

要设置 HashiCorp Vault 密钥存储，需要创建一个类型为 `secretstores.hashicorp.vault` 的组件。请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})了解如何创建和应用密钥存储配置。请参阅[引用密钥]({{% ref component-secrets.md %}})指南，了解如何使用 Dapr 组件检索和使用密钥。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: [vault_address] # 可选。默认值："https://127.0.0.1:8200"
  - name: caCert # 可选。与此项或 caPath 或 caPem 二选一
    value: "[ca_cert]"
  - name: caPath # 可选。与此项或 CaCert 或 caPem 二选一
    value: "[path_to_ca_cert_file]"
  - name: caPem # 可选。与此项或 CaCert 或 CaPath 二选一
    value : "[encoded_ca_cert_pem]"
  - name: skipVerify # 可选。默认值：false
    value : "[skip_tls_verification]"
  - name: tlsServerName # 可选。
    value : "[tls_config_server_name]"
  - name: vaultTokenMountPath # 如果未提供 vaultToken 则为必填。令牌文件的路径。
    value : "[path_to_file_containing_token]"
  - name: vaultToken # 如果未提供 vaultTokenMountPath 则为必填。令牌值。
    value : "[path_to_file_containing_token]"
  - name: vaultKVPrefix # 可选。默认值："dapr"
    value : "[vault_prefix]"
  - name: vaultKVUsePrefix # 可选。默认值："true"
    value: "[true/false]"
  - name: enginePath # 可选。默认值："secret"
    value: "secret"
  - name: vaultValueType # 可选。默认值："map"
    value: "map"
```
{{% alert title="Warning" color="warning" %}}
上述示例将密钥用作纯文本字符串。建议使用本地密钥存储，例如 [Kubernetes secret store]({{% ref kubernetes-secret-store.md %}}) 或 [本地文件]({{% ref file-secret-store.md %}}) 来引导安全密钥存储。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情                        | 示例             |
|--------------------|:--------:|--------------------------------|---------------------|
| vaultAddr      | N | Vault 服务器的地址。默认值为 `"https://127.0.0.1:8200"` | `"https://127.0.0.1:8200"` |
| caPem | N | 要使用的 CA 证书的内联内容，采用 PEM 格式。如果已定义，则优先于 `caPath` 和 `caCert`。  | 见下方 |
| caPath | N | 包含要使用的 CA 证书文件的文件夹路径，采用 PEM 格式。如果文件夹包含多个文件，将仅使用找到的第一个文件。如果已定义，则优先于 `caCert`。  |  `"path/to/cacert/holding/folder"` |
| caCert | N | 要使用的 CA 证书的路径，采用 PEM 格式。 | `""path/to/cacert.pem"` |
| skipVerify | N | 跳过 TLS 验证。默认值为 `"false"` | `"true"`, `"false"` |
| tlsServerName | N | 在 TLS 握手期间请求的服务器名称，以支持虚拟托管。此值还用于验证 Vault 服务器提供的 TLS 证书。 | `"tls-server"` |
| vaultTokenMountPath | Y | 包含令牌的文件的路径 | `"path/to/file"` |
| vaultToken | Y | 用于在 Vault 中进行身份验证的 [令牌](https://learn.hashicorp.com/tutorials/vault/tokens)。  | `"tokenValue"` |
| vaultKVPrefix | N | vault 中的前缀。默认值为 `"dapr"` | `"dapr"`, `"myprefix"` |
| vaultKVUsePrefix | N | 如果为 false，vaultKVPrefix 将被强制为空。如果未给出该值或设置为 true，则在访问 vault 时使用 vaultKVPrefix。若要能够使用存储的 BulkGetSecret 方法，需要将其设置为 false。  | `"true"`, `"false"` |
| enginePath | N | vault 中的[引擎](https://www.vaultproject.io/api-docs/secret/kv/kv-v2)路径。默认值为 `"secret"` | `"kv"`, `"any"` |
| vaultValueType | N | Vault 值类型。`map` 表示将值解析为 `map[string]string`，`text` 表示将值作为字符串使用。'map' 设置 `multipleKeyValuesPerSecret` 行为。`text` 使 Vault 充当具有名称/值语义的密钥存储。  默认值为 `"map"` | `"map"`, `"text"` |

## 可选的请求元数据属性

可以向 Hashicorp Vault 密钥存储组件提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

查询参数 | 描述
--------- | -----------
`metadata.version_id` | 给定密钥的版本。

## 设置 Hashicorp Vault 实例

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
使用 Vault 文档设置 Hashicorp Vault：https://www.vaultproject.io/docs/install/index.html。
{{% /tab %}}

{{% tab "Kubernetes" %}}
对于 Kubernetes，您可以使用 Helm Chart：<https://github.com/hashicorp/vault-helm>。
{{% /tab %}}

{{< /tabpane >}}


## 每个密钥的多个键值

HashiCorp Vault 支持在一个密钥中存储多个键值。虽然这种行为最终取决于由 `enginePath` 配置的底层[密钥引擎](https://www.vaultproject.io/docs/secrets#secrets-engines)，但它可能会改变您从 Vault 存储和检索密钥的方式。例如，密钥中的多个键值是在 `secret` 引擎中公开的行为，这是由 `enginePath` 字段配置的默认引擎。

检索密钥时，将返回一个 JSON 有效负载，其中键名作为字段，各自的值作为值。

假设您按如下方式向 Vault 设置添加一个密钥：

```shell
vault kv put secret/dapr/mysecret firstKey=aValue secondKey=anotherValue thirdKey=yetAnotherDistinctValue
```

在上述示例中，密钥名为 `mysecret`，它下面有 3 个键值。
请注意，密钥是在 `dapr` 前缀下创建的，因为这是 `vaultKVPrefix` 标志的默认值。
从 Dapr 检索它将产生以下输出：

```shell
$ curl http://localhost:3501/v1.0/secrets/my-hashicorp-vault/mysecret
```

```json
{
  "firstKey": "aValue",
  "secondKey": "anotherValue",
  "thirdKey": "yetAnotherDistinctValue"
}
```

请注意，密钥的名称（`mysecret`）在结果中未重复。


## TLS 服务器验证

字段 `skipVerify`、`tlsServerName`、`caCert`、`caPath` 和 `caPem` 控制 Dapr 在使用 TLS/HTTPS 连接时是否以及如何验证 vault 服务器的证书。

### 内联 CA PEM caPem

`caPem` 字段值应该是您要使用的 PEM CA 证书的内容。鉴于 PEM 证书由多行组成，定义该值起初可能看起来具有挑战性。YAML 允许使用几种方式来[定义多行值](https://yaml-multiline.info/)。

以下是定义 `caPem` 字段的一种方法。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: https://127.0.0.1:8200
  - name: caPem
    value: |-
          -----BEGIN CERTIFICATE-----
          << 您的 PEM 文件内容的其余部分在此处，适当缩进。 >>
          -----END CERTIFICATE-----
```

## 相关链接
- [密钥构建块]({{% ref secrets %}})
- [操作方法：检索密钥]({{% ref "howto-secrets.md" %}})
- [操作方法：在 Dapr 组件中引用密钥]({{% ref component-secrets.md %}})
- [密钥 API 参考]({{% ref secrets_api.md %}})
