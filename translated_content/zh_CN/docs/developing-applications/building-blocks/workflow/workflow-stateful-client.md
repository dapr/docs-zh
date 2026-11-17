---
type: docs
title: "stateful workflow 客户端"
linkTitle: "有状态客户端"
weight: 2700
description: "workflow SDK 如何缓存已提交的历史，使 sidecar 每一轮只发送新增事件"
---

每当 workflow 取得进展时，Dapr sidecar 都会把 workflow SDK 将 workflow 重放到当前位置所需的历史交给它。过去的做法是每一轮都发送该实例的**全部已提交历史**，因此随着 workflow 不断增长，同样的事件会被反复序列化、传输和反序列化。

stateful workflow 客户端消除了这种重复。SDK 的 workflow worker 会在内存中保留它已经重放过的历史，并告知 sidecar 它可以这样做；随后 sidecar 只发送自上一轮以来新增的事件。

{{% alert title="注意" color="primary" %}}
stateful workflow 客户端从 Dapr v1.19 起可用，并且在支持它的 SDK 中**默认启用**（参见[版本兼容性](#版本兼容性)）。无需配置 sidecar，也无需修改应用代码即可受益。Python、.NET 和 Java SDK 另外提供了禁用或调优它的选项，下文会介绍。在 Go 中，这些选项位于 durabletask-go 客户端上，而不是 Go SDK 的 workflow 客户端上。JavaScript SDK 不支持 stateful workflow 客户端。
{{% /alert %}}

## 为什么重要

workflow 的历史只会增长。每次 activity 调用、timer 和外部事件都会追加到历史中，而 workflow 在每一轮都要从这段历史重放。

如果每一轮都发送完整历史，单轮的开销就会随整个 workflow 的长度增长。一个运行到第一百轮的 workflow，会重新接收前九十九轮的全部内容。这份开销要付出三次：sidecar 要序列化历史，连接要传输历史，worker 要反序列化历史。

使用 stateful workflow 客户端后，一个已经"预热"的 worker 只接收自上一轮以来提交的事件，通常只有少量，与 workflow 已运行多久无关。每一轮的历史负载不再随 workflow 长度增长。

受益最大的是历史不断累积的 workflow：

- 长时间运行的 workflow，以及包含大型循环的 workflow。
- 运行数天甚至更久的监控模式（Monitor pattern）workflow 与永续 workflow。
- 收集大量 activity 完成结果的扇出/扇入 workflow。

举个具体的例子：Dapr 的集成测试运行一个包含 40 个顺序 activity 的 workflow。其中至多两轮以完整历史发送，其余每一轮都以增量（delta）发送。

## 工作原理

worker 打开其工作项流时，会声明它在两轮之间保留历史。sidecar 按流记录这一信息，并跟踪每个已连接的流已被发送了多少已提交历史。在之后的轮次中，sidecar 会省略 worker 已经持有的前缀，并告知 worker 它省略了多少个事件。

{{< mermaid >}}
sequenceDiagram
    participant W as Workflow SDK worker
    participant S as Dapr sidecar
    W->>S: GetWorkItems<br/>capabilities: STATEFUL_HISTORY
    Note over S: 流被标记为<br/>保留历史
    S->>W: 第 1 轮：完整历史<br/>（已提交历史仍为空）
    Note over W: 缓存历史<br/>刚刚重放的部分
    S->>W: 第 2 轮：完整历史<br/>（预热尚未完成）
    Note over W: 缓存历史<br/>刚刚重放的部分
    S->>W: 第 3 轮起：<br/>cachedHistory.eventCount = n<br/>pastEvents = 仅增量
    Note over W: 重放缓存的前缀<br/>加上增量
{{< /mermaid >}}

两个独立的状态共同实现了这一机制：

- **sidecar** 只保存一个水位线（watermark）：按实例记录该流已发送了多少个已提交事件。
- **worker** 保存实际的事件。

两者都只限于单个工作项流，且都不做持久化。

### 前两轮总是完整发送

sidecar 只有在准备好工作项之后才会记录其水位线，因此会有一个简短的预热过程：

- **第 1 轮** 从空的已提交历史开始，没有可省略的内容，水位线记为零。
- **第 2 轮** 已经有了真实的已提交历史，但水位线仍为零，因此仍然没有 worker 已知持有的前缀。
- **第 3 轮起** 水位线非零，sidecar 开始发送增量。

每当 worker 冷启动（包括重新连接之后）时，都会重复这一预热过程。

### 缓存命中与未命中

worker 在使用每个增量之前都会对其进行校验：它缓存的事件数必须与 sidecar 声明省略的数量完全一致。如果不一致，或者根本没有缓存，worker 就视为缓存未命中，并通过 `GetInstanceHistory` 调用从 sidecar 获取完整历史。

{{< diagram name="workflow-stateful-client" width="75" >}}

一次缓存未命中只多花一次调用，并且总是安全的，这正是缓存可以自由被逐出的原因。

### 何时丢弃缓存的历史

worker 会在以下情况释放某个实例的缓存历史：

- **实例结束。** 完成、失败、终止以及 continue-as-new 都会结束当前执行，此后缓存的历史不再延伸。
- **条目闲置。** 每个条目都有一个滑动的生存时间（TTL），每一轮都会刷新，用于回收那些不再接收轮次又未完成的实例所占用的内存。
- **达到缓存上限。** 最近最少使用的条目会被优先逐出，从而保留活跃的工作集。
- **流重新连接。** 缓存只在工作项流存在期间有效。重新连接的 worker 会冷启动，并以完整历史重新预热。

## 不会改变什么

**你的 workflow 代码。** 这是 sidecar 与 SDK 之间的传输优化。workflow 和 activity 代码不受影响，重放的行为与之前完全相同。

**正确性。** sidecar 只会省略它先前已发送到同一个流上的前缀，因此缓存的前缀加上增量，按构造就等于 sidecar 所持有的历史。另外三重独立的回退机制保护其余部分：

- 长度与预期不符的前缀被视为未命中，并通过完整获取来恢复。
- 历史缩短（例如在 continue-as-new 时）绝不会产生增量，而是整体重新发送。
- 落在其他任何流上的轮次在该流上找不到水位线，因此会整体重新发送。

**负载大小限制。** 增量发送减少了通过网络传输的数据量，但并不会提高历史大小的实际上限。sidecar 在把工作项缩减为增量之前，会使用状态中保存的完整历史，依据[最大消息体大小]({{% ref "workflow-payload-size.md" %}})检查 workflow 的大小。因此，历史非常庞大的 workflow 仍会在同一位置停滞，即便本应发送的增量很小。这一检查是刻意保守的：检查执行时，sidecar 还不知道哪个 worker 会接收此轮，而对该实例处于冷状态的 worker，总是发送完整历史。

## 运行多个 worker

当多个 worker，或同一应用的多个副本，连接到同一个 sidecar 时，sidecar 会优先把某个实例的轮次路由回已经持有其历史的流。它使用会合哈希（rendezvous hashing）来做到这一点，因此当 worker 加入或离开时，只有一小部分实例会更换归属，大多数缓存得以保留。

有几点值得了解：

- **亲和性是一种偏好，而非约束。** 如果首选的 worker 忙碌或已经不存在，该轮会在短暂等待后交给另一个 worker，而那个 worker 只会收到完整历史。吞吐量与活性始终优先于缓存命中。
- **热状态只属于一个 sidecar。** 实例由哪个 sidecar 持有，由 Actor placement 决定。缓存的历史绝不会在 sidecar 之间转移。
- **worker 重启是安全的。** 新的或重新连接的 worker 会冷启动，以完整历史重新预热，然后恢复接收增量。

## 启用与禁用

stateful workflow 客户端默认启用。如果你的 worker 内存受限，或者在调试时想排除它的影响，可以考虑禁用它。

{{< tabpane text=true >}}

{{% tab header="Python" %}}

```python
from dapr.ext.workflow import WorkflowRuntime

runtime = WorkflowRuntime(disable_stateful_history=True)
```

{{% /tab %}}

{{% tab header=".NET" %}}

```csharp
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<MyWorkflow>();
    options.DisableStatefulHistory = true;
});
```

{{% /tab %}}

{{% tab header="Java" %}}

```java
WorkflowRuntime runtime = new WorkflowRuntimeBuilder()
    .registerWorkflow(MyWorkflow.class)
    .withStatefulHistoryDisabled(true)
    .build();
```

{{% /tab %}}

{{% tab header="Go" %}}

Go SDK 的 workflow 客户端（`client.NewWorkflowClient`）没有禁用该功能的选项。要禁用它，请在 durabletask-go 客户端上运行 worker，并传入 `WithStatefulHistoryDisabled`。该客户端在 `task.TaskRegistry` 上注册 workflow，因此 workflow 函数接收的是 `*task.WorkflowContext`。

```go
import (
	"context"
	"log"

	"github.com/dapr/durabletask-go/backend"
	dtclient "github.com/dapr/durabletask-go/client"
	"github.com/dapr/durabletask-go/task"
	"github.com/dapr/go-sdk/client"
)

daprClient, err := client.NewClient()
if err != nil {
	log.Fatal(err)
}

registry := task.NewTaskRegistry()
if err := registry.AddWorkflow(MyWorkflow); err != nil {
	log.Fatal(err)
}

worker := dtclient.NewTaskHubGrpcClient(daprClient.GrpcClientConn(), backend.DefaultLogger(),
	dtclient.WithStatefulHistoryDisabled(),
)
if err := worker.StartWorkItemListener(context.Background(), registry); err != nil {
	log.Fatal(err)
}
```

{{% /tab %}}

{{< /tabpane >}}

禁用该功能的 worker 不会声明这一能力，因此 sidecar 每一轮都会发送完整历史，worker 也不保留任何缓存。

## 调整缓存

默认值适用于大多数应用，通常无需更改。

{{< table "table table-striped" >}}

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| 有状态历史记录 | 已启用 | worker 是否在两轮之间保留历史。 |
| 缓存生存时间 | 1 小时 | 实例缓存历史的滑动过期时间，每一轮都会刷新。 |
| 最大实例数 | 100,000 | 一个流上最多可缓存多少个实例。最近最少使用的条目会被优先逐出。 |
| 最大字节数 | 不限 | 缓存的可选内存预算。最近最少使用的条目会被优先逐出。 |

{{< /table >}}

每一项上限都可以安全触发：被逐出的条目只会在该实例下一次运行时多花一次 `GetInstanceHistory` 调用。

{{% alert title="设置字节预算并非没有代价" color="warning" %}}
只有在配置了最大字节预算时，worker 才会测量历史的序列化大小。因此，设置它会在每一轮重新引入一次完整历史的序列化过程，而这正是本功能要消除的开销之一。优先使用生存时间和实例数量上限；只有当 worker 内存确实是瓶颈时，才设置字节预算。
{{% /alert %}}

{{< tabpane text=true >}}

{{% tab header="Python" %}}

```python
from dapr.ext.workflow import WorkflowRuntime

runtime = WorkflowRuntime(
    history_cache_ttl=600,
    history_cache_max_instances=10_000,
    history_cache_max_bytes=256 * 1024 * 1024,
)
```

{{% /tab %}}

{{% tab header=".NET" %}}

```csharp
builder.Services.AddDaprWorkflow(options =>
{
    options.RegisterWorkflow<MyWorkflow>();
    options.HistoryCacheTtl = TimeSpan.FromMinutes(10);
    options.HistoryCacheMaxInstances = 10_000;
    options.HistoryCacheMaxBytes = 256L * 1024 * 1024;
});
```

{{% /tab %}}

{{% tab header="Java" %}}

```java
WorkflowRuntime runtime = new WorkflowRuntimeBuilder()
    .registerWorkflow(MyWorkflow.class)
    .withHistoryCacheTtl(Duration.ofMinutes(10))
    .withHistoryCacheMaxInstances(10_000)
    .withHistoryCacheMaxBytes(256L * 1024 * 1024)
    .build();
```

{{% /tab %}}

{{% tab header="Go" %}}

缓存选项同样位于 durabletask-go 客户端的构造函数上。使用 `worker.StartWorkItemListener` 启动 worker，方式与 [启用与禁用](#启用与禁用) 下的示例相同。

```go
import (
	"log"
	"time"

	"github.com/dapr/durabletask-go/backend"
	dtclient "github.com/dapr/durabletask-go/client"
	"github.com/dapr/go-sdk/client"
)

daprClient, err := client.NewClient()
if err != nil {
	log.Fatal(err)
}

worker := dtclient.NewTaskHubGrpcClient(daprClient.GrpcClientConn(), backend.DefaultLogger(),
	dtclient.WithWorkflowHistoryCacheTTL(10*time.Minute),
	dtclient.WithWorkflowHistoryCacheMaxInstances(10_000),
	dtclient.WithWorkflowHistoryCacheMaxBytes(256*1024*1024),
)
```

Go 还提供了 janitor 清扫间隔的设置，其他 SDK 则将其固定为一分钟：

```go
dtclient.WithWorkflowHistoryCacheSweepInterval(30 * time.Second)
```

{{% /tab %}}

{{< /tabpane >}}

## 版本兼容性

stateful workflow 客户端需要 Dapr v1.19 或更高版本的 sidecar，以及使用以下 SDK 之一构建的 worker：

- **Python、Java 和 .NET：** SDK 1.19 或更高版本。
- **Go：** Go SDK v1.16.0 或更高版本；若直接使用 durabletask-go，则需 v0.15.0 或更高版本。
- **JavaScript：** 不支持。JavaScript SDK 的 workflow 引擎不使用共享的 durabletask 客户端库，因此其 worker 每一轮都会收到完整历史。

该功能按连接协商，因此混合版本会退回到之前的行为，无需任何配置，也不会报错：

- **较新的 SDK 搭配较旧的 sidecar。** sidecar 会忽略它不认识的能力，并且从不发送增量。worker 收到的是完整历史，与之前完全一致。
- **较旧的 SDK 搭配较新的 sidecar。** worker 不声明任何能力，因此 sidecar 会向它发送完整历史。
- **同一 sidecar 上的混合 worker。** 支持情况按连接跟踪，因此支持该功能的 worker 接收增量，而不支持的 worker 同时接收完整历史。

## 后续步骤

在[workflow 架构]({{% ref "workflow-architecture.md" %}})概述中了解 sidecar 与 workflow SDK 如何通信。

{{< button text="workflow 模式 >>" page="workflow-patterns.md" >}}

## 相关链接

- [workflow 架构]({{< ref workflow-architecture.md >}})
- [workflow 负载大小]({{< ref workflow-payload-size.md >}})
- [workflow 功能与概念]({{< ref workflow-features-concepts.md >}})
- [workflow 概述]({{< ref workflow-overview.md >}})
- [如何编写 workflow]({{< ref howto-author-workflow.md >}})
