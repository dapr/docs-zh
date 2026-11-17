---
type: docs
title: "Dapr Agents"
linkTitle: "Dapr Agents"
weight: 25
description: "用于大规模构建持久且有弹性的 AI 代理系统的框架"
aliases:
  - /zh-hans/developing-applications/dapr-agents
---

![Concepts Agents](/images/dapr-agents/agents-blue.png)

{{% alert title="Dapr Agents v1.0 — 正式发布（GA）" color="primary" %}}
Dapr Agents 为 **v1.0** 版本，已可用于生产环境。该框架提供稳定的 API、企业级可靠性，并支持大规模构建和运行由大型语言模型 (LLM) 驱动的代理系统。
{{% /alert %}}

###  什么是 Dapr Agents？

Dapr Agents 是一个 Python 框架，用于利用 Dapr 的分布式系统能力构建由 LLM 驱动的自主代理应用。它提供工具来创建能够执行持久任务、做出决策，并通过 workflows 协作的 AI 代理。同时，它借助 Dapr 的 state management、消息传递和 observability 功能，实现大规模下的可靠执行。
