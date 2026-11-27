---
type: docs
title: "功能与概念"
linkTitle: "功能与概念"
weight: 2000
description: "了解更多关于 Dapr Workflow 的功能与概念"
---

现在您已经从高层了解了 [workflow building block]({{% ref workflow-overview.md %}})，让我们深入探讨 Dapr Workflow 引擎和 SDK 所包含的功能与概念。Dapr Workflow 公开了多项核心功能和概念，它们在所有受支持的语言中都是通用的。

{{% alert title="注意" color="primary" %}}
有关 workflow 状态如何管理的更多信息，请参阅 [workflow 架构指南]({{% ref workflow-architecture.md %}})。
{{% /alert %}}

## Workflows

Dapr Workflows 是您编写的函数，用于定义一系列按特定顺序执行的任务。
Dapr Workflow 引擎负责任务的调度和执行，包括管理失败与重试。
如果托管 workflow 的应用扩展到多台机器上，workflow 引擎会在多台机器之间对 workflow 及其任务的执行进行负载均衡。
您可以[配置并发限制]({{% ref "workflow-concurrency.md" %}})，以控制同时运行的 workflow 和 activities 数量，既可以按 per-sidecar 设置，也可以在所有副本之间全局设置。

workflow 可以调度多种不同类型的任务，包括：
- [Activities]({{% ref "workflow-features-concepts.md#workflow-activities" %}})：用于执行自定义逻辑
- [Durable timers]({{% ref "workflow-features-concepts.md#durable-timers" %}})：用于将 workflow 暂停任意时长
- [Child workflows]({{% ref "workflow-features-concepts.md#child-workflows" %}})：用于将较大的 workflow 拆分为较小的部分
- [Detached workflows]({{% ref "workflow-features-concepts.md#detached-workflows" %}})：用于派生独立运行的即发即忘（fire-and-forget）workflow，这些 workflow 各自独立运行
- [External event waiters]({{% ref "workflow-features-concepts.md#external-events" %}})：用于阻塞 workflow，直到收到外部事件信号。这些任务将在其对应章节中有更详细的描述。

## Workflow Instance Management

### 查询 Workflow 状态

您可以使用 CLI 查询 workflow instances：

```bash
# 查找所有运行中的 workflow
dapr workflow list --app-id myapp --filter-status RUNNING

# 按名称查找 workflow
dapr workflow list --app-id myapp --filter-name OrderProcessing

# 查找最近的 workflow（过去 2 小时）
dapr workflow list --app-id myapp --filter-max-age 2h

# 获取详细的 JSON 输出
dapr workflow list --app-id myapp --output json
```

### Workflow 历史

查看完整的执行历史：

```bash
dapr workflow history wf-12345 --app-id myapp --output json
```

这将显示所有事件、activities 和状态转换。

## External Events

### 通过 CLI 触发事件

```bash
dapr workflow raise-event wf-12345/ApprovalReceived \
  --app-id myapp \
  --input '{"approved": true, "comments": "Approved by manager"}'
```

## Workflow 暂停与恢复

### 使用 CLI

```bash
# 暂停以进行人工干预
dapr workflow suspend wf-12345 \
  --app-id myapp \
  --reason "Awaiting customer response"

# 准备就绪后恢复
dapr workflow resume wf-12345 \
  --app-id myapp \
  --reason "Customer responded"
```

### Workflow 标识

您定义的每个 workflow 都有一个类型名称，而 workflow 的每次单独执行都需要一个唯一的 _实例 ID_。实例 ID 可以由您的应用代码生成，这在 workflow 对应文档或 job 等业务实体时很有用；也可以是自动生成的 UUID。workflow 的实例 ID 既可用于调试，也可用于通过 [Workflow APIs]({{% ref workflow_api.md %}}) 管理 workflow。

在任意时刻，给定 ID 的 workflow instance 只能存在一个。若现有的 instance 及其创建的每个子 workflow（递归检查）尚未达到终态（`COMPLETED`、`FAILED` 或 `TERMINATED`），使用相同 ID 创建新的 workflow instance 就会报错。一旦整个 workflow 树都进入终态，使用相同 ID 创建新 instance 就会开始一次全新的执行，并替换 state store 中之前的执行记录。

