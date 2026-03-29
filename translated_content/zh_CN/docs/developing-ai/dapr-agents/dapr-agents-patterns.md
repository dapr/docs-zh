---
type: docs
title: "代理模式"
linkTitle: "代理模式"
weight: 50
description: "构建代理系统常用设计模式与使用场景"
aliases:
  - /developing-applications/dapr-agents/dapr-agents-patterns
---

Dapr Agents 简化了代理系统的实现，从简单的增强型 LLM 到企业环境中的完全自主代理。以下各节描述了可以从 Dapr Agents 中受益的多种应用模式。

## 概述

代理系统使用设计模式（如反思、工具使用、规划和多代理协作）来实现比简单单次提示交互更好的结果。与其将"代理"视为二元分类，不如将系统视为具有不同程度代理性的系统更有用。

这一范围从简单的工作流（仅提示模型一次）到能够以更大自主性执行多个迭代步骤的复杂系统。 有两种基本的架构方法：

* **工作流**：通过预定义代码路径编排 LLM 和工具的系统（更具规范性）
* **代理**：LLM 动态引导自身流程和工具使用的系统（更具自主性）

一端是可预测的工作流，具有明确定义的决策路径和确定性结果。另一端是能够动态引导自身策略的 AI 代理。虽然完全自主的代理看似吸引人，但工作流通常为明确定义的任务提供更好的可预测性和一致性。这与企业对可靠性和可维护性的要求一致。

<img src="/images/dapr-agents/agents-patterns-overview.png" width=1200 style="padding-bottom:15px;">

本文档中的模式从增强型 LLM 开始，然后介绍基于工作流的方法（提供可预测性和控制），再转向更具自主性的模式。每个模式都针对特定的使用场景，并在确定性结果和自主性之间提供不同的权衡。

## 增强型 LLM

增强型 LLM 模式是任何代理系统的基础构建块。它通过外部能力（如记忆和工具）增强语言模型，为 AI 驱动应用提供基本但强大的基础。

<img src="/images/dapr-agents/agents-augmented-llm.png" width=600 alt="Diagram showing how the augmented LLM pattern works">

此模式非常适合需要增强型 LLM 但不需要复杂编排或自主决策的场景。增强型 LLM 可以访问外部工具、维护对话历史，并在交互中提供一致的响应。

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
    # Mock flight data (would be an external API call in a real app)
    return [
        FlightOption(airline="SkyHighAir", price=450.00),
        FlightOption(airline="GlobalWings", price=375.50)
    ]

# Create agent with memory and tools
travel_planner = DurableAgent(
    name="TravelBuddy",
    role="Travel Planner Assistant",
    instructions=["Remember destinations and help find flights"],
    tools=[search_flights],
)
```

Dapr Agents 自动处理：
- **代理配置** - 通过角色和指令进行简单配置以引导 LLM 行为
- **记忆持久化** - 代理管理对话记忆
- **工具集成** - `@tool` 装饰器处理输入验证、类型转换和输出格式化

任何代理系统的基础构建块都是增强型 LLM——一种通过外部能力（如记忆、工具和检索）增强的语言模型。在 Dapr Agents 中，这由 `DurableAgent` 类表示。虽然简单的 `Agent` 类也存在，但**自 v1.0.0-rc.1 起已弃用**；`DurableAgent` 是所有新开发推荐的选项。增强型 LLM 能力本身通常不足以应对复杂的企业场景，因此它们通常与工作流编排结合使用，为多步骤流程提供结构、可靠性和协调。

## 提示链

提示链模式通过将任务分解为一系列步骤来应对复杂需求，其中每个 LLM 调用处理前一个的输出。此模式允许更好地控制整个流程、步骤之间的验证以及每个步骤的专业化。

<img src="/images/dapr-agents/agents-prompt-chaining.png" width=800 alt="Diagram showing how the prompt chaining pattern works">

**使用场景：**
- 内容生成（先创建大纲，然后扩展，然后审核）
- 多阶段分析（将复杂分析分解为顺序步骤）
- 质量保证工作流（在处理步骤之间添加验证）

**使用 Dapr Agents 实现：**

```python
from dapr_agents import DaprWorkflowContext, workflow

@workflow(name='travel_planning_workflow')
def travel_planning_workflow(ctx: DaprWorkflowContext, user_input: str):
    # Step 1: Extract destination using a simple prompt (no agent)
    destination_text = yield ctx.call_activity(extract_destination, input=user_input)
    
    # Gate: Check if destination is valid
    if "paris" not in destination_text.lower():
        return "Unable to create itinerary: Destination not recognized or supported."
    
    # Step 2: Generate outline with planning agent (has tools)
    travel_outline = yield ctx.call_activity(create_travel_outline, input=destination_text)
    
    # Step 3: Expand into detailed plan with itinerary agent (no tools)
    detailed_itinerary = yield ctx.call_activity(expand_itinerary, input=travel_outline)
    
    return detailed_itinerary
