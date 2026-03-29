---
type: docs
title: "AWS SES 绑定规范"
linkTitle: "AWS SES"
description: "AWS SES 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/ses/"
---

## 组件格式

要设置 AWS 绑定，请创建类型为 `bindings.aws.ses` 的组件。请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。

有关身份验证相关属性的信息，请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ses
spec:
  type: bindings.aws.ses
  version: v1
  metadata:
  - name: accessKey
    value: *****************
  - name: secretKey
    value: *****************
  - name: region
    value: "eu-west-1"
  - name: sessionToken
    value: mysession
  - name: emailFrom
    value: "sender@example.com"
  - name: emailTo
    value: "receiver@example.com"
  - name: emailCc
    value: "cc@example.com"
  - name: emailBcc
    value: "bcc@example.com"
  - name: subject
    value: "subject"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯文本字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| Field              | Required | Binding support |  Details | Example |
|--------------------|:--------:|------------|-----|---------|
| `region`             | N        | Output |  特定的 AWS 区域 | `"eu-west-1"`       |
| `accessKey`          | N        | Output | 用于访问此资源的 AWS Access Key                              | `"key"`             |
| `secretKey`          | N        | Output | 用于访问此资源的 AWS Secret Access Key                       | `"secretAccessKey"` |
| `sessionToken`       | N        | Output | 要使用的 AWS 会话令牌                                            | `"sessionToken"`    |
| `emailFrom` | N | Output | 如果设置，指定发件人的电子邮件地址。另请参见[示例](#example-request) | `"me@example.com"` |
| `emailTo` | N | Output | 如果设置，指定收件人的电子邮件地址。另请参见[示例](#example-request) | `"me@example.com"` |
| `emailCc` | N | Output | 如果设置，指定要抄送的电子邮件地址。另请参见[示例](#example-request) | `"me@example.com"` |
| `emailBcc` | N | Output | 如果设置，指定要密送的电子邮件地址。另请参见[示例](#example-request) | `"me@example.com"` |
| `subject` | N | Output | 如果设置，指定电子邮件的主题。另请参见[示例](#example-request) | `"subject of mail"` |

{{% alert title="Important" color="warning" %}}
当在 EKS（AWS Kubernetes）上与应用程序一起运行 Dapr 边车（daprd）时，如果您使用的节点/Pod 已附加到定义了 AWS 资源访问权限的 IAM 策略，则**绝不能**在正在使用的组件规范定义中提供 AWS access-key、secret-key 和令牌。  
{{% /alert %}}

## 绑定支持

此组件支持**输出绑定**，具有以下操作：

- `create`

## 示例请求

您可以在每个请求中指定以下任意可选元数据属性：

- `emailFrom`
- `emailTo`
- `emailCc`
- `emailBcc`
- `subject`

发送电子邮件时，配置和请求中的元数据会合并。合并后的元数据集必须至少包含 `emailFrom`、`emailTo`、`emailCc`、`emailBcc` 和 `subject` 字段。

`emailTo`、`emailCc` 和 `emailBcc` 字段可以包含多个用分号分隔的电子邮件地址。

示例：
```json
{
  "operation": "create",
  "metadata": {
    "emailTo": "dapr-smtp-binding@example.net",
    "emailCc": "cc1@example.net",
    "subject": "Email subject"
  },
  "data": "Testing Dapr SMTP Binding"
}
```
`emailTo`、`emailCc` 和 `emailBcc` 字段可以包含多个用分号分隔的电子邮件地址。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [如何操作：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [如何操作：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
