---
type: docs
title: "workflow 架构"
linkTitle: "workflow 架构"
weight: 4000
description: "Dapr Workflow 引擎架构"
---

[Dapr Workflows]({{% ref "workflow-overview.md" %}}) 允许开发者使用多种编程语言中的普通代码定义 workflow。workflow 引擎运行在 Dapr sidecar 内部，协调作为应用程序一部分部署的 workflow 代码。Dapr Workflows 构建于 Dapr Actors 之上，为 workflow 执行提供持久性和可扩展性。

本文介绍：

- Dapr Workflow 引擎的架构
- workflow 引擎如何与应用程序代码交互
- workflow 引擎如何融入整体 Dapr 架构
- 不同的 workflow 后端如何与 workflow 引擎协同工作

有关如何在应用程序中编写 Dapr Workflows 的更多信息，请参阅[如何：编写 workflow]({{% ref "workflow-overview.md" %}})。

Dapr Workflow 引擎内部由 Dapr 的 Actor runtime 驱动。下图展示了 Kubernetes 模式下的 Dapr Workflow 架构：

{{< diagram workflows-architecture-k8s >}}

要使用 Dapr Workflow building block，你需要使用 Dapr Workflow SDK 在应用程序中编写 workflow 代码。该 SDK 在内部通过 gRPC 流连接到 sidecar，从而注册 workflow 以及 workflow 可以调度的 workflow activity（即任务）。