```

该实现展示了三种不同的方法：
- **基于简单提示的任务**（无代理）
- **基于代理的任务**（无工具）
- **基于代理的任务**（有工具）

Dapr Agents 的工作流编排提供：
- **代码即工作流** - 以开发者友好的方式定义任务
- **工作流持久化** - 长时间运行的链式任务在进程重启后依然存在
- **混合执行** - 轻松混合提示、代理调用和配备工具的代理

## 路由

路由模式通过分类输入并将其引导到专门的后续任务来处理多样化的请求类型。这允许关注点分离，并为不同类型的查询创建专门的处理专家。

<img src="/images/dapr-agents/agents-routing.png" width=600 alt="Diagram showing how the routing pattern works">

**使用场景：**
- 资源优化（将简单查询发送到较小的模型）
- 多语言支持（将查询路由到语言特定的处理程序）
- 客户支持（将不同查询类型引导到专门的处理程序）
- 内容创建（将写作任务路由到主题专家）
- 混合 LLM 系统（为不同任务使用不同模型）

**使用 Dapr Agents 实现：**

```python
@workflow(name="travel_assistant_workflow")
def travel_assistant_workflow(ctx: DaprWorkflowContext, input_params: dict):
    user_query = input_params.get("query")
    
    # Classify the query type using an LLM
    query_type = yield ctx.call_activity(classify_query, input={"query": user_query})

    # Route to the appropriate specialized handler
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
- **熟悉的控制流** - 使用标准编程 if-else 结构进行路由
- **可扩展性** - 控制流可以轻松扩展以满足未来需求
- **LLM 驱动的分类** - 使用 LLM 动态分类查询

## 并行化

并行化模式使问题的多个维度能够同时处理，输出以编程方式聚合。此模式提高了具有可并发处理的独立子任务的复杂任务的效率。

<img src="/images/dapr-agents/agents-parallelization.png" width=600 alt="Diagram showing how the parallelization pattern works">

**使用场景：**
- 复杂研究（并行处理主题的不同方面）
- 多方面规划（同时创建计划的各个元素）
- 产品分析（并行分析产品的不同方面）
- 内容创建（同时生成文档的多个部分）

**使用 Dapr Agents 实现：**

```python
@workflow(name="travel_planning_workflow")
def travel_planning_workflow(ctx: DaprWorkflowContext, input_params: dict):
    destination = input_params.get("destination")
    preferences = input_params.get("preferences")
    days = input_params.get("days")

    # Process three aspects of the travel plan in parallel
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

    # Wait for all parallel tasks to complete
    results = yield wfapp.when_all(parallel_tasks)
    
    # Aggregate results into final plan
    final_plan = yield ctx.call_activity(create_final_plan, input={"results": results})
    
    return final_plan
```

使用 Dapr 进行并行化的好处包括：
- **简化的并发** - 处理并行任务的复杂编排
- **自动同步** - 等待所有并行任务完成
- **工作流持久性** - 整个并行过程是持久且可恢复的

## 编排器-工作者

对于高度复杂的任务，当子任务的数量和性质无法预先知道时，编排器-工作者模式提供了一个强大的解决方案。此模式具有一个中央编排器 LLM，它动态分解任务、将任务委托给工作者 LLM，并综合它们的结果。

<img src="/images/dapr-agents/agents-orchestrator-workers.png" width=600 alt="Diagram showing how the orchestrator-workers pattern works">

与之前预定义工作流的模式不同，编排器根据特定输入动态确定工作流。

**使用场景：**
- 跨越多个文件的软件开发任务
- 从多个来源收集信息的研究
- 评估复杂问题不同方面的业务分析
- 结合各个领域专门内容的创作

**使用 Dapr Agents 实现：**

```python
@workflow(name="orchestrator_travel_planner")
def orchestrator_travel_planner(ctx: DaprWorkflowContext, input_params: dict):
    travel_request = input_params.get("request")

    # Step 1: Orchestrator analyzes request and determines required tasks
    plan_result = yield ctx.call_activity(
        create_travel_plan,
        input={"request": travel_request}
    )

    tasks = plan_result.get("tasks", [])

    # Step 2: Execute each task with a worker LLM
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

    # Step 3: Synthesize the results into a cohesive travel plan
    final_plan = yield ctx.call_activity(
        synthesize_travel_plan,
        input={
            "request": travel_request,
            "results": worker_results
        }
    )

    return final_plan
```

Dapr 用于编排器-工作者模式的优势包括：
- **动态规划** - 编排器可以根据输入动态创建子任务
- **工作者隔离** - 每个工作者专注于解决问题的一个特定方面
- **简化的综合** - 最终综合步骤将结果组合成连贯的输出

## 评估器-优化器

质量通常通过迭代和细化来实现。评估器-优化器模式实现了一个双 LLM 流程，其中一个模型生成响应，另一个模型在迭代循环中提供评估和反馈。

<img src="/images/dapr-agents/agents-evaluator-optimizer.png" width=600 alt="Diagram showing how the evaluator-optimizer pattern works">

**使用场景：**
- 需要遵守特定风格指南的内容创作
- 需要细致理解和表达翻译
- 满足特定需求和处理边缘情况的代码生成
- 需要多轮信息收集和细化的复杂搜索

