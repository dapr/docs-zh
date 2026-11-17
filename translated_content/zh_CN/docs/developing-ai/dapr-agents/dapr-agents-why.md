---
type: docs
title: "为什么选择 Dapr Agents"
linkTitle: "为什么选择 Dapr Agents"
weight: 30
description: "了解 Dapr Agents 的优势与使用场景"
aliases:
  - /zh-hans/developing-applications/dapr-agents/dapr-agents-why
---

Dapr Agents 是一个面向生产环境的开源框架（v1.0），用于构建和编排基于大型语言模型 (LLM) 的自主代理，它以 Dapr 经过验证的分布式系统基础为支撑。与要求开发者从零开始构建基础设施的其他代理框架不同，Dapr Agents 开箱即用地提供企业级的可扩展性、状态管理和消息传递能力，使团队能够专注于代理的智能。这种方法消除了重新构建分布式系统基础能力的复杂性，同时借助 Dapr 提供可靠的代理 workflow。

### 现有框架的挑战

当今许多代理框架试图通过开发自己的平台来重新定义微服务的构建和编排方式，以实现核心的分布式系统能力。虽然这些努力展现了创新，但在扩展或适应新环境时，它们往往带来陡峭的学习曲线、分散的系统和不必要的复杂性。

这些框架要求开发者采用全新的范式，或重新构建底层基础设施，而不是基于现有的、已被证明能够在大规模下应对这些挑战的解决方案。这种额外的复杂性分散了开发者对核心目标的关注：设计和实现智能、高效的代理。

### Dapr Agents 如何解决这些问题

Dapr Agents 采用了一种不同的方法：它基于 Dapr 构建，利用其经过验证的 API 和模式，包括 [workflow]({{% ref workflow-overview.md %}})、[pub/sub 消息]({{% ref pubsub-overview.md %}})、[状态管理]({{% ref state-management-overview %}}) 和 [服务通信]({{% ref service-invocation-overview.md %}})。这种集成消除了从零重新创建基础组件的必要。

通过与 Dapr 的运行时和模块化 components 集成，Dapr Agents 使开发者能够构建和部署代理，让它们作为更大系统中的协作服务工作。无论是试验单个代理，还是编排涉及多个代理的 workflow，Dapr Agents 都让团队能够专注于由 LLM 驱动的代理的智能与行为，同时借助经过验证的框架实现可扩展性和可靠性。


## 原则

### 代理中心设计

Dapr Agents 的设计理念是将由 LLM 驱动的代理置于任务执行和工作流编排的核心。这一原则强调：

* **LLM 驱动的代理**：Dapr Agents 支持创建能够利用 LLM 进行推理、动态决策和自然语言交互的代理。
* **自适应任务处理**：Dapr Agents 中的代理配备了灵活的模式，如工具调用和推理循环（例如 ReAct），使它们能够自主处理复杂且不断变化的任务。
* **Multi-Agent Systems**：Dapr Agents 的框架允许代理作为模块化、可复用的 building blocks，无缝集成到 workflow 中，无论它们是独立运行还是协作运行。

虽然 Dapr Agents 以代理为中心，但它也认识到，在确定性 workflow 或更简单的任务序列中直接使用 LLM 同样有其价值。当代理内置的任务处理模式（如 `tool calling` 或 `ReAct` 循环）并非必需时，LLM 可以作为推理和决策的核心组件。这种灵活性确保你可以根据不同需求调整 Dapr Agents，而不局限于单一方法。

{{% alert title="注意" color="info" %}}
代理可以独立使用，并在后台创建 workflow，也可以作为确定性 workflow 中的自主步骤使用。
{{% /alert %}}

### 由 Durable Workflows 支持

Dapr Agents 将持久性置于其架构的核心，以 [Dapr Workflows]({{% ref workflow-overview.md %}}) 作为持久代理执行和确定性多代理编排的基础。

* **Durable Agent 执行**：DurableAgents 本质上由 workflow 支持，确保所有 LLM 调用和工具执行都是持久的、可审计且可恢复的。workflow 检查点保证代理能够从任何故障点恢复，同时保持状态一致性。
* **确定性多代理编排**：workflow 提供对任务依赖关系和多个代理之间协调的集中控制。Dapr 的代码优先 workflow 引擎能够可靠地编排复杂的业务流程，同时在适当之处保留代理的自主性。

通过将 workflow 作为基础层，Dapr Agents 使系统既能结合确定性执行的可靠性，又能获得 LLM 驱动代理的智能，从而确保可靠性和可扩展性。

{{% alert title="注意" color="info" %}}
Dapr Agents 中的 workflow 为构建持久代理系统提供了基础，这些系统将可靠的执行与 LLM 驱动的智能结合在一起。
{{% /alert %}}

### 模块化 component 模型

Dapr Agents 利用 [Dapr 的 pluggable component 框架]({{% ref components-concept.md %}}) 和 building blocks 来简化开发并增强灵活性：

* **核心功能的 building blocks**：Dapr 提供 API building blocks，如 pub/sub 消息、状态管理、service invocation 等，以应对常见的微服务挑战并推广最佳实践。
* **可互换的 components**：每个 building block 都运行在可互换的 components 上（例如 Redis、Kafka、Azure CosmosDB），允许你在不修改应用程序代码的情况下替换实现。
* **无缝转换**：使用默认配置在本地开发，然后只需更新 component 定义，即可轻松部署到云环境。

