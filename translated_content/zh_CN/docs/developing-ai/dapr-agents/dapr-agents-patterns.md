---
type: docs
title: "代理模式"
linkTitle: "代理模式"
weight: 50
description: "构建代理系统常用设计模式与使用场景"
aliases:
  - /zh-hans/developing-applications/dapr-agents/dapr-agents-patterns
---

Dapr Agents 简化了代理系统的实现，从简单的增强型大型语言模型 (LLM) 到企业环境中的完全自主代理。以下各节描述了可以从 Dapr Agents 中受益的多种应用模式。

## 概述

代理系统使用反思、工具使用、规划和多代理协作等设计模式，以取得比单次提示交互更好的结果。与其把“代理”看作二元分类，不如把系统看作具有不同程度代理性的连续谱，这样更有用。

这一范围从只提示模型一次的简单 workflow，到能够以更高自主性执行多个迭代步骤的复杂系统。
有两种基本的架构方法：

* **workflow**：通过预定义代码路径编排 LLM 和工具的系统（更具规范性）
* **代理**：LLM 动态引导自身流程和工具使用的系统（更具自主性）

一端是可预测的 workflow，具有明确定义的决策路径和确定性结果；另一端是能够动态制定自身策略的 AI 代理。虽然完全自主的代理看似吸引人，但对于定义明确的任务，workflow 通常能提供更好的可预测性和一致性。这与企业对可靠性和可维护性的要求相符。

{{< diagram agents-patterns-overview >}}

本文档中的模式从增强型 LLM 开始，然后介绍能够提供可预测性和控制力的基于 workflow 的方法，最后转向更具自主性的模式。每种模式都针对特定的使用场景，并在确定性结果与自主性之间提供不同的权衡。

