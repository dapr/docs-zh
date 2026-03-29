---
type: docs
title: "Postmark binding 规范"
linkTitle: "Postmark"
description: "Postmark binding 组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/postmark/"
---

## 组件格式

要设置 Postmark binding，请创建一个类型为 `bindings.postmark` 的组件。有关如何创建和应用 binding 配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: postmark
spec:
  type: bindings.postmark
  metadata:
  - name: accountToken
    value: "YOUR_ACCOUNT_TOKEN" # 必填，这是您的 Postmark 账户令牌
  - name: serverToken
    value: "YOUR_SERVER_TOKEN" # 必填，这是您的 Postmark 服务器令牌
  - name: emailFrom
    value: "testapp@dapr.io" # 可选
  - name: emailTo
    value: "dave@dapr.io" # 可选
  - name: subject
    value: "Hello!" # 可选
```
{{% alert title="Warning" color="warning" %}}
上述示例使用纯文本字符串形式的密钥。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | Binding 支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `accountToken` | Y | Output |  Postmark 账户令牌，应将其视为密钥值 | `"account token"` |
| `serverToken` | Y | Output  | Postmark 服务器令牌，应将其视为密钥值 | `"server token"` |
| `emailFrom` | N | Output | 如果设置，则指定电子邮件的"发件人"地址 | `"me@exmaple.com"` |
| `emailTo` | N | Output | 如果设置，则指定电子邮件的"收件人"地址 | `"me@example.com"` |
| `emailCc` | N | Output | 如果设置，则指定电子邮件的"抄送"地址 | `"me@example.com"` |
| `emailBcc` | N | Output | 如果设置，则指定电子邮件的"密送"地址 | `"me@example.com"` |
| `subject` | N | Output | 如果设置，则指定电子邮件的主题 | `"me@example.com"` |

您也可以在输出 binding 请求中指定任何可选的元数据属性（例如 `emailFrom`、`emailTo`、`subject` 等）。

综合来看，组件配置和请求负载中的可选元数据属性应至少包含 `emailFrom`、`emailTo` 和 `subject` 字段，因为成功发送电子邮件需要这些字段。


## Binding 支持

此组件支持 **输出 binding**，具有以下操作：

- `create`


## 示例请求负载

```json
{
  "operation": "create",
  "metadata": {
    "emailTo": "changeme@example.net",
    "subject": "An email from Dapr Postmark binding"
  },
  "data": "<h1>Testing Dapr Bindings</h1>This is a test.<br>Bye!"
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [如何使用输入 binding 触发应用程序]({{% ref howto-triggers.md %}})
- [如何使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
