---
type: docs
title: "核心概念"
linkTitle: "核心概念"
weight: 40
description: "了解 Dapr Agents 的核心概念"
aliases:
  - /zh-hans/developing-applications/dapr-agents/dapr-agents-core-concepts
---

Dapr Agents 提供了一种结构化的方式，用于构建和编排使用大型语言模型 (LLM) 的应用，让你无需陷入基础设施细节，同时具备持久性保证。它的核心目标，是通过抽象掉 LLM、工具、内存管理以及分布式系统的复杂性，使开发者能够把注意力集中在 AI 应用的业务逻辑上。在这一框架中，代理是最基础的构建块。

## 代理

代理是由 LLM 驱动的自治单元，旨在执行任务、对问题进行推理，并在 workflow 中协作。作为智能构建块，代理将推理能力与工具集成、内存和协作特性相结合，以达成预期结果。

{{< diagram name="agents-loop" width="75" >}}

Dapr Agents 提供两类代理，分别适用于不同场景：

### Agent

{{% alert title="已弃用" color="warning" %}}
`Agent` 类**自 v1.0.0-rc.1 起已弃用**，未来版本将被移除。所有新开发都应使用 [`DurableAgent`](#durable-agent)。
{{% /alert %}}

`Agent` 类是一种会话式代理，使用语言模型管理工具调用与对话。它提供同步执行，并内置对话内存。

```python
@tool
def my_weather_func() -> str:
    """Get current weather."""
    return "It's 72°F and sunny"

async def main():
    weather_agent = Agent(
        name="WeatherAgent",
        role="Weather Assistant",
        goal="Provide timely weather updates across cities",
        instructions=["Help users with weather information"],
        tools=[my_weather_func],
        memory = AgentMemoryConfig(
            store=ConversationDaprStateMemory(
                store_name="historystore",
                session_id="some-id",
            )
        ),
    )

    response1 = await weather_agent.run("What's the weather?")
    response2 = await weather_agent.run("How about now?")
```

这个示例展示了如何创建一个带工具集成的简单代理。该代理同步处理查询，并借助 Dapr State Store API 在多次交互之间保持对话上下文。

### Durable Agent

`DurableAgent` 类是一种基于 workflow 的代理。它在标准 Agent 的基础上结合了 Dapr Workflows，以实现长时间运行、容错的持久执行。它提供持久状态管理、自动重试机制，以及跨故障场景的确定性执行。

```python

from dapr_agents.workflow.runners import AgentRunner

async def main():
    travel_planner = DurableAgent(
        name="TravelBuddy",
        role="Travel Planner",
        goal="Help users find flights and remember preferences",
        instructions=["Help users find flights and remember preferences"],
        tools=[search_flights],
        memory = AgentMemoryConfig(
            store=ConversationDaprStateMemory(
                store_name="conversationstore",
                session_id="travel-session",
            )
        )
    )

    runner = AgentRunner()

    try:
        itinerary = await runner.run(
            travel_planner,
            payload={"task": "Plan a 3-day trip to Paris"},
        )
        print(itinerary)
    finally:
        runner.shutdown(travel_planner)

```
这个示例演示了如何创建一个由 workflow 支撑、可在后台自主运行的代理。`AgentRunner` 会为你调度 workflow、等待其完成，并确保该代理即使只被触发一次，也能在重启后继续执行。

**关键特性：**
- 基于 Dapr Workflows 的 workflow 执行
- 跨会话与故障场景的持久 workflow 状态管理
- 自动重试与恢复机制
- 带检查点的确定性执行
- 内置消息路由与代理间通信能力
- 适用于 DurableAgent 的 `AgentRunner` 模式：临时执行（`runner.run(...)`）、pub/sub 订阅（`runner.subscribe(...)`）和 FastAPI 服务（`runner.serve(...)`）
- 支持复杂编排模式与多代理协作

**适用场景：**
- 跨越时间或多个系统的多步骤 workflow
- 需要保证进度跟踪与状态持久化的任务
- 操作可能暂停、失败，或需要在不丢失数据的情况下恢复的场景
- 复杂的 agent orchestration 与多代理协作
- 需要容错与可扩展性的生产系统

总结如下：

| 代理类型 | 内存类型 | 执行 | 交互模式 | 状态 |
|-----------------|-------------------------|-----------|--------------------------|--------|
| `Agent`         | 内存或持久化 | 临时 | 嵌入式 | **已弃用**（v1.0.0-rc.1） |
| `DurableAgent`  | 持久化 | 持久 | PubSub / HTTP / 嵌入式 | 推荐 |


- 普通 `Agent`：交互是同步的——你发送对话提示，并立即获得响应。对话可以保存在内存中，也可以持久化，但执行本身是临时的，重启后不会继续。

- `DurableAgent`（由 workflow 支撑）：交互是异步的——你只需触发一次该代理，它便会在后台自主运行直至完成。对话状态与执行过程都会被持久化，并可在故障或重启后恢复。


#### 感知重放的日志

由于 `DurableAgent` 依赖 Dapr Workflows，其底层执行模型采用事件溯源。这意味着 workflow 代码会从头开始重新执行（即重放），以便在等待外部活动或工具调用之后重建本地状态。

为避免这些重新水化周期中产生的重复日志污染输出，Dapr Agents 提供了 `ContextAwareLogger`。该日志记录器会通过钩子自动接入 `DaprWorkflowContext`，并在 workflow 正在重放时静默屏蔽日志记录。

```python
from dapr_agents.utils import get_context_aware_logger
from dapr_agents.workflow.decorators import workflow_entry

# 在模块级别初始化日志记录器
logger = get_context_aware_logger(__name__)

@workflow_entry
def my_workflow(self, ctx: DaprWorkflowContext, wf_input: dict) -> str:
    # 即使 workflow 挂起并重放 5 次，这条日志也只会输出一次
    logger.info("Starting workflow execution...")
    # ...
```

## 核心代理功能

代理系统本质上是一种分布式系统，需要多种行为模式及配套基础设施。

### LLM 集成

Dapr Agents 提供统一接口，用于连接 LLM 推理 API。借助这一抽象，开发者可以把代理无缝接入前沿语言模型，用于推理与决策。框架内置了多个 LLM 客户端，分别面向不同的提供方与模态：

- `DaprChatClient`：通过 Dapr 的 Conversation API 提供统一的 LLM 交互接口，内置安全能力（作用域、secrets、PII 混淆）、弹性能力（超时、重试、断路器），并通过 OpenTelemetry 与 Prometheus 提供 observability
- `OpenAIChatClient`：全面支持 OpenAI 模型，包括聊天、嵌入向量与音频
- `AnthropicChatClient`：通过官方 SDK 原生支持 Anthropic Claude 模型，包括流式输出、图像输入、工具调用和结构化输出。详情请参阅 [Anthropic]({{< ref "developing-ai/dapr-agents/integrations/providers/anthropic.md" >}})。
- `HFHubChatClient`：面向 Hugging Face 模型，同时支持聊天与嵌入向量
- `MistralChatClient`：通过官方 SDK 原生支持 Mistral 模型，支持自定义端点及高级多模态功能。若未显式提供模型，则回退到 `MISTRAL_MODEL` 环境变量，或 `mistral-large-latest`。
- `NVIDIAChatClient`：面向 NVIDIA AI Foundation 模型，支持本地推理与聊天
- `ElevenLabs`：支持语音与声音能力

### 代理执行器

`DurableAgent` 可以使用**代理执行器**来代替 LLM 客户端。代理执行器是一种外部代理运行时，它自行运行完整的推理与工具调用循环，例如通过 `ClaudeAgentExecutor` 使用的 Claude Agent SDK。传入 `executor=...` 而非 `llm=...`，二者互斥。Dapr Agents 仍会将该代理作为持久 workflow 运行，并提供触发器、状态、人工审批、流式输出和追踪能力。参阅 [代理执行器]({{< ref dapr-agents-executors.md >}})。

### 提示词灵活性

Dapr Agents 支持灵活的提示模板，以塑造代理的行为和推理方式。用户可以在提示中定义占位符，为推理调用动态注入上下文。借助 [Jinja 模板](https://jinja.palletsprojects.com/en/stable/templates/) 与 Python f-string 格式化，用户可以加入循环、条件和变量，从而精确控制提示的结构与内容。这种灵活性确保 LLM 的响应能够贴合当前任务，同时为各类场景带来模块化与适应性。

### 使用 Prompty 模板

你可以通过一个 `.prompty` 文件，在同一处配置 Dapr 代理的提示词、模型参数和 LLM 提供方。例如，若要使用 Mistral 配置代理：

```yaml
---
name: Mistral Agent
model:
  api: chat
  configuration:
    type: mistral
    name: mistral-large-latest
  parameters:
    temperature: 0.7
    max_tokens: 500
---
system:
You are a helpful assistant.
```
> **注意：** `mistral-large-latest` 仅作示例。请查阅 Mistral 文档，以获取最新的模型名称。

### 结构化输出

Dapr Agents 中的代理利用结构化输出能力（如 [OpenAI 的函数调用](https://platform.openai.com/docs/guides/function-calling)）生成可预测且可靠的结果。这些输出遵循 [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/release-notes.html) 与 [OpenAPI Specification v3.1.0](https://github.com/OAI/OpenAPI-Specification) 标准，因而更易于互操作与工具集成。

```python
# 定义数据模型
class Dog(BaseModel):
    name: str
    breed: str
    reason: str

# 初始化聊天客户端
llm = OpenAIChatClient()

# 获取结构化响应
response = llm.generate(
    messages=[UserMessage("One famous dog in history.")], response_format=Dog
)

print(json.dumps(response.model_dump(), indent=2))
```
这个示例展示了 LLM 如何按照 schema 生成结构化数据。Pydantic 模型（Dog）指定了预期的确切结构与数据类型，而 response_format 参数则指示 LLM 返回与该模型匹配的数据，从而确保下游处理所用的输出一致且可预测。


### 工具调用

工具调用是自治代理设计中的一种基本模式，它使 AI 代理能够根据用户输入与外部工具进行动态交互。代理借助 LLM 分析需求，动态选择适合特定任务的工具，并决定最佳操作。

```python
@tool(args_model=GetWeatherSchema)
def get_weather(location: str) -> str:
    """Get weather information based on location."""
    import random
    temperature = random.randint(60, 80)
    return f"{location}: {temperature}F."
```

每个工具都有一段描述性的文档字符串，帮助 LLM 理解何时使用它。`@tool` 装饰器用于将函数标记为工具，而 Pydantic 模型（`GetWeatherSchema`）则定义了用于结构化校验的输入参数。

{{< diagram name="agents-tool-call-flow" width="80" >}}

1. 用户提交一个查询，指明任务以及可用的工具。
2. LLM 分析查询，并为该任务选择合适的工具。
3. LLM 提供结构化的 JSON 输出，其中包含工具的唯一 ID、名称和参数。
4. AI 代理解析 JSON，使用提供的参数执行工具，并将结果作为工具消息发送回去。
5. LLM 随后结合用户的上下文总结工具的执行结果，给出完整的最终回复。

这一能力直接依赖 LLM 的参数化知识，并借助[函数调用](https://platform.openai.com/docs/guides/function-calling)得到增强，从而确保工具被高效、准确地调用。

#### 工具执行模式

当 LLM 在单个轮次中返回多个工具调用时，`DurableAgent` 可以通过 `AgentExecutionConfig.tool_execution_mode` 进行配置，以两种模式执行这些调用：

| 模式 | 枚举值 | 行为 |
|------|-----------|----------|
| **并行**（默认） | `ToolExecutionMode.PARALLEL` | 同一次 LLM 轮次中的所有工具调用都会同时派发并等待完成。当工具彼此独立时，延迟最低。 |
| **顺序** | `ToolExecutionMode.SEQUENTIAL` | 工具调用按 LLM 返回的顺序逐个执行。当工具带有副作用，且其结果依赖于同一轮次中先前调用的结果时，请使用此模式。 |

```python
from dapr_agents.agents.configs import AgentExecutionConfig, ToolExecutionMode

travel_planner = DurableAgent(
    name="TravelBuddy",
    ...
    execution=AgentExecutionConfig(
        max_iterations=10,
        tool_execution_mode=ToolExecutionMode.SEQUENTIAL,
    ),
)
```


### MCP 支持
Dapr Agents 内置支持[模型上下文协议（MCP）](https://modelcontextprotocol.io/)，使代理能够通过标准化接口动态发现并调用外部工具。借助提供的 MCPClient，代理可以通过三种传输方式连接 MCP 服务器：用于本地开发的 stdio、用于远程或分布式环境的 sse，以及 Streamable HTTP 传输。

```python
client = MCPClient()
await client.connect_sse("local", url="http://localhost:8000/sse")

# 将 MCP 工具转换为 AgentTool 列表
tools = client.get_all_tools()
```

连接之后，MCP 客户端会从服务器获取所有可用工具，并将其准备好，以便在代理的工具集中立即使用。这使代理能够整合外部进程（例如本地 Python 脚本或远程服务）所暴露的能力，而无需硬编码或预先加载。代理可以在运行时调用这些工具，并根据当前活动的 MCP 服务器所提供的能力扩展自身行为。


### 内存
代理会在多次交互之间保留上下文，从而提供更连贯、更具适应性的回复。内存选项既包括用于管理聊天历史的简单内存列表，也包括用于语义搜索的向量数据库，并且还能与 [Dapr state store](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/) 集成，为高级用例提供可扩展且持久的内存，支持 28 种不同的 state store 提供方。


```python
from dapr_agents import Agent, DurableAgent
from dapr_agents.agents.configs import AgentMemoryConfig
from dapr_agents.memory import (
    ConversationDaprStateMemory,
    ConversationListMemory,
    ConversationVectorMemory,
)

# 1. ConversationListMemory（简单的内存实现）- 默认
memory_list = ConversationListMemory()

# 2. ConversationVectorMemory（vector store）
memory_vector = ConversationVectorMemory(
    vector_store=your_vector_store_instance,
    distance_metric="cosine",
)

# 3. 通过 AgentMemoryConfig 使用 ConversationDaprStateMemory（Dapr State Store）
durable_memory = AgentMemoryConfig(
    store=ConversationDaprStateMemory(
        store_name="historystore",  # Dapr 组件名称
        session_id="my-session",
    )
)

# 与普通 Agent 配合使用（直接传入内存实例）
agent = Agent(
    name="MyAgent",
    role="Assistant",
    memory=memory_list,
)

# 与 DurableAgent 配合使用（传入 AgentMemoryConfig）
travel_planner = DurableAgent(
    name="TravelBuddy",
    memory=durable_memory,
    # ... 其他配置 ...
)
```
`ConversationListMemory` 是未指定内存时的默认实现，它使用 Python 列表提供快速的临时存储，适用于开发和测试。Dapr 的各个内存实现（均位于 `dapr_agents.memory` 中）可以互换使用，无需修改代理逻辑或部署模型即可在它们之间切换。

| 内存实现 | 类型 | 持久性 | 搜索 | 用例 |
|---|---|---|---|---|
| `ConversationListMemory`（默认） | 内存 | ❌ | 线性 | 开发 |
| `ConversationVectorMemory` | vector store | ✅ | 语义 | RAG/AI 应用 |
| `ConversationDaprStateMemory` | Dapr State Store | ✅ | 查询 | 生产 |

`ConversationVectorMemory` 可以由任意受支持的 vector store 实现提供支持：

| vector store | 类 | 后端 | 说明 |
|---|---|---|---|
| Chroma | `ChromaVectorStore` | ChromaDB | 内存或持久化；无需额外基础设施 |
| PostgreSQL | `PostgresVectorStore` | pgvector 扩展 | 需要带有 `pgvector` 的 PostgreSQL |
| Redis | `RedisVectorStore` | Redis Stack / 带搜索功能的 Redis | 需要 `redisvl` |

```python
from dapr_agents.storage.vectorstores import RedisVectorStore
from dapr_agents.document.embedder.openai import OpenAIEmbedder
from dapr_agents.memory import ConversationVectorMemory

vector_store = RedisVectorStore(
    url="redis://localhost:6379",
    index_name="my_agent",
    embedding_function=OpenAIEmbedder(),
    embedding_dimensions=1536,
)

memory = ConversationVectorMemory(
    vector_store=vector_store,
    distance_metric="cosine",
)
```


### Agents as Tools

Dapr Agents 支持在 `DurableAgent` 的推理循环中，将其他代理（无论是 Dapr Agents 代理还是第三方代理框架中的代理）作为工具调用。这使父代理能够将子任务委派给专门的子代理，从而组合出 multi-agent systems，而无需使用 pub/sub 消息代理。

注册在同一注册表中的代理会自动可用作工具，其中也包括调用第三方框架的代理。另外，你也可以使用 `dapr_agents.tool.workflow` 中的 `agent_to_tool`，进行显式连接、跨应用 Routing，或调用其他框架的代理：

```python
from dapr_agents.tool.workflow import agent_to_tool

# 将另一个代理作为工具调用
aragorn_tool = agent_to_tool(
    "aragorn",
    description="Military Strategy. Goal: Lead the forces of Gondor.",
    target_app_id="aragorn-app",
)
# 在 DurableAgent 中将代理用作工具
frodo = DurableAgent(
    name="frodo",
    role="Ring Bearer",
    goal="Carry the One Ring to Mordor",
    tools=[aragorn_tool],
    ...
)
```

当 LLM 调用其中某个工具时，Dapr Agents 会将目标代理的 workflow 作为 `DurableAgent`（child workflow）进行调度并返回结果，同时透明地处理跨应用 Routing 与结果封送。

| 参数 | 说明 |
|---|---|
| `agent_name` | 目标代理的名称（用于派生工具名称和 workflow ID） |
| `description` | 在工具 schema 中展示给父 LLM 的可读描述 |
| `target_app_id` | 用于跨应用 Routing 的 Dapr app-id；进程内调用时为 `None` |
| `framework` | 非 Dapr Agents 目标所用的框架名称（例如 `"openai"`、`"langgraph"`） |
| `workflow_name` | 显式指定的 Dapr workflow 名称；优先级高于 `framework` |

参阅[Agents as Tools 示例](https://github.com/dapr/dapr-agents/tree/main/examples/08-agents-as-tools)，以获取完整的可运行实现。


### Agent Runner

`AgentRunner` 将 DurableAgent 接入三种互补的托管模式：

1. **`run`**——直接从 Python 触发 durable workflow（适用于 CLI、测试和 notebook），并可选择等待其完成。
2. **`subscribe`**——自动为代理上每个带有 `@message_router` 装饰的 handler（包括内置的 `DurableAgent.agent_workflow`）注册 Dapr 订阅，使配置 topics 上的 CloudEvents 先按其 `message_model` 进行校验，再调度 workflow 入口。
3. **`serve`**——将 `subscribe` 与 FastAPI 路由注册以及自动启动的 Uvicorn 服务器相结合，把代理托管为 Web 服务。默认情况下，它暴露 `POST /agent/run`（调度 `@workflow_entry`）和 `GET /agent/instances/{instance_id}`（获取 workflow 状态）；你也可以提供自己的 FastAPI 应用，或自定义主机、端口和路径。

```python
travel_planner = DurableAgent(
    name="TravelBuddy",
    role="Travel Planner",
    goal="Help humans find flights and remember preferences",
    instructions=[
        "Find flights to destinations",
        "Remember user preferences",
        "Provide clear flight info.",
    ],
    tools=[search_flights],
)
runner = AgentRunner()
```

以下示例复用同一个 `travel_planner` 实例，以说明每种模式。

#### 1. 使用 `runner.run(...)` 临时执行

当你希望直接从 Python 代码（测试、CLI、notebook 等）触发 workflow 时，请使用 `run`。运行器会定位代理的 `@workflow_entry` 并调度它。`.run()` 是一个阻塞调用，它会触发代理并等待其完成。

```python
result = await runner.run(
    travel_planner,
    payload={"task": "Plan a 3-day trip to Paris"},
)
print(result)
```

这种模式适用于同步自动化场景，或者在你需要以编程方式获取最终回复时使用。传入 `wait=False` 即可创建即发即忘（fire-and-forget）实例。

#### 2. 使用 `runner.subscribe(...)` 进行 pub/sub 订阅

`subscribe` 会扫描代理上所有带有 `@message_router` 标记的方法（包括内置的 `agent_workflow`），并使用 `AgentPubSubConfig` 中定义的 topics 和 schema 自动注册必要的 Dapr 订阅。每个传入的 CloudEvent 都会先按声明的 `message_model`（例如 `TriggerAction`）进行校验，然后运行器才会调度 workflow 入口。

```python
runner.subscribe(travel_planner)
await wait_for_shutdown()
```

添加你自己的 `@message_router` 方法即可支持额外的 topics 或广播通道，运行器会自动发现它们，并将消息路由到相应的 handler。使用 `wait_for_shutdown()`（来自 `dapr_agents.workflow.utils.core`）等辅助函数，可以让进程保持运行，直到你将其停止。

#### 3. 使用 `runner.serve(...)` 提供 FastAPI 服务

`serve` 是将 DurableAgent 作为 Web 服务运行的一行式方式。它会先调用 `subscribe(...)`，然后启动一个 FastAPI 应用（除非你传入自己的应用），并提供两个默认端点：

- `POST /agent/run`：依据代理 `@workflow_entry` 的签名校验 JSON 请求体，并调度一个新的 workflow 实例。
- `GET /agent/instances/{instance_id}`：转发 workflow 状态查询（如有需要，也包括负载）。

```python
runner.serve(
    travel_planner,
    port=8001,
)
```

由于 workflow 是持久的，`/run` 端点会立即返回一个实例 ID，即使代理仍在后台继续工作。你可以将生成的 FastAPI 路由挂载到更大的应用中，也可以让 `serve` 运行自己的 Uvicorn 循环，用于独立部署。

## Multi-agent Systems (MAS)

与其构建一个能够处理众多任务的完全自治代理，在实践中更有效的做法是将其拆分为配备适当工具和指令的专门代理，然后协调多个代理之间的交互。

Multi-agent systems (MAS) 将 workflow 的执行分布到多个相互协调的代理中，以高效地实现共同目标。这种被称为 **agent orchestration** 的方法，相较于单体式的代理设计，能够带来更好的专业化、可扩展性与可维护性。

{{< diagram agents-orchestration >}}

Dapr Agents 通过 [Dapr Workflows](https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/) 和 [Dapr PubSub](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/) 支持两种主要的编排方式：

- **基于确定性 workflow 的编排**：提供清晰、可重复的流程，具有预定义的执行顺序和决策点
- **事件驱动编排**：通过基于消息的协调，实现动态、自适应的代理协作

两种方式都使用一个中央编排器来协调多个专门代理，每个代理负责特定的任务或领域，从而确保高效的任务分配，以及整个系统中的无缝协作。

## 确定性 Workflows

Workflow 是结构化的流程，其中 LLM 代理与工具按照预定义的顺序协作，以完成复杂任务。与独立做出所有决策的完全自治代理不同，workflow 既以其定义提供结构与可预测性，又借助 LLM 代理获得智能与灵活性，并借助 Dapr 的 workflow 引擎获得可靠性与持久性。

这种方式特别适用于业务关键型应用，在这些场景中，你既需要 LLM 的智能，也需要传统软件系统的可靠性。

```python
import time

import dapr.ext.workflow as wf

wfr = wf.WorkflowRuntime()

@wfr.workflow(name="support_workflow")
def support_workflow(ctx: wf.DaprWorkflowContext, request: dict) -> str:
    triage_result = yield ctx.call_child_workflow(
        workflow="agent_workflow",
        input={"task": f"Assist with the following support request:\n\n{request}"},
        app_id="triage-agent",
    )
    if triage_result:
        print("Triage result:", triage_result.get("content", ""), flush=True)

    recommendation = yield ctx.call_child_workflow(
        workflow="agent_workflow",
        input={"task": triage_result.get("content", "")},
        app_id="expert-agent",
    )
    if recommendation:
        print("Recommendation:", recommendation.get("content", ""), flush=True)

    return recommendation.get("content", "") if recommendation else ""

wfr.start()
time.sleep(5)

client = wf.DaprWorkflowClient()
request = {
    "customer": "alice",
    "issue": "Unable to access dashboard after recent update",
}
instance_id = client.schedule_new_workflow(
    workflow=support_workflow,
    input=request,
)
client.wait_for_workflow_completion(instance_id, timeout_in_seconds=60)
wfr.shutdown()
```

这里使用 `call_child_workflow` 调用两个 Dapr Agents 代理的 workflow，并将其中一个的输出作为另一个的输入。这要求 `DurableAgent` 按如下方式运行：

```python
from dapr_agents import DurableAgent
from dapr_agents.agents.configs import AgentMemoryConfig
from dapr_agents.llm.dapr import DaprChatClient
from dapr_agents.memory import ConversationDaprStateMemory
from dapr_agents.workflow.runners.agent import AgentRunner

expert_agent = DurableAgent(
    name="expert_agent",
    role="Technical Support Specialist",
    goal="Provide recommendations based on customer context and issue.",
    instructions=[
        "Provide a clear, actionable recommendation to resolve the issue.",
    ],
    llm=DaprChatClient(component_name="llm-provider"),
    memory=AgentMemoryConfig(
        store=ConversationDaprStateMemory(
            store_name="agent-memory",
            session_id=f"expert-agent-session",
        )
    ),
)
runner = AgentRunner()
try:
    runner.serve(expert_agent, port=8001)
finally:
    runner.shutdown(expert_agent)
```

### Workflow 模式

Workflow 能够通过结构化编排实现多种代理模式，包括 Prompt Chaining、Routing、Parallelization、Orchestrator-Workers、Evaluator-Optimizer、人在回路（Human-in-the-loop）等。关于这些模式的详细实现和示例，请参阅[模式文档]({{< ref dapr-agents-patterns.md >}})。

### 消息路由 Workflows

`@message_router` 装饰器可将 workflow 直接绑定到 Dapr pub/sub topic，使每条经过校验的消息都会自动调度一个 workflow 实例。这种模式（即 message-router Quickstart 所用的模式）允许你将 CloudEvent 负载推送到某个 topic，并由基于 LLM 的活动立即接手处理。

```python
from pydantic import BaseModel
from dapr_agents.workflow.decorators.routers import message_router

class StartBlogMessage(BaseModel):
    topic: str

@message_router(
    pubsub="messagepubsub",
    topic="blog.requests",
    message_model=StartBlogMessage,
)
def blog_workflow(ctx: DaprWorkflowContext, wf_input: dict) -> str:
    outline = yield ctx.call_activity(
        create_outline, input={"topic": wf_input["topic"]}
    )
    post = yield ctx.call_activity(write_post, input={"outline": outline})
    return post
```

在启动期间调用 `register_message_routes(targets=[blog_workflow], dapr_client=client)`，即可自动配置订阅、schema 校验和 workflow 调度。这使 workflow 定义同时成为编排与事件入口的唯一事实来源。

### Workflow 与 Durable Agents

DurableAgent 与基于 workflow 的 agent orchestration 在底层都使用 Dapr workflow 来保证持久性与可靠性，但二者决定控制流的方式不同。

| 方面 | Workflow | Durable Agents |
|--------|-----------|------------------------------------|
| 控制 | 由开发者定义的流程 | 由代理决定后续步骤 |
| 可预测性 | 较高 | 较低 |
| 灵活性 | 整体结构固定，步骤内部灵活 | 完全灵活 |
| 可靠性 | 非常高（由 workflow 引擎保证） | 非常高（由底层代理实现保证） |
| 复杂性 | 结构化的 workflow 模式 | 动态、灵活的执行路径 |
| 用例 | 业务流程、受监管领域 | 开放式研究、创造性任务 |

关键区别在于控制流的确定方式：使用 DurableAgent 时，底层 workflow 是由 LLM 的规划决策动态创建的，完全在单个代理上下文中执行。相比之下，在确定性 workflow 中，开发者会显式定义一个或多个 LLM 交互之间的协调方式，从而在多个任务或代理之间提供结构化编排。

## 事件驱动编排

事件驱动的 agent orchestration 借助异步的 [pub/sub 消息传递](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/)，使多个专门代理能够协同工作。这种方式通过独立扩展、服务隔离带来的弹性，以及清晰的职责划分，支持强大的协作式问题解决、并行处理，以及专门代理之间的职责分工。

### 核心参与者

在这一多代理协调系统中，核心参与者包括以下几类。

#### Durable Agents

每个代理都作为独立服务运行，拥有各自的生命周期。它被配置为启用了 pub/sub 的标准 DurableAgent：

```python
import asyncio

from dapr_agents.agents.configs import (
    AgentMemoryConfig,
    AgentProfileConfig,
    AgentPubSubConfig,
    AgentRegistryConfig,
    AgentStateConfig,
)
from dapr_agents.memory import ConversationDaprStateMemory
from dapr_agents.storage.daprstores.stateservice import StateStoreService
from dapr_agents.workflow.runners import AgentRunner
from dapr_agents.workflow.utils.core import wait_for_shutdown

registry = AgentRegistryConfig(
    store=StateStoreService(store_name="agentregistrystore"),
    team_name="fellowship",
)

frodo = DurableAgent(
    profile=AgentProfileConfig(
        name="Frodo",
        role="Ring Bearer",
        instructions=["Speak like Frodo, with humility and determination."],
    ),
    pubsub=AgentPubSubConfig(
        pubsub_name="messagepubsub",
        agent_topic="fellowship.frodo.requests",
        broadcast_topic="fellowship.broadcast",
    ),
    state=AgentStateConfig(
        store=StateStoreService(store_name="workflowstatestore", key_prefix="frodo:")
    ),
    registry=registry,
    memory=AgentMemoryConfig(
        store=ConversationDaprStateMemory(
            store_name="memorystore",
            session_id="frodo-session",
        )
    ),
)

async def main():
    runner = AgentRunner()
    try:
        runner.subscribe(frodo)
        await wait_for_shutdown()
    finally:
        runner.shutdown(frodo)

asyncio.run(main())
```

#### 编排器

编排器负责协调代理之间的交互，并通过选择合适的代理、管理交互顺序以及跟踪进度来管理对话流程。Dapr Agents 提供三种编排策略：Random、RoundRobin 和基于 LLM 的编排。

```python
from dapr_agents.agents.configs import (
    AgentExecutionConfig,
    AgentPubSubConfig,
    AgentRegistryConfig,
    AgentStateConfig,
)
from dapr_agents.llm.openai import OpenAIChatClient
from dapr_agents.storage.daprstores.stateservice import StateStoreService
from dapr_agents.workflow.runners import AgentRunner
import dapr.ext.workflow as wf

llm_orchestrator = LLMOrchestrator(
    name="LLMOrchestrator",
    llm=OpenAIChatClient(),
    pubsub=AgentPubSubConfig(
        pubsub_name="messagepubsub",
        agent_topic="llm.orchestrator.requests",
        broadcast_topic="fellowship.broadcast",
    ),
    state=AgentStateConfig(
        store=StateStoreService(
            store_name="workflowstatestore", key_prefix="llm.orchestrator:"
        )
    ),
    registry=AgentRegistryConfig(
        store=StateStoreService(store_name="agentregistrystore"),
        team_name="fellowship",
    ),
    execution=AgentExecutionConfig(max_iterations=3),
    runtime=wf.WorkflowRuntime(),
)

runner = AgentRunner()
runner.serve(llm_orchestrator, port=8004)
```

基于 LLM 的编排器会利用智能的代理选择做出感知上下文的决策，而 Random 与 RoundRobin 则为较简单的场景提供了替代的协调策略。运行器会将编排器作为 Dapr 应用或 HTTP 服务保持在线，使客户端可以通过 topics 或 REST 调用发布任务。

由于 `DurableAgent.agent_workflow` 与上述编排器都使用 `@message_router(message_model=TriggerAction)` 装饰，因此 `runner.subscribe(...)` 会自动绑定 `AgentPubSubConfig` 中声明的 topics，并在调度 `@workflow_entry` 之前依据预期 schema 校验每个传入的 CloudEvent。你可以为同一代理添加更多消息路由（每个都可以拥有自己的 `message_model`），运行器会在下次启动时发现它们，并自动扩展订阅列表。

### 通信流程

代理通过事件驱动的 pub/sub 系统进行通信，该系统支持异步通信、解耦架构、可扩展的交互以及可靠的消息投递。典型的协作流程包括：提交客户端查询、编排器驱动的代理选择、代理响应处理，以及迭代协调直至任务完成。

这种方式特别适用于需要多个专业领域知识的复杂问题求解、来自不同视角的创造性协作、角色扮演场景，以及大型任务的分布式处理。

### 消息传递的工作方式

消息传递将 workflow 中的代理连接在一起，实现实时通信与协调。它是事件驱动交互的骨干，确保代理无需直接连接即可协同工作。

通过消息传递，代理可以：

* **跨任务协作**：代理交换消息，以共享更新、广播事件或交付任务结果。
* **编排 workflow**：任务通过已发布的消息被触发和协调，使 workflow 能够动态调整。
* **响应事件**：代理通过订阅相关 topics，并在事件发生时进行处理，从而适应实时变化。

借助消息传递，workflow 保持模块化与可扩展性，代理专注于各自的角色，同时无缝参与到更大的系统中。

#### Message Bus 与 Topics

message bus 是管理 topics 与消息投递的中央系统。代理通过 message bus 收发消息：

* **发布消息**：代理向特定 topic 发布消息，使所有已订阅的代理都能获取这些信息。
* **订阅 Topics**：代理订阅与其角色相关的 topics，确保只接收其所需的消息。
* **广播更新**：多个代理可以订阅同一 topic，从而对共享事件或更新作出响应。

#### 为什么在代理式 workflow 中使用 pub/sub 消息传递？

在事件驱动的代理式 workflow 中，pub/sub 消息传递至关重要，因为它能够：

* **解耦组件**：代理发布消息时无需了解哪些代理会接收，从而促进模块化和可扩展的设计。
* **支持实时通信**：消息在事件发生时即被投递，使代理能够即时作出反应。
* **促进协作**：多个代理可以订阅同一 topic，便于共享更新或分担职责。
* **支持可扩展性**：无论你是在添加新代理、扩展 workflow，还是适应不断变化的需求，message bus 都能让通信轻松扩展。代理之间保持松耦合，使 workflow 能够在不中断的情况下演进。

这一消息框架确保代理高效运行、workflow 保持灵活，并且系统能够动态扩展。
