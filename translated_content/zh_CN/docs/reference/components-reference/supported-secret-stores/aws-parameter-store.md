---
type: docs
title: "AWS SSM Parameter Store"
linkTitle: "AWS SSM Parameter Store"
description: AWS SSM Parameter Store 密钥存储组件的详细信息
aliases:
  - "/operations/components/setup-secret-store/supported-secret-stores/aws-parameter-store/"
---

## 组件格式

要设置 AWS SSM Parameter Store 密钥存储，需创建类型为 `secretstores.aws.parameterstore` 的组件。有关如何创建和应用密钥存储配置的信息，请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})。有关使用 Dapr 组件检索和使用密钥的信息，请参阅此关于[引用密钥]({{% ref component-secrets.md %}})的指南。

有关身份验证相关属性的信息，请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: awsparameterstore
spec:
  type: secretstores.aws.parameterstore
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
  - name: prefix
    value: "[secret_name]"
```
{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用本地密钥存储（例如 [Kubernetes secret store]({{% ref kubernetes-secret-store.md %}}) 或[本地文件]({{% ref file-secret-store.md %}})）来引导安全的密钥存储。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填   | 详情                                                                     | 示例                |
|--------------------|:------:|-------------------------------------------------------------------------|---------------------|
| region             | Y      | 部署 AWS SSM Parameter Store 实例的特定 AWS 区域                          | `"us-east-1"`       |
| accessKey          | Y      | 用于访问此资源的 AWS Access Key                                          | `"key"`             |
| secretKey          | Y      | 用于访问此资源的 AWS Secret Access Key                                   | `"secretAccessKey"` |
| sessionToken       | N      | 要使用的 AWS 会话令牌                                                    | `"sessionToken"`    |
| prefix             | N      | 允许您指定多个 SSM Parameter Store 密钥存储组件。                          | `"prefix"`          |

{{% alert title="Important" color="warning" %}}
当在 EKS（AWS Kubernetes）上使用您的应用程序运行 Dapr 边车（daprd）时，如果您使用的节点/pod 已经附加到定义了对 AWS 资源访问权限的 IAM 策略，则**不得**在正在使用的组件规范定义中提供 AWS access-key、secret-key 和 tokens。  
{{% /alert %}}

## 创建 AWS SSM Parameter Store 实例

使用 AWS 文档设置 AWS SSM Parameter Store：https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html。

## 相关链接
- [密钥存储构建块]({{% ref secrets %}})
- [操作方法：检索密钥]({{% ref "howto-secrets.md" %}})
- [操作方法：在 Dapr 组件中引用密钥]({{% ref component-secrets.md %}})
- [密钥存储 API 参考]({{% ref secrets_api.md %}})
- [向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})
