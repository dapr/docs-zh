---
type: docs
title: "Twilio SMS 绑定规范"
linkTitle: "Twilio SMS"
description: "Twilio SMS 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/twilio/"
---

## 组件格式

要设置 Twilio SMS 绑定，请创建一个类型为 `bindings.twilio.sms` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.twilio.sms
  version: v1
  metadata:
  - name: toNumber # required.
    value: "111-111-1111"
  - name: fromNumber # required.
    value: "222-222-2222"
  - name: accountSid # required.
    value: "*****************"
  - name: authToken # required.
    value: "*****************"
```
{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用 secret store 来存储密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `toNumber` | Y | Output | 接收短信的目标号码 | `"111-111-1111"` |
| `fromNumber` | Y | Output | 发送方电话号码 | `"222-222-2222"` |
| `accountSid` | Y | Output | Twilio 账户 SID | `"account sid"` |
| `authToken` | Y | Output | Twilio 认证令牌 | `"auth token"` |

## 绑定支持

该组件支持以下操作的**输出绑定**：

- `create`


## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
