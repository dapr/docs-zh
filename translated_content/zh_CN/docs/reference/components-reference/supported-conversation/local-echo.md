---
type: docs
title: "本地测试"
linkTitle: "Echo"
description: 用于本地测试的 echo conversation component 的详细信息
---

## component 格式

Dapr `conversation.yaml` component 文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: echo
spec:
  type: conversation.echo
  version: v1
```

{{% alert title="Information" color="warning" %}}
此 component 仅用于 conversation component 实现的本地验证和测试。它实际上不会将数据发送到任何大型语言模型 (LLM)，而是直接回显输入。
{{% /alert %}}

## 规范 metadata 字段

| 字段              | 必需 | 说明 | 示例 |
|--------------------|:--------:|---------|---------|
| `maxTokens` | N | 每个请求默认回显的最大令牌数（以空白分隔的单词计）。请求级别的 `maxTokens` 值会覆盖此默认值。当上限截断输出时，候选结果（choice）的 `finishReason` 为 `length`。未设置时，输入将被完整回显，不做截断。 | `2048` |

## 相关链接

- [conversation API 概览]({{% ref conversation-overview.md %}})
