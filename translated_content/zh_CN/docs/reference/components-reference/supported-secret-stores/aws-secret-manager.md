---
type: docs
title: "AWS Secrets Manager"
linkTitle: "AWS Secrets Manager"
description: 有关 AWS Secrets Manager 密钥存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/aws-secret-manager/"
---

## 组件格式

要设置 AWS Secrets Manager 密钥存储，请创建类型为 `secretstores.aws.secretmanager` 的组件。有关如何创建和应用密钥存储配置的信息，请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})。有关使用 Dapr 组件检索和使用密钥的信息，请参阅[引用密钥]({{% ref component-secrets.md %}})指南。

有关身份验证相关属性的信息，请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: awssecretmanager
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "[aws_region]"
  - name: accessKey
    value: "[aws_access_key]"
  - name: secretKey
    value: "[aws_secret_key]"
  - name: sessionToken
    value: "[aws_session_token]"
  - name: multipleKeyValuesPerSecret
    value: "false"
```
{{% alert title="警告" color="warning" %}}
上面的示例使用明文字符串作为密钥。建议使用本地密钥存储（如 [Kubernetes secret store]({{% ref kubernetes-secret-store.md %}}) 或[本地文件]({{% ref file-secret-store.md %}})）来引导安全的密钥存储。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情                                                                 | 示例             |
|--------------------|:--------:|-------------------------------------------------------------------------|---------------------|
| region             | Y        | AWS Secrets Manager 实例部署到的特定 AWS 区域                                 | `"us-east-1"`       |
| accessKey          | Y        | 用于访问此资源的 AWS Access Key                                            | `"key"`             |
| secretKey          | Y        | 用于访问此资源的 AWS Secret Access Key                                     | `"secretAccessKey"` |
| sessionToken       | N        | 要使用的 AWS 会话令牌                                                      | `"sessionToken"`    |
| multipleKeyValuesPerSecret | N | 当设置为 `"true"` 时，允许在单个密钥中存储多个键值对。默认为 `"false"` | `"true"` |

{{% alert title="重要" color="warning" %}}
当在 EKS（AWS Kubernetes）上使用应用程序运行 Dapr 边车（daprd）时，如果您使用的节点/Pod 已附加到定义了对 AWS 资源访问权限的 IAM 策略，则**不得**在所使用的组件规范定义中提供 AWS access-key、secret-key 和令牌。  
{{% /alert %}}

## 可选的每请求元数据属性

从此密钥存储检索密钥时，可以提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

查询参数 | 描述
--------- | -----------
`metadata.version_id` | 给定密钥的版本。
`metadata.version_stage` | 给定密钥的版本阶段。

## 配置每个密钥的多个键值对

`multipleKeyValuesPerSecret` 标志确定密钥存储是每个密钥呈现单个值还是多个键值对。

### 每个密钥的单个值

如果 `multipleKeyValuesPerSecret` 为 `false`（默认），AWS Secrets Manager 将按原样返回密钥值。给定名为 `database-credentials` 的密钥，其包含以下 JSON 内容：

```json
{
  "username": "admin",
  "password": "secret123",
  "host": "db.example.com"
}
```

请求此密钥会将整个 JSON 作为单个值返回：

```bash
$ curl http://localhost:3500/v1.0/secrets/awssecretmanager/database-credentials
{
  "database-credentials": "{\"username\":\"admin\",\"password\":\"secret123\",\"host\":\"db.example.com\"}"
}
```

### 每个密钥的多个键值对

如果 `multipleKeyValuesPerSecret` 为 `true`，密钥存储会解析存储在 AWS Secrets Manager 中的 JSON 内容，并将其作为多个键值对返回。

从上方请求相同的 `database-credentials` 密钥时，响应会将 JSON 对象分解为各自的条目，允许将其解析为多个键值对。

```bash
$ curl http://localhost:3500/v1.0/secrets/awssecretmanager/database-credentials
{
  "username": "admin",
  "password": "secret123", 
  "host": "db.example.com"
}
```

## 创建 AWS Secrets Manager 实例

使用 AWS 文档设置 AWS Secrets Manager：https://docs.aws.amazon.com/secretsmanager/latest/userguide/tutorials_basic.html。

## 相关链接
- [密钥构建块]({{% ref secrets %}})
- [操作指南：检索密钥]({{% ref "howto-secrets.md" %}})
- [操作指南：在 Dapr 组件中引用密钥]({{% ref component-secrets.md %}})
- [密钥 API 参考]({{% ref secrets_api.md %}})
- [向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})
