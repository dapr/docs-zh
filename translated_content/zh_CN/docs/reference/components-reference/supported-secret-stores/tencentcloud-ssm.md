---
type: docs
title: "Tencent Cloud Secrets Manager (SSM)"
linkTitle: "Tencent Cloud Secrets Manager (SSM)"
description: 有关 Tencent Cloud Secrets Manager (SSM) 密钥存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/tencentcloud-ssm/"
---

## 组件格式

要设置 Tencent Cloud Secrets Manager (SSM) 密钥存储，请创建类型为 `secretstores.tencentcloud.ssm` 的组件。
有关如何创建和应用密钥存储配置，请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})。
有关使用 Dapr 组件检索和使用密钥，请参阅此[引用密钥]({{% ref component-secrets.md %}})指南。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: tencentcloudssm
spec:
  type: secretstores.tencentcloud.ssm
  version: v1
  metadata:
  - name: region
    value: "[tencentcloud_region]"
  - name: secretId
    value: "[tencentcloud_secret_id]"
  - name: secretKey
    value: "[tencentcloud_secret_key]"
  - name: token
    value: "[tencentcloud_secret_token]"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。
建议使用本地密钥存储，例如 [Kubernetes secret store]({{% ref kubernetes-secret-store.md %}}) 或 [本地文件]({{% ref file-secret-store.md %}}) 来引导安全密钥存储。
{{% /alert %}}

## 规范元数据字段

| 字段           | 必填 | 详情                                                          | 示例             |
| --------------- | :------: | ---------------------------------------------------------------- | ------------------- |
| region          |    Y     | 部署 Tencent SSM 实例的特定区域      | `"ap-beijing-3"`      |
| secretId        |    Y     | 腾讯云账户的 SecretId                        | `"xyz"` |
| secretKey       |    Y     | 腾讯云账户的 SecretKey                       | `"xyz"` |
| token           |    N     | 腾讯云账户的 Token。仅在使用临时凭证时需要 | `""`                |

## 可选的每次请求元数据属性

从此密钥存储检索密钥时，可以提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

查询参数 | 描述
--------- | -----------
`metadata.version_id` | 给定密钥的版本。

## 设置 Tencent Cloud Secrets Manager (SSM)

使用 Tencent Cloud 文档设置 Tencent Cloud Secrets Manager (SSM)：https://www.tencentcloud.com/products/ssm

## 相关链接

- [密钥构建块]({{% ref secrets %}})
- [操作指南：检索密钥]({{% ref "howto-secrets.md" %}})
- [操作指南：在 Dapr 组件中引用密钥]({{% ref component-secrets.md %}})
- [密钥 API 参考]({{% ref secrets_api.md %}})
