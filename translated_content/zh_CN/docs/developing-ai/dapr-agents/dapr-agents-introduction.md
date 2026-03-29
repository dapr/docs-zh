---
type: docs
title: "简介"
linkTitle: "简介"
weight: 10
description: "Dapr Agents 及其核心功能概述"
aliases:
  - /zh-hans/developing-applications/dapr-agents/dapr-agents-introduction
---

![Agent Overview](/images/dapr-agents/concepts-agents-overview.png)


Dapr Agents 是一个用于构建持久且弹性的 AI agent 系统的开发者框架，由大语言模型（LLMs）驱动。基于久经考验的 Dapr 项目构建，它使开发者能够创建具有身份、能够推理问题、做出动态决策并无缝协作的自主系统。它包含内置的可观测性和有状态工作流执行，确保 agent 工作流无论复杂度如何都能成功完成。无论您是开发单 agent 应用还是复杂的多 agent 工作流，Dapr Agents 都为智能、自适应系统提供可在跨环境中扩展的基础设施。

## 核心能力
- **Agent 身份**：使用 Dapr Agents，每个 agent 都被分配一个唯一的加密身份，用于对 agent 交互进行身份认证并在服务和基础设施间强制执行授权。
- **持久执行**：使用 Dapr Agents 创建的 agent 由 Dapr 的工作流引擎支持，该引擎将每个 agent 与 LLMs 和工具的交互持久化到持久状态存储中，即使在 agent 重启后也能恢复并继续执行。
- **弹性**：Dapr Agents 可以通过自动重试策略、超时和熔断器从临时故障中恢复，还可以应用由工作流状态支持的持久重试以从持续时间更长的故障中恢复。
- **规模与效率**：在单核上高效运行数千个 agent。Dapr 在机器集群间透明地分发单 agent 和多 agent 应用并处理它们的生命周期。
- **数据驱动 Agent**：通过连接到数十种不同的数据源，直接与数据库、文档和非结构化数据集成。
- **多 Agent 系统**：默认安全和可观测，支持 agent 之间的协作。
- **Kubernetes 原生**：在 Kubernetes 环境中轻松部署和管理 agent。
- **平台就绪**：访问范围和声明式资源使平台团队能够将 Dapr Agents 集成到其系统中。
- **供应商中立与开源**：避免供应商锁定，并在云和本地部署间获得灵活性。

## 核心功能

Dapr Agents 提供专为创建智能、自主系统设计的专用模块。每个模块都设计为独立工作，允许您使用适合应用程序需求的任何组合。
 