本文中的大多数模式都可以与[钩子系统]({{< ref dapr-agents-hooks.md >}})结合使用。钩子系统是 `DurableAgent` 上的一组小型回调，可以让你记录、改写、缓存或阻止单个工具调用和 LLM 调用，而无需修改代理主体。人在回路正是通过钩子实现的（参见下文的[人在回路](#人在回路)一节），它们同样适用于其他任何模式。

## 增强型 LLM

增强型 LLM 模式是任何代理系统的基础 building block。它通过记忆和工具等外部能力增强语言模型，为 AI 驱动的应用提供基础而强大的支撑。

{{< diagram name="agents-augmented-llm" width="60" >}}

此模式适用于需要增强型 LLM、但不需要复杂编排或自主决策的场景。增强型 LLM 可以访问外部工具、维护对话历史，并在多次交互中提供一致的响应。

**使用场景：**
- 记住用户偏好的个人助手
- 访问产品信息的客户支持代理
- 检索和分析信息的研究工具

**使用 Dapr Agents 实现：**

```python
from dapr_agents import DurableAgent, tool

@tool
def search_flights(destination: str) -> List[FlightOption]:
    """Search for flights to the specified destination."""
    # 模拟的航班数据（实际应用中会是外部 API 调用）
    return [
        FlightOption(airline="SkyHighAir", price=450.00),
        FlightOption(airline="GlobalWings", price=375.50)
    ]

# 创建带有记忆和工具的代理
travel_planner = DurableAgent(
    name="TravelBuddy",
    role="Travel Planner Assistant",
    instructions=["Remember destinations and help find flights"],
    tools=[search_flights],
)
```

Dapr Agents 自动处理：
- **代理配置** - 通过角色和指令进行简单配置，以引导 LLM 的行为
- **记忆持久化** - 代理管理对话记忆
- **工具集成** - `@tool` 装饰器负责输入验证、类型转换和输出格式化

任何代理系统的基础 building block 都是增强型 LLM——一种通过记忆、工具和检索等外部能力增强的语言模型。在 Dapr Agents 中，它由 `DurableAgent` 类表示。虽然简单的 `Agent` 类也存在，但**自 v1.0.0-rc.1 起已弃用**；`DurableAgent` 是所有新开发推荐的选择。增强型 LLM 能力本身通常不足以应对复杂的企业场景，因此它们通常会与 workflow 编排结合使用，为多步骤流程提供结构、可靠性和协调。

## 提示链

提示链模式将复杂需求分解为一系列步骤，每次 LLM 调用都处理前一步的输出，从而应对复杂的任务。此模式可以更好地控制整个流程、在步骤之间进行验证，并使每个步骤更加专业化。

{{< diagram agents-prompt-chaining >}}

**使用场景：**
- 内容生成（先创建大纲，然后扩展，再进行审核）
- 多阶段分析（将复杂分析分解为顺序步骤）
- 质量保证 workflow（在处理步骤之间添加验证）

**使用 Dapr Agents 实现：**

```python
from dapr_agents import DaprWorkflowContext, workflow

@workflow(name='travel_planning_workflow')
def travel_planning_workflow(ctx: DaprWorkflowContext, user_input: str):
    # 第 1 步：使用简单提示提取目的地（不使用代理）
    destination_text = yield ctx.call_activity(extract_destination, input=user_input)
    
    # 关卡：检查目的地是否有效
    if "paris" not in destination_text.lower():
        return "Unable to create itinerary: Destination not recognized or supported."
    
    # 第 2 步：使用规划代理（具备工具）生成大纲
    travel_outline = yield ctx.call_activity(create_travel_outline, input=destination_text)
    
    # 第 3 步：使用行程代理（无工具）扩展为详细计划
    detailed_itinerary = yield ctx.call_activity(expand_itinerary, input=travel_outline)
    
    return detailed_itinerary
```

该实现展示了三种不同的方法：
- **基于简单提示的任务**（不使用代理）
- **基于代理的任务**（无工具）
- **基于代理的任务**（有工具）

Dapr Agents 的 workflow 编排提供：
- **代码即 workflow** - 以对开发者友好的方式定义任务
- **workflow 持久化** - 长时间运行的链式任务在进程重启后依然存在
- **混合执行** - 轻松混合使用提示、代理调用以及配备工具的代理

## 路由

路由模式通过对输入进行分类，并将其引导到专门的后续任务，来处理多样化的请求类型。这样可以实现关注点分离，并为不同类型的查询创建专门的处理专家。

{{< diagram name="agents-routing" width="65" >}}

**使用场景：**
- 资源优化（将简单查询发送到较小的模型）
- 多语言支持（将查询路由到特定语言的处理程序）
- 客户支持（将不同类型的查询引导到专门的处理程序）
- 内容创作（将写作任务路由给主题专家）
- 混合 LLM 系统（为不同任务使用不同的模型）

**使用 Dapr Agents 实现：**

```python
@workflow(name="travel_assistant_workflow")
def travel_assistant_workflow(ctx: DaprWorkflowContext, input_params: dict):
    user_query = input_params.get("query")
    
    # 使用 LLM 对查询类型进行分类
    query_type = yield ctx.call_activity(classify_query, input={"query": user_query})

    # 路由到相应的专门处理程序
    if query_type == QueryType.ATTRACTIONS:
        response = yield ctx.call_activity(
            handle_attractions_query,
            input={"query": user_query}
        )
    elif query_type == QueryType.ACCOMMODATIONS:
        response = yield ctx.call_activity(
            handle_accommodations_query,
            input={"query": user_query}
        )
    elif query_type == QueryType.TRANSPORTATION:
        response = yield ctx.call_activity(
            handle_transportation_query,
            input={"query": user_query}
        )
    else:
        response = "I'm not sure how to help with that specific travel question."
        
    return response
```

Dapr 方法的优势包括：
- **熟悉的控制流** - 使用标准的编程 if-else 结构进行路由
- **可扩展性** - 控制流可以轻松扩展，以满足未来的需求
- **LLM 驱动的分类** - 使用 LLM 动态对查询进行分类

## 并行化

并行化模式使问题的多个维度能够同时处理，并以编程方式汇总输出。对于包含可并发处理的独立子任务的复杂任务，此模式可以提高效率。

{{< diagram name="agents-parallelization" width="65" >}}

**使用场景：**
- 复杂研究（并行处理某个主题的不同方面）
- 多方面规划（同时制定计划的各个要素）
- 产品分析（并行分析产品的不同方面）
- 内容创作（同时生成文档的多个章节）

**使用 Dapr Agents 实现：**

```python
@workflow(name="travel_planning_workflow")
def travel_planning_workflow(ctx: DaprWorkflowContext, input_params: dict):
    destination = input_params.get("destination")
    preferences = input_params.get("preferences")
    days = input_params.get("days")

    # 并行处理旅行计划的三个方面
    parallel_tasks = [
        ctx.call_activity(research_attractions, input={
            "destination": destination, 
            "preferences": preferences, 
            "days": days
        }),
        ctx.call_activity(recommend_accommodations, input={
            "destination": destination, 
            "preferences": preferences, 
            "days": days
        }),
        ctx.call_activity(suggest_transportation, input={
            "destination": destination, 
            "preferences": preferences, 
            "days": days
        })
    ]

    # 等待所有并行任务完成
    results = yield wfapp.when_all(parallel_tasks)
    
    # 将结果汇总为最终计划
    final_plan = yield ctx.call_activity(create_final_plan, input={"results": results})
    
    return final_plan
```

使用 Dapr 进行并行化的好处包括：
- **简化的并发** - 处理并行任务的复杂编排
- **自动同步** - 等待所有并行任务完成
- **workflow 持久性** - 整个并行过程都是持久且可恢复的

## 编排器-工作者

对于高度复杂的任务，当子任务的数量和性质无法预先确定时，编排器-工作者模式提供了强大的解决方案。此模式包含一个中央编排器 LLM，它动态地分解任务、将任务委派给工作者 LLM，并综合它们的结果。

{{< diagram agents-orchestrator-workers >}}

与之前 workflow 预先定义的模式不同，编排器会根据具体输入动态确定 workflow。

**使用场景：**
- 跨越多个文件的软件开发任务
- 从多个来源收集信息的研究
- 评估复杂问题不同方面的商业分析
- 结合多个领域专业内容的创作

**使用 Dapr Agents 实现：**

```python
@workflow(name="orchestrator_travel_planner")
def orchestrator_travel_planner(ctx: DaprWorkflowContext, input_params: dict):
    travel_request = input_params.get("request")

    # 第 1 步：编排器分析请求并确定所需任务
    plan_result = yield ctx.call_activity(
        create_travel_plan,
        input={"request": travel_request}
    )

    tasks = plan_result.get("tasks", [])

    # 第 2 步：使用工作者 LLM 执行每个任务
    worker_results = []
    for task in tasks:
        task_result = yield ctx.call_activity(
            execute_travel_task,
            input={"task": task}
        )
        worker_results.append({
            "task_id": task["task_id"],
            "result": task_result
        })

    # 第 3 步：将结果综合为一份连贯的旅行计划
    final_plan = yield ctx.call_activity(
        synthesize_travel_plan,
        input={
            "request": travel_request,
            "results": worker_results
        }
    )

    return final_plan
```

编排器-工作者模式的优势包括：
- **动态规划** - 编排器可以根据输入动态创建子任务
- **工作者隔离** - 每个工作者专注于解决问题的某一个特定方面
- **简化的综合** - 最终的综合步骤将结果合并为连贯的输出

## 评估器-优化器

质量通常需要通过迭代和细化来实现。评估器-优化器模式实现了双 LLM 流程：一个模型生成响应，另一个模型在迭代循环中提供评估和反馈。

{{< diagram name="agents-evaluator-optimizer" width="65" >}}

**使用场景：**
- 需要遵循特定风格指南的内容创作
- 需要细致理解与表达的翻译
- 满足特定需求并处理边界情况的代码生成
- 需要多轮信息收集和细化的复杂搜索

**使用 Dapr Agents 实现：**

```python
@workflow(name="evaluator_optimizer_travel_planner")
def evaluator_optimizer_travel_planner(ctx: DaprWorkflowContext, input_params: dict):
    travel_request = input_params.get("request")
    max_iterations = input_params.get("max_iterations", 3)
    
    # 生成初始旅行计划
    current_plan = yield ctx.call_activity(
        generate_travel_plan,
        input={"request": travel_request, "feedback": None}
    )

    # 评估循环
    iteration = 1
    meets_criteria = False

    while iteration <= max_iterations and not meets_criteria:
        # 评估当前计划
        evaluation = yield ctx.call_activity(
            evaluate_travel_plan,
            input={"request": travel_request, "plan": current_plan}
        )

        score = evaluation.get("score", 0)
        feedback = evaluation.get("feedback", [])
        meets_criteria = evaluation.get("meets_criteria", False)
        
        # 若满足标准或达到最大迭代次数则停止
        if meets_criteria or iteration >= max_iterations:
            break

        # 根据反馈优化计划
        current_plan = yield ctx.call_activity(
            generate_travel_plan,
            input={"request": travel_request, "feedback": feedback}
        )

        iteration += 1

    return {
        "final_plan": current_plan,
        "iterations": iteration,
        "final_score": score
    }
```

使用 Dapr 实现此模式的好处包括：
- **迭代改进循环** - 管理生成与评估之间的反馈循环
- **质量标准** - 能够清晰定义什么是可接受的输出
- **最大迭代控制** - 通过强制执行迭代上限，防止无限循环

## 人在回路

有些代理操作的影响过大，不宜完全交由模型决定。人在回路（Human-in-the-Loop，HITL）模式会在特定的工具调用（或其他高风险步骤）上暂停代理，并等待人工批准或拒绝后再继续。由于等待发生在 Dapr workflow 内部，暂停时长可以是几秒、几小时或几天——人工响应后，workflow 会从暂停处恢复。

在 Dapr Agents 中，此模式通过**钩子系统**实现：在 `DurableAgent` 上注册 `before_tool_call` 钩子，并为需要人工确认的步骤返回 `RequireApproval(...)`。框架会将审批请求事件发布到你配置的投递通道（HTTP、Dapr pub/sub 或 workflow 事件），通过 `wait_for_external_event` 挂起 workflow，并在收到批准或拒绝的响应后恢复执行；若超时，则自动拒绝。

**使用场景：**
- 批准破坏性操作（删除数据、删除表、超过阈值的退款）
- 对涉及策略敏感的工具调用进行合规把关（个人信息访问、架构变更）
- 在受监管环境中，执行前审查代理的计划
- 需要由领域专家确认某一步骤的长时间、多步骤流程

**使用 Dapr Agents 实现：**

```python
from dapr_agents import DurableAgent, Hooks
from dapr_agents.hooks import ToolHookContext, HookDecision, Proceed, RequireApproval
from dapr_agents.agents.configs import AgentApprovalConfig, AgentExecutionConfig


def gate_deletions(ctx: ToolHookContext) -> HookDecision:
    if ctx.step_name.startswith("delete_"):
        return RequireApproval(
            timeout_seconds=3600,
            instructions=f"Confirm deletion: {ctx.payload}",
        )
    return Proceed()


approval = AgentApprovalConfig(
    pubsub_name="messagepubsub",
    topic="agent-approval-requests",
    default_timeout_seconds=300,
)

agent = DurableAgent(
    name="OpsAgent",
    role="Operations Assistant",
    llm=...,
    tools=[delete_old_data, ...],
    hooks=Hooks(before_tool_call=[gate_deletions]),
    execution=AgentExecutionConfig(approval=approval),
)
```

使用 Dapr 实现此模式的好处包括：
- **持久化暂停** - workflow 在等待期间可以承受崩溃与重启；审批结果持久化在 state store 中
- **可选的投递通道** - 可以通过 HTTP（`GET /hitl/approvals`、`POST /hitl/approvals/{id}/respond`）、Dapr pub/sub 或直接的 workflow 事件进行审批
- **超时保护** - 若人工长时间未响应，待处理的请求会自动拒绝，因此 workflow 不会永久挂起
- **可与其他模式组合** - 人在回路是一个钩子决策，因此可以干净地叠加在上述任何模式之上

有关完整的钩子 API（包括其他决策 `Skip`、`Mutate`、`Deny` 以及 LLM 级别的钩子），请参阅[钩子与人在回路]({{< ref dapr-agents-hooks.md >}})。

## Durable Agent

在代理谱系的另一端，Durable Agent 模式代表了一种从基于 workflow 方法的转变。它不再使用预定义的步骤，而是由一个自主代理根据对目标的理解，自行规划步骤并执行。

企业应用通常需要超越内存能力的持久执行和可靠性。Dapr 的 `DurableAgent` 类帮助你借助 workflow 的可靠性实现自主代理，因为这些代理在幕后由 Dapr workflow 支持。`DurableAgent` 通过为代理执行增加持久性，扩展了基础的 `Agent` 类。

{{< diagram name="agents-stateful-llm" width="60" >}}

此模式不仅仅持久化消息历史——它会为每次交互动态创建带有持久化活动的 workflow，其中 LLM 调用和工具执行都可靠地存储在 Dapr 的 state store 中。这使其非常适合对可靠性和持久性要求极高的环境。

Durable Agent 还支持“无头代理”方式，即无需直接用户交互即可运行的自主系统。Dapr 的 Durable Agent 暴露 REST 和 pub/sub API，因此非常适合由其他应用或 external event 触发的长时间运行操作。


**使用场景：**
- 可能需要数分钟甚至数天才能完成的长时间运行任务
- 跨多个服务运行的分布式系统
- 处理复杂多会话工单的客户支持
- 每一步都包含 LLM 智能的业务流程
- 处理日程安排和信息查询的个人助手
- 由外部系统触发的自主后台进程

**使用 Dapr Agents 实现：**

```python
import asyncio

from dapr_agents import DurableAgent
from dapr_agents.agents.configs import (
    AgentExecutionConfig,
    AgentMemoryConfig,
    AgentPubSubConfig,
    AgentRegistryConfig,
    AgentStateConfig,
)
from dapr_agents.memory import ConversationDaprStateMemory
from dapr_agents.storage.daprstores.stateservice import StateStoreService
from dapr_agents.workflow.runners import AgentRunner

travel_planner = DurableAgent(
    name="TravelBuddy",
    role="Travel Planner",
    goal="Help users find flights and remember preferences",
    instructions=[
        "Find flights to destinations",
        "Remember user preferences",
        "Provide clear flight info",
    ],
    tools=[search_flights],
    pubsub=AgentPubSubConfig(
        pubsub_name="messagepubsub",
        agent_topic="travel.requests",
        broadcast_topic="travel.broadcast",
    ),
    state=AgentStateConfig(
        store=StateStoreService(store_name="workflowstatestore"),
    ),
    registry=AgentRegistryConfig(
        store=StateStoreService(store_name="registrystatestore"),
        team_name="travel-team",
    ),
    execution=AgentExecutionConfig(max_iterations=3),
    memory=AgentMemoryConfig(
        store=ConversationDaprStateMemory(
            store_name="conversationstore",
            session_id="travel-session",
        )
    ),
)

async def main():
    runner = AgentRunner()
    try:
        result = await runner.run(
            travel_planner,
            payload={"task": "Find weekend flights to Paris"},
        )
        print(result)
    finally:
        runner.shutdown(travel_planner)

asyncio.run(main())
```
该实现遵循 Dapr 的 sidecar 架构模型，所有基础设施相关的问题均由 Dapr runtime 处理：
- **持久化记忆** - 代理状态存储在 Dapr 的 state store 中，进程崩溃后依然存在
- **workflow 编排** - 所有代理交互都通过 Dapr 的 workflow 系统进行管理
- **服务暴露** - `AgentRunner.serve()` 暴露 REST 端点（例如 `POST /agent/run`），用于调度代理的 `@workflow_entry`
- **pub/sub 输入/输出** - `AgentRunner.subscribe()` 扫描代理中的 `@message_router` 方法，并通过模式验证将配置的主题连接起来

Durable Agent 实现了“无头代理”的概念，即在没有直接用户交互的情况下运行的自主系统。根据场景，你可以：

1. **以编程方式运行**持久化 workflow（如上所示的 `runner.run`）
2. **订阅**代理到主题，使其他服务能够通过 pub/sub 触发它（`runner.subscribe`）
3. **以服务形式暴露**代理，将其部署在 FastAPI 应用之后，并提供内置的 `/run` 与状态端点（`runner.serve`）

这些选项使异步处理请求变得简单，并能无缝集成到更大的分布式系统中。

### 重试策略

Durable Agent 支持 Dapr workflow 的 `RetryPolicy`，即其 `WorkflowRetryPolicy`：

- `max_attempts`：workflow 操作的最大重试次数。默认值为 1（不重试）。可通过设置 `DAPR_API_MAX_RETRIES` 环境变量覆盖默认值。
- `initial_backoff_seconds`：初始退避时长（秒）。默认值为 5 秒。
- `max_backoff_seconds`：最大退避时长（秒）。默认值为 30 秒。
- `backoff_multiplier`：指数退避的乘数。默认值为 1.5。
- `retry_timeout`：所有重试的总超时时间（秒）。

所有字段都是可选的。可以在实例化 Durable Agent 时传入：

```python
from dapr_agents.agents.configs import WorkflowRetryPolicy
travel_planner = DurableAgent(
    name="TravelBuddy",
    ...
    retry_policy=WorkflowRetryPolicy(
        max_attempts=5,
        initial_backoff_seconds=10,
        max_backoff_seconds=60,
        backoff_multiplier=2.0,
        retry_timeout=300,
    )
    ...
)
```

## 选择正确的模式

从简单的代理 workflow 到完全自主的代理，这一路径代表了将 LLM 集成到应用程序中的一系列不同方法。不同的使用场景需要不同程度的代理性与控制力：

- **从更简单的模式开始**，如增强型 LLM 和提示链，适用于可预测性至关重要的明确定义任务
- **随着需求增长逐步转向更复杂的模式**，如并行化和编排器-工作者
- **仅在开放式任务中考虑完全自主的代理**，前提是灵活性带来的好处超过了严格控制的需要
