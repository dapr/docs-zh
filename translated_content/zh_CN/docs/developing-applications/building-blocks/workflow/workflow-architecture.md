---
type: docs
title: "工作流架构"
linkTitle: "工作流架构"
weight: 4000
description: "Dapr 工作流引擎架构"
---

[Dapr Workflows]({{% ref "workflow-overview.md" %}}) 允许开发者使用多种编程语言中的普通代码定义工作流。工作流引擎运行在 Dapr 边车内部，协调作为应用程序一部分部署的工作流代码。Dapr Workflows 构建于 Dapr Actors 之上，为工作流执行提供持久性和可扩展性。

本文介绍：

- Dapr Workflow 引擎的架构
- 工作流引擎如何与应用程序代码交互
- 工作流引擎如何融入整体 Dapr 架构
- 不同的工作流后端如何与工作流引擎协同工作

有关如何在应用程序中编写 Dapr Workflows 的更多信息，请参阅[如何：编写工作流]({{% ref "workflow-overview.md" %}})。

Dapr 工作流引擎内部由 Dapr 的 Actor 运行时驱动。下图展示了 Kubernetes 模式下的 Dapr Workflow 架构：

{{< diagram workflows-architecture-k8s >}}

要使用 Dapr Workflow 构建块，你需要使用 Dapr Workflow SDK 在应用程序中编写工作流代码。该 SDK 在内部通过 gRPC 流连接到边车，从而注册工作流以及工作流可以调度的工作流活动（即任务）。