引擎直接嵌入在 sidecar 中，并基于 [`durabletask-go`](https://github.com/dapr/durabletask-go) 框架库实现。该框架允许你替换不同的存储提供程序，其中包括为 Dapr 创建的、在幕后利用内部 Actor 的存储提供程序。由于 Dapr Workflows 使用 Actor，你可以将 workflow 状态存储在 state store 中。

## sidecar 交互

当 workflow 应用程序启动时，它会使用 workflow 编写 SDK 向 Dapr sidecar 发送 gRPC 请求，并以[服务器流式 RPC 模式](https://grpc.io/docs/what-is-grpc/core-concepts/#server-streaming-rpc)获取一个 workflow 工作项的流。这些工作项可以是任何内容，从“启动新的 X workflow”（其中 X 是 workflow 的类型）到“代表 workflow X 调度输入为 Z 的 activity Y 运行”。

workflow 应用程序执行相应的 workflow 代码，然后向 sidecar 发送一个 gRPC 请求，其中包含执行结果。

{{< diagram name="workflow-engine-protocol" width="55" >}}

所有交互都通过单个 gRPC 通道进行，并由应用程序发起，这意味着应用程序不需要打开任何入站端口。
这些交互的细节由特定语言的 Dapr Workflow 编写 SDK 在内部处理。

sidecar 通过该流发送的历史记录是增量的：工作进程一旦为某个实例准备就绪（即已缓存其状态），sidecar 便只发送自其上一轮次以来新增的事件，而不再发送整个历史记录。参见[stateful workflow 客户端]({{% ref "workflow-stateful-client.md" %}})。

位于应用与 sidecar 之间的负载均衡器或代理可能会关闭没有流量的流。例如，AWS ALB 和 nginx 会在 60 秒后关闭空闲流，这会让工作进程付出重新连接并重新发送完整历史记录的代价。为了保持流处于打开状态，工作进程可以在打开流时声明 `WORKER_CAPABILITY_HEALTH_PING` 能力，此后 sidecar 每 30 秒会向其发送一次健康检查（health ping）。使用 1.19 版 Python、Java 和 .NET SDK 构建的工作进程，或使用 Go SDK v1.16（durabletask-go v0.15）构建的工作进程，都会声明该能力。sidecar 会读取 `DAPR_WORKFLOW_HEALTH_PING_INTERVAL` 环境变量以覆盖检查间隔，但该变量仅供 Dapr 集成测试使用，不是受支持的设置。请参阅[环境变量参考]({{% ref environment %}})。

### workflow 与应用程序 Actor 交互的区别

如果你熟悉 Dapr Actor，可能会注意到 workflow 与 sidecar 的交互方式与应用程序定义的 Actor 有一些不同。

| Actor | workflow |
| ------ | --------- |
| 应用程序创建的 Actor 可以使用 HTTP 或 gRPC 与 sidecar 交互。 | workflow 仅使用 gRPC。由于 workflow gRPC 协议较为复杂，实现 workflow 时_必须_使用 SDK。 |
| Actor 操作由 sidecar 推送到应用程序代码。这要求应用程序监听特定的_应用端口_。 | 对于 workflow，操作由应用程序通过流式协议从 sidecar_拉取_。应用程序无需监听任何端口即可运行 workflow。 |
| Actor 会向 sidecar 显式注册自己。 | workflow 不会向 sidecar 注册自己。嵌入式引擎不跟踪 workflow 类型。这一职责转而交由 workflow 应用程序及其 SDK 承担。 |

## workflow 分布式追踪

workflow 引擎所使用的 [`durabletask-go`](https://github.com/dapr/durabletask-go) 核心使用 Open Telemetry SDK 编写分布式追踪。
这些追踪由 Dapr sidecar 自动捕获，并导出到已配置的 Open Telemetry 提供程序，例如 Zipkin。

引擎管理的每个 workflow instance 都表示为一个或多个跨度。
其中有一个父跨度表示完整的 workflow 执行，还有针对各类任务的子跨度，包括 activity 任务执行和 durable timer 的跨度。

> workflow activity 代码目前**无法**访问追踪上下文。

## workflow Actor

当 Workflow Client 连接到 sidecar 时，会注册两类 Actor 以支持 workflow 引擎：

- `dapr.internal.{namespace}.{appID}.workflow`
- `dapr.internal.{namespace}.{appID}.activity`

`{namespace}` 的值为 Dapr namespace，如果未配置 namespace，则默认为 `default`。
`{appID}` 的值为应用的 ID。
例如，如果你有一个名为 “wfapp” 的 workflow 应用，则 workflow Actor 的类型为 `dapr.internal.default.wfapp.workflow`，activity Actor 的类型为 `dapr.internal.default.wfapp.activity`。

下图演示了 workflow Actor 在 Kubernetes 场景中的运作方式：

{{< diagram workflow-execution >}}

与用户定义的 Actor 一样，workflow Actor 通过 Actor placement service 提供的哈希查找表分布在集群中。
它们同样会维护自身状态并使用 reminder。
但与应用程序代码中的 Actor 不同，这些 workflow Actor 嵌入在 Dapr sidecar 中。
应用程序代码完全不知道这些 Actor 的存在。

{{% alert title="注意" color="primary" %}}
只有在应用程序使用 Dapr Workflow SDK 注册过 workflow 之后，workflow Actor 类型才会被注册。
如果应用从未注册任何 workflow，内部的 workflow Actor 就永远不会被注册。
{{% /alert %}}

### workflow Actor

workflow 使用 2 种不同类型的 Actor：workflow Actor 和 activity Actor。
workflow Actor 负责管理应用中运行的所有 workflow 的状态和 placement 位置。
每个被调度的 workflow instance 都会激活一个新的 workflow Actor 实例。
workflow Actor 的 ID 即为 workflow 的 ID。
该 workflow Actor 在 workflow 推进过程中存储其状态，并通过 Actor 查找表决定 workflow 代码在哪个节点上执行。

由于 workflow 基于 Actor 实现，所有 workflow 和 activity 工作都会通过 Actor placement 表分布到实现 workflow 的应用的所有副本上。
默认情况下，workflow 的启动位置与每个工作项的执行位置之间没有局部性或关联关系。
启用[workflow 快速路径]({{% ref "workflow-fast-path.md" %}})预览功能后，提交事件的主机也会驱动随之产生的轮次，并且 activity 体会直接在其目标主机上执行，无需经由 Scheduler 进行一次 reminder 往返。

每个 workflow Actor 使用配置的 Actor state store 中的以下键来保存其状态：

| 键 | 描述 |
| --- | ----------- |
| `inbox-NNNNNN` | workflow 的收件箱实际上是一个先进先出（FIFO）队列，其中存放着驱动 workflow 执行的_消息_。示例消息包括 workflow 创建消息、activity 任务完成消息等。每条消息都存储在 state store 中自己的键里，键名为 `inbox-NNNNNN`，其中 `NNNNNN` 是一个 6 位数字，表示消息的顺序。workflow 消费了相应的消息后，这些状态键就会被删除。 |
| `history-NNNNNN` | workflow 的历史是表示 workflow 执行过程的有序事件列表。历史中的每个键保存单个 history event 的数据。与仅追加日志一样，workflow 的 history event 只会被添加，从不删除（但执行 continue as new 操作时除外，该操作会清除所有历史并以新输入重新启动 workflow）。 |
| `customStatus` | 包含用户定义的 workflow 状态值。每个 workflow Actor 实例恰好有一个 `customStatus` 键。 |
| `metadata` | 以 JSON 块的形式包含 workflow 的元信息，例如收件箱长度、历史长度，以及表示 workflow 代次（generation）的 64 位整数。长度信息用于确定在加载或保存 workflow 状态更新时需要读取或写入哪些键。 |
| `parent-notify` | 与 child workflow 的终态在同一事务中写入的标记，记录父 workflow 尚未收到完成通知。父 workflow 确认后，该标记会被清除。标记存在期间，清除 child workflow 或复用其实例 ID 会因“未完成”而被拒绝。 |
| `creation-input` | 仅在启用[history signing]({{% ref "workflow-history-signing.md" %}})时为 child workflow 写入：父 workflow 创建 child workflow 时使用的输入。它与历史分开保存，因此在 `continue as new` 之后依然存在，并可在对完成结果进行证明时与父 workflow 进行校验。 |

{{% alert title="警告" color="warning" %}}
workflow Actor 的状态在 workflow 完成后仍会保留在 state store 中。
创建大量 workflow 可能导致存储用量无限增长。
为解决此问题，请使用[清除 API]({{% ref "workflow_api.md#purge-workflow-request" %}})清除 workflow，或配置[workflow 保留策略]({{% ref workflow-history-retention-policy.md %}})，以自动清理已完成的 workflow 状态。
{{% /alert %}}

下图说明了 workflow Actor 的典型生命周期。

{{< diagram name="workflow-actor-flowchart" width="70" >}}

概括如下：

1. workflow Actor 在收到新消息时被激活。
1. 新消息随后触发（在你的应用程序中）相关的 workflow 代码运行，并将执行结果返回给 workflow Actor。
1. 收到结果后，Actor 根据需要调度任何任务。
1. 调度完成后，Actor 将其状态更新到 state store 中。
1. 最后，Actor 进入空闲状态，直到收到另一条消息。在此空闲期间，sidecar 可能会决定将 workflow Actor 从内存中卸载。

### activity Actor

activity Actor 负责管理所有 workflow activity 调用的状态和 placement 位置。
每当 workflow 调度一个 activity 任务时，都会激活一个新的 activity Actor 实例。
activity Actor 的 ID 由 workflow 的 ID、activity 的任务 ID（任务 ID 从 0 开始）以及一个固定的末尾 `0` 组成，三者以 `::` 连接。
例如，如果一个 workflow 的 ID 为 `876bf371` 并调度了其第三个 activity，则该 activity Actor 的 ID 为 `876bf371::2::0`。
第三个部分是为兼容早期版本而保留的：早期版本在此处写入的是 workflow 代次（generation），现在它已不再携带任何信息。
当 workflow 使用 `continue as new` 时，任务 ID 会从 0 重新开始，因此后续代次会复用相同的 activity Actor ID。引擎通过调度事件和完成事件中携带的任务执行 ID 来区分不同的执行。

activity Actor 本身不存储任何状态，所有结果数据都会发送回父 workflow Actor。唯一的例外是[workflow 快速路径]({{% ref "workflow-fast-path.md#execution-claim-record" %}})：当 Actor placement 将正在运行的执行迁移到另一台主机时，activity Actor 会写入一条短暂存在的 `execution-claim` 记录。

下图说明了 activity Actor 的典型生命周期。

{{< diagram name="workflow-activity-actor-flowchart" width="85" >}}

activity Actor 是短暂存在的：

1. 当 workflow Actor 调度 activity 任务时，activity Actor 被激活。
1. activity Actor 随即调用 workflow 应用程序，以执行相关的 activity 代码。
1. activity 代码运行完毕并返回结果后，activity Actor 会向父 workflow Actor 发送一条包含执行结果的消息。
1. 随后，activity Actor 停用自身。
1. 结果发送后，workflow 会被触发，继续进入下一步。

启用[workflow 快速路径]({{% ref "workflow-fast-path.md#leg-2-local-activity-drive" %}})后，只要 workflow Actor 确认其 janitor 兜底机制已就绪，activity 体就会在调度请求到达后立即运行，而无需一次性 reminder。在 placement 变更期间，activity Actor 可能会写入一条小的 `execution-claim` 记录，以便新的所有者能够区分仍在运行的执行与随宿主一同崩溃的执行。

### reminder 使用和执行保证

Dapr Workflow 通过使用 [Actor reminder]({{% ref "../actors/actors-timers-reminders.md##actor-reminders" %}})从瞬时系统故障中恢复，以此保证 workflow 的容错性。
在调用应用程序的 workflow 代码之前，workflow 或 activity Actor 会先创建一个新的 reminder。
这些 reminder 是“一次性”的，即在成功触发后即失效。
如果应用程序代码顺利执行，reminder 会被触发并失效。
但如果承载相关 workflow 或 activity 的节点或 sidecar 崩溃，reminder 会重新激活对应的 Actor，执行将被无限次重试。
失败投递的重试采用去相关抖动的指数退避（decorrelated jittered exponential backoff）来控制间隔，范围为 50 毫秒至 2 秒，这样一来，大量实例同时失败时就不会步调一致地同时重试。

启用[workflow 快速路径]({{% ref "workflow-fast-path.md" %}})预览功能后，每个事件的 reminder 会被替换为每个活跃 workflow instance 一个的单个循环“janitor” reminder。该 reminder 每 20 秒触发一次，驱动任何失去本地驱动方的轮次或 activity，并在实例完成时自行删除。若某次唤醒的本地驱动持续失败，则交由 janitor 处理；若 activity 驱动失败，则会升级回前文所述的一次性 `run-activity` reminder。无论哪种路径，恢复保证都是相同的。

状态已保存但其启动永远无法被处理的实例（例如其已提交的启动事件丢失），会以错误类型 `DAPR_WORKFLOW_UNSTARTABLE_STATE` 失败，而不会永远停留在 `PENDING` 状态；并且在读取实例状态时，若挂起的启动 reminder 已超期，则会重新驱动该启动。

{{< diagram name="workflow-actor-reminder-flow" width="85" >}}

### state store 使用

Dapr Workflow 在内部使用 Actor 驱动 workflow 的执行。
与任何 Actor 一样，这些 workflow Actor 将其状态存储在已配置的 Actor state store 中。
具体做法是：在 Dapr 配置中指定一个 state store component，然后在 `actors` 配置段的 `actorStateStore` 属性中引用该 state store。
请阅读[状态 API 参考]({{% ref state_api %}})和[Actor API 参考]({{% ref actors_api %}})，以了解更多关于 Actor state store 的信息。

任何支持 Actor 的 state store 都隐式支持 Dapr Workflow。

如[workflow Actor]({{% ref "workflow-architecture.md#workflow-actors" %}})一节所述，workflow 通过追加到历史日志的方式增量保存其状态。
workflow 的历史日志分布在多个 state store 键中，因此每个“checkpoint”只需追加最新的条目。

每个 checkpoint 的大小取决于 workflow 在进入空闲状态之前所调度的并发操作数量。因此，[顺序 workflow]({{% ref "workflow-overview.md#task-chaining" %}})对 state store 的批量更新较小，而[扇出/扇入 workflow]({{% ref "workflow-overview.md#fan-outfan-in" %}})则需要更大的批量。批量大小还会受到 workflow 在[调用 activity]({{% ref "workflow-features-concepts.md#workflow-activities" %}})或[调用 child workflow]({{% ref "workflow-features-concepts.md#child-workflows" %}})时的输入和输出大小的影响。

{{< diagram workflow-state-store-interactions >}}

不同的 state store 实现可能会隐式地对你可以编写的 workflow 类型施加限制。
例如，Azure Cosmos DB state store 将单个项的大小限制为 2 MB 的 UTF-8 编码 JSON（[来源](https://learn.microsoft.com/azure/cosmos-db/concepts-limits#per-item-limits)）。
activity 或 child workflow 的输入或输出负载会作为单条记录存储在 state store 中，因此 2 MB 的单项限制意味着 workflow 和 activity 的输入与输出都不能超过 2 MB 的 JSON 序列化数据。

同样，如果 state store 对批量事务的大小有所限制，这可能会限制 workflow 可以并行调度的操作数量。

workflow 状态（包括其全部历史）可以从 state store 中清除。
每个 Dapr SDK 都提供用于清除特定 workflow instance 全部 metadata 的 API。

#### state store 记录数

每次 workflow 运行在 state store 中保存为历史的记录数，取决于其复杂度或“形状”。换句话说，即 activity、timer、child workflow 等的数量。
下表给出了不同 workflow 任务所保存记录数的大致指南。
由于重试或并发，实际数量可能更多或更少。

| 任务类型 | 保存的记录数 |
| ----------|-------------------------|
| 启动 workflow | 5 条记录 |
| 调用 activity | 3 条记录 |
| timer | 3 条记录 |
| raise event | 3 条记录 |
| 启动 child workflow | 8 条记录 |

每个实例还会携带 `metadata` 和 `customStatus` 键，它们不会随历史增长。child workflow 在其终态提交与父 workflow 确认之间还会携带一个临时的 `parent-notify` 标记；若启用了 history signing，还会有一条 `creation-input` 记录。

#### 查询 workflow 历史

```bash
dapr workflow --app-id myapp list
dapr workflow --app-id myapp history <instance-id>
```

### 支持的 state store

workflow 引擎支持以下 state store：
- PostgreSQL
- MySQL
- SQL Server
- SQLite
- Oracle Database
- CockroachDB
- MongoDB
- Redis

## workflow 可扩展性

由于 Dapr Workflows 内部基于 Actor 实现，它们具有与 Actor 相同的可扩展性特征。
placement service：

- 不区分 workflow Actor 与你在应用程序中定义的 Actor
- 使用与 Actor 相同的算法对 workflow 进行负载均衡

workflow 的预期可扩展性由以下因素决定：

- 用于托管 workflow 应用程序的机器数量
- 运行 workflow 的机器上可用的 CPU 和内存资源
- 为 Actor 配置的 state store 的可扩展性
- Actor placement service 和 reminder 子系统的可扩展性

目标应用程序中 workflow 代码的实现细节，同样会影响单个 workflow instance 的可扩展性。
每个 workflow instance 在同一时间只会在一个节点上执行，但 workflow 可以调度在其他节点上运行的 activity 和 child workflow。

workflow 还可以并行调度这些 activity 和 child workflow，从而使单个 workflow 有可能将计算任务分布到集群中所有可用的节点上。

你可以按照下一节所述，使用 [Dapr 配置]({{% ref workflow-concurrency.md %}})来配置 workflow 和 activity 的最大并发数。

{{% alert title="重要" color="warning" %}}
默认情况下，workflow 和 activity 的并发数没有全局限制。
因此，如果某个失控的 workflow 试图并行调度过多任务，就可能耗尽集群中的所有资源。
编写会并行调度大量工作的 Dapr Workflows 时请务必谨慎。
{{% /alert %}}

{{% alert title="重要" color="warning" %}}
Dapr Workflow 引擎要求 workflow 应用的所有实例注册完全相同的一组 workflow 和 activity。
换句话说，无法单独对某些 workflow 或 activity 进行扩缩容。
应用中的所有 workflow 和 activity 都必须一起扩缩。
{{% /alert %}}

workflow 无法控制负载在集群中具体如何分布。
例如，如果一个 workflow 并行调度 10 个 activity 任务，这 10 个任务可能分布在多达 10 个不同的计算节点上，也可能全部运行在同一个计算节点上。
实际的扩展行为由 Actor placement service 决定，它管理代表 workflow 各项任务的 Actor 的分布。

{{< diagram workflow-actor-scale-out >}}

## workflow 延迟

为了提供持久性和 resiliency 保证，Dapr Workflows 会频繁写入 state store，并依赖 reminder 来驱动执行。
因此，Dapr Workflows 可能不适用于对延迟敏感的工作负载。
预期的高延迟来源包括：

- 持久化 workflow 状态时来自 state store 的延迟。
- 重新加载包含大型历史记录的 workflow 时来自 state store 的延迟。
- 集群中活跃 reminder 过多导致的延迟。
- 集群中 CPU 使用率过高导致的延迟。

有关 workflow Actor 的设计如何影响执行延迟的更多细节，请参阅[reminder 使用和执行保证]({{% ref "workflow-architecture.md#reminder-usage-and-execution-guarantees" %}})一节。

[workflow 快速路径]({{% ref "workflow-fast-path.md" %}})预览功能会移除每个事件的 reminder，并减少每个轮次中的大部分 state store 提交。启用该功能后，上述第一项和第三项主要影响故障后的恢复，而不是稳定运行时的轮次。

## 提高调度吞吐量

默认情况下，客户端调度 workflow 时，workflow 引擎会等待 workflow 完全启动后才向客户端返回响应。
在返回前等待 workflow 启动，会降低 workflow 的调度吞吐量。
调度带有开始时间的 workflow 时，workflow 引擎不会等待 workflow 启动就返回响应。
要提高调度吞吐量，可以考虑在调度 workflow 时将开始时间设为“现在”。
以下示例展示了在 Go SDK 中将开始时间设为“现在”来调度 workflow：

```go
client.ScheduleNewWorkflow(ctx, "MyCoolWorkflow", workflow.WithStartTime(time.Now()))
```

这一技巧可以加快客户端调度调用的返回速度。若要提高轮次本身的吞吐量，请参阅 [workflow 快速路径]({{% ref "workflow-fast-path.md" %}})。

## 在 Dapr Shared 中使用 workflow 时的 Workflows Clustered Deployment

{{% alert title="注意" color="primary" %}}
以下功能仅在启用 [Workflows Clustered Deployment 预览功能]({{% ref "preview-features.md" %}}) 时可用。
{{% /alert %}}

使用 [Dapr Shared]({{% ref "kubernetes-dapr-shared" %}}) 时，可能会有多个 daprd sidecar 运行在同一个负载均衡器或服务之后。
因此，接收工作的工作进程所在的实例，可能与接收工作结果的实例不是同一个。
Dapr 使用第三种 Actor 类型来处理这种场景：`dapr.internal.{namespace}.{appID}.executor`。
持有待处理工作项的 daprd 会为其结果注册一个进程内的等待器（waiter）。落在其他 daprd 上的结果会通过一次内部调用转发给 executor Actor。该 Actor 与正在等待的 workflow Actor 或 activity Actor 共享同一个 ID，因此 Actor placement 会将其解析到正在等待的主机上。在单副本情况下不会发生转发调用。
指标 `dapr_runtime_workflow_completion_route_count` 带有 `task_type` 和 `route`（`wait_local`、`wait_watch`、`complete_local`、`complete_actor`）标签，用于显示每个结果所走的路径；`wait_watch` 的持续高速率表明结果并未落在等待它的主机上。

## 后续步骤

{{< button text="编写 workflow >>" page="howto-author-workflow.md" >}}

## 相关链接

- [workflow 概述]({{% ref workflow-overview.md %}})
- [workflow 快速路径]({{% ref workflow-fast-path.md %}})
- [stateful workflow 客户端]({{% ref workflow-stateful-client.md %}})
- [workflow API 参考]({{% ref workflow_api.md %}})
- [尝试 workflow Quickstart]({{% ref workflow-quickstart.md %}})
- 尝试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
   - [JavaScript 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
