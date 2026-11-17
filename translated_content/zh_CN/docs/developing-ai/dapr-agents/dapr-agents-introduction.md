---
type: docs
title: "简介"
linkTitle: "简介"
weight: 10
description: "Dapr Agents 及其核心功能概述"
aliases:
  - /zh-hans/developing-applications/dapr-agents/dapr-agents-introduction
---

{{< diagram name="agents-overview" width="85" >}}

{{% alert title="Dapr Agents v1.0 — 正式发布（Generally Available）" color="primary" %}}
Dapr Agents **v1.0** 已可用于生产环境，提供稳定的 API 以及面向代理类工作负载的企业级支持。
{{% /alert %}}

Dapr Agents 是一个开发者框架，用于构建由大型语言模型 (LLM) 驱动的、持久且有弹性的 AI 代理系统。它基于久经考验的 Dapr 项目构建，使开发者能够创建具备身份、能够推理问题、做出动态决策并无缝协作的自主系统。它包含内置的 observability 和 stateful workflow 执行能力，以确保代理工作流无论复杂度如何都能成功完成。无论你是在开发单代理应用，还是复杂的多代理 workflow，Dapr Agents 都为能够跨环境扩展的智能、自适应系统提供基础设施。

## 核心能力
- **Agent Identity**：使用 Dapr Agents 时，每个代理都会被分配一个唯一的加密身份，用于对代理交互进行身份验证，并在服务和基础设施之间执行授权。
- **持久执行**：使用 Dapr Agents 创建的代理由 Dapr 的 workflow 引擎支撑，该引擎会将每次代理与 LLM 和工具的交互持久化到持久的 state store 中，即使代理重启后也能恢复并继续执行。
- **弹性**：Dapr Agents 可以通过自动 retry policies、超时和断路器从临时故障中恢复，也可以应用由 workflow 状态支撑的持久重试，从持续时间更长的故障中恢复。
- **规模与效率**：在单个核心上高效运行数千个代理。Dapr 会透明地将单代理和多代理应用分布到机器集群中，并处理它们的生命周期。
- **数据驱动代理**：通过连接数十种不同的数据源，直接与数据库、文档和非结构化数据集成。
- **Multi-Agent Systems**：默认安全且可观测，支持代理之间的协作。
- **Kubernetes 原生**：在 Kubernetes 环境中轻松部署和管理代理。
- **平台就绪**：访问作用域和声明式资源使平台团队能够将 Dapr Agents 集成到其系统中。
- **供应商中立与开源**：避免供应商锁定，并在云端和本地部署之间获得灵活性。

## 核心功能

Dapr Agents 提供专为构建智能自主系统而设计的专用模块。每个模块都可以独立工作，你可以根据应用需求自由组合。

