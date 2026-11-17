---
type: docs
title: "SMTP binding spec"
linkTitle: "SMTP"
description: "SMTP binding 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/smtp/"
---

## Component format

要设置 SMTP binding，请创建类型为 `bindings.smtp` 的 component。有关如何创建和应用 binding 配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: smtp
spec:
  type: bindings.smtp
  version: v1
  metadata:
  - name: host
    value: "smtp host"
  - name: port
    value: "smtp port"
  - name: user
    value: "username"
  - name: password
    value: "password"
  - name: skipTLSVerify
    value: true|false
  - name: emailFrom
    value: "sender@example.com"
  - name: emailTo
    value: "receiver@example.com"
  - name: emailCC
    value: "cc@example.com"
  - name: emailBCC
    value: "bcc@example.com"
  - name: subject
    value: "subject"
  - name: priority
    value: "[value 1-5]"
```

{{% alert title="警告" color="warning" %}}
上述示例配置中以明文字符串形式包含了用户名和密码。建议按照[此处]({{% ref component-secrets.md %}})的说明，使用 secret store 管理 secrets。
{{% /alert %}}

## Spec metadata 字段

| 字段              | 必填 | Binding 支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `host` | Y | Output |  SMTP 服务器运行所在的主机 | `"smtphost"` |
| `port` | Y | Output |  SMTP 服务器监听的端口 | `"9999"` |
| `user` | Y | Output |  用于向 SMTP 服务器进行身份验证的用户名 | `"user"` |
| `password` | Y | Output | 该用户的密码 | `"password"` |
| `skipTLSVerify` | N | Output | 如果设置为 true，则不验证 SMTP 服务器的 TLS 证书。默认为 `"false"` | `"true"`, `"false"` |
| `emailFrom` | N | Output | 如果设置，则指定发件人的电子邮件地址。参见[此处](#示例请求) | `"me@example.com"` |
| `emailTo` | N | Output | 如果设置，则指定收件人的电子邮件地址。参见[此处](#示例请求) | `"me@example.com"` |
| `emailCc` | N | Output | 如果设置，则指定抄送的电子邮件地址。参见[此处](#示例请求) | `"me@example.com"` |
| `emailBcc` | N | Output | 如果设置，则指定密送的电子邮件地址。参见[此处](#示例请求) | `"me@example.com"` |
| `subject` | N | Output | 如果设置，则指定电子邮件的主题。参见[此处](#示例请求) | `"subject of mail"` |
| `priority` | N | Output | 如果设置，则指定电子邮件的优先级（X-Priority），范围从 1（最低）到 5（最高）（默认值：3）。参见[此处](#示例请求) | `"1"` |

## Binding support

该组件支持 **output binding**，具有以下操作：

- `create`

## 示例请求

你可以在每个请求中指定以下任意可选的 metadata 属性：

- `emailFrom`
- `emailTo`
- `emailCC`
- `emailBCC`
- `subject`
- `priority`

发送电子邮件时，配置中的 metadata 与请求中的 metadata 会被合并。合并后的 metadata 至少必须包含 `emailFrom`、`emailTo` 和 `subject` 字段。

`emailTo`、`emailCC` 和 `emailBCC` 字段可以包含多个电子邮件地址，地址之间以分号分隔。

示例：
```json
{
  "operation": "create",
  "metadata": {
    "emailTo": "dapr-smtp-binding@example.net",
    "emailCC": "cc1@example.net; cc2@example.net",
    "subject": "Email subject",
    "priority: "1"
  },
  "data": "Testing Dapr SMTP Binding"
}
```

`emailTo`、`emailCC` 和 `emailBCC` 字段可以包含多个电子邮件地址，地址之间以分号分隔。
## 相关链接

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [Bindings building block]({{% ref bindings %}})
- [如何操作：使用 input binding 触发应用程序]({{% ref howto-triggers.md %}})
- [如何操作：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
