---
type: docs
title: "DeepSeek"
linkTitle: "DeepSeek"
description: DeepSeek 对话组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: deepseek
spec:
  type: conversation.deepseek
  metadata:
  - name: key
    value: mykey
  - name: maxTokens
    value: 2048
```

{{% alert title="警告" color="warning" %}}
上述示例将机密以明文字符串的形式提供。建议使用机密存储来保存机密，具体方法请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规格元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `key`   | Y | DeepSeek 的 API 密钥。 | `mykey` |
| `maxTokens` | N | 模型在每次请求中可生成的默认最大令牌数。请求级别的 `maxTokens` 值会覆盖此默认值。未设置时，不发送上限，将使用提供方自身的默认值。 | `2048` |

## 相关链接

- [对话 API 概览]({{% ref conversation-overview.md %}})
