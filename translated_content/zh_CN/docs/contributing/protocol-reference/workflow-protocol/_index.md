---
type: docs
title: "Workflow Protocol"
linkTitle: "Workflow"
weight: 10
description: "Workflow 构建块内部实现的底层描述。"

本文档以底层视角详细说明 Dapr Workflow 协议与运行时契约。它面向构建 Workflow Workers 的 SDK 作者，以及演进 Dapr 边车 Workflow Engine 的运行时维护者。

## 概述
Dapr Workflow 实现了边车即调度器模式：Dapr 运行时（边车）作为 Workflow Engine，应用 SDK 作为 Workflow Worker。所有控制与执行流量通过 gRPC 传递。

存在两个协议面：
1. 管理 API（可通过 SDK 访问的标准 Dapr gRPC）：
    - 启动、终止、暂停、恢复、重新运行、清除与查询工作流实例。
2. 执行 API（Task Hub 协议）：
    - 面向 Worker，用于接收业务流程/活动工作项并报告完成（例如通过 `TaskHubSidecarService`）。

[//]: # (graph LR)

[//]: # (Client[Workflow Client] -- Management API --> Sidecar[Dapr Sidecar Engine])

[//]: # (Sidecar -- Task Hub Protocol --> Worker[Workflow Worker SDK])

[//]: # (Sidecar -- State Store --> Actors[Dapr Actors Backend])

关键组件
- **Workflow Engine (Dapr Sidecar)**

   管理工作流状态转换、历史持久化、业务流程与活动任务的调度，以及可靠交付语义。默认情况下，它利用 Dapr Actors 作为后端以实现持久化、分片执行。

- **Workflow Worker (Application SDK)**

  连接到边车，轮询业务流程与活动工作项，执行用户定义的逻辑，并向引擎返回结果、失败与心跳。业务流程逻辑必须是确定性的；活动逻辑无需如此。

- **Orchestration**

  定义工作流的确定性协调器。引擎通过历史重放来驱动业务流程，以重建状态并调度出站任务（活动、子业务流程、计时器、外部事件）。

- **Activity**

  工作的原子单元。活动至少执行一次（**at-least-once**），并向引擎报告结果或失败。建议实现幂等性，上下文中提供任务执行标识符以辅助实现。

- **State Store & Backend**

  工作流历史与状态被持久化存储。引擎通常在所选持久化层上实现任务中心模式，并使用 Dapr Actors 作为默认的可靠性基础。

## 执行模型
Dapr Workflow 基于 Durable Task Framework (DTFx) 执行语义：

### 基于重放的执行
业务流程从其事件历史中重放以重建确定性状态。所有非确定性操作（时间、随机值、I/O）必须由引擎代理（例如计时器、活动调用、外部事件）。

### 确定性业务流程
业务流程代码必须无副作用，除非通过引擎代理的效果。重放期间控制流必须可重现。

### 至少一次活动、精确一次状态提交
活动可能被多次投递。引擎确保工作流状态提交的幂等性，并仅应用一次。

### 边车即调度器
边车拥有调度权，并在向工作器分发工作之前持久化所有历史/事件。从引擎视角来看，工作器是无状态执行器。

## 协议面
1) 管理 API（标准 Dapr gRPC）
  - **启动工作流**：创建并持久化初始历史事件；返回实例元数据
  - **终止 / 暂停/ 恢复**：通过持久化的控制事件驱动生命周期转换。
  - **查询**：检索实例状态、历史、输出、失败详情与自定义元数据。
  - **重新运行**：从历史事件启动新的工作流实例。
  - **清除**：主动清除工作流历史与状态。

> **说明**：具体 RPC 形态、错误码与语义，请参阅：[Management API specification]({{% ref workflow-protocol-management-api %}})

2) 执行 API（Task Hub 协议）
  - **轮询工作**：工作器获取业务流程与活动工作项。
  - **完成 / 失败工作**：工作器报告完成结果或失败；引擎将其追加到历史并推进业务流程进度。
  - **心跳 / 租约**：用于长时间运行的活动与协作重新平衡的可选机制。
  - **计时器与外部事件**：作为历史事件投递到业务流程，以保持重放的确定性。

> **说明**：定义 `TaskHubSidecarService` 契约、载荷模式与排序规则，请参见 [Execution API specification]({{% ref workflow-protocol-execution-api %}})

# 请求与运行时生命周期
1. 启动工作流
  - 客户端通过管理 API 调用 `StartWorkflow`。
  - 引擎持久化初始事件（例如 `ExecutionStarted`）并实现实例。
2. 业务流程执行（重放驱动）
  - 引擎重放业务流程历史以重建状态。
  - 业务流程通过发出命令来调度效果（活动、子业务流程、计时器），引擎将其持久化为新的历史事件。
3. 活动分发与执行
  - 引擎将活动工作项分发给工作器
  - 工作器运行活动（可能会被重试并至少投递一次）。
  - 工作器响应完成（结果）或失败；引擎追加到历史。
4. 计时器与外部信号
  - 引擎将计时器触发或外部事件记录作为历史条目投递。
  - 业务流程在下次重放时以确定性方式消费这些条目。
5. 进度与检查点
  - 每一步都会追加到历史日志并推进业务流程状态。
  - 引擎保障业务流程状态的幂等性与精确一次提交。
6. 完成
  - 业务流程返回输出（成功）或失败（异常详情）。
  - 最终状态与输出被持久化；状态查询反映终端状态。

# 协议原则
- **GRIEF (GRpc IntErFace)**：所有工作器/引擎与客户端/引擎通信均使用 gRPC。
- **基于重放的业务流程**：通过历史重放强制确定性行为。
- **至少一次活动投递**：活动可能重新执行；应设计为幂等。
- **引擎代理效果**：所有非确定性/时间/IO 流经引擎以保持重放安全。

# 文档导航
1. [管理 API]({{% ref workflow-protocol-management-api %}})
   Dapr gRPC 控制平面操作与载荷详解。
2. [执行 API（Task Hub 协议）]({{% ref workflow-protocol-execution-api %}})
   `TaskHubSidecarService` 工作器协议、工作项契约、结果/失败报告与排序规则。
3. [业务流程生命周期]({{% ref workflow-protocol-orchestration-lifecycle %}})
   重放语义、调度、外部事件、计时器与完成。
4. [活动生命周期]({{% ref workflow-protocol-activity-lifecycle %}})
   分发、重试、幂等性、心跳语义与失败处理。
5. [状态与历史]({{% ref workflow-protocol-state-and-history %}})
   历史模式、状态快照与持久化保证。
6. [版本管理]({{% ref workflow-protocol-versioning %}})
   Dapr 如何处理同一工作流定义的多个版本。
