---
type: docs
title: "本地测试"
linkTitle: "Echo"
description: 用于本地测试的 echo conversation 组件的详细信息
---

## 组件格式

Dapr `conversation.yaml` 组件文件具有以下结构：

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
此组件仅用于 Conversation 组件实现的本地验证和测试。它实际上不会将数据发送到任何 LLM，而是直接回显输入。
{{% /alert %}}

## 相关链接

- [Conversation API 概览]({{% ref conversation-overview.md %}})
