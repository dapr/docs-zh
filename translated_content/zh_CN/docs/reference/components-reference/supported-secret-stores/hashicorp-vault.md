---
type: docs
title: "HashiCorp Vault"
linkTitle: "HashiCorp Vault"
description: HashiCorp Vault 机密存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/hashicorp-vault/"
---

## 创建 Vault 组件

要设置 HashiCorp Vault 机密存储，需要创建一个类型为 `secretstores.hashicorp.vault` 的组件。请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})了解如何创建和应用机密存储配置。请参阅[引用机密]({{% ref component-secrets.md %}})指南，了解如何检索机密并在 Dapr 组件中使用它。

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
  - name: caCert # 可选。与 caPath 或 caPem 二选一
    value: "[ca_cert]"
  - name: caPath # 可选。与 CaCert 或 caPem 二选一
    value: "[path_to_ca_cert_file]"
  - name: caPem # 可选。与 CaCert 或 CaPath 二选一
    value : "[encoded_ca_cert_pem]"
  - name: skipVerify # 可选。默认值：false
    value : "[skip_tls_verification]"
  - name: tlsServerName # 可选。
    value : "[tls_config_server_name]"
  - name: vaultAuthMethod # 可选。默认值："token"
    value: "token"
  - name: vaultTokenMountPath # 当 vaultAuthMethod 为 "token" 且未提供 vaultToken 时必填。令牌文件的路径。
    value : "[path_to_file_containing_token]"
  - name: vaultToken # 当 vaultAuthMethod 为 "token" 且未提供 vaultTokenMountPath 时必填。令牌值。
    value : "[token]"
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
上述示例将机密用作纯文本字符串。建议使用本地机密存储，例如 [Kubernetes 机密存储]({{% ref kubernetes-secret-store.md %}}) 或 [本地文件]({{% ref file-secret-store.md %}}) 来引导安全的机密存储。
{{% /alert %}}

## Kubernetes 认证

