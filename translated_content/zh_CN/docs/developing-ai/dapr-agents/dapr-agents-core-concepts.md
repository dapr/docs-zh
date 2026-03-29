---
type: docs
title: "核心概念"
linkTitle: "核心概念"
weight: 40
description: "了解 Dapr Agents 的核心概念"
aliases:
  - /developing-applications/dapr-agents/dapr-agents-core-concepts
---

Dapr Agents 提供了一种结构化的方式来构建和编排使用 LLMs 的应用程序，而不会陷入基础设施细节，并提供持久性保证。主要目标是通过抽象使用 LLMs、工具、内存管理和分布式系统的复杂性来实现 AI 开发，使开发人员能够专注于其 AI 应用程序的业务逻辑。在此框架中，Agents 是基本的构建块。

## Agents

Agents 是由大型语言模型（LLMs）驱动的自主单元，旨在执行任务、推理问题并在工作流中协作。作为智能构建块，agents 将推理与工具集成、内存和协作功能相结合，以实现期望的结果。

![Concepts Agents](/images/dapr-agents/concepts-agents.png)

Dapr Agents 提供两种 agent 类型，每种都针对不同的用例设计：

### Agent

{{% alert title="已弃用" color="warning" %}}
`Agent` 类自 **v1.0.0-rc.1 起** 已弃用，并将在未来版本中删除。请对所有新开发使用 [`DurableAgent`](#durable-agent)。
{{% /alert %}}

`Agent` 类是一个对话 agent，使用语言模型管理工具调用和对话。它提供内置对话内存的同步执行。

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

此示例展示如何创建具有工具集成的简单 agent。agent 同步处理查询，并使用 Dapr State Store API 在多次交互中维护对话上下文。

### Durable Agent

`DurableAgent` 类是一个基于工作流的 agent，它使用 Dapr Workflows 扩展了标准 Agent，以实现长时间运行、容错和持久的执行。它提供持久的状态管理、自动重试机制和跨故障的确定性执行。

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
此示例演示了创建在后台自主运行的基于工作流的 agent。`AgentRunner` 为您调度工作流，等待完成，并确保 agent 可以被触发一次并在重启后继续执行。

**关键特性：**
- 使用 Dapr Workflows 的基于工作流的执行
- 跨会话和故障的持久工作流状态管理
- 自动重试和恢复机制
- 具有检查点的确定性执行
- 内置消息路由和 agent 通信
- `AgentRunner` 的 DurableAgents 模式：临时运行（`runner.run(...)`）、发布订阅订阅（`runner.subscribe(...)`）和 FastAPI 服务（`runner.serve(...)`）
- 支持复杂的编排模式和多 agent 协作

**何时使用：**
- 跨时间或系统的多步骤工作流
- 需要保证进度跟踪和状态持久性的任务
- 操作可能暂停、失败或需要恢复而不丢失数据的场景
- 复杂的 agent 编排和多 agent 协作
- 需要容错和可扩展性的生产系统

总结：

| Agent 类型      | 内存类型             | 执行方式 | 交互模式         | 状态 |
|-----------------|-------------------------|-----------|--------------------------|--------|
| `Agent`         | 内存或持久化 | 临时 | 嵌入式                 | **已弃用**（v1.0.0-rc.1） |
| `DurableAgent`  | 持久化              | 持久化   | 发布订阅 / HTTP / 嵌入式 | 推荐 |


- 常规 `Agent`：交互是同步的——您发送对话提示并立即接收响应。对话可以存储在内存中或持久化，但执行是临时的，不会在重启后继续存在。

- `DurableAgent`（支持工作流）：交互是异步的——您触发一次 agent，它会在后台自主运行直到完成。对话状态和执行都会持久化，并且可以在故障或重启后恢复。


## 核心 Agent 功能
Agent 系统是一个分布式系统，需要各种行为和支持基础设施。

### LLM 集成

Dapr Agents 提供了统一的接口来连接 LLM 推理 API。这种抽象使开发人员能够无缝地将其 agents 与前沿的语言模型集成，以进行推理和决策。框架包括针对不同提供商和模态的多个 LLM 客户端：

- `DaprChatClient`：通过 Dapr 的 Conversation API 进行 LLM 交互的统一 API，具有内置安全性（作用域、密钥、PII 混淆）、弹性（超时、重试、断路器）以及通过 OpenTelemetry 和 Prometheus 的可观测性
- `OpenAIChatClient`：对 OpenAI 模型的全面支持，包括聊天、嵌入和音频
- `HFHubChatClient`：用于支持聊天和嵌入的 Hugging Face 模型
- `NVIDIAChatClient`：用于支持本地推理和聊天的 NVIDIA AI Foundation 模型
- `ElevenLabs`：对语音和声音功能的支持

### 提示词灵活性

Dapr Agents 支持灵活的提示词模板来塑造 agent 行为和推理。用户可以在提示词中定义占位符，从而能够为推理调用动态输入上下文。通过利用带有 [Jinja 模板](https://jinja.palletsprojects.com/en/stable/templates/)和 Python f-string 格式化的提示词格式化，用户可以包含循环、条件和变量，从而对提示词的结构和内容进行精确控制。这种灵活性确保 LLM 响应能够适应当前的任务，为各种用例提供模块化和适应性。

### 结构化输出

Dapr Agents 中的 agents 利用结构化输出功能（例如 [OpenAI 的 Function Calling](https://platform.openai.com/docs/guides/function-calling)）来生成可预测且可靠的结果。这些输出遵循 [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/release-notes.html) 和 [OpenAPI Specification v3.1.0](https://github.com/OAI/OpenAPI-Specification) 标准，从而实现轻松的互操作性和工具集成。

```python
# 定义我们的数据模型
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
这演示了 LLM 如何根据架构生成结构化数据。Pydantic 模型（Dog）指定了预期的确切结构和数据类型，而 response_format 参数指示 LLM 返回与模型匹配的数据，从而确保下游处理的一致性和可预测性。


### 工具调用

工具调用是自主 agent 设计中的一个基本模式，允许 AI agents 根据用户输入动态地与外部工具交互。Agents 动态选择适合给定任务的工具，使用 LLM 分析需求并选择最佳操作。

```python
@tool(args_model=GetWeatherSchema)
def get_weather(location: str) -> str:
    """Get weather information based on location."""
    import random
    temperature = random.randint(60, 80)
    return f"{location}: {temperature}F."
```

每个工具都有描述性的文档字符串，帮助 LLM 理解何时使用它。`@tool` 装饰器将函数标记为工具，而 Pydantic 模型（`GetWeatherSchema`）定义了用于结构化验证的输入参数。

![Tool Call Flow](/images/dapr-agents/concepts_agents_toolcall_flow.png)

1. 用户提交指定任务和可用工具的查询。
2. LLM 分析查询并选择适合该任务的工具。
3. LLM 提供包含工具唯一 ID、名称和参数的结构化 JSON 输出。
4. AI agent 解析 JSON，使用提供的参数执行工具，并将结果作为工具消息发送回。
5. 然后，LLM 在用户的上下文中总结工具的执行结果，以提供全面的最终响应。

这通过 LLM 参数知识直接支持，并通过 [Function Calling](https://platform.openai.com/docs/guides/function-calling) 增强，确保工具被高效准确地调用。

#### 工具执行模式

当 LLM 在单轮对话中返回多个工具调用时，`DurableAgent` 可以通过 `AgentExecutionConfig.tool_execution_mode` 配置两种模式执行它们：

| 模式 | 枚举值 | 行为 |
|------|-----------|----------|
| **并行**（默认） | `ToolExecutionMode.PARALLEL` | 来自单个 LLM 轮次的所有工具调用都会被并发调度和等待。当工具相互独立时，延迟最佳。 |
| **顺序** | `ToolExecutionMode.SEQUENTIAL` | 工具调用按 LLM 返回的顺序逐个执行。当工具具有依赖于同一轮次中早期调用结果的副作用时，请使用此模式。 |

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
Dapr Agents 包含对 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的内置支持，使 agents 能够通过标准化接口动态发现和调用外部工具。使用提供的 MCPClient，agents 可以通过三种传输选项连接到 MCP 服务器：stdio 用于本地开发，sse 用于远程或分布式环境，以及通过可流式传输的 HTTP 传输。

```python
client = MCPClient()
await client.connect_sse("local", url="http://localhost:8000/sse")

# 将 MCP 工具转换为 AgentTool 列表
tools = client.get_all_tools()
```

连接后，MCP 客户端从服务器获取所有可用工具，并准备好在 agent 的工具集中立即使用。这使得 agents 能够合并由外部进程公开的功能（例如本地 Python 脚本或远程服务），而无需硬编码或预加载。Agents 可以在运行时调用这些工具，根据活动 MCP 服务器提供的内容扩展其行为。


### 内存
Agents 在交互之间保留上下文，从而增强其提供连贯和自适应响应的能力。内存选项范围从用于管理聊天历史的简单内存列表，到用于语义搜索的向量数据库，还与 [Dapr 状态存储](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/)集成，为来自 28 种不同状态存储提供商的高级用例提供可扩展和持久的内存。


```python
from dapr_agents import Agent, DurableAgent
from dapr_agents.agents.configs import AgentMemoryConfig
from dapr_agents.memory import (
    ConversationDaprStateMemory,
    ConversationListMemory,
    ConversationVectorMemory,
)

# 1. ConversationListMemory（简单内存）- 默认
memory_list = ConversationListMemory()

# 2. ConversationVectorMemory（向量存储）
memory_vector = ConversationVectorMemory(
    vector_store=your_vector_store_instance,
    distance_metric="cosine",
)

# 3. ConversationDaprStateMemory（Dapr 状态存储）通过 AgentMemoryConfig
durable_memory = AgentMemoryConfig(
    store=ConversationDaprStateMemory(
        store_name="historystore",  # Dapr 组件名称
        session_id="my-session",
    )
)

# 与常规 Agent 一起使用（直接传递内存实例）
agent = Agent(
    name="MyAgent",
    role="Assistant",
    memory=memory_list,
)

# 与 DurableAgent 一起使用（传递 AgentMemoryConfig）
travel_planner = DurableAgent(
    name="TravelBuddy",
    memory=durable_memory,
    # ... 其他配置 ...
)
```
当未指定内存时，`ConversationListMemory` 是默认的内存实现。它为开发和测试在 Python 列表中提供快速、临时的存储。Dapr 的内存实现（均在 `dapr_agents.memory` 中找到）可互换，允许您在无需修改 agent 逻辑或部署模型的情况下在它们之间切换。

| 内存实现 | 类型 | 持久化 | 搜索 | 用例 |
|---|---|---|---|---|
| `ConversationListMemory`（默认） | 内存 | ❌ | 线性 | 开发 |
| `ConversationVectorMemory` | 向量存储 | ✅ | 语义 | RAG/AI 应用 |
| `ConversationDaprStateMemory` | Dapr 状态存储 | ✅ | 查询 | 生产环境 |

`ConversationVectorMemory` 可以由任何支持的向量存储实现支持：

| 向量存储 | 类 | 后端 | 说明 |
|---|---|---|---|
| Chroma | `ChromaVectorStore` | ChromaDB | 内存或持久化；无需额外基础设施 |
| PostgreSQL | `PostgresVectorStore` | pgvector 扩展 | 需要带有 `pgvector` 的 PostgreSQL |
| Redis | `RedisVectorStore` | Redis Stack / 带搜索的 Redis | 需要 `redisvl` |

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


### Agents 作为工具

Dapr Agents 支持在 `DurableAgent` 推理循环中将其他 agents（无论是 Dapr Agents 还是第三方 agent 框架）作为工具调用。这使得父 agent 能够将子任务委托给专门的子 agents，并在无需使用发布订阅消息代理的情况下组合多 agent 系统。

在同一注册表中注册的 agents 可自动作为工具使用。这包括调用第三方框架 agents。或者，使用 `dapr_agents.tool.workflow` 中的 `agent_to_tool` 进行显式连接、跨应用路由或调用来自其他框架的 agents：

```python
from dapr_agents.tool.workflow import agent_to_tool

# 将单独的 agent 作为工具调用
aragorn_tool = agent_to_tool(
    "aragorn",
    description="Military Strategy. Goal: Lead the forces of Gondor.",
    target_app_id="aragorn-app",
)
# 在 DurableAgent 中将 agent 用作工具
frodo = DurableAgent(
    name="frodo",
    role="Ring Bearer",
    goal="Carry the One Ring to Mordor",
    tools=[aragorn_tool],
    ...
)
```

当 LLM 调用这些工具之一时，Dapr Agents 将目标 agent 的工作流调度为 `DurableAgent`（子工作流）并返回结果——透明地处理跨应用路由和结果编组。

| 参数 | 描述 |
|---|---|
| `agent_name` | 目标 agent 的名称（用于派生工具名称和工作流 ID） |
| `description` | 在工具架构中向父 LLM 显示的人类可读描述 |
| `target_app_id` | 用于跨应用路由的 Dapr app-id；`None` 表示进程内调用 |
| `framework` | 非 Dapr-Agents 目标的框架名称（例如 `"openai"`、`"langgraph"`） |
| `workflow_name` | 显式的 Dapr 工作流名称；优先于 `framework` |

有关完整的工作实现，请参阅 [Agents 作为工具示例](https://github.com/dapr/dapr-agents/tree/main/examples/08-agents-as-tools)。


### Agent Runner

`AgentRunner` 将 DurableAgents 连接到三种互补的托管模式：

1. **`run`** – 直接从 Python（CLI、测试、notebook）触发持久工作流，并可选择等待完成。
2. **`subscribe`** – 自动注册 agent 上每个用 `@message_router` 装饰的处理程序（包括 `DurableAgent.agent_workflow`），以便配置主题上的 CloudEvents 根据其 `message_model` 进行验证并调度为工作流运行。
3. **`serve`** – 通过将 `subscribe` 与 FastAPI 路由注册和自动启动的 Uvicorn 服务器相结合，将 agent 托管为 Web 服务。默认情况下，它公开 `POST /agent/run`（调度 `@workflow_entry`）和 `GET /agent/instances/{instance_id}`（获取工作流状态），但您可以提供自己的 FastAPI 应用或自定义主机/端口/路径。

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

下面的代码片段重用此 `travel_planner` 实例来说明每种模式。

#### 1. 使用 `runner.run(...)` 进行临时执行

当您想直接从 Python 代码（测试、CLI、notebook 等）触发持久工作流时，使用 `run`。运行器定位 agent 的 `@workflow_entry` 并调度它。`.run()` 命令是一个阻塞调用，触发 agent 并等待其完成。 

```python
result = await runner.run(
    travel_planner,
    payload={"task": "Plan a 3-day trip to Paris"},
)
print(result)
```

此模式非常适合同步自动化，或者当您需要以编程方式捕获最终响应时。对于即发即忘的实例，请传递 `wait=False`。

#### 2. 使用 `runner.subscribe(...)` 进行发布订阅订阅

`subscribe` 扫描 agent 中每个用 `@message_router` 标记的方法——包括内置的 `agent_workflow`——并使用 `AgentPubSubConfig` 中定义的主题和架构自动注册必要的 Dapr 订阅。每个传入的 CloudEvent 都会在运行器调度工作流条目之前根据声明的 `message_model`（例如，`TriggerAction`）进行验证。

```python
runner.subscribe(travel_planner)
await wait_for_shutdown()
```

添加您自己的 `@message_router` 方法以支持额外的主题或广播频道——运行器将自动发现它们并将消息路由到相应的处理程序。使用辅助函数（如来自 `dapr_agents.workflow.utils.core` 的 `wait_for_shutdown()`）来保持进程存活，直到您停止它。

#### 3. 使用 `runner.serve(...)` 提供 FastAPI 服务

`serve` 是将 DurableAgent 作为 Web 服务运行的一行方式。它首先调用 `subscribe(...)`，然后启动 FastAPI 应用（除非您传递自己的应用），并提供两个默认端点：

- `POST /agent/run`：根据 agent 的 `@workflow_entry` 签名验证 JSON 主体并调度新的工作流实例。
- `GET /agent/instances/{instance_id}`：代理工作流状态查询（包括有效负载，如果请求）。

```python
runner.serve(
    travel_planner,
    port=8001,
)
`

由于工作流是持久的，即使 agent 继续在后台工作，`/run` 端点也会立即响应实例 ID。您可以将生成的 FastAPI 路由挂载到更大的应用程序中，也可以让 `serve` 为独立部署运行自己的 Uvicorn 循环。


## 多 Agent 系统 (MAS)

虽然构建一个能够处理许多任务的完全自主 agent 很诱人，但在实践中，将其分解为配备适当工具和指令的专门 agents，然后协调多个 agents 之间的交互会更有效。

多 Agent 系统（MAS）将工作流执行分布到多个协调的 agents，以高效地实现共享目标。这种方法称为 agent 编排，与单一 agent 设计相比，提供了更好的专业化、可扩展性和可维护性。

![Agent Orchestration](/images/dapr-agents/home_concepts_principles_workflows.png)

Dapr Agents 通过 [Dapr Workflows](https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/) 和 [Dapr PubSub](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/) 支持两种主要的编排方法：

- **确定性基于工作流的编排** - 通过预定义的序列和决策点提供清晰、可重复的流程
- **事件驱动编排** - 通过 agents 之间基于消息的协调实现动态、自适应的协作

这两种方法都利用中央编排器来协调多个专门的 agents，每个 agents 处理特定任务或领域，确保在整个系统中高效的任务分配和无缝协作。

## 确定性工作流

工作流是结构化的流程，其中 LLM agents 和工具按预定义的序列协作以完成复杂的任务。与完全自主 agents 独立做出所有决策不同，工作流在工作流定义的结构和可预测性、LLM agents 的智能和灵活性以及 Dapr 工作流引擎的可靠性和持久性之间取得平衡。

这种方法特别适合关键业务应用程序，在这些应用程序中，您既需要 LLM 的智能，又需要传统软件系统的可靠性。

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

在这里，`call_child_workflow` 用于调用两个 Dapr Agents 的工作流，并将一个的输出作为另一个的输入传递。这要求 `DurableAgent` 运行方式如下：

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

### 工作流模式

工作流通过结构化编排实现各种代理模式，包括提示链接、路由、并行化、编排器-工作者、评估器-优化器、人工在环等。有关这些模式的详细实现和示例，请参阅[模式文档]({{< ref dapr-agents-patterns.md >}})。

### 消息路由器工作流

`@message_router` 装饰器将工作流直接绑定到 Dapr 发布订阅主题，以便每个经过验证的消息都会自动调度工作流实例。这种模式（在消息路由器快速入门中使用）允许您将 CloudEvent 有效负载推送到主题上，并让支持 LLM 的活动立即接管。

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

在启动期间，调用 `register_message_routes(targets=[blog_workflow], dapr_client=client)` 以自动配置订阅、架构验证和工作流调度。这使工作流定义成为编排和事件入口的单一真实来源。

### 工作流与持久 Agents

DurableAgent 和基于工作流的 agent 编排都在底层使用 Dapr 工作流来确保持久性和可靠性，但它们在如何确定控制流方面有所不同。

| 方面 | 工作流 | 持久 Agents           |
|--------|-----------|------------------------------------|
| 控制 | 开发人员定义的流程 | Agent 确定下一步骤        |
| 可预测性 | 更高 | 更低                              |
| 灵活性 | 整体结构固定，步骤内灵活 | 完全灵活                |
| 可靠性 | 非常高（工作流引擎保证） | 非常高（底层 agent 实现保证）    |
| 复杂性 | 结构化的工作流模式 | 动态、灵活的执行路径     |
| 用例 | 业务流程、受监管领域 | 开放式研究、创意任务 |

关键区别在于控制流确定：对于 DurableAgent，底层工作流由 LLM 的规划决策动态创建，完全在单个 agent 上下文中执行。相比之下，对于确定性工作流，开发人员明确定义一个或多个 LLM 交互之间的协调，提供跨多个任务或 agents 的结构化编排。


## 事件驱动编排
事件驱动 agent 编排使多个专门的 agents 能够通过异步 [发布订阅消息传递](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/)进行协作。这种方法通过独立扩展、通过服务隔离实现的弹性以及职责的清晰分离，提供了强大的协作问题解决、并行处理和专门 agents 之间的职责划分。

### 核心参与者
这种多代理协调系统中的核心参与者如下。

#### 持久 Agents

每个 agent 都作为具有自己生命周期的独立服务运行，配置为启用发布订阅的标准 DurableAgent：

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

编排器通过选择合适的 agents、管理交互顺序和跟踪进度来协调 agents 之间的交互和管理对话流程。Dapr Agents 提供三种编排策略：随机、轮询和基于 LLM 的编排。

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

基于 LLM 的编排器使用智能 agent 选择进行上下文感知决策，而随机和轮询为简单的用例提供替代的协调策略。运行器使编排器作为 Dapr 应用或 HTTP 服务在线，以便客户端可以通过主题或 REST 调用发布任务。

由于 `DurableAgent.agent_workflow` 和上述编排器都使用 `@message_router(message_model=TriggerAction)` 装饰，因此 `runner.subscribe(...)` 会自动连接在 `AgentPubSubConfig` 中声明的主题，并在调度 `@workflow_entry` 之前根据期望的架构验证每个传入的 CloudEvent。您可以将额外的消息路由器（每个都有自己的 `message_model`）添加到同一个 agent；运行器将在下次启动时自动发现它们并自动扩展订阅列表。

### 通信流程

Agents 通过事件驱动的发布订阅系统进行通信，该系统支持异步通信、解耦的架构、可扩展的交互和可靠的消息传递。典型的协作流程涉及客户端查询提交、编排器驱动的 agent 选择、agent 响应处理，以及直到任务完成的迭代协调。

这种方法对于需要多个专业知识领域的复杂问题解决、来自不同视角的创造性协作、角色扮演场景以及大型任务的分布式处理特别有效。

### 消息传递如何工作

消息传递将工作流中的 agents 连接起来，实现实时通信和协调。它充当事件驱动交互的主干，确保 agents 无需直接连接即可有效协作。

通过消息传递，agents 可以：

* **跨任务协作**：Agents 交换消息以分享更新、广播事件或传递任务结果。
* **编排工作流**：通过发布的消息触发和协调任务，使工作流能够动态调整。
* **响应事件**：Agents 通过订阅相关主题和处理发生的事件来适应实时变化。

通过使用消息传递，工作流保持模块化和可扩展性，agents 专注于其特定角色，同时无缝参与更广泛的系统。

#### 消息总线和主题

消息总线是管理主题和消息传递的中央系统。Agents 与消息总线交互以发送和接收消息：

* **发布消息**：Agents 将消息发布到特定主题，使所有订阅的 agents 都能获得信息。
* **订阅主题**：Agents 订阅与其角色相关的主题，确保只接收所需的消息。
* **广播更新**：多个 agents 可以订阅同一主题，从而允许它们对共享事件或更新采取行动。

#### 为什么 Agent 工作流使用发布订阅消息传递？

发布订阅消息传递对于事件驱动的 agent 工作流至关重要，因为它：

* **解耦组件**：Agents 发布消息，无需知道哪些 agents 将接收它们，从而促进模块化和可扩展的设计。
* **实现实时通信**：消息在事件发生时传递，允许 agents 瞬间响应。
* **促进协作**：多个 agents 可以订阅同一主题，从而轻松共享更新或划分职责。
* **实现可扩展性**：消息总线确保通信能够无缝扩展，无论您是添加新的 agents、扩展工作流还是适应不断变化的需求。Agents 保持松散耦合，允许工作流在不中断的情况下发展。

这种消息传递框架确保 agents 高效运行、工作流保持灵活、系统能够动态扩展。