{{% alert title="注意" color="info" %}}
开发者可以根据部署环境，在不同的 components 之间轻松切换（例如从 Redis 切换到 DynamoDB，或从 OpenAI 切换到 Anthropic），确保可移植性和适应性。
{{% /alert %}}

### 消息驱动的通信

Dapr Agents 强调使用 pub/sub 消息在代理之间进行事件驱动的通信。这一原则确保：

* **解耦的架构**：异步通信，实现可扩展性和模块化。
* **实时适应性**：代理动态响应事件，实现更快、更灵活的任务执行。
* **事件驱动的 workflow**：通过将 pub/sub 消息与 workflow 能力相结合，代理可以通过事件流协作，同时参与更大的编排 workflow，兼顾自主协调与结构化的任务执行。

{{% alert title="注意" color="info" %}}
pub/sub 消息是 Dapr Agents 事件驱动 workflow 的主干，使代理能够实时通信和协作，同时保持松散耦合。
{{% /alert %}}

{{< diagram agents-message-driven >}}

### 解耦的基础设施设计

Dapr Agents 确保代理与底层基础设施之间清晰分离，强调简单性、可扩展性和适应性：

* **代理的简单性**：代理只专注于推理和任务执行，而 pub/sub 消息、路由和验证由模块化的基础设施 components 外部管理。
* **可扩展且可适应的系统**：通过卸载非代理特定的职责，Dapr Agents 使代理能够独立扩展，并无缝适应新的用例或集成。

{{% alert title="注意" color="info" %}}
解耦基础设施使代理专注于任务，同时实现跨系统的无缝可扩展性和集成。
{{% /alert %}}

{{< diagram name="agents-decoupled-infrastructure" width="80" >}}


## Dapr Agents 的优势

### 作为一等公民的可扩展 workflow

Dapr Agents 使用[持久执行 workflow 引擎]({{% ref workflow-overview.md %}})，保证每个代理任务都能执行到完成，即使遇到网络中断、节点崩溃和其他破坏性故障。开发者无需了解底层 workflow 引擎的概念，只需编写一个代理，执行任意数量的任务，这些任务就会自动分布到集群中。如果任何任务失败，它将被重试，并从上次中断的位置恢复其状态。

### 成本效益的 AI 采用

Dapr Agents 基于 Dapr 的 Workflow API 构建，该 API 将每个代理表示为一个 actor，即一个兼具计算与状态的单元，它是线程安全且原生分布式的。这种设计实现了缩容至零的架构，最大限度地降低基础设施成本，使各种规模的组织都能采用 AI。底层的虚拟 actor 模型允许数千个代理按需在单台机器上运行，并在从零扩容时保持低延迟。代理闲置时会被系统回收，但会保留其状态，直到再次需要。这种设计消除了性能与资源效率之间的权衡。

### 以数据为中心的 AI 代理

通过内置的对超过 50 个企业数据源的连接，Dapr Agents 能够高效处理结构化和非结构化数据。从基础的 [PDF 提取]({{% ref "/developing-ai/dapr-agents/dapr-agents-integrations.md" %}}) 到大规模数据库交互，它让数据驱动的 AI workflow 只需极少的代码改动即可实现。Dapr 的 [bindings]({{% ref bindings-overview.md %}}) 和 [state stores]({{% ref supported-state-stores.md %}})，以及 MCP 支持，为代理的数据摄取提供了访问众多数据源的能力。

### 加速开发

Dapr Agents 提供 AI 功能，为开发者提供完整的 API 表面来解决常见问题，包括：

- 灵活的提示
- 结构化输出
- 多个 LLM 提供商
- 上下文记忆
- 智能工具选择
- [MCP 集成](https://docs.anthropic.com/en/docs/agents-and-tools/mcp)
- 多代理通信

### 集成的安全性和可靠性

通过基于 Dapr 构建，平台和基础设施团队可以将 Dapr 的 [resiliency 策略]({{% ref "operations/resiliency/policies/_index.md" %}}) 应用于 Dapr Agents 所使用的数据库和消息代理组件。这些策略包括超时、重试/退避策略和断路器。对于[安全性]({{% ref security-concept.md %}})，Dapr 提供了将对特定数据库或消息代理的访问范围限定到一个或多个代理应用部署的选项。此外，Dapr Agents 使用 mTLS 加密其底层组件之间的通信。

### 内置的消息传递和状态基础设施

- **Service-to-Service Invocation**：通过内置的服务发现、错误处理和分布式追踪，实现代理之间的直接通信。代理可以在多代理 workflow 中将其用于同步消息传递。
- **发布和订阅**：通过共享 message bus 支持代理之间的松散耦合协作。这实现了用于任务分发和协调的实时、事件驱动交互。
- **Durable Workflow**：定义长时间运行的持久 workflow，将确定性流程与基于 LLM 的决策相结合。Dapr Agents 使用它来编排复杂的多步骤代理式 workflow。
- **State Management**：提供灵活的键值存储，使代理能够在多次交互之间保留上下文，确保 workflow 过程中的连续性与适应性。
- **LLM 集成**：使用 Dapr [Conversation API]({{% ref conversation-overview.md %}}) 抽象 LLM 推理 API，以实现聊天补全，并为嵌入向量和音频处理等其他 LLM 集成提供原生客户端。

### 供应商中立和开源

作为 **CNCF** 的一部分，Dapr Agents 是供应商中立的，消除了对锁定、知识产权风险或专有限制的顾虑。组织可以使用其可审计、可贡献的开源软件，对自身的 AI 应用拥有完全的灵活性和控制权。
