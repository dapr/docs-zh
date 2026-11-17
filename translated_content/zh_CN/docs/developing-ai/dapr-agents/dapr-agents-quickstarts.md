---
type: docs
title: "Quickstarts"
linkTitle: "Quickstarts"
weight: 70
description: "通过实用的分步示例开始使用 Dapr Agents"
aliases:
  - /zh-hans/developing-applications/dapr-agents/dapr-agents-quickstarts
---

[Dapr Agents quickstarts](https://github.com/dapr/dapr-agents/tree/main/quickstarts) 展示了如何使用 Dapr Agents 构建基于大型语言模型 (LLM) 的自主代理和事件驱动 workflow 应用程序。quickstarts 是一套循序渐进的完整教程，从基本的 LLM 调用开始，逐步构建到 Durable Agent、workflow、多代理编排和 observability。

#### 开始之前

- [设置本地 Dapr environment]({{% ref install-dapr-cli.md %}})。
- 安装 [uv](https://docs.astral.sh/uv/getting-started/installation/)（quickstarts 使用的 Python 包管理器）。
- 安装 [Ollama](https://ollama.com/) 用于本地 LLM 推理（默认），**或者**获取 [OpenAI API 密钥](https://platform.openai.com/api-keys)。


## Dapr Agents 基础

[Dapr Agents Fundamentals quickstart](https://github.com/dapr/dapr-agents/tree/main/quickstarts) 在单个包含编号 Python 脚本的目录中涵盖了完整的 Dapr Agents 编程模型。每一步都建立在前一步的基础之上。

| 步骤 | 文件 | 你将学到 |
|------|------|-------------------|
| 1 | [`01_llm_client.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/01_llm_client.py) | 使用 `DaprChatClient` 通过 Dapr Conversation API 调用 LLM |
| 2 | [`02_durable_agent_workflow.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/02_durable_agent_workflow.py) | 运行通过 Dapr Workflow API 以编程方式触发的 Durable Agent，可从客户端代码使用 `trigger_agent`，也可从另一个编排器内部使用 `call_agent` |
| 3 | [`03_durable_agent_http.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/03_durable_agent_http.py) | 运行由 Dapr Workflow 支持并通过 HTTP 暴露的 Durable Agent |
| 4 | [`04_durable_agent_pubsub.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/04_durable_agent_pubsub.py) | 通过 pub/sub 而非 HTTP 触发 Durable Agent |
| 5 | [`05_workflow_llm.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/05_workflow_llm.py) | 构建将 LLM 作为活动调用的确定性 Dapr Workflow |
| 6 | [`06_workflow_agents.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/06_workflow_agents.py) | 将多个专业代理编排为 child workflows |
| 7 | [`07_durable_agent_tracing.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/07_durable_agent_tracing.py) | 使用 Zipkin 为代理和 workflow 启用分布式追踪 |
| 8 | [`08_durable_agent_hot_reload.py`](https://github.com/dapr/dapr-agents/blob/main/quickstarts/08_durable_agent_hot_reload.py) | 通过 Dapr Configuration Store 在运行时热重载代理配置 |

完整的设置说明（包括 LLM 配置和先决条件）请参阅 [quickstarts README](https://github.com/dapr/dapr-agents/tree/main/quickstarts#readme)。


## 示例

[Dapr Agents 示例](https://github.com/dapr/dapr-agents/tree/main/examples)目录包含更高级、针对特定功能的场景，是对 quickstarts 的补充：

| 示例 | 你将学到 |
|---|---|
| [LLM 调用 – Dapr Chat Client](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-dapr) | 通过 `DaprChatClient` 实现文本生成、LLM 提供商切换、韧性和 PII 混淆 |
| [LLM 调用 – OpenAI Client](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-open-ai) | 使用原生 OpenAI 客户端实现聊天完成、结构化输出、音频和嵌入向量。*同样适用于 [ElevenLabs](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-elevenlabs)、[Hugging Face](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-hugging-face) 和 [NVIDIA](https://github.com/dapr/dapr-agents/tree/main/examples/01-llm-call-nvidia)。* |
| [独立代理工具调用](https://github.com/dapr/dapr-agents/tree/main/examples/02-standalone-agent-tool-call) | 使用 `DurableAgent` 配合 `AgentRunner.run` 构建带工具的对话代理 |
| [Durable Agent 工具调用](https://github.com/dapr/dapr-agents/tree/main/examples/02-durable-agent-tool-call) | 使用 `AgentRunner.run/subscribe/serve` 升级为由 workflow 支持的 Durable Agent |
| [基于 LLM 的 workflows](https://github.com/dapr/dapr-agents/tree/main/examples/03-llm-based-workflows) | 使用 LLM 活动的确定性多步骤 workflows（链式调用、并行化、路由） |
| [基于代理的 workflows](https://github.com/dapr/dapr-agents/tree/main/examples/03-agent-based-workflows) | 在 Dapr Workflow 内编排代理活动 |
| [消息路由器 workflow](https://github.com/dapr/dapr-agents/tree/main/examples/03-message-router-workflow) | 使用 `@message_router` 将 workflow 绑定到 Dapr pub/sub 主题 |
| [多代理 workflows](https://github.com/dapr/dapr-agents/tree/main/examples/04-multi-agent-workflows) | 以指环王为主题的事件驱动多代理系统，支持 LLM、随机和轮询编排策略 |
| [Kubernetes 上的多代理 workflows](https://github.com/dapr/dapr-agents/tree/main/examples/04-multi-agent-workflow-k8s) | 在 Kubernetes 中部署和编排多代理系统 |
| [使用 Chainlit 的文档代理](https://github.com/dapr/dapr-agents/tree/main/examples/05-document-agent-chainlit) | 可对话的代理，能够上传并学习非结构化文档，并具备长期记忆 |
| [MCP 客户端 – SSE](https://github.com/dapr/dapr-agents/tree/main/examples/06-agent-mcp-client-sse) | 通过服务器发送事件连接到远程 MCP 服务器 |
| [MCP 客户端 – stdio](https://github.com/dapr/dapr-agents/tree/main/examples/06-agent-mcp-client-stdio) | 通过 stdio 连接到本地 MCP 服务器 |
| [MCP 客户端 – Streamable HTTP](https://github.com/dapr/dapr-agents/tree/main/examples/06-agent-mcp-client-streamablehttp) | 通过 Streamable HTTP 传输连接到 MCP 服务器 |
| [使用 MCP 和 Chainlit 的数据代理](https://github.com/dapr/dapr-agents/tree/main/examples/07-data-agent-mcp-chainlit) | 通过 MCP 使用类 ChatGPT 的 UI，对 Postgres 数据库进行自然语言查询 |
| [具备 Observability 的代理作为活动](https://github.com/dapr/dapr-agents/tree/main/examples/07-agents-as-activities-observability) | 使用 OpenTelemetry 和 Zipkin 端到端追踪代理活动 |
| [代理作为工具](https://github.com/dapr/dapr-agents/tree/main/examples/08-agents-as-tools) | 将其他 `DurableAgent` 实例以及其他框架的代理作为 child workflow 工具调用 |
| [Durable Agent 热重载](https://github.com/dapr/dapr-agents/tree/main/examples/09-durable-agent-hot-reload) | 在运行时热重载代理角色和 LLM 设置，无需重启 |
| [Echo 代理执行器](https://github.com/dapr/dapr-agents/tree/main/examples/10-agent-executor-echo) | 运行带有 [代理执行器]({{< ref dapr-agents-executors.md >}}) 而非 LLM 客户端的 `DurableAgent`，无需 API 密钥 |
| [带有自动发现的 MCPServer 工具的代理](https://github.com/dapr/dapr-agents/tree/main/examples/10-mcpserver) | 自动发现已加载 MCPServer 资源中的工具 |
| [专家代理 – 带通过钩子实现 RAG 的 Chainlit UI (Tavily)](https://github.com/dapr/dapr-agents/tree/main/examples/11-expert-agent-tavily) | 在每个 LLM 轮次中注入最新的网页上下文，无需显式工具调用 |
| [Claude Agent 执行器](https://github.com/dapr/dapr-agents/tree/main/examples/13-agent-executor-claude) | 在 `DurableAgent` 中运行 Claude Agent SDK，并使用 Dapr Agents 工具、基于 Dapr 的会话存储以及工具调用的人工审批 |
| [Kubernetes 上的 OpenTelemetry Observability](https://github.com/dapr/dapr-agents/tree/main/examples/demo-otel-k8s) | 为在 Kubernetes 上运行的 Dapr Agents 配置 OpenTelemetry observability |


## 扩展示例

以下 [Dapr Agents 示例](https://github.com/dapr/dapr-agents/tree/main/examples)展示了特定提供商的集成：

| 示例 | 你将学到 |
|---|---|
| [Kubernetes 上由 Drasi 变更驱动的代理](https://github.com/dapr/dapr-agents/tree/main/examples/ext-drasi-change-driven-agents-k8s) | 通过 Dapr pub/sub 响应 Drasi 检测到的实时数据变更 |