在 Kubernetes 上运行时，你可以将 `vaultAuthMethod` 设置为 `kubernetes`，而不是 `token`。在此模式下，组件会使用 Pod 自身的服务账号令牌，直接向 Vault 的 [Kubernetes 认证方法](https://developer.hashicorp.com/vault/docs/auth/kubernetes)进行身份验证，并在组件运行期间于后台持续续期所得到的会话。这意味着你无需运行 [Vault Agent Injector](https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector) 边车，也无需自行管理和轮换静态令牌。

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
    value: [vault_address]
  - name: vaultAuthMethod
    value: "kubernetes"
  - name: vaultKubernetesRole # 当 vaultAuthMethod 为 "kubernetes" 时必填。
    value: "[vault_role_name]"
  - name: vaultKubernetesMountPath # 可选。默认值："kubernetes"
    value: "kubernetes"
  - name: vaultServiceAccountTokenPath # 可选。默认值："/var/run/secrets/kubernetes.io/serviceaccount/token"
    value: "/var/run/secrets/kubernetes.io/serviceaccount/token"
```

使用 `vaultAuthMethod: kubernetes` 时，不得设置 `vaultToken` 和 `vaultTokenMountPath`。

令牌文件会在每次登录时重新读取，因此由 kubelet 轮换的投射服务账号令牌会被自动获取。Pod 必须挂载服务账号令牌；如果禁用了 `automountServiceAccountToken`，请自行挂载投射令牌，并将 `vaultServiceAccountTokenPath` 指向该令牌。

在此功能生效之前，Vault 本身需要了解你的集群，以及你的 Dapr 应用 Pod 被允许使用的角色。这是 Vault 端的一次性设置，可使用 [Vault CLI](https://developer.hashicorp.com/vault/docs/install) 完成，例如：

```shell
# 启用 Kubernetes 认证方法（若已启用则跳过）。
vault auth enable kubernetes

# 指向集群的 API 服务器。当 Vault 服务器运行在同一集群中时，
# 它会使用自身 Pod 的服务账号令牌和 CA 证书来审查登录令牌。
# 当 Vault 运行在集群外部时，
# 还需同时设置 token_reviewer_jwt 和 kubernetes_ca_cert。
vault write auth/kubernetes/config \
  kubernetes_host="https://kubernetes.default.svc:443"

# 为应用所需的机密授予访问权限的策略。
vault policy write dapr-app - <<EOF
path "secret/data/dapr/*" {
  capabilities = ["read"]
}
path "secret/metadata/dapr/*" {
  capabilities = ["list"]
}
EOF

# 将该策略绑定到应用 ServiceAccount 与命名空间的角色绑定。
vault write auth/kubernetes/role/dapr-app \
  bound_service_account_names=dapr-app \
  bound_service_account_namespaces=default \
  policies=dapr-app \
  ttl=1h
```

组件元数据中的 `vaultKubernetesRole` 必须与你创建的角色名称一致（即上文的 `dapr-app`），并且你的 Dapr 应用 Pod 必须以你所配置的 `bound_service_account_names`/`bound_service_account_namespaces` 运行。

## 规范元数据字段

| 字段              | 必填 | 详情                        | 示例             |
|--------------------|:--------:|--------------------------------|---------------------|
| vaultAddr      | N | Vault 服务器的地址。默认值为 `"https://127.0.0.1:8200"` | `"https://127.0.0.1:8200"` |
| caPem | N | 要使用的 CA 证书的内联内容，采用 PEM 格式。如果已定义，则优先于 `caPath` 和 `caCert`。  | 见下方 |
| caPath | N | 包含要使用的 CA 证书文件的文件夹路径，采用 PEM 格式。如果该文件夹包含多个文件，则使用其中所有文件的证书。如果已定义，则优先于 `caCert`。  |  `"path/to/cacert/holding/folder"` |
| caCert | N | 要使用的 CA 证书的路径，采用 PEM 格式。 | `""path/to/cacert.pem"` |
| skipVerify | N | 跳过 TLS 验证。默认值为 `"false"` | `"true"`, `"false"` |
| tlsServerName | N | 在 TLS 握手期间请求的服务器名称，以支持虚拟托管。此值还用于验证 Vault 服务器提供的 TLS 证书。 | `"tls-server"` |
| vaultAuthMethod | N | 对 Vault 进行身份验证时使用的方法。`token` 使用静态令牌或挂载到文件中的令牌。`kubernetes` 通过 Kubernetes 认证方法并使用 Pod 的服务账号令牌进行原生身份验证，无需 Vault Agent Injector 边车，并会在后台自动续期或重新认证。默认值为 `"token"` | `"token"`, `"kubernetes"` |
| vaultTokenMountPath | N | 包含令牌的文件的路径。当 `vaultAuthMethod` 为 `token` 且未设置 `vaultToken` 时必填。 | `"path/to/file"` |
| vaultToken | N | 用于在 Vault 中进行身份验证的[令牌](https://learn.hashicorp.com/tutorials/vault/tokens)。当 `vaultAuthMethod` 为 `token` 且未设置 `vaultTokenMountPath` 时必填。不得与 `vaultTokenMountPath` 同时设置。 | `"tokenValue"` |
| vaultKubernetesRole | N | 当 `vaultAuthMethod` 为 `kubernetes` 时用于认证的 Vault 角色。该情况下必填。 | `"my-app-role"` |
| vaultKubernetesMountPath | N | Kubernetes 认证方法在 Vault 中的挂载路径，若未挂载在默认的 `kubernetes` 路径下则需设置。默认值为 `"kubernetes"` | `"kubernetes"` |
| vaultServiceAccountTokenPath | N | 用于认证的 Kubernetes 服务账号令牌路径，覆盖默认的投射服务账号令牌路径。默认值为 `"/var/run/secrets/kubernetes.io/serviceaccount/token"` | `"/var/run/secrets/kubernetes.io/serviceaccount/token"` |
| vaultKVPrefix | N | Vault 中的前缀。默认值为 `"dapr"` | `"dapr"`, `"myprefix"` |
| vaultKVUsePrefix | N | 如果为 false，则 vaultKVPrefix 会被强制为空。如果未提供该值或设置为 true，则在访问 Vault 时使用 vaultKVPrefix。若要使用存储的 BulkGetSecret 方法，需要将其设置为 false。  | `"true"`, `"false"` |
| enginePath | N | Vault 中的[引擎](https://www.vaultproject.io/api-docs/secret/kv/kv-v2)路径。默认值为 `"secret"` | `"kv"`, `"any"` |
| vaultValueType | N | Vault 值类型。`map` 表示将值解析为 `map[string]string`，`text` 表示将值作为字符串使用。'map' 会设置 `multipleKeyValuesPerSecret` 行为。`text` 使 Vault 表现为具有名称/值语义的机密存储。默认值为 `"map"` | `"map"`, `"text"` |

## 可选的请求元数据属性

可以为 Hashicorp Vault 机密存储组件提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

查询参数 | 描述
--------- | -----------
`metadata.version_id` | 给定机密的版本。

## 设置 Hashicorp Vault 实例

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
使用 Vault 文档设置 Hashicorp Vault：https://www.vaultproject.io/docs/install/index.html。
{{% /tab %}}

{{% tab "Kubernetes" %}}
对于 Kubernetes，你可以使用 Helm Chart：<https://github.com/hashicorp/vault-helm>。
{{% /tab %}}

{{< /tabpane >}}


## 每个机密的多个键值

HashiCorp Vault 支持在一个机密中存储多个键值。虽然这种行为最终取决于由 `enginePath` 配置的底层[机密引擎](https://www.vaultproject.io/docs/secrets#secrets-engines)，但它可能会改变你在 Vault 中存储和检索键的方式。例如，在一个机密中存储多个键值，正是 `secret` 引擎（即由 `enginePath` 字段配置的默认引擎）所提供的行为。

检索机密时，会返回一个 JSON 负载，其中以键名作为字段名，并附带各自的值。

假设你按如下方式在 Vault 中添加一个机密：

```shell
vault kv put secret/dapr/mysecret firstKey=aValue secondKey=anotherValue thirdKey=yetAnotherDistinctValue
```

在上述示例中，机密名为 `mysecret`，其下包含 3 个键值。
请注意，该机密是在 `dapr` 前缀下创建的，因为这是 `vaultKVPrefix` 标志的默认值。
从 Dapr 检索它将得到以下输出：

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

请注意，结果中不会重复机密的名称（`mysecret`）。

## TLS 服务器验证

字段 `skipVerify`、`tlsServerName`、`caCert`、`caPath` 和 `caPem` 控制 Dapr 在使用 TLS/HTTPS 连接时是否以及如何验证 Vault 服务器的证书。

### 内联 CA PEM caPem

`caPem` 字段的值应为你要使用的 PEM CA 证书的内容。由于 PEM 证书由多行组成，起初定义该值可能显得有些困难。YAML 提供了几种[定义多行值](https://yaml-multiline.info/)的方式。

下面是定义 `caPem` 字段的一种方式。

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
          << the rest of your PEM file content's here, indented appropriately. >>
          -----END CERTIFICATE-----
```

## 机密轮换

通过[机密 API]({{% ref secrets_api.md %}})检索的机密会在每次请求时从 Vault 读取，因此调用该 API 的应用始终会获得机密的当前版本。

但是，在组件定义中通过 `secretKeyRef` 引用、且 `auth.secretStore` 指向 Vault 机密存储的机密，只会在组件初始化时解析。在 Vault 中轮换机密并不会触发组件重新加载，组件会一直使用旧值，直到 Dapr 边车重启或组件清单被修改为止。更多详情请阅读[更新已引用的机密]({{% ref "component-secrets.md#updating-referenced-secrets" %}})。

## 相关链接
- [机密构建块]({{% ref secrets %}})
- [操作方法：检索机密]({{% ref "howto-secrets.md" %}})
- [操作方法：在 Dapr 组件中引用机密]({{% ref component-secrets.md %}})
- [机密 API 参考]({{% ref secrets_api.md %}})
