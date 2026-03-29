---
type: docs
title: "Twilio SendGrid binding spec"
linkTitle: "Twilio SendGrid"
description: "Twilio SendGrid 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/sendgrid/"
---

## 组件格式

要设置 Twilio SendGrid 绑定，需创建一个类型为 `bindings.twilio.sendgrid` 的组件。有关如何创建和应用绑定配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sendgrid
spec:
  type: bindings.twilio.sendgrid
  version: v1
  metadata:
  - name: emailFrom
    value: "testapp@dapr.io" # optional
  - name: emailFromName
    value: "test app" # optional
  - name: emailTo
    value: "dave@dapr.io" # optional
  - name: emailToName
    value: "dave" # optional
  - name: subject
    value: "Hello!" # optional
  - name: emailCc
    value: "jill@dapr.io" # optional
  - name: emailBcc
    value: "bob@dapr.io" # optional
  - name: dynamicTemplateId
    value: "d-123456789" # optional
  - name: dynamicTemplateData
    value: '{"customer":{"name":"John Smith"}}' # optional
  - name: apiKey
    value: "YOUR_API_KEY" # required, this is your SendGrid key
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体说明请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `apiKey` | Y | Output | SendGrid API 密钥，应将其视为机密值 | `"apikey"` |
| `emailFrom` | N | Output | 如果设置，则指定电子邮件的"发件人"邮箱地址。仅允许单个邮箱地址。可选字段，参见[下文](#example-request-payload) | `"me@example.com"` |
| `emailFromName` | N | Output | 如果设置，则指定电子邮件的"发件人"名称。可选字段，参见[下文](#example-request-payload) | `"me"` |
| `emailTo` | N | Output | 如果设置，则指定电子邮件的"收件人"邮箱地址。仅允许单个邮箱地址。可选字段，参见[下文](#example-request-payload) | `"me@example.com"` |
| `emailToName` | N | Output | 如果设置，则指定电子邮件的"收件人"名称。可选字段，参见[下文](#example-request-payload) | `"me"` |
| `emailCc` | N | Output | 如果设置，则指定电子邮件的"抄送"邮箱地址。仅允许单个邮箱地址。可选字段，参见[下文](#example-request-payload) | `"me@example.com"` |
| `emailBcc` | N | Output | 如果设置，则指定电子邮件的"密送"邮箱地址。仅允许单个邮箱地址。可选字段，参见[下文](#example-request-payload) | `"me@example.com"` |
| `subject` | N | Output | 如果设置，则指定电子邮件的主题。可选字段，参见[下文](#example-request-payload) | `"subject of the email"` |

## 绑定支持

该组件支持**输出绑定**，包含以下操作：

- `create`

## 示例请求载荷

您也可以在输出绑定请求中指定任何可选的元数据属性（例如 `emailFrom`、`emailTo`、`subject` 等）。

```json
{
  "operation": "create",
  "metadata": {
    "emailTo": "changeme@example.net",
    "subject": "An email from Dapr SendGrid binding"
  },
  "data": "<h1>Testing Dapr Bindings</h1>This is a test.<br>Bye!"
}
```

## 动态模板
如果使用动态模板，需要提供 `dynamicTemplateId`，然后使用 `dynamicTemplateData`：

```json
{
  "operation": "create",
  "metadata": {
    "emailTo": "changeme@example.net",
    "subject": "An template email from Dapr SendGrid binding",
    "dynamicTemplateId": "d-123456789",
    "dynamicTemplateData": "{\"customer\":{\"name\":\"John Smith\"}}"
  }
}
```

## 相关链接

- [Dapr 组件的基本 schema]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：通过输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
