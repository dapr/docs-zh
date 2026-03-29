---
type: docs
title: "AWS SNS 绑定规范"
linkTitle: "AWS SNS"
description: "AWS SNS 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/sns/"
---

## 组件格式

要设置 AWS SNS 绑定，需创建一个类型为 `bindings.aws.sns` 的组件。有关如何创建和应用绑定配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

有关身份验证相关属性的信息，请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.aws.sns
  version: v1
  metadata:
  - name: topicArn
    value: "mytopic"
  - name: region
    value: "us-west-2"
  - name: endpoint
    value: "sns.us-west-2.amazonaws.com"
  - name: accessKey
    value: "*****************"
  - name: secretKey
    value: "*****************"
  - name: sessionToken
    value: "*****************"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详细说明 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `topicArn`           | Y        | 输出 | SNS 主题名称                                                    | `"arn:::topicarn"`               |
| `region`             | Y        | 输出 | 特定的 AWS 区域                                               | `"us-east-1"`                    |
| `endpoint`           | N        | 输出 | 特定的 AWS 端点                                             | `"sns.us-east-1.amazonaws.com"`  |
| `accessKey`          | Y        | 输出 | 用于访问此资源的 AWS 访问密钥                            | `"key"`                          |
| `secretKey`          | Y        | 输出 | 用于访问此资源的 AWS 秘密访问密钥                     | `"secretAccessKey"`              |
| `sessionToken`       | N        | 输出 | 要使用的 AWS 会话令牌                                         | `"sessionToken"`                 |

{{% alert title="重要" color="warning" %}}
在 EKS（AWS Kubernetes）上与你的应用程序一起运行 Dapr 边车（daprd）时，如果你使用的节点/Pod 已附加到定义了 AWS 资源访问权限的 IAM 策略，则**不得**在你使用的组件规范定义中提供 AWS 访问密钥、秘密密钥和令牌。  
{{% /alert %}}

## 绑定支持

此组件支持**输出绑定**，支持以下操作：

- `create`

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [如何操作：通过输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [如何操作：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
- [向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})
