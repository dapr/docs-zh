---
type: docs
title: "核心概念"
linkTitle: "核心概念"
weight: 40
description: "了解 Dapr Agents 的核心概念"
aliases:
  - /developing-applications/dapr-agents/dapr-agents-core-concepts
---

Dapr Agents 提供了一种结构化方式，用于构建和编排使用 LLM 的应用，让你无需陷入基础设施细节，同时具备持久性保证。它的核心目标，是通过抽象掉 LLM、工具、内存管理以及分布式系统的复杂性，使开发者能够把注意力集中在 AI 应用的业务逻辑上。在这一框架中，agent 是最基础的构建块。

## Agents

Agent 是由大语言模型（LLM）驱动的自治单元，旨在执行任务、对问题进行推理，并在工作流中协作。作为智能构建块，agent 将推理能力与工具集成、内存和协作特性结合起来，以达成目标结果。

![Agents 概念图](/images/dapr-agents/concepts-agents.png)

Dapr Agents 提供两类 agent，分别适用于不同场景：

### Agent

{{% alert title="已弃用" color="warning" %}}
`Agent` 类**自 v1.0.0-rc.1 起已弃用**，未来版本将被移除。所有新开发都应使用 [`DurableAgent`](#durable-agent)。
{{% /alert %}}

`Agent` 类是一种会话式 agent，使用语言模型管理工具调用与对话。它提供同步执行，并内置对话记忆。

```python
@tool
def my_weather_func() -> str:
    """获取当前天气。"""
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

这个示例展示了如何创建一个带工具集成的简单 agent。该 agent 会同步处理查询，并借助 Dapr State Store API 在多次交互之间保持对话上下文。

### Durable Agent

`DurableAgent` 类是基于工作流的 agent。它在标准 Agent 的基础上结合了 Dapr Workflows，用于长时间运行、容错且具备持久性的执行。它提供持久状态管理、自动重试机制，以及跨故障场景的确定性执行。

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
这个示例演示了如何创建一个由工作流支撑、可在后台自主运行的 agent。`AgentRunner` 会为你调度工作流、等待其完成，并确保该 agent 即使只被触发一次，也能在重启后继续执行。

**关键特性：**
- 基于 Dapr Workflows 的工作流执行
- 跨会话与故障场景的持久工作流状态管理
- 自动重试与恢复机制
- 带检查点的确定性执行
- 内置消息路由与 agent 通信能力
- 适用于 DurableAgent 的 `AgentRunner` 模式：临时执行（`runner.run(...)`）、pub/sub 订阅（`runner.subscribe(...)`）和 FastAPI 服务（`runner.serve(...)`）
- 支持复杂编排模式与多 agent 协作

**适用场景：**
- 跨越时间或多个系统的多步骤工作流
- 需要保证进度跟踪与状态持久化的任务
- 操作可能暂停、失败，或需要在不丢数据的情况下恢复的场景
- 复杂的 agent 编排与多 agent 协作
- 需要容错与可扩展性的生产系统

总结如下：

| Agent 类型 | 内存类型 | 执行 | 交互模式 | 状态 |
|-----------------|-------------------------|-----------|--------------------------|--------|
| `Agent`         | 内存或持久化 | 临时 | 嵌入式 | **已弃用**（v1.0.0-rc.1） |
| `DurableAgent`  | 持久化 | 持久 | PubSub / HTTP / 嵌入式 | 推荐 |


- 普通 `Agent`：交互是同步的——你发送对话提示并立即获得响应。对话可以保存在内存中，也可以持久化，但执行本身是临时的，重启后不会继续。

- `DurableAgent`（由工作流支撑）：交互是异步的——你只需触发一次 agent，它会在后台自主运行直到完成。对话状态和执行过程都会被持久化，并且可以在失败或重启后恢复。


## Core Agent Features
Agent 系统本质上是分布式系统，需要多种行为模式及配套基础设施。

### LLM Integration

Dapr Agents 提供统一接口，用于连接 LLM 推理 API。借助这一抽象，开发者可以把 agent 无缝接入先进语言模型，用于推理与决策。框架内置了适配不同提供方与模态的多个 LLM 客户端：

- `DaprChatClient`：通过 Dapr 的 Conversation API 提供统一的 LLM 交互接口，内置安全能力（scopes、secrets、PII 混淆）、弹性能力（超时、重试、熔断器），并通过 OpenTelemetry 与 Prometheus 提供可观测性
- `OpenAIChatClient`：全面支持 OpenAI 模型，包括聊天、embeddings 与音频
- `HFHubChatClient`：面向 Hugging Face 模型，支持聊天与 embeddings
- `NVIDIAChatClient`：面向 NVIDIA AI Foundation 模型，支持本地推理与聊天
- `ElevenLabs`：支持语音与声音能力

### Prompt Flexibility

Dapr Agents 支持灵活的提示模板，以塑造 agent 的行为和推理方式。用户可以在提示中定义占位符，为推理调用动态注入上下文。借助 [Jinja 模板](https://jinja.palletsprojects.com/en/stable/templates/) 与 Python f-string 格式化，用户可以加入循环、条件和变量，从而精确控制提示的结构与内容。这种灵活性保证了 LLM 的响应能够贴合当前任务，同时为各种场景带来模块化与适配性。

### Structured Outputs

Dapr Agents 中的 agent 利用结构化输出能力（如 [OpenAI 的 Function Calling](https://platform.openai.com/docs/guides/function-calling)）生成可预测且可靠的结果。这些输出遵循 [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12/release-notes.html) 与 [OpenAPI Specification v3.1.0](https://github.com/OAI/OpenAPI-Specification) 标准，因而更易于互操作与工具集成。

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
这个示例展示了 LLM 如何按照某个 schema 生成结构化数据。Pydantic 模型（Dog）定义了期望的精确结构与数据类型，而 `response_format` 参数会指示 LLM 返回与该模型匹配的数据，从而为后续处理提供一致且可预测的输出。


### Tool Calling

工具调用是自主 agent 设计中的关键模式，它允许 AI agent 基于用户输入，动态与外部工具交互。agent 会为特定任务动态选择合适工具，利用 LLM 分析需求并决定最佳动作。

```python
@tool(args_model=GetWeatherSchema)
def get_weather(location: str) -> str:
    """根据地点获取天气信息。"""
    import random
    temperature = random.randint(60, 80)
    return f"{location}: {temperature}F."
```

每个工具都应带有清晰的 docstring，帮助 LLM 理解何时应使用它。`@tool` 装饰器将函数标记为工具，而 Pydantic 模型（`GetWeatherSchema`）则定义了用于结构化校验的输入参数。

![工具调用流程](/images/dapr-agents/concepts_agents_toolcall_flow.png)

1. 用户提交查询，说明任务以及可用工具。
2. LLM 分析查询，并为当前任务选择合适工具。
3. LLM 返回结构化 JSON 输出，其中包含工具的唯一 ID、名称和参数。
4. AI agent 解析该 JSON，用提供的参数执行工具，并把结果作为 tool message 发回。
5. 随后，LLM 会在用户上下文中总结工具执行结果，给出完整的最终响应。

这一能力既来自 LLM 的参数化知识，也通过 [Function Calling](https://platform.openai.com/docs/guides/function-calling) 得到增强，从而确保工具被高效且准确地调用。

#### Tool Execution Modes

当 LLM 在单轮中返回多个工具调用时，`DurableAgent` 可通过 `AgentExecutionConfig.tool_execution_mode` 配置两种执行模式：

| 模式 | 枚举值 | 行为 |
|------|-----------|----------|
| **并行**（默认） | `ToolExecutionMode.PARALLEL` | 来自单个 LLM 回合的所有工具调用会被并发分派并等待完成。适用于彼此独立的工具，可获得最佳延迟表现。 |
| **顺序** | `ToolExecutionMode.SEQUENTIAL` | 工具调用会按照 LLM 返回的顺序逐个执行。适用于存在副作用、且依赖同一轮前序结果的场景。 |

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


### MCP Support
Dapr Agents 内置了对 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) 的支持，使 agent 能通过标准化接口动态发现并调用外部工具。借助提供的 MCPClient，agent 可以通过三种传输方式连接 MCP 服务器：用于本地开发的 stdio、面向远程或分布式环境的 sse，以及可流式传输的 HTTP。

```python
client = MCPClient()
await client.connect_sse("local", url="http://localhost:8000/sse")

# 将 MCP 工具转换为 AgentTool 列表
tools = client.get_all_tools()
```

一旦连接完成，MCP 客户端会从服务器拉取全部可用工具，并将其准备为可立即在 agent 工具集内使用的形式。这使 agent 无需硬编码或预加载，即可纳入外部进程暴露的能力——例如本地 Python 脚本或远程服务。agent 可以在运行时调用这些工具，并根据当前 MCP 服务器所提供的能力扩展自身行为。


### Memory
Agent 会在多次交互之间保留上下文，从而提升响应的一致性与适应性。内存选项范围很广：从用于管理聊天历史的简单内存列表，到用于语义检索的向量数据库，再到与 [Dapr 状态存储](https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-get-save-state/) 集成的持久化内存，可覆盖 28 种状态存储提供程序的高级场景。


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

# 3. 通过 AgentMemoryConfig 使用 ConversationDaprStateMemory（Dapr 状态存储）
durable_memory = AgentMemoryConfig(
    store=ConversationDaprStateMemory(
        store_name="historystore",  # Dapr 组件名称
        session_id="my-session",
    )
)

# 与普通 Agent 一起使用（直接传入 memory 实例）
agent = Agent(
    name="MyAgent",
    role="Assistant",
    memory=memory_list,
)

# 与 DurableAgent 一起使用（传入 AgentMemoryConfig）
travel_planner = DurableAgent(
    name="TravelBuddy",
    memory=durable_memory,
    # ... 其他配置 ...
)
```
`ConversationListMemory` 是未显式指定内存时的默认实现。它使用 Python 列表提供快速、临时的存储，适合开发与测试。Dapr 提供的这些内存实现（都位于 `dapr_agents.memory`）彼此可互换，你无需修改 agent 逻辑或部署模型，就可以在它们之间切换。

| 内存实现 | 类型 | 持久化 | 搜索 | 使用场景 |
|---|---|---|---|---|
| `ConversationListMemory`（默认） | 内存 | ❌ | 线性 | 开发 |
| `ConversationVectorMemory` | 向量存储 | ✅ | 语义 | RAG / AI 应用 |
| `ConversationDaprStateMemory` | Dapr 状态存储 | ✅ | 查询 | 生产环境 |

`ConversationVectorMemory` 可由任意受支持的向量存储实现作为后端：

| 向量存储 | 类 | 后端 | 说明 |
|---|---|---|---|
| Chroma | `ChromaVectorStore` | ChromaDB | 可内存或持久化；无需额外基础设施 |
| PostgreSQL | `PostgresVectorStore` | pgvector 扩展 | 需要启用 `pgvector` 的 PostgreSQL |
| Redis | `RedisVectorStore` | Redis Stack / Redis with Search | 需要 `redisvl` |

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

Dapr Agents 支持在 `DurableAgent` 的推理循环中，把其他 agent——无论是 Dapr Agents 自身，还是第三方 agent 框架——作为工具来调用。这样，父 agent 可以把子任务委派给专门的子 agent，并在不依赖 pub/sub 消息代理的情况下组合出多 agent 系统。

在同一注册表中注册的 agent，会自动作为可用工具出现。这同样适用于调用第三方框架中的 agent。或者，你也可以使用 `dapr_agents.tool.workflow` 中的 `agent_to_tool`，以进行显式接线、跨应用路由，或调用其他框架中的 agent：

```python
from dapr_agents.tool.workflow import agent_to_tool

# 将独立 agent 作为一次工具调用来调用
aragorn_tool = agent_to_tool(
    "aragorn",
    description="Military Strategy. Goal: Lead the forces of Gondor.",
    target_app_id="aragorn-app",
)
# 在 DurableAgent 中把一个 agent 当作工具使用
frodo = DurableAgent(
    name="frodo",
    role="Ring Bearer",
    goal="Carry the One Ring to Mordor",
    tools=[aragorn_tool],
    ...
)
```

当 LLM 调用这些工具之一时，Dapr Agents 会把目标 agent 的工作流调度为一个 `DurableAgent`（子工作流），并返回结果——同时透明地处理跨应用路由与结果编组。

| 参数 | 说明 |
|---|---|
| `agent_name` | 目标 agent 的名称（用于派生工具名和工作流 ID） |
| `description` | 展示给父级 LLM 的工具 schema 中的人类可读描述 |
| `target_app_id` | 跨应用路由时使用的 Dapr app-id；若为 `None`，则表示进程内调用 |
| `framework` | 面向非 Dapr Agents 目标时的框架名称（例如 `"openai"`、`"langgraph"`） |
| `workflow_name` | 显式指定的 Dapr 工作流名称；优先级高于 `framework` |

完整可运行示例见 [Agents as Tools 示例](https://github.com/dapr/dapr-agents/tree/main/examples/08-agents-as-tools)。


### Agent Runner

`AgentRunner` 为 DurableAgent 提供三种互补的托管模式：

1. **`run`**：直接从 Python 触发持久工作流（适合 CLI、测试、notebook），并可选择等待完成。
2. **`subscribe`**：自动为 agent 上所有使用 `@message_router` 装饰的方法（包括 `DurableAgent.agent_workflow`）完成注册，使配置主题上的 CloudEvent 在通过 `message_model` 校验后被调度为工作流运行。
3. **`serve`**：把 `subscribe` 与 FastAPI 路由注册和自动启动的 Uvicorn 服务器组合起来，将 agent 作为 Web 服务托管。默认暴露 `POST /agent/run`（调度 `@workflow_entry`）和 `GET /agent/instances/{instance_id}`（获取工作流状态），你也可以传入自己的 FastAPI 应用，或自定义 host / port / path。

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

下面的代码片段会复用这个 `travel_planner` 实例，分别说明每种模式。

#### 1. Ad-hoc execution with `runner.run(...)`

当你希望直接从 Python 代码（测试、CLI、notebook 等）触发持久工作流时，可使用 `run`。runner 会定位 agent 的 `@workflow_entry` 并进行调度。`.run()` 是阻塞调用：它会触发 agent，并等待其完成。

```python
result = await runner.run(
    travel_planner,
    payload={"task": "Plan a 3-day trip to Paris"},
)
print(result)
```

这种模式适合同步自动化场景，或你需要以编程方式拿到最终响应时使用。若想触发后立即返回，可传入 `wait=False`。

#### 2. Pub/Sub subscriptions with `runner.subscribe(...)`

`subscribe` 会扫描 agent 上所有带有 `@message_router` 的方法——包括内置的 `agent_workflow`——并根据 `AgentPubSubConfig` 中定义的主题与 schema，自动注册所需的 Dapr 订阅。每个传入的 CloudEvent 都会先依据声明的 `message_model`（例如 `TriggerAction`）校验，再由 runner 调度工作流入口。

```python
runner.subscribe(travel_planner)
await wait_for_shutdown()
```

你可以增加自己的 `@message_router` 方法，以支持更多主题或广播通道——runner 会自动发现并把消息路由到正确处理器。可配合 `wait_for_shutdown()`（位于 `dapr_agents.workflow.utils.core`）等辅助方法，让进程持续运行，直到你手动停止。

#### 3. FastAPI services with `runner.serve(...)`

`serve` 是把 DurableAgent 作为 Web 服务运行的一行式方法。它会先调用 `subscribe(...)`，再启动一个 FastAPI 应用（除非你传入自定义应用），并默认提供两个端点：

- `POST /agent/run`：根据 agent 的 `@workflow_entry` 签名校验 JSON 请求体，并调度新的工作流实例。
- `GET /agent/instances/{instance_id}`：代理查询工作流状态（如有需要，也可包含 payload）。

```python
runner.serve(
    travel_planner,
    port=8001,
)
```

由于工作流具备持久性，`/run` 端点会立即返回实例 ID，即使 agent 仍在后台继续工作。你既可以把生成的 FastAPI 路由挂载到更大的应用中，也可以让 `serve` 自己运行 Uvicorn 循环，用于独立部署。


## Multi-agent Systems (MAS)

虽然构建一个完全自主、能处理各种任务的 agent 很诱人，但在实践中，更有效的做法通常是把问题拆分为多个具备适当工具与指令的专门 agent，再去协调它们之间的交互。

多 agent 系统（MAS）会把工作流执行分配给多个协同 agent，以高效达成共同目标。这个过程通常被称为 agent 编排。与单体式 agent 设计相比，它能带来更好的专业化、可扩展性与可维护性。

![Agent 编排](/images/dapr-agents/home_concepts_principles_workflows.png)

Dapr Agents 主要通过 [Dapr Workflows](https://docs.dapr.io/developing-applications/building-blocks/workflow/workflow-overview/) 与 [Dapr PubSub](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/) 支持两种编排方式：

- **基于确定性工作流的编排** —— 提供清晰、可重复的流程，具有预定义步骤与决策点
- **事件驱动编排** —— 通过基于消息的协作，使 agent 之间形成动态、自适应配合

这两种方式都会使用中心编排器来协调多个专门 agent，每个 agent 负责特定任务或领域，从而实现高效任务分发与系统级协同。

## Deterministic Workflows

工作流是结构化过程，其中 LLM agent 与工具按照预定义顺序协作，以完成复杂任务。与完全自主、独立做出所有决策的 agent 不同，工作流在工作流定义中提供结构性与可预测性，在 LLM agent 中提供智能与灵活性，在 Dapr 工作流引擎中提供可靠性与持久性。

这种方式尤其适合业务关键型应用：你既需要 LLM 的智能，也需要传统软件系统的可靠性。

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

这里使用 `call_child_workflow` 调用两个 Dapr Agent 的工作流，并把前一个的输出作为后一个的输入。为此，`DurableAgent` 需要按如下方式运行：

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

### Workflow Patterns

工作流能够通过结构化编排实现多种 agent 模式，包括 Prompt Chaining、Routing、Parallelization、Orchestrator-Workers、Evaluator-Optimizer、Human-in-the-loop 等。若要查看这些模式的详细实现与示例，请参见 [Patterns 文档]({{< ref dapr-agents-patterns.md >}})。

### Message Router Workflows

`@message_router` 装饰器会把工作流直接绑定到 Dapr Pub/Sub 主题上，使每条通过校验的消息都会自动调度一个工作流实例。这一模式也用于 message-router quickstart：你只需把 CloudEvent 负载推送到主题，后续就会立即由 LLM 支撑的活动接手。

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

启动期间，可调用 `register_message_routes(targets=[blog_workflow], dapr_client=client)`，以自动配置订阅、schema 校验与工作流调度。这让工作流定义同时成为编排与事件入口的单一事实来源。

### Workflows vs. Durable Agents

DurableAgent 与基于工作流的 agent 编排，底层都使用 Dapr 工作流来获得持久性与可靠性，但两者在控制流由谁决定这一点上存在差异。

| 方面 | Workflows | Durable Agents           |
|--------|-----------|------------------------------------|
| 控制方式 | 开发者定义流程 | Agent 决定下一步        |
| 可预测性 | 更高 | 更低                              |
| 灵活性 | 整体结构固定、步骤内灵活 | 完全灵活                |
| 可靠性 | 很高（由工作流引擎保证） | 很高（由底层 agent 实现保证）    |
| 复杂度 | 结构化工作流模式 | 动态、灵活的执行路径     |
| 使用场景 | 业务流程、受监管领域 | 开放式研究、创造性任务 |

关键差异在于控制流的决定方式：使用 DurableAgent 时，底层工作流由 LLM 的规划决策动态生成，且整个过程在单个 agent 上下文中执行；而在确定性工作流中，开发者会显式定义一个或多个 LLM 交互之间的协调方式，从而为多任务或多 agent 提供结构化编排。


## Event-Driven Orchestration
事件驱动的 agent 编排，使多个专门 agent 能通过异步 [Pub/Sub 消息传递](https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/) 进行协作。这种方式带来了强大的协同解题能力、并行处理能力，以及在多个专门 agent 之间划分职责的能力，并通过服务隔离获得弹性，通过独立扩缩容获得灵活性。

### Core Participants
多 agent 协调系统中的核心参与者如下。

#### Durable Agents

每个 agent 都作为独立服务运行，拥有自己的生命周期，并以启用 pub/sub 的标准 DurableAgent 进行配置：

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

#### Orchestrator

编排器负责协调 agent 之间的交互并管理对话流，包括选择合适的 agent、管理交互顺序以及跟踪进度。Dapr Agents 提供三种编排策略：Random、RoundRobin 和基于 LLM 的编排。

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

基于 LLM 的编排器会使用智能 agent 选择，实现上下文感知的决策；而 Random 与 RoundRobin 则为更简单的场景提供替代协调策略。runner 会把编排器作为 Dapr 应用或 HTTP 服务持续运行，使客户端能够通过 topic 发布任务，或通过 REST 调用它。

由于 `DurableAgent.agent_workflow` 与上述编排器都使用了 `@message_router(message_model=TriggerAction)` 装饰，`runner.subscribe(...)` 会自动根据 `AgentPubSubConfig` 中声明的主题完成接线，并在调度 `@workflow_entry` 之前，对每个传入的 CloudEvent 做 schema 校验。你还可以为同一个 agent 添加额外的 message router（每个都可拥有自己的 `message_model`）；runner 下次启动时会自动发现它们，并扩展订阅列表。

### Communication Flow

Agent 通过事件驱动的 pub/sub 系统通信，这种机制支持异步通信、解耦架构、可扩展交互与可靠消息投递。典型协作流程包括：客户端提交查询、编排器选择 agent、agent 处理并返回响应，以及在任务完成前持续进行迭代协调。

这种方式尤其适合需要多领域专长的复杂问题求解、来自不同视角的创造性协作、角色扮演场景，以及大任务的分布式处理。

### How Messaging Works

消息传递把工作流中的 agent 连接起来，支持实时通信与协调。它是事件驱动交互的骨干，使 agent 无需直接连接，也能高效协同工作。

通过消息传递，agent 可以：

* **跨任务协作**：agent 交换消息以共享更新、广播事件或传递任务结果。
* **编排工作流**：任务通过已发布消息被触发和协调，使工作流能够动态调整。
* **响应事件**：agent 通过订阅相关主题并处理实时事件，适应不断变化的环境。

借助消息传递，工作流可以保持模块化与可扩展性；各 agent 专注自身职责，同时无缝参与更大的系统。

#### Message Bus and Topics

消息总线是负责管理主题与消息分发的中心系统。agent 通过消息总线发送和接收消息：

* **发布消息**：agent 将消息发布到指定主题，使所有订阅该主题的 agent 都能获得信息。
* **订阅主题**：agent 订阅与自身职责相关的主题，从而只接收它们真正需要的消息。
* **广播更新**：多个 agent 可以订阅同一主题，以便对共享事件或更新作出响应。

#### Why Pub/Sub Messaging for Agentic Workflows?

对于事件驱动的 agent 工作流而言，Pub/Sub 消息传递之所以关键，是因为它：

* **解耦组件**：agent 发布消息时无需知道由哪些 agent 接收，从而推动模块化与可扩展设计。
* **实现实时通信**：消息会在事件发生时送达，使 agent 能立即作出反应。
* **促进协作**：多个 agent 可以订阅同一主题，便于共享更新或拆分职责。
* **支持可扩展性**：消息总线能够让通信自然扩展，无论你是在增加新 agent、扩展工作流，还是适应不断变化的需求。agent 始终保持松耦合，使工作流能够平滑演进而不被打断。

这一消息传递框架保证了 agent 高效运行、工作流保持灵活，并使系统能够动态扩展。