| 功能                                                                                               | 描述 |
|-------------------------------------------------------------------------------------------------------|-------------|
| [**LLM 集成**]({{% ref "dapr-agents-core-concepts.md#llm-integration" %}})                     | 它通过 Dapr [Conversation API]({{% ref conversation-overview.md %}}) 抽象了用于聊天补全的 LLM 推理 API，使你无需更改高层代理代码即可更换 LLM 提供商，并包含用于嵌入向量、音频及其他专用集成的原生客户端。
| [**结构化输出**]({{% ref "dapr-agents-core-concepts.md#structured-outputs" %}})               | 利用 OpenAI 的函数调用等能力，生成符合 JSON Schema 和 OpenAPI 标准的可预测、可靠结果，用于工具集成。
| [**工具选择**]({{% ref "dapr-agents-core-concepts.md#tool-calling" %}})                         | 基于需求、最佳动作，通过 [函数调用](https://platform.openai.com/docs/guides/function-calling) 能力进行动态工具选择并执行。
| [**MCP 支持**]({{% ref "dapr-agents-core-concepts.md#mcp-support" %}})                             | 内置对 [模型上下文协议（MCP）](https://modelcontextprotocol.io/) 的支持，使代理能够通过标准化接口动态发现并调用外部工具。
| [**Agents as Tools**]({{% ref "dapr-agents-core-concepts.md#agents-as-tools" %}})                     | 在 DurableAgent 的推理循环中，将其他 Dapr Agents，或来自其他框架（如 OpenAI Agents、LangGraph 和 CrewAI）的代理作为工具调用，以构建可组合的 Multi-Agent Systems。
| [**内存管理**]({{% ref "dapr-agents-core-concepts.md#memory" %}})                            | 在多次交互之间保留上下文。可选方案从简单的内存列表到向量数据库（Chroma、PostgreSQL、Redis）不等，并可与 [Dapr state stores]({{% ref state-management-overview.md %}}) 集成，实现可扩展的持久化内存。
| [**Durable Agents**]({{% ref "dapr-agents-core-concepts.md#durable-agents" %}})                       | 由 workflow 支撑的代理，提供容错执行，具备持久状态管理和自动重试机制，适用于长时间运行的进程。
| [**Agent Runner**]({{% ref "dapr-agents-core-concepts.md#agent-runner" %}})                           | 通过 HTTP 暴露代理，或订阅 PubSub 以执行长时间运行的任务，使代理无需用户界面或人工干预即可通过 API 访问。
| [**事件驱动通信**]({{% ref "dapr-agents-core-concepts.md#event-driven-orchestration" %}}) | 通过 [pub/sub 消息传递]({{% ref pubsub-overview.md %}}) 实现代理协作，用于分布式系统中的事件驱动通信、任务分发和实时协调。
| [**Agent Orchestration**]({{% ref "dapr-agents-core-concepts.md#deterministic-workflows" %}})         | 使用 [Dapr Workflows]({{% ref workflow-overview.md %}}) 进行确定性的 agent orchestration，通过更高层级的任务与 LLM 交互，处理复杂的多步骤流程。


## 代理模式
Dapr Agents 支持一整套模式，代表构建智能系统的不同方法。

{{< diagram agents-patterns-overview >}}

这些模式涵盖从确定性的、由 workflow 驱动的设计，到能够进行动态规划和执行的完全自主代理；每种模式都针对不同的用例，并在可预测性与自主性之间取得平衡。

| 模式                                                                                | 描述 |
|----------------------------------------------------------------------------------------|-------------|
| [**增强型 LLM**]({{% ref "dapr-agents-patterns.md#augmented-llm" %}})               | 通过内存和工具等外部能力增强语言模型，为 AI 驱动的应用程序提供基础。
| [**Durable Agent**]({{% ref "dapr-agents-patterns.md#durable-agent" %}})               | 通过使用 Dapr 的 state store 为代理交互增加持久性和持久化，从而扩展增强型 LLM。
| [**Prompt Chaining**]({{% ref "dapr-agents-patterns.md#prompt-chaining" %}})           | 将复杂任务分解为一系列步骤，其中每次 LLM 调用都处理前一次调用的输出。
| [**Evaluator-Optimizer**]({{% ref "dapr-agents-patterns.md#evaluator-optimizer" %}})   | 实现双 LLM 流程，其中一个模型生成响应，另一个模型在迭代循环中提供评估和反馈。
| [**Parallelization**]({{% ref "dapr-agents-patterns.md#parallelization" %}})           | 同时处理问题的多个维度，并以编程方式聚合输出，以提高效率。
| [**Routing**]({{% ref "dapr-agents-patterns.md#routing" %}})                           | 对输入进行分类，并将其导向专门的后续任务，实现关注点分离和专家专业化。
| [**Orchestrator-Workers**]({{% ref "dapr-agents-patterns.md#orchestrator-workers" %}}) | 由一个中央编排器 LLM 动态地分解任务，将其委派给工作者 LLM，并综合各方结果。


## 开发者体验

Dapr Agents 是基于 [Python Dapr SDK]({{% ref "developing-applications/sdks/python/_index.md" %}}) 构建的 Python 框架，为构建代理系统提供全面的开发体验。

### 入门指南

按照[入门页面]({{% ref dapr-agents-getting-started.md %}})上的说明开始使用 Dapr Agents。

### 框架集成

Dapr Agents 与流行的 Python 框架和工具集成。有关详细的集成指南和示例，请参阅[集成页面]({{% ref integrations %}})。

## 运维支持

Dapr Agents 继承了 Dapr 的企业级运维能力，为代理系统的持久、可靠部署提供全面支持。

### 内置运维功能

- **[Observability]({{% ref observability-concept.md %}})** - 为代理交互和 workflow 执行提供分布式追踪、指标收集和日志记录
- **[安全性]({{% ref security-concept.md %}})** - 提供 mTLS 加密、访问控制和 secrets management，保障代理通信安全
- **[resiliency]({{% ref resiliency-concept.md %}})** - 为容错的代理操作提供自动重试、断路器和超时策略
- **[基础设施抽象]({{% ref components-concept.md %}})** - Dapr component 抽象了 LLM 提供商、内存存储、存储和消息传递后端，实现在不同环境之间的无缝切换

这些能力使团队能够监控代理性能、保护多代理通信，并确保复杂代理 workflow 的可靠执行。

## 贡献

无论你是有兴趣增强框架、添加新集成，还是改进文档，我们都欢迎社区的贡献。

有关开发环境设置和指南，请参阅我们的[贡献者指南]({{% ref "contributing/dapr-agents.md" %}})。
