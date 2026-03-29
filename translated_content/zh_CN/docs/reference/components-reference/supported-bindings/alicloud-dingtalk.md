---
type: docs
title: "Alibaba Cloud DingTalk binding 规范"
linkTitle: "Alibaba Cloud DingTalk"
description: "Alibaba Cloud DingTalk binding 组件的详细文档"
---

## 设置 Dapr 组件
要设置 Alibaba Cloud DingTalk binding，请创建一个类型为 `bindings.dingtalk.webhook` 的组件。有关如何创建和应用 secretstore 配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。有关如何检索和使用密钥以及 Dapr 组件，请参阅此[引用密钥]({{% ref component-secrets.md %}})指南。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.dingtalk.webhook
  version: v1
  metadata:
  - name: id
    value: "test_webhook_id"
  - name: url
    value: "https://oapi.dingtalk.com/robot/send?access_token=******"
  - name: secret
    value: "****************"
  - name: direction
    value: "input, output"
```

{{% alert title="Warning" color="warning" %}}
上面的示例将密钥作为纯字符串使用。建议使用密钥存储来存储密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段
| 字段                | 必填   | Binding 支持   | 详情           | 示例     |
|--------------------|:--------:|--------|---------|---------|
| `id`                 | Y        | Input/Output |唯一 id| `"test_webhook_id"`
| `url`                | Y        | Input/Output |DingTalk 的 Webhook url | `"https://oapi.dingtalk.com/robot/send?access_token=******"`
| `secret`             | N        | Input/Output |DingTalk Webhook 的密钥 | `"****************"`
| `direction`          | N        | Input/Output |binding 的方向 | `"input"`, `"output"`, `"input, output"`

## Binding 支持

此组件支持**输入和输出** binding 接口。

此组件支持**输出 binding**，具有以下操作：
- `create`
- `get`

## 指定负载

示例：按照[此处](https://developers.dingtalk.com/document/app/custom-robot-access)的说明设置负载数据

```shell
curl -X POST http://localhost:3500/v1.0/bindings/myDingTalk \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "msgtype": "text",
          "text": {
            "content": "Hi"
          }
        },
        "operation": "create"
      }'
```

```shell
curl -X POST http://localhost:3500/v1.0/bindings/myDingTalk \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "msgtype": "text",
          "text": {
            "content": "Hi"
          }
        },
        "operation": "get"
      }'
```
## 相关链接

- [Dapr 组件的基本模式]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：使用输入 binding 触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