SDK 的 workflow 客户端在实例 ID 属于一个正在运行的 instance 时，会收到 gRPC `AlreadyExists` 状态码（Java SDK 会抛出 `WorkflowInstanceAlreadyExistsException`）。因此，客户端可以使用固定的实例 ID 启动 workflow，将其作为幂等调用，并将 `AlreadyExists` 视为「已在运行」，无需解析错误消息。已完成实例的 ID 默认可以被重用。当 durabletask-go 客户端设置了 `api.WithEnforceUniqueInstanceID()`，或旧实例的子 workflow 尚未结束时，也会返回 `AlreadyExists`。[Workflow API]({{% ref "workflow_api.md#start-workflow-request" %}})（HTTP 和 gRPC `StartWorkflowBeta1`）仍保留其错误响应：HTTP `500`，错误码为 `ERR_START_WORKFLOW`。

#### 实例 ID 重用的影响

{{% alert title="建议" color="primary" %}}
为每次 workflow 执行分配一个从未使用过的实例 ID。为已结束执行的 ID 启动新的执行，出于向后兼容仍然允许，但不推荐，新应用不应依赖此行为。
{{% /alert %}}

为新的 workflow 执行重用实例 ID，会带来全新 ID 所没有的以下代价：

- **旧执行会被替换。**新执行一创建，其历史、输出和失败详情就会被覆写到 state store 中。审计轨迹随之丢失，也无法再查询较早那次运行做了什么。
- **每次重用都要对整个旧 workflow 树做冲突检查。**在接受创建请求之前，运行时必须确认旧 instance 及其创建的每个子 workflow（递归检查，且可能位于其他应用中）都已进入终态。仍在运行的子 workflow 会以冲突拒绝创建请求；在故障期间无法访问的子 workflow 则会以不可用拒绝创建请求。使用全新 ID 创建时不存在这种依赖，在相同条件下也能成功。
- **发给旧执行的工作可能到达新执行。**事件、activity 结果和 reminder 都按实例 ID 路由，它们的存活时间可能超过产生它们的那次执行。Dapr 设有守卫（guard）机制，防止它们被应用到错误的执行上，但这仍比不重用实例 ID 更具风险。
- **恢复与排障更加困难。**引擎的恢复路径以实例 ID 为键。当一个 ID 承载过多次执行时，运维人员在排查卡住的 instance 时，首先必须弄清 state store 中的状态、reminder 和日志分别属于哪次执行。

推荐采用以下模式替代重用：

- **交由 Dapr 生成 ID**，或基于业务键加上唯一后缀派生 ID，例如 `order-1234-<uuid>` 或 `order-1234-attempt-3`。请将业务实体与当前实例 ID 的映射保存在您自己的 state store 中，或通过 workflow 的 custom status 对外提供，以便调用方找到正在运行的 instance。
- **仅在对单次逻辑启动去重时使用固定 ID。**如果两个调用方可能竞争启动同一个逻辑 workflow，确定性的 ID 会让第二次创建在第一次仍在运行时以冲突失败，这正是预期的信号。不要用同一个 ID 运行一连串的执行。
- **如果业务标识符必须作为实例 ID 且执行会重复出现**，请在启动下一次执行之前，使用 [purge API]({{% ref "workflow_api.md#purge-workflow-request" %}}) 或 [保留策略]({{% ref workflow-history-retention-policy.md %}}) purge 旧 instance，并在代码中将 purge 与创建视为一个事务。

{{% alert title="重要" color="warning" %}}
workflow 运行期间，或其上一次执行创建的任何子 workflow 仍在运行期间，实例 ID 都不能被重用。这包括那些被父 workflow 放弃的子 workflow（父 workflow 在未等待它们的情况下结束，或被非递归方式终止），否则旧执行中仍在运行的子 workflow 可能会把其结果送达新执行。创建请求会失败，错误信息会指出尚未终态的子 workflow：对 SDK 的 workflow 客户端返回 gRPC `AlreadyExists`，对 workflow HTTP API 则返回 HTTP `500` 与 `ERR_START_WORKFLOW`。

要释放实例 ID，请使用 [purge API]({{% ref "workflow_api.md#purge-workflow-request" %}}) purge 该 workflow，或配置 [workflow 保留策略]({{% ref workflow-history-retention-policy.md %}})。