**使用 Dapr Agents 实现：**

```python
@workflow(name="evaluator_optimizer_travel_planner")
def evaluator_optimizer_travel_planner(ctx: DaprWorkflowContext, input_params: dict):
    travel_request = input_params.get("request")
    max_iterations = input_params.get("max_iterations", 3)
    
    # Generate initial travel plan
    current_plan = yield ctx.call_activity(
        generate_travel_plan,
        input={"request": travel_request, "feedback": None}
    )

    # Evaluation loop
    iteration = 1
    meets_criteria = False

    while iteration <= max_iterations and not meets_criteria:
        # Evaluate the current plan
        evaluation = yield ctx.call_activity(
            evaluate_travel_plan,
            input={"request": travel_request, "plan": current_plan}
        )

        score = evaluation.get("score", 0)
        feedback = evaluation.get("feedback", [])
        meets_criteria = evaluation.get("meets_criteria", False)
        
        # Stop if we meet criteria or reached max iterations
        if meets_criteria or iteration >= max_iterations:
            break

        # Optimize the plan based on feedback
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
- **迭代改进循环** - 管理生成和评估之间的反馈周期
- **质量标准** - 能够清晰定义什么构成可接受的输出
- **最大迭代控制** - 通过强制执行迭代限制防止无限循环

## 持久化代理

在代理性谱系的远端，持久化代理模式代表了从基于工作流方法的转变。不是预定义的步骤，而是一个自主代理，可以根据其对目标的理解规划自己的步骤并执行。

企业应用通常需要超出内存能力的持久化执行和可靠性。Dapr 的 `DurableAgent` 类帮助你实现具有工作流可靠性的自主代理，因为这些代理在幕后由 Dapr 工作流支持。`DurableAgent` 通过添加持久化到代理执行来扩展基本的 `Agent` 类。

<img src="/images/dapr-agents/agents-stateful-llm.png" width=600 alt="Diagram showing how the durable agent pattern works">

此模式不仅仅持久化消息历史——它为每次交互动态创建带有持久化活动的工作流，其中 LLM 调用和工具执行可靠地存储在 Dapr 的状态存储中。这使其非常适合可靠性和持久性至关重要的环境。

持久化代理还支持"无头代理"方法，即自主系统在没有直接用户交互的情况下运行。Dapr 的持久化代理暴露 REST 和发布订阅 API，使其非常适合由其他应用或外部事件触发的长时间运行操作。

**使用场景：**
- 可能需要数分钟或数天完成的长时间运行任务
- 跨多个服务运行的分布式系统
- 处理复杂多会话工单的客户服务
- 每一步都有 LLM 智能的业务流程
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

该实现遵循 Dapr 的边车架构模型，所有基础设施关注点由 Dapr 运行时处理：
- **持久化记忆** - 代理状态存储在 Dapr 的状态存储中，在进程崩溃后依然存在
- **工作流编排** - 所有代理交互通过 Dapr 的工作流系统管理
- **服务暴露** - `AgentRunner.serve()` 暴露 REST 端点（如 `POST /agent/run`），用于调度代理的 `@workflow_entry`
- **发布订阅输入/输出** - `AgentRunner.subscribe()` 扫描代理中的 `@message_router` 方法，并将配置的主题与模式验证连接

持久化代理支持"无头代理"概念——在没有直接用户交互的情况下运行的自主系统。根据场景，你可以：

1. **运行**持久化工作流以编程方式（`runner.run` 如上所示）
2. **订阅**代理到主题，以便其他服务可以通过发布订阅触发它（`runner.subscribe`）
3. **服务**代理到 FastAPI 应用后面，提供内置的 `/run` 和状态端点（`runner.serve`）

这些选项使得异步处理请求变得容易，并可以无缝集成到更大的分布式系统中。

### 重试策略

持久化代理支持 Dapr Workflow 的 `RetryPolicy`，使用其 `WorkflowRetryPolicy`：

- `max_attempts`: 工作流操作的最大重试次数。默认值为 1（无重试）。设置 `DAPR_API_MAX_RETRIES` 环境变量可覆盖默认值。
- `initial_backoff_seconds`: 初始退避持续时间（秒）。默认值为 5 秒。
- `max_backoff_seconds`: 最大退避持续时间（秒）。默认值为 30 秒。
- `backoff_multiplier`: 指数退避的退避乘数。默认值为 1.5。
- `retry_timeout`: 所有重试的总超时时间（秒）。

所有字段都是可选的。可以在实例化持久化代理时传递：

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

从简单的代理工作流到完全自主代理的旅程代表了将 LLM 集成到应用程序中的不同方法谱系。不同的使用场景需要不同程度的代理性和控制：

- **从更简单的模式开始**，如增强型 LLM 和提示链，用于可预测性至关重要的明确定义任务
- **根据需求增长变得更复杂**，逐步发展到更动态的模式，如并行化和编排器-工作者
- **仅在开放式任务中考虑完全自主代理**，当灵活性的好处超过严格控制的需求时