| 功能                                                                                               | 描述 |
|-------------------------------------------------------------------------------------------------------|-------------|
| [**LLM 集成**]({{% ref "dapr-agents-core-concepts.md#llm-integration" %}})                     | 它使用 Dapr [Conversation API]({{% ref conversation-overview.md %}}) 抽象了用于聊天补全的 LLM 推理 API，使您能够在不更改高级 agent 代码的情况下更换 LLM 提供商，并包括用于 embeddings、音频和其他专用集成的原生客户端。
| [**结构化输出**]({{% ref "dapr-agents-core-concepts.md#structured-outputs" %}})               | 利用 OpenAI 的 Function Calling 等功能生成符合 JSON Schema 和 OpenAPI 标准的可预测、可靠的结果，用于工具集成。
| [**工具选择**]({{% ref "dapr-agents-core-concepts.md#tool-calling" %}})                         | 基于需求、最佳动作和通过 [Function Calling](https://platform.openai.com/docs/guides/function-calling) 功能执行的动态工具选择。
| [**MCP 支持**]({{% ref "dapr-agents-core-concepts.md#mcp-support" %}})                             | 内置对 [Model Context Protocol](https://modelcontextprotocol.io/) 的支持，使 agent 能够通过标准化接口动态发现和调用外部工具。
| [**Agent 即工具**]({{% ref "dapr-agents-core-concepts.md#agents-as-tools" %}})                     | 在 DurableAgent 的推理循环中调用其他 Dapr Agents——或来自其他框架（如 OpenAI Agents、LangGraph 和 CrewAI）的 agent——作为工具，以实现可组合的多 agent 系统。
| [**内存管理**]({{% ref "dapr-agents-core-concepts.md#memory" %}})                            | 在交互间保留上下文，选项从简单的内存列表到向量数据库（Chroma、PostgreSQL、Redis），与 [Dapr 状态存储]({{% ref state-management-overview.md %}}) 集成以实现可扩展、持久的内存。
| [**持久 Agent**]({{% ref "dapr-agents-core-concepts.md#durable-agents" %}})                       | 由工作流支持的 agent，通过持久状态管理和自动重试机制为长时间运行的进程提供容错执行。
| [**Agent 运行器**]({{% ref "dapr-agents-core-concepts.md#agent-runner" %}})                           | 通过 HTTP 暴露 agent 或订阅 PubSub 以执行长时间运行的任务，使 agent 能够被 API 访问而无需用户界面或人工干预。
| [**事件驱动通信**]({{% ref "dapr-agents-core-concepts.md#event-driven-orchestration" %}}) | 通过 [发布订阅消息传递]({{% ref pubsub-overview.md %}}) 实现 agent 协作，用于分布式系统中的事件驱动通信、任务分发和实时协调。
| [**Agent 编排**]({{% ref "dapr-agents-core-concepts.md#deterministic-workflows" %}})         | 使用 [Dapr 工作流]({{% ref workflow-overview.md %}}) 进行确定性 agent 编排，通过更高级别的任务与 LLMs 交互以处理复杂的多步骤流程。
 
 
## Agent 模式
Dapr Agents 支持一组全面的模式，代表构建智能系统的不同方法。 

<img src="/images/dapr-agents/agents-patterns-overview.png" width=1200 style="padding-bottom:15px;">

这些模式从确定性的、工作流驱动的设计到完全自主的 agent，能够进行动态规划和执行；每种模式都解决不同的用例并在可预测性与自主性之间取得平衡。

| 模式                                                                                | 描述 |
|----------------------------------------------------------------------------------------|-------------|
| [**增强型 LLM**]({{% ref "dapr-agents-patterns.md#augmented-llm" %}})               | 通过内存和工具等外部功能增强语言模型，为 AI 驱动的应用程序提供基础。
| [**持久 Agent**]({{% ref "dapr-agents-patterns.md#durable-agent" %}})               | 通过使用 Dapr 状态存储为 agent 交互添加持久性和持久化来扩展增强型 LLM。
| [**提示链接**]({{% ref "dapr-agents-patterns.md#prompt-chaining" %}})           | 将复杂任务分解为一系列步骤，其中每个 LLM 调用处理前一个调用的输出。
| [**评估器-优化器**]({{% ref "dapr-agents-patterns.md#evaluator-optimizer" %}})   | 实现双 LLM 流程，其中一个模型生成响应，而另一个在迭代循环中提供评估和反馈。
| [**并行化**]({{% ref "dapr-agents-patterns.md#parallelization" %}})           | 同时处理问题的多个维度，输出通过编程方式聚合以提高效率。
| [**路由**]({{% ref "dapr-agents-patterns.md#routing" %}})                           | 对输入进行分类并将其定向到专门的后续任务，实现关注点分离和专家专业化。
| [**编排器-工作者**]({{% ref "dapr-agents-patterns.md#orchestrator-workers" %}}) | 具有中央编排器 LLM，动态分解任务，将其委派给工作者 LLMs，并综合结果。


 
## 开发者体验

Dapr Agents 是基于 [Python Dapr SDK]({{% ref "developing-applications/sdks/python/_index.md" %}}) 构建的 Python 框架，为构建 agent 系统提供全面的开发体验。

### 入门指南

按照 [入门页面]({{% ref dapr-agents-getting-started.md %}}) 上的说明开始使用 Dapr Agents。

### 框架集成

Dapr Agents 与流行的 Python 框架和工具集成。有关详细的集成指南和示例，请参阅 [集成页面]({{% ref "developing-ai/dapr-agents/dapr-agents-integrations.md" %}})。
 
## 运维支持

Dapr Agents 继承了 Dapr 的企业级运维能力，为 agent 系统的持久可靠部署提供全面支持。

### 内置运维功能

- **[可观测性]({{% ref observability-concept.md %}})** - 分布式追踪、指标收集和日志记录，用于 agent 交互和工作流执行
- **[安全性]({{% ref security-concept.md %}})** - mTLS 加密、访问控制和密钥管理，用于安全的 agent 通信
- **[弹性]({{% ref resiliency-concept.md %}})** - 自动重试、熔断器和超时策略，用于容错的 agent 操作
- **[基础设施抽象]({{% ref components-concept.md %}})** - Dapr 组件抽象了 LLM 提供商、内存存储、存储和消息传递后端，实现在不同环境间的无缝转换

这些功能使团队能够监控 agent 性能、保护多 agent 通信，并确保复杂 agent 工作流的可靠执行。

## 贡献

无论您是有兴趣增强框架、添加新集成还是改进文档，我们都欢迎社区的贡献。

有关开发设置和指南，请参阅我们的[贡献者指南]({{% ref "contributing/dapr-agents.md" %}})。
