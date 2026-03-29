---
type: docs
title: "快速入门"
linkTitle: "快速入门"
weight: 70
description: "通过实用的分步示例开始使用 Dapr Agents"
aliases:
  - /developing-applications/dapr-agents/dapr-agents-quickstarts
---

[Dapr Agents 快速入门](https://github.com/dapr/dapr-agents/tree/main/quickstarts)展示了如何使用 Dapr Agents 构建具有 LLM 驱动的自主代理和事件驱动工作流的应用程序。快速入门是一个单一渐进式教程，从基本 LLM 调用逐步构建到持久代理、工作流、多代理编排和可观测性。

#### 开始之前

- [设置本地 Dapr 环境]({{% ref install-dapr-cli.md %}})。
- 安装 [uv](https://docs.astral.sh/uv/getting-started/installation/)（快速入门使用的 Python 包管理器）。
- 安装 [Ollama](https://ollama.com/) 进行本地 LLM 推理（默认），**或**获取 [OpenAI API 密钥](https://platform.openai.com/api-keys)。

## Dapr Agents 基础

[Dapr Agents 基础快速入门](https://github.com/dapr/dapr-agents/tree/main/quickstarts)在单个编号 Python 脚本目录中覆盖了完整的 Dapr Agents 编程模型。每一步都构建在前一步之上。

| 步骤 | 文件 | 你将学到 |
|------|------|-------------------|
| 1 | [`01_llm_client.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/01_llm_client.py) | 使用 `DaprChatClient` 通过 Dapr Conversation API 调用 LLM |
| 2 | [`02_durable_agent_http.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/02_durable_agent_http.py) | 运行由 Dapr 工作流支持的持久代理，通过 HTTP 暴露 |
| 3 | [`03_durable_agent_pubsub.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/03_durable_agent_pubsub.py) | 通过发布订阅而非 HTTP 触发持久代理 |
| 4 | [`04_workflow_llm.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/04_workflow_llm.py) | 构建调用 LLM 作为活动的确定性 Dapr 工作流 |
| 5 | [`05_workflow_agents.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/05_workflow_agents.py) | 将多个专业代理编排为子工作流 |
| 6 | [`06_durable_agent_tracing.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/06_durable_agent_tracing.py) | 使用 Zipkin 为代理和工作流启用分布式追踪 |
| 7 | [`07_durable_agent_hot_reload.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/07_durable_agent_hot_reload.py) | 通过 Dapr Configuration Store 在运行时热重载代理配置 |

有关完整的设置说明，包括 LLM 配置和先决条件，请参阅[快速入门 README](https://github.com/dapr/dapr-agents/tree/main/quickstarts#readme)。

## 示例

[Dapr Agents 示例](https://github.com/dapr/dapr-agents/tree/main/examples)目录包含更高级和特定功能的场景，是对快速入门的补充：

| 示例 | 你将学到 |
|---|---|
| [LLM 调用 – Dapr Chat Client](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-dapr) | 通过 `DaprChatClient` 进行文本生成、LLM 提供商切换、韧性和 PII 混淆 |
| [LLM 调用 – OpenAI Client](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-open-ai) | 使用原生 OpenAI 客户端进行聊天完成、结构化输出、音频和嵌入。*也适用于 [ElevenLabs](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-elevenlabs)、[Hugging Face](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-hugging-face) 和 [NVIDIA](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-nvidia)。* |
| [独立代理工具调用](https://github.com/dapr/dapr-agents/tree/main/examples/02-standalone-agent-tool-call) | 使用 `DurableAgent` 和 `AgentRunner.run` 构建具有工具的对话代理 |
| [持久代理工具调用](https://github.com/dapr/dapr-agents/tree/main/examples/02-durable-agent-tool-call) | 使用 `AgentRunner.run/subscribe/serve` 升级到持久工作流支持的代理 |
| [基于 LLM 的工作流](https://github.com/dapr/dapr-agents/tree/main/examples/03-llm-based-workflows) | 使用 LLM 活动的确定性多步骤工作流（链式调用、并行化、路由） |
| [基于代理的工作流](https://github.com/dapr/dapr-agents/tree/main/examples/03-agent-based-workflows) | 在 Dapr 工作流内编排代理活动 |
| [消息路由器工作流](https://github.com/dapr/dapr-agents/tree/main/examples/03-message-router-workflow) | 使用 `@message_router` 将工作流绑定到 Dapr 发布订阅主题 |
| [多代理工作流](https://github.com/dapr/dapr-agents/tree/main/examples/04-multi-agent-workflows) | 指环王主题的事件驱动多代理系统，具有 LLM、随机和轮询编排策略 |
| [Kubernetes 上的多代理工作流](https://github.com/dapr/dapr-agents/tree/main/examples/04-multi-agent-workflow-k8s) | 在 Kubernetes 中部署和编排多代理系统 |
| [使用 Chainlit 的文档代理](https://github.com/dapr/dapr-agents/tree/main/examples/05-document-agent-chainlit) | 可以上传和学习非结构化文档并具有长期记忆的对话代理 |
| [MCP 客户端 – SSE](https://github.com/dapr/dapr-agents/tree/main/examples/06-agent-mcp-client-sse) | 通过服务器发送事件连接到远程 MCP 服务器 |
| [MCP 客户端 – stdio](https://github.com/dapr/dapr-agents/tree/main/examples/06-agent-mcp-client-stdio) | 通过 stdio 连接到本地 MCP 服务器 |
| [MCP 客户端 – Streamable HTTP](https://github.com/dapr/dapr-agents/tree/main/examples/06-agent-mcp-client-streamablehttp) | 通过 Streamable HTTP 传输连接到 MCP 服务器 |
| [使用 MCP 和 Chainlit 的数据代理](https://github.com/dapr/dapr-agents/tree/main/examples/07-data-agent-mcp-chainlit) | 通过 MCP 使用类 ChatGPT UI 对 Postgres 数据库进行自然语言查询 |
| [具有可观测性的代理作为活动](https://github.com/dapr/dapr-agents/tree/main/examples/07-agents-as-activities-observability) | 使用 OpenTelemetry 和 Zipkin 端到端追踪代理活动 |
| [代理作为工具](https://github.com/dapr/dapr-agents/tree/main/examples/08-agents-as-tools) | 将其他 `DurableAgent` 实例——以及来自其他框架的代理——作为子工作流工具调用 |
| [持久代理热重载](https://github.com/dapr/dapr-agents/tree/main/examples/09-durable-agent-hot-reload) | 在运行时热重载代理角色和 LLM 设置而无需重启