此前部分 SDK 提供的实例 ID 重用策略选项（允许在 ID 冲突时执行 `IGNORE` 或 `TERMINATE` 等操作）已在 v1.18 中移除，仍保留该选项的 SDK 中也已标记为弃用。Dapr 1.18+ 运行时会完全忽略该选项。
{{% /alert %}}

### Workflow 重放

Dapr Workflows 使用一种称为[事件溯源](https://learn.microsoft.com/azure/architecture/patterns/event-sourcing)的技术来维护其执行状态。workflow 引擎不会将 workflow 的当前状态存储为快照，而是管理一个只追加的历史事件日志，记录 workflow 所执行过的各个步骤。使用 workflow SDK 时，每当 workflow "等待"某个已调度任务的结果，这些历史事件都会被自动存储。

当 workflow "等待"某个已调度的任务时，它会从内存中卸载，直到该任务完成。任务完成后，workflow 引擎会再次调度 workflow 函数运行。这第二次 workflow 函数执行称为 _重放_。

workflow 函数被重放时，会从头开始运行。但当它遇到已经完成的任务时，workflow 引擎不会再次调度该任务，而是：

1. 将已完成任务的已存储结果返回给 workflow。
1. 继续执行，直到下一个"等待"点。

这种"重放"行为会一直持续，直到 workflow 函数完成或因错误而失败。

借助这种重放技术，workflow 能够从任意"等待"点恢复执行，仿佛它从未被从内存中卸载。即使是之前运行中的局部变量值也能被恢复，而 workflow 引擎无需知道它们存储了什么数据。这种恢复状态的能力使 Dapr Workflows 具有_持久性_和_容错性_。

{{% alert title="注意" color="primary" %}}
此处描述的 workflow 重放行为要求 workflow 函数代码具有_确定性_。确定性的 workflow 函数在输入完全相同时，会执行完全相同的操作。[了解更多关于确定性 workflow 代码的限制。]({{% ref "workflow-features-concepts.md#workflow-determinism-and-code-restraints" %}})
{{% /alert %}}


### 无限循环与 eternal workflows

正如 [workflow 重放]({{% ref "#workflow-replay" %}}) 一节所述，workflow 会为其所有操作维护一个只写的事件溯源历史日志。为避免资源失控，workflow 必须限制其调度的操作数量。例如，请确保您的 workflow 不会：

- 在实现中使用无限循环
- 调度数千个任务。

如果 workflow 可能需要调度极大量的任务，您可以使用以下两种技术来编写这类 workflow：

1. **使用 _continue-as-new_ API**：
    每个 workflow SDK 都提供了一个 _continue-as-new_ API，workflow 可以调用它，以新的输入和历史重新启动自身。_continue-as-new_ API 特别适合实现"eternal workflows"，例如监控代理，否则这类 workflow 就需要用类似 `while (true)` 的结构来实现。使用 _continue-as-new_ 是保持 workflow 历史记录规模较小的好方法。

    {{% alert title="注意" color="primary" %}}
Continue-as-new 会立即重启 workflow，并丢弃所有未完成任务的结果，包括已启动但未等待的 activities、timers 和子 workflow。
    {{% /alert %}}

    > _continue-as-new_ API 会截断现有历史记录，并用新的历史记录替换它。

1. **使用 child workflows**：
    每个 workflow SDK 都提供了用于创建 child workflow 的 API。child workflow 的行为与其他 workflow 一样，只是它由父 workflow 调度。child workflow 具有：
    - 自己的历史记录
    - 可将 workflow 函数的执行分布到多台机器上的优势。

    如果 workflow 需要调度数千个或更多任务，建议将这些任务分布到 child workflows 中，避免单个 workflow 的历史记录规模过大。

### 更新 workflow 代码

由于 workflow 是长期运行且持久的，更新 workflow 代码时必须格外小心。正如 [workflow 确定性]({{% ref "#workflow-determinism-and-code-restraints" %}}) 限制一节所述，workflow 代码必须具有确定性。如果系统中存在任何未完成的 workflow instance，对 workflow 代码的更新就必须保持这种确定性。否则，对 workflow 代码的更新可能导致这些 workflow 在下次执行时出现运行时故障。

[查看已知限制]({{% ref "#limitations" %}})

## Workflow activities

Activities 是 workflow 中的基本工作单元，也是在业务流程中被编排的任务。例如，您可以创建一个 workflow 来处理订单。这些任务可能包括检查库存、向客户收费以及创建发货单。每个任务都是一个独立的 activity。这些 activities 可以串行执行、并行执行，或两者结合执行。

与 workflow 不同，activity 不限制您可以在其中执行的工作类型。Activity 常用于发起网络调用或运行 CPU 密集型操作。Activity 还可以将数据返回给 workflow。

Dapr Workflow 引擎保证，每个被调用的 activity 在 workflow 执行过程中**至少执行一次**。由于 activities 只保证至少一次执行，建议尽可能将 activity 逻辑实现为幂等的。

## Child workflows

除了 activities，workflow 还可以将其他 workflow 调度为 _child workflows_。child workflow 拥有自己的实例 ID、历史记录和状态，独立于启动它的父 workflow。

child workflows 有许多优势：

* 您可以将大型 workflow 拆分为一系列较小的 child workflow，使代码更易于维护。
* 您可以让 workflow 逻辑并发地分布在多个计算节点上，如果您的 workflow 逻辑需要协调大量任务，这一点尤其有用。
* 通过让父 workflow 的历史记录更小，您可以降低内存使用和 CPU 开销。

child workflow 的返回值即其输出。如果 child workflow 因异常失败，该异常会像 activity 任务因异常失败时一样，被传递给父 workflow。child workflows 也支持自动 retry policies。

终止父 workflow 会终止该 workflow instance 创建的所有 child workflows。更多信息请参阅 [terminate workflow API]({{% ref "workflow_api.md#terminate-workflow-request" %}})。

## Detached workflows

除了 [child workflows]({{% ref "#child-workflows" %}})，workflow 还可以将另一个 workflow 调度为 _detached workflow_：一个完全独立于调用方运行的即发即忘 instance。调用会同步返回新的实例 ID，调度方 workflow 会立即继续执行，而无需等待 detached workflow。与 child workflow 不同，它与调用方之间没有父子关联：detached workflow 的成功或失败不会回传给调用方，终止调用方也不会终止 detached workflow。

关于与 child workflows 的对比、使用时机指导以及代码示例，请参阅 [Detached workflows]({{% ref workflow-detached.md %}})。

## Durable timers

Dapr Workflows 允许您为任意时间范围调度类似 reminder 的持久化延迟，包括几分钟、几天，甚至数年。这些 _durable timers_ 可由 workflow 调度，用于实现简单的延迟，或为其他异步任务设置临时超时。更具体地说，durable timer 可以设置为在某个特定日期触发，也可以在指定时长之后触发。durable timer 的最长时长没有限制，它们在内部由内部 actor reminders 支撑。例如，跟踪某项服务 30 天免费订阅的 workflow，可以使用在 workflow 创建 30 天后触发的 durable timer 来实现。workflow 在等待 durable timer 触发期间，可以被安全地从内存中卸载。

{{% alert title="注意" color="primary" %}}
workflow 编写 SDK 中的某些 API 可能会在内部调度 durable timers，以实现内部超时行为。
{{% /alert %}}

## Retry policies

workflow 支持针对 activities 和 child workflows 的持久化 retry policies。workflow retry policies 与 [Dapr resiliency policies]({{% ref "resiliency-overview.md" %}}) 在以下方面有所不同：

- workflow retry policies 由 workflow 作者在代码中配置，而 Dapr resiliency policies 由应用运维人员在 YAML 中配置。
- workflow retry policies 是持久的，并且在应用重启后保持其状态，而 Dapr resiliency policies 不是持久的，应用重启后必须重新应用。
- workflow retry policies 由 activities 和 child workflows 中未处理的错误或异常触发，而 Dapr resiliency policies 由操作超时和连接故障触发。

重试在内部使用 durable timers 实现。这意味着 workflow 在等待重试触发期间可以被安全地从内存中卸载，从而节省系统资源。这也意味着重试之间的延迟可以任意长，包括几分钟、几小时，甚至几天。

{{% alert title="注意" color="primary" %}}
retry policy 执行的操作会保存到 workflow 的历史记录中。在 workflow 已经执行之后，必须注意不要更改 retry policy 的行为，否则 workflow 在重放时可能出现意外行为。更多信息请参阅关于[更新 workflow 代码]({{% ref "#updating-workflow-code" %}})的说明。
{{% /alert %}}

也可以同时使用 workflow retry policies 和 Dapr resiliency policies。例如，如果 workflow activity 使用 Dapr 客户端调用某个服务，则 Dapr 客户端会使用已配置的 resiliency policy。更多信息及示例，请参阅 [Quickstart：Service-to-service resiliency]({{% ref "resiliency-serviceinvo-quickstart.md" %}})。但是，如果 activity 本身因任何原因失败（包括耗尽了 resiliency policy 的重试次数），则 workflow 的 resiliency policy 会介入。

{{% alert title="注意" color="primary" %}}
同时使用 workflow retry policies 和 resiliency policies 可能导致意外行为。例如，如果 workflow activity 耗尽了其配置的 retry policy，workflow 引擎仍会根据 workflow retry policy 重试该 activity。这可能导致 activity 被重试的次数超出预期。
{{% /alert %}}

由于 workflow retry policies 在代码中配置，具体的开发体验可能因 workflow SDK 版本而异。一般来说，workflow retry policies 可通过以下参数进行配置：

| 参数 | 描述 |
| --- | --- |
| **最大尝试次数** | 执行 activity 或 child workflow 的最大次数。如果设置为 0，则不会进行任何尝试。 |
| **首次重试间隔** | 等待第一次重试之前的时长。 |
| **退避系数** | 用于确定退避时间增长速率的系数。例如，系数为 2 会使后续每次重试的等待时间翻倍。 |
| **最大重试间隔** | 每次后续重试之前等待的最长时长。如果设置为 0，则不会发生任何重试。 |
| **重试超时** | 重试的全局超时时间，与配置的最大尝试次数无关。此超时到期后，将不再执行 activity 的后续尝试。 |

child workflow 的每次重试都是一个独立的 instance，拥有自己的实例 ID。自 Dapr 1.19 起，父 workflow 历史记录中重试尝试的 `ChildWorkflowInstanceCreated` 事件会记录第一次尝试的实例 ID（`retryParentInstanceInfo`）。读取父 workflow 历史的工具可以据此将同一次调用的各次尝试归为一组，而无需遍历它们之间的重试 timers。

## External events

有时 workflow 需要等待由外部系统触发的事件。例如，若订单总额超过某个阈值，审批 workflow 可能要求人工在订单处理 workflow 中明确批准订单请求。另一个例子是问答游戏编排 workflow，它会暂停，直到所有参与者都提交了问题的答案。这些执行过程中的输入称为 _external events_。

external events 具有_名称_和_负载_，并会被投递到单个 workflow instance。workflow 可以创建"_wait for external event_"任务来订阅 external events，并_等待_这些任务，以阻塞执行直到收到事件。随后，workflow 可以读取这些事件的负载，并决定接下来要采取的步骤。External events 可以串行或并行处理。External events 可以由其他 workflow 或 workflow 代码触发。

workflow 也可以等待多个同名的 external event 信号，此时这些信号会以先进先出（FIFO）的方式派发给对应的 workflow 任务。如果 workflow 收到了 external event 信号，但尚未创建"wait for external event"任务，该事件会被保存到 workflow 的历史记录中，并在 workflow 请求该事件后立即被消费。

了解更多关于[与外部系统交互]({{% ref "workflow-patterns.md#external-system-interaction" %}})的信息。

## Workflow history propagation

Workflow history propagation 使 workflow instance 能够回溯 workflow 或其他 workflow 已执行过的事件集合，并验证这些事件确实发生过。一些场景包括性能欺诈检查、合规关卡检查，或让长期运行的 AI 代理或 workflow 在多次调用之间保持上下文（multi-agent、multi-app workflow），从而判断代理或 workflow 声称已完成的事情是否真的属实。

例如，如果您有一个 workflow 用于验证用户的信用检查，您可以使用 workflow history propagation 来验证该检查确实针对指定用户发生过。若再结合 workflow history signing，您还可以对此进行密码学层面的确认或证明。

父 workflow 可以选择将其执行历史与下游的 child workflows、grandchild workflows 以及 activities 共享。提供两种作用域：

- **Lineage**— 调用方的事件，外加完整的祖先链（保管链）
- **Own history**— 仅包含调用方的事件（作为信任边界，不包含祖先 Lineage）

接收方 workflow 或 activity 可通过 SDK 的 `GetPropagatedHistory()` API 读取其继承的历史，并验证上游发生了什么。

关于详细信息、作用域对比和代码示例，请参阅 [Workflow history propagation]({{< ref workflow-history-propagation.md >}})。

## Stateful workflow client

workflow 在每个轮次都会从其历史记录重放，而该历史只会不断增长。为避免每次都发送完整历史，workflow SDK 会将已重放的历史保留在内存中，sidecar 只发送自上一轮次以来新增的事件。因此，每个轮次的负载不再随 workflow 的长度增长，这对长期运行的 workflow、监控模式（monitor pattern）以及大规模扇出 workflow 最为重要。

该功能默认启用，无需任何配置或代码更改，并且绝不影响正确性：如果工作进程缓存的历史与 sidecar 的预期不一致，则会改为获取完整历史。

了解更多关于 [stateful workflow client]({{< ref workflow-stateful-client.md >}}) 的信息。

## 重新运行 workflow

重新运行 workflow 会基于某个已结束实例的一个历史事件，创建一个**新的** workflow 实例。源实例保持不变。你可以借此从失败的步骤重试失败的 workflow，并可选择提供新的输入，无需重复已经成功的工作。

在目标事件之前已完成（已完成或失败）并记录在历史中的工作，会从历史中重放，不会再次执行。其余部分都会在新实例中重新执行：仍在执行中的 activity、尚未触发的 timer，以及尚未结束的 child workflow。在并行运行 activity 的 workflow 中，这还包括一种情况：某个 activity 已经成功，但其完成记录位于目标事件*之后*，因此扇出可能会重新运行得比你预期的更多。被再次执行的 child workflow 会获得新的实例 ID。重新运行并不等同于补偿：源实例的副作用依然存在，因此应使 activity 具备幂等性。

### 重新运行的限制

- 源实例必须处于终态（`COMPLETED`、`FAILED` 或 `TERMINATED`）。正在运行的实例无法重新运行。
- 源实例不能是 child workflow。请改为重新运行父 workflow。
- 只能从三种事件类型重新运行：activity 被调度（`TaskScheduled`）、timer 被创建（`TimerCreated`），以及 child workflow 被创建（`ChildWorkflowInstanceCreated`）。其他任何事件都会被拒绝，包括 [detached workflow]({{% ref workflow-detached.md %}}) 的创建。
- 事件 ID 是 workflow 历史中所示的事件自身 ID，而不是它在事件列表中的位置。
- 新输入只会替换目标事件的输入，且不能用于 timer 事件。新的 child workflow 实例 ID 只能用于 child workflow 事件。
- 若提供了新的实例 ID，它必须不同于源实例 ID，并且不能属于已有状态的实例。若省略，运行时会自动生成一个。

通过 [Dapr CLI]({{% ref "howto-manage-workflow.md#re-run-workflows" %}}) 和 SDK 的 workflow 客户端可以重新运行 workflow，但不能通过 HTTP API 进行。它还可以[以其他应用所拥有的 workflow 为目标]({{% ref workflow-multi-app.md %}})。

## Purging

可以从 state store 中 purge workflow 状态，purge 其全部历史记录，并移除与特定 workflow instance 相关的所有 metadata。purge 能力适用于已运行至 `COMPLETED`、`FAILED` 或 `TERMINATED` 状态的 workflow。

更多信息请参阅 [Workflow API 参考指南]({{% ref workflow_api.md %}})。

## 版本控制

workflow 代码是长期运行的，在更新期间必须保持确定性。关于修补和 named workflow versioning 的详细信息，请参阅 [Workflow versioning]({{% ref workflow-versioning.md %}})。

## Limitations

### 负载大小

单次 workflow 或 activity 派发受 sidecar 的 `--max-body-size` 设置限制（默认为 4 MiB）。如果 workflow 的 `PastEvents + NewEvents + PropagatedHistory` 将超过该上限的 95%，则该 workflow 会进入停滞状态，而不会中断 dispatch stream。指标会展示每个 workflow 和 activity 距离上限的接近程度，以便运维人员在停滞发生之前采取行动。详情与补救步骤请参阅 [Workflow 负载大小]({{% ref workflow-payload-size.md %}})。

### 快速路径与并发限制

当配置了由 Scheduler 强制执行的并发限制（`globalMaxConcurrentWorkflowInvocations`、`globalMaxConcurrentActivityInvocations`，或按名称设置的 `workflowConcurrencyLimits` 与 `activityConcurrencyLimits`）时，`WorkflowsFastPath` 预览功能会自动禁用，因为这些限制会控制每次 Scheduler job 的投递，而快速路径不借助 Scheduler jobs 驱动工作。per-sidecar 限制则是兼容的。请参阅 [Workflow 快速路径]({{% ref workflow-fast-path.md %}}) 和 [Workflow 并发限制]({{% ref workflow-concurrency.md %}})。

### Workflow determinism and code restraints

为了利用 workflow 重放技术，您的 workflow 代码需要具有确定性。为了让 workflow 代码具有确定性，您可能需要规避一些限制。

#### Workflow 函数必须调用确定性 API
生成随机数、随机 UUID 或获取当前日期的 API 是_非确定性的_。要规避此限制，您可以：
- 在 activity 函数中使用这些 API，或
- （推荐）使用 SDK 提供的内置等效 API。例如，每个编写 SDK 都提供了以确定性方式获取当前时间的 API。

例如，不要这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 不要这样做！
DateTime currentTime = DateTime.UtcNow;
Guid newIdentifier = Guid.NewGuid();
string randomString = GetRandomString();
```

{{% /tab %}}

{{% tab "Java" %}}

```java
// 不要这样做！
Instant currentTime = Instant.now();
UUID newIdentifier = UUID.randomUUID();
String randomString = getRandomString();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
// 不要这样做！
const currentTime = new Date();
const newIdentifier = uuidv4();
const randomString = getRandomString();
```

{{% /tab %}}

{{% tab "Go" %}}

```go
// 不要这样做！
const currentTime = time.Now()
```

{{% /tab %}}

{{< /tabpane >}}

这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 这样做！！
DateTime currentTime = context.CurrentUtcDateTime;
Guid newIdentifier = context.NewGuid();
string randomString = await context.CallActivityAsync<string>(nameof("GetRandomString")); //使用 "nameof" 以防止指定应用程序中不存在的 activity 名称
```

{{% /tab %}}

{{% tab "Java" %}}

```java
// 这样做！！
Instant currentTime = context.getCurrentInstant();
Guid newIdentifier = context.newGuid();
String randomString = context.callActivity(GetRandomString.class.getName(), String.class).await();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
// 这样做！！
const currentTime = context.getCurrentUtcDateTime();
const randomString = yield context.callActivity(getRandomString);
```

{{% /tab %}}

{{% tab "Go" %}}

```go
const currentTime = ctx.CurrentUTCDateTime()
```

{{% /tab %}}

{{< /tabpane >}}


#### Workflow 函数必须仅_间接_与外部状态交互。
外部数据包括任何未存储在 workflow 状态中的数据。Workflows 不得与全局变量、环境变量、文件系统交互，也不得发起网络调用。

相反，workflow 应当通过 workflow 输入、activity 任务以及 external event 处理，_间接_地与外部状态交互。

例如，不要这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 不要这样做！
string configuration = Environment.GetEnvironmentVariable("MY_CONFIGURATION")!;
string data = await new HttpClient().GetStringAsync("https://example.com/api/data");
```
{{% /tab %}}

{{% tab "Java" %}}

```java
// 不要这样做！
String configuration = System.getenv("MY_CONFIGURATION");

HttpRequest request = HttpRequest.newBuilder().uri(new URI("https://postman-echo.com/post")).GET().build();
HttpResponse<String> response = HttpClient.newBuilder().build().send(request, HttpResponse.BodyHandlers.ofString());
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
// 不要这样做！
// 访问环境变量 (Node.js)
const configuration = process.env.MY_CONFIGURATION;

fetch('https://postman-echo.com/get')
  .then(response => response.text())
  .then(data => {
    console.log(data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

{{% /tab %}}

{{% tab "Go" %}}

```go
// 不要这样做！
resp, err := http.Get("http://example.com/api/data")
```

{{% /tab %}}


{{< /tabpane >}}

这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 这样做！！
string configuration = workflowInput.Configuration; // 假设的 workflow 输入参数
string data = await context.CallActivityAsync<string>(nameof("MakeHttpCall"), "https://example.com/api/data");
```

{{% /tab %}}

{{% tab "Java" %}}

```java
// 这样做！！
String configuration = ctx.getInput(InputType.class).getConfiguration(); // 假设的 workflow 输入参数
String data = ctx.callActivity(MakeHttpCall.class, "https://example.com/api/data", String.class).await();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
// 这样做！！
const configuration = workflowInput.getConfiguration(); // 假设的 workflow 输入参数
const data = yield ctx.callActivity(makeHttpCall, "https://example.com/api/data");
```

{{% /tab %}}


{{% tab "Go" %}}

```go
// 这样做！！
err := ctx.CallActivity(MakeHttpCallActivity, workflow.ActivityInput("https://example.com/api/data")).Await(&output)

```

{{% /tab %}}
{{< /tabpane >}}

#### Workflow 函数必须仅在 workflow 派发线程上执行。
每种语言的 SDK 实现都要求，所有 workflow 函数操作必须在该函数被调度所在的同一线程（goroutine 等）上执行。Workflow 函数绝不能：
- 调度后台线程，或
- 使用会将回调函数调度到另一线程上运行的 API。

违反此规则可能导致未定义的行为。任何后台处理都应改为委托给 activity 任务，activity 任务可以串行或并发调度。

例如，不要这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 不要这样做！
Task t = Task.Run(() => context.CallActivityAsync("DoSomething"));
await context.CreateTimer(5000).ConfigureAwait(false);
```
{{% /tab %}}

{{% tab "Java" %}}

```java
// 不要这样做！
new Thread(() -> {
    ctx.callActivity(DoSomethingActivity.class.getName()).await();
}).start();
ctx.createTimer(Duration.ofSeconds(5)).await();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

不要将 JavaScript workflow 声明为 `async`。Node.js 运行时不能保证异步函数是确定性的。

{{% /tab %}}

{{% tab "Go" %}}

```go
// 不要这样做！
go func() {
  err := ctx.CallActivity(DoSomething).Await(nil)
}()
err := ctx.CreateTimer(time.Second).Await(nil)
```

{{% /tab %}}



{{< /tabpane >}}

这样做：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
// 这样做！！
Task t = context.CallActivityAsync(nameof("DoSomething"));
await context.CreateTimer(5000).ConfigureAwait(true);
```

{{% /tab %}}

{{% tab "Java" %}}

```java
// 这样做！！
ctx.callActivity(DoSomethingActivity.class.getName()).await();
ctx.createTimer(Duration.ofSeconds(5)).await();
```

{{% /tab %}}

{{% tab "JavaScript" %}}

由于 Node.js 运行时不能保证异步函数是确定性的，请始终将 JavaScript workflow 声明为同步生成器函数。

{{% /tab %}}

{{% tab "Go" %}}

```go
// 这样做！
task := ctx.CallActivity(DoSomething)
task.Await(nil)
```

{{% /tab %}}

{{< /tabpane >}}

### Updating workflow code
请确保您对 workflow 代码的更新保持其确定性。以下是一些可能破坏 workflow 确定性的代码更新示例：
- **更改 workflow 函数签名**：更改 workflow 或 activity 的名称、输入或输出，被视为重大变更（breaking change），必须避免。
- **更改 workflow 任务的数量或顺序**：更改 workflow 任务的数量或顺序，会导致 workflow 的历史记录与 workflow 代码不再匹配，并可能引发运行时错误或其他意外行为。

要规避这些约束，请使用版本控制指南中描述的 workflow [versioning]({{% ref workflow-versioning.md %}}) 概念，通过添加补丁（patch）并引入新的 named workflow versions，以确定性的方式将更改纳入您的 workflow。

## 下一步

{{< button text="workflow 模式 >>" page="workflow-patterns.md" >}}

## 相关链接

- [使用 Quickstart 试用 Dapr Workflow]({{% ref workflow-quickstart.md %}})
- [Workflow 概述]({{% ref workflow-overview.md %}})
- [Workflow 快速路径]({{% ref workflow-fast-path.md %}})
- [操作指南：应用 workflow access policies]({{% ref workflow-access-policy.md %}})
- [Workflow API 参考]({{% ref workflow_api.md %}})
- 试用以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
   - [JavaScript](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