引擎直接嵌入在边车中，并基于 [`durabletask-go`](https://github.com/dapr/durabletask-go) 框架库实现。该框架允许你替换不同的存储提供程序，其中包括为 Dapr 创建的、在幕后利用内部 Actor 的存储提供程序。由于 Dapr Workflows 使用 Actor，你可以将工作流状态存储在 state store 中。

## 边车交互

当工作流应用程序启动时，它会使用工作流编写 SDK 向 Dapr 边车发送 gRPC 请求，并获取工作流工作项的流，该流遵循[服务器流式 RPC 模式](https://grpc.io/docs/what-is-grpc/core-concepts/#server-streaming-rpc)。这些工作项可以是任何内容，从"启动新的 X 工作流"（其中 X 是工作流的类型）到"代表工作流 X 调度输入为 Z 的活动 Y 运行"。

工作流应用程序执行相应的工作流代码，然后向边车发送一个 gRPC 请求，其中包含执行结果。

{{< diagram name="workflow-engine-protocol" width="55" >}}

所有交互都通过单个 gRPC 通道进行，并由应用程序发起，这意味着应用程序不需要打开任何入站端口。
这些交互的细节由特定语言的 Dapr Workflow 编写 SDK 在内部处理。

边车通过该流发送的历史记录是增量的：工作者一旦为某个实例准备就绪（即已缓存其状态），边车便只发送自其上一轮次以来新增的事件，而不再发送整个历史记录。参见[有状态工作流客户端]({{% ref "workflow-stateful-client.md" %}})。

位于应用与边车之间的负载均衡器或代理可能会关闭没有流量的流。例如，AWS ALB 和 nginx 会在 60 秒后关闭空闲流，这会让工作者付出重新连接并重新发送完整历史记录的代价。为了保持流处于打开状态，工作者可以在打开流时声明 `WORKER_CAPABILITY_HEALTH_PING` 能力，此后边车每 30 秒会向其发送一次健康检查（health ping）。使用 1.19 版 Python、Java 和 .NET SDK，或 Go SDK v1.16（durabletask-go v0.15）构建的工作者都会声明该能力。边车会读取 `DAPR_WORKFLOW_HEALTH_PING_INTERVAL` 环境变量以覆盖检查间隔，但该变量仅供 Dapr 集成测试使用，不是受支持的设置。请参阅[环境变量参考]({{% ref environment %}})。

### 工作流与应用程序 Actor 交互的区别

如果你熟悉 Dapr Actor，可能会注意到工作流与边车的交互方式与应用程序定义的 Actor 有一些不同。

| Actor | 工作流 |
| ------ | --------- |
| 应用程序创建的 Actor 可以使用 HTTP 或 gRPC 与边车交互。 | 工作流仅使用 gRPC。由于工作流 gRPC 协议较为复杂，实现工作流时_必须_使用 SDK。 |
| Actor 操作由边车推送到应用程序代码。这要求应用程序监听特定的_应用端口_。 | 对于工作流，操作由应用程序通过流式协议从边车_拉取_。应用程序无需监听任何端口即可运行工作流。 |
| Actor 会向边车显式注册自己。 | 工作流不会向边车注册自己。嵌入式引擎不跟踪工作流类型。这一职责转而交由工作流应用程序及其 SDK 承担。 |

## 工作流分布式追踪

工作流引擎所使用的 [`durabletask-go`](https://github.com/dapr/durabletask-go) 核心使用 Open Telemetry SDK 编写分布式追踪。
这些追踪由 Dapr 边车自动捕获，并导出到已配置的 Open Telemetry 提供程序，例如 Zipkin。

引擎管理的每个工作流实例都表示为一个或多个 span。
其中有一个父 span 表示完整的工作流执行，还有针对各类任务的子 span，包括活动任务执行和持久定时器的 span。

> 工作流活动代码目前**无法**访问追踪上下文。

## 工作流 Actor

当工作流客户端连接到边车时，会注册两类 Actor 以支持工作流引擎：

- `dapr.internal.{namespace}.{appID}.workflow`
- `dapr.internal.{namespace}.{appID}.activity`

`{namespace}` 的值为 Dapr 命名空间，如果未配置命名空间，则默认为 `default`。
`{appID}` 的值为应用的 ID。
例如，如果你有一个名为 "wfapp" 的工作流应用，则工作流 Actor 的类型为 `dapr.internal.default.wfapp.workflow`，活动 Actor 的类型为 `dapr.internal.default.wfapp.activity`。

下图演示了工作流 Actor 在 Kubernetes 场景中的运作方式：

{{< diagram workflow-execution >}}

与用户定义的 Actor 一样，工作流 Actor 通过 Actor 放置服务提供的哈希查找表分布在集群中。
它们同样会维护自身状态并使用提醒。
但与应用程序代码中的 Actor 不同，这些工作流 Actor 嵌入在 Dapr 边车中。
应用程序代码完全不知道这些 Actor 的存在。

{{% alert title="注意" color="primary" %}}
只有在应用程序使用 Dapr Workflow SDK 注册过工作流之后，工作流 Actor 类型才会被注册。
如果应用从未注册任何工作流，内部的工作流 Actor 就永远不会被注册。
{{% /alert %}}

### 工作流 Actor

工作流使用两种不同类型的 Actor：工作流 Actor 和活动 Actor。
工作流 Actor 负责管理应用中运行的所有工作流的状态和放置位置。
每个被调度的工作流实例都会激活一个新的工作流 Actor 实例。
工作流 Actor 的 ID 即工作流的 ID。
该工作流 Actor 在工作流推进过程中存储其状态，并通过 Actor 查找表决定工作流代码在哪个节点上执行。

由于工作流基于 Actor 实现，所有工作流和活动工作都会由 Actor 放置表分布到实现工作流的应用的所有副本上。
默认情况下，工作流的启动位置与每个工作项的执行位置之间没有局部性或关联关系。
启用[工作流快速路径]({{% ref "workflow-fast-path.md" %}})预览功能后，提交事件的主机也会驱动随之产生的轮次，并且活动体会直接在其目标主机上执行，无需经由调度器进行一次提醒往返。

每个工作流 Actor 使用配置的 Actor state store 中的以下键来保存其状态：

| 键 | 描述 |
| --- | ----------- |
| `inbox-NNNNNN` | 工作流的收件箱实际上是一个先进先出（FIFO）队列，其中存放着驱动工作流执行的_消息_。示例消息包括工作流创建消息、活动任务完成消息等。每条消息都存储在 state store 中自己的键里，键名为 `inbox-NNNNNN`，其中 `NNNNNN` 是一个 6 位数字，表示消息的顺序。当工作流消费了相应的消息后，这些状态键就会被删除。 |
| `history-NNNNNN` | 工作流的历史是表示工作流执行过程的事件有序列表。历史中的每个键保存单个历史事件的数据。与仅追加日志一样，工作流历史事件只会被添加，从不删除（但执行“继续作为新”（continue as new）操作时除外，该操作会清除所有历史并以新输入重新启动工作流）。 |
| `customStatus` | 包含用户定义的工作流状态值。每个工作流 Actor 实例恰好有一个 `customStatus` 键。 |
| `metadata` | 以 JSON 块的形式包含工作流的元信息，例如收件箱长度、历史长度，以及表示工作流代次（generation）的 64 位整数。长度信息用于确定在加载或保存工作流状态更新时需要读取或写入哪些键。 |
| `parent-notify` | 与子工作流的终态在同一事务中写入的标记，记录父工作流尚未收到完成通知。父工作流确认后，该标记会被清除。标记存在期间，清除子工作流或复用其实例 ID 会因“未完成”而被拒绝。 |
| `creation-input` | 仅在启用[历史签名]({{% ref "workflow-history-signing.md" %}})时为子工作流写入：父工作流创建子工作流时使用的输入。它与历史分开保存，因此在 `continue as new` 之后依然存在，并可在完成结果被证明时与父工作流进行校验。 |

{{% alert title="警告" color="warning" %}}
工作流 Actor 的状态在工作流完成后仍保留在 state store 中。
创建大量工作流可能导致存储用量无限增长。
为解决此问题，请使用[清除 API]({{% ref "workflow_api.md#purge-workflow-request" %}})清除工作流，或配置[工作流保留策略]({{% ref workflow-history-retention-policy.md %}})以自动清理已完成的工作流状态。
{{% /alert %}}

下图说明了工作流 Actor 的典型生命周期。

{{< diagram name="workflow-actor-flowchart" width="70" >}}

概括如下：

1. 工作流 Actor 在收到新消息时被激活。
1. 新消息随后触发（在你的应用程序中）相关的工作流代码运行，并将执行结果返回给工作流 Actor。
1. 收到结果后，Actor 根据需要调度任何任务。
1. 调度完成后，Actor 更新其在 state store 中的状态。
1. 最后，Actor 进入空闲状态，直到收到另一条消息。在此空闲期间，边车可能会决定将工作流 Actor 从内存中卸载。

### 活动 Actor

活动 Actor 负责管理所有工作流活动调用的状态和放置位置。
每当工作流调度一个活动任务，就会激活一个新的活动 Actor 实例。
活动 Actor 的 ID 由工作流的 ID、活动的任务 ID（任务 ID 从 0 开始）以及一个固定的末尾 `0` 组成，三者以 `::` 连接。
例如，如果工作流的 ID 为 `876bf371`，并且调度了它的第三个活动，则该活动 Actor 的 ID 为 `876bf371::2::0`。
第三个部分是为了与早期版本保持兼容而保留的：早期版本在此处写入的是工作流代次（generation），现在它已不再携带任何信息。
任务 ID 在工作流使用 `continue as new` 时会从 0 重新开始，因此后续代次会复用相同的活动 Actor ID。引擎通过调度事件和完成事件中携带的任务执行 ID 来区分不同的执行。

活动 Actor 本身不存储任何状态，所有结果数据都会发送回父工作流 Actor。唯一的例外是[工作流快速路径]({{% ref "workflow-fast-path.md#execution-claim-record" %}})：当 Actor 放置将正在运行的执行迁移到另一台主机时，活动 Actor 会写入一条短暂存在的 `execution-claim` 记录。

下图说明了活动 Actor 的典型生命周期。

{{< diagram name="workflow-activity-actor-flowchart" width="85" >}}

活动 Actor 是短暂存在的：

1. 当工作流 Actor 调度活动任务时，活动 Actor 被激活。
1. 活动 Actor 随即调用工作流应用程序，以执行相关的活动代码。
1. 活动代码运行完毕并返回其结果后，活动 Actor 会向父工作流 Actor 发送一条包含执行结果的消息。
1. 随后，活动 Actor 停用自身。
1. 结果发送后，工作流被触发，继续进入下一步。

启用[工作流快速路径]({{% ref "workflow-fast-path.md#leg-2-local-activity-drive" %}})后，只要工作流 Actor 确认其 janitor 兜底机制已就绪，活动体就会在调度请求到达后立即运行，而无需一次性提醒。在放置变更期间，活动 Actor 可能会写入一条小的 `execution-claim` 记录，以便新的所有者能够区分仍在运行的执行与随宿主一同崩溃的执行。

### 提醒使用和执行保证

Dapr Workflow 通过使用 [Actor 提醒]({{% ref "../actors/actors-timers-reminders.md##actor-reminders" %}})从瞬态系统故障中恢复，以此保证工作流的容错性。
在调用应用程序的工作流代码之前，工作流或活动 Actor 会先创建一个新提醒。
这些提醒是“一次性”的，意味着它们在成功触发后即失效。
如果应用程序代码顺利执行，提醒会被触发并失效。
但如果托管相关工作流或活动的节点或边车崩溃，提醒会重新激活对应的 Actor，并且执行会被无限次重试。
失败投递的重试以去相关抖动的指数退避（decorrelated jittered exponential backoff）进行间隔控制，范围为 50 毫秒至 2 秒，这样一来，大量实例同时失败时就不会步调一致地同时重试。

启用[工作流快速路径]({{% ref "workflow-fast-path.md" %}})预览功能后，每个事件的提醒会被针对每个活动工作流实例的单个循环“janitor”提醒所取代。该提醒每 20 秒触发一次，驱动任何失去本地驱动者的轮次或活动，并在实例完成时自行删除。若某次唤醒的本地驱动持续失败，则交由 janitor 处理；若活动驱动失败，则会升级回上述一次性的 `run-activity` 提醒。无论哪种路径，恢复保证都是相同的。

状态已保存但其启动永远无法被处理的实例（例如其已提交的启动事件丢失），会以错误类型 `DAPR_WORKFLOW_UNSTARTABLE_STATE` 失败，而不会永远停留在 `PENDING` 状态；并且在读取实例状态时，若挂起的启动提醒已超期，则会重新驱动该启动。

{{< diagram name="workflow-actor-reminder-flow" width="85" >}}

### state store 使用

Dapr Workflow 在内部使用 Actor 驱动工作流的执行。
与任何 Actor 一样，这些工作流 Actor 将其状态存储在已配置的 Actor state store 中。
具体做法是：在 Dapr 配置中指定一个 state store 组件，然后在 `actors` 配置段的 `actorStateStore` 属性中引用该 state store。
请阅读[状态 API 参考]({{% ref state_api %}})和[Actor API 参考]({{% ref actors_api %}})，以了解更多关于 Actor state store 的信息。

任何支持 Actor 的 state store 都隐式地支持 Dapr Workflow。

如[工作流 Actor]({{% ref "workflow-architecture.md#工作流-actor" %}})一节所述，工作流通过追加到历史日志来增量保存其状态。
工作流的历史日志分布在多个 state store 键中，因此每个“检查点”只需追加最新的条目。

每个检查点的大小取决于工作流在进入空闲状态之前所调度的并发操作数量。因此，[顺序工作流]({{% ref "workflow-overview.md#task-chaining" %}})对 state store 的批量更新较小，而[扇出/扇入工作流]({{% ref "workflow-overview.md#fan-outfan-in" %}})则需要更大的批量。批量大小还会受到工作流[调用活动]({{% ref "workflow-features-concepts.md#workflow-activities" %}})或[子工作流]({{% ref "workflow-features-concepts.md#child-workflows" %}})时的输入和输出大小的影响。

{{< diagram workflow-state-store-interactions >}}

不同的 state store 实现可能会隐式地对你可以编写的工作流类型施加限制。
例如，Azure Cosmos DB state store 将单个项的大小限制为 2 MB 的 UTF-8 编码 JSON（[来源](https://learn.microsoft.com/azure/cosmos-db/concepts-limits#per-item-limits)）。
活动或子工作流的输入或输出负载会作为单条记录存储在 state store 中，因此 2 MB 的单项限制意味着工作流和活动的输入与输出都不能超过 2 MB 的 JSON 序列化数据。

同样，如果 state store 对批量事务的大小有所限制，这可能会限制工作流可调度的并行操作数量。

工作流状态（包括其全部历史）可以从 state store 中清除。
每个 Dapr SDK 都提供用于清除特定工作流实例全部元数据的 API。

#### state store 记录数

每次工作流运行在 state store 中保存为历史的记录数，取决于其复杂度或“形状”。换句话说，即活动、定时器、子工作流等的数量。
下表给出了不同工作流任务所保存记录数的大致指南。
由于重试或并发情况，实际数量可能更多或更少。

| 任务类型 | 保存的记录数 |
| ----------|-------------------------|
| 启动工作流 | 5 条记录 |
| 调用活动 | 3 条记录 |
| 定时器 | 3 条记录 |
| 引发事件 | 3 条记录 |
| 启动子工作流 | 8 条记录 |

每个实例还会携带 `metadata` 和 `customStatus` 键，它们不会随历史增长。子工作流在其终态提交与父工作流确认之间还会携带一个临时的 `parent-notify` 标记；若启用了历史签名，还会有一条 `creation-input` 记录。

#### 查询工作流历史

```bash
dapr workflow --app-id myapp list
dapr workflow --app-id myapp history <instance-id>
```

### 支持的 state store

工作流引擎支持以下 state store：
- PostgreSQL
- MySQL
- SQL Server
- SQLite
- Oracle Database
- CockroachDB
- MongoDB
- Redis

## 工作流可扩展性

由于 Dapr Workflow 内部基于 Actor 实现，它具有与 Actor 相同的可扩展性特征。
放置服务：

- 不区分工作流 Actor 与你在应用程序中定义的 Actor
- 使用与 Actor 相同的算法对工作流进行负载均衡

工作流的预期可扩展性取决于以下因素：

- 用于托管工作流应用程序的机器数量
- 运行工作流的机器上可用的 CPU 和内存资源
- 为 Actor 配置的 state store 的可扩展性
- Actor 放置服务和提醒子系统的可扩展性

目标应用程序中工作流代码的实现细节，也会影响单个工作流实例的可扩展性。
每个工作流实例同一时间只会在一个节点上执行，但工作流可以调度在其他节点上运行的活动和子工作流。

工作流还可以并行调度这些活动和子工作流，使单个工作流有可能将计算任务分布到集群中所有可用的节点上。

你可以按下一节所述，使用 [Dapr 配置]({{% ref workflow-concurrency.md %}})来配置工作流和活动的最大并发数。

{{% alert title="重要" color="warning" %}}
默认情况下，工作流和活动的并发数没有全局限制。
因此，如果某个失控的工作流试图并行调度过多任务，就可能耗尽集群中的所有资源。
在编写会并行调度大批工作的 Dapr Workflow 时，请务必谨慎。
{{% /alert %}}

{{% alert title="重要" color="warning" %}}
Dapr 工作流引擎要求工作流应用的所有实例注册完全相同的一组工作流和活动。
换句话说，无法单独扩展某些工作流或活动。
应用中的所有工作流和活动都必须一起扩展。
{{% /alert %}}

工作流无法控制负载在集群中分布的具体细节。
例如，如果一个工作流并行调度 10 个活动任务，这 10 个任务可能分布在多达 10 个不同的计算节点上，也可能全部运行在一个计算节点上。
实际的扩展行为由 Actor 放置服务决定，它管理着代表工作流各个任务的 Actor 的分布。

{{< diagram workflow-actor-scale-out >}}

## 工作流延迟

为了提供持久性和弹性保证，Dapr Workflow 会频繁写入 state store，并依赖提醒来驱动执行。
因此，Dapr Workflow 可能不适用于对延迟敏感的工作负载。
预期的高延迟来源包括：

- 持久化工作流状态时，state store 的延迟。
- 重新加载带有大型历史记录的工作流时，state store 的延迟。
- 集群中活动提醒过多所导致的延迟。
- 集群中 CPU 使用率过高所导致的延迟。

有关工作流 Actor 的设计如何影响执行延迟的更多细节，请参阅[提醒使用和执行保证]({{% ref "workflow-architecture.md#提醒使用和执行保证" %}})一节。

[工作流快速路径]({{% ref "workflow-fast-path.md" %}})预览功能会移除每个事件的提醒，并减少每个轮次中的大部分 state store 提交。启用该功能后，上述第一项和第三项主要影响的是故障后的恢复，而不是稳定运行时的轮次。

## 提高调度吞吐量

默认情况下，客户端调度工作流时，工作流引擎会等待工作流完全启动后才向客户端返回响应。
在返回前等待工作流启动，会降低工作流的调度吞吐量。
调度带有开始时间的工作流时，工作流引擎不会等待工作流启动就返回响应。
要提高调度吞吐量，可以考虑在调度工作流时将开始时间设为“现在”。
以下示例展示了在 Go SDK 中将开始时间设为“现在”来调度工作流：

```go
client.ScheduleNewWorkflow(ctx, "MyCoolWorkflow", workflow.WithStartTime(time.Now()))
```

这一技巧可以加快客户端调度调用的返回速度。若要提高轮次本身的吞吐量，请参阅[工作流快速路径]({{% ref "workflow-fast-path.md" %}})。

## 在 Dapr Shared 中使用工作流时的工作流集群部署

{{% alert title="注意" color="primary" %}}
以下功能仅在启用[工作流集群部署预览功能]({{% ref "preview-features.md" %}})时可用。
{{% /alert %}}

使用 [Dapr Shared]({{% ref "kubernetes-dapr-shared" %}}) 时，可能会有多个 daprd 边车运行在同一个负载均衡器或服务之后。
因此，接收工作的工作者所在的实例，可能与接收工作结果的实例不是同一个。
Dapr 使用第三种 Actor 类型来处理这种场景：`dapr.internal.{namespace}.{appID}.executor`。
持有待处理工作项的 daprd 会为其结果注册一个进程内的等待器（waiter）。落在其他 daprd 上的结果会通过一次内部调用转发给 executor Actor。该 Actor 与正在等待的工作流 Actor 或活动 Actor 共享同一个 ID，因此 Actor 放置会将其解析到正在等待的主机上。在单副本情况下不会发生转发调用。
指标 `dapr_runtime_workflow_completion_route_count` 带有 `task_type` 和 `route`（`wait_local`、`wait_watch`、`complete_local`、`complete_actor`）标签，用于显示每个结果所走的路径；`wait_watch` 的持续高速率表明结果并未落在等待它的主机上。

## 后续步骤

{{< button text="编写工作流 >>" page="howto-author-workflow.md" >}}

## 相关链接

- [工作流概述]({{% ref workflow-overview.md %}})
- [工作流快速路径]({{% ref workflow-fast-path.md %}})
- [有状态工作流客户端]({{% ref workflow-stateful-client.md %}})
- [工作流 API 参考]({{% ref workflow_api.md %}})
- [尝试工作流快速入门]({{% ref workflow-quickstart.md %}})
- 尝试以下示例：
   - [Python](https://github.com/dapr/python-sdk/tree/main/examples/workflow)
   - [JavaScript 示例](https://github.com/dapr/js-sdk/tree/main/examples/workflow)
   - [.NET](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow)
   - [Java](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/workflows)
   - [Go 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow/README.md)
