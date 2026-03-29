---
type: docs
title: "SMTP 绑接规范"
linkTitle: "SMTP"
description: "SMTP 绑接组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/smtp/"
---

## 组件格式

要设置 SMTP 绑接，请创建类型为 `bindings.smtp` 的组件。有关如何创建和应用绑接配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


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
上述示例配置中包含以纯文本形式呈现的用户名和密码。建议按照[此处]({{% ref component-secrets.md %}})的说明使用 secret store 来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑接支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `host` | Y | Output |  SMTP 服务器运行的主机地址 | `"smtphost"` |
| `port` | Y | Output |  SMTP 服务器监听的端口 | `"9999"` |
| `user` | Y | Output |  用于 SMTP 服务器身份验证的用户名 | `"user"` |
| `password` | Y | Output | 用户的密码 | `"password"` |
| `skipTLSVerify` | N | Output | 如果设置为 true，将不会验证 SMTP 服务器的 TLS 证书。默认值为 `"false"` | `"true"`, `"false"` |
| `emailFrom` | N | Output | 如果设置，指定发件人的电子邮件地址。参见[此处](#example-request) | `"me@example.com"` |
| `emailTo` | N | Output | 如果设置，指定收件人的电子邮件地址。参见[此处](#example-request) | `"me@example.com"` |
| `emailCc` | N | Output | 如果设置，指定抄送的电子邮件地址。参见[此处](#example-request) | `"me@example.com"` |
| `emailBcc` | N | Output | 如果设置，指定密送的电子邮件地址。参见[此处](#example-request) | `"me@example.com"` |
| `subject` | N | Output | 如果设置，指定电子邮件的主题。参见[此处](#example-request) | `"邮件主题"` |
| `priority` | N | Output | 如果设置，指定电子邮件的优先级（X-Priority），从 1（最低）到 5（最高）（默认值：3）。参见[此处](#example-request) | `"1"` |

## 绑接支持

该组件支持**输出绑接**，具有以下操作：

- `create`

## 示例请求

您可以在每个请求中指定以下可选元数据属性：

- `emailFrom`
- `emailTo`
- `emailCC`
- `emailBCC`
- `subject`
- `priority`

发送电子邮件时，配置和请求中的元数据会被合并。合并后的元数据集必须至少包含 `emailFrom`、`emailTo` 和 `subject` 字段。

`emailTo`、`emailCC` 和 `emailBCC` 字段可以包含多个以分号分隔的电子邮件地址。

示例：
```json
{
  "operation": "create",
  "metadata": {
    "emailTo": "dapr-smtp-binding@example.net",
    "emailCC": "cc1@example.net; cc2@example.net",
    "subject": "电子邮件主题",
    "priority": "1"
  },
  "data": "测试 Dapr SMTP 绑接"
}
```

`emailTo`、`emailCC` 和 `emailBCC` 字段可以包含多个以分号分隔的电子邮件地址。
## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑接构建块]({{% ref bindings %}})
- [如何操作：使用输入绑接触发应用程序]({{% ref howto-triggers.md %}})
- [如何操作：使用绑接与外部资源交互]({{% ref howto-bindings.md %}})
- [绑接 API 参考]({{% ref bindings_api.md %}})
