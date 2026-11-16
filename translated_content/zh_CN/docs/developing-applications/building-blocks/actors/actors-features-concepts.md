---
type: docs
title: "Actor 运行时功能"
linkTitle: "运行时功能"
weight: 20
description: "了解 Dapr 中 Actor 的功能和概念"
aliases:
  - "/zh-hans/developing-applications/building-blocks/actors/actors-background"
---

既然你已经从高层次了解了 [Actor 构建块]({{% ref "actors-overview" %}})，现在让我们深入探讨 Dapr 中 Actor 所包含的功能和概念。

## Actor 生命周期

Dapr Actor 是虚拟的，这意味着它们的生命周期与其内存中的表示形式无关。因此，它们不需要被显式创建或销毁。Dapr Actor 运行时会在首次收到针对某个 Actor ID 的请求时自动激活该 Actor。如果 Actor 在一段时间内未被使用，Dapr Actor 运行时会回收其内存中的对象。它还会保留 Actor 存在的相关信息，以便之后需要时重新激活。

调用 Actor 方法、定时器和提醒会重置 Actor 的空闲时间。例如，提醒触发会使 Actor 保持活动状态。
- Actor 提醒无论 Actor 处于活动状态还是非活动状态都会触发。如果为非活动 Actor 触发，它会先激活该 Actor。
- Actor 定时器触发会重置空闲时间；但是，定时器仅在 Actor 处于活动状态时才会触发。

Dapr 运行时用于判断 Actor 是否可以被垃圾回收的空闲超时和扫描间隔是可配置的。当 Dapr 运行时调用 Actor 服务以获取支持的 Actor 类型时，可以传递此信息。

由于虚拟 Actor 模型的特点，这种虚拟 Actor 生命周期抽象存在一些注意事项；实际上，Dapr Actors 的实现有时会偏离该模型。

首次向某个 Actor ID 发送消息时，该 Actor 会被自动激活（这会构造一个 Actor 对象）。一段时间后，该 Actor 对象会被垃圾回收。之后再次使用该 Actor ID 时，会构造一个新的 Actor 对象。Actor 的状态比对象的生命周期更长，因为状态存储在为 Dapr 运行时配置的状态提供程序中。

## 分布和故障转移

为了提供可扩展性和可靠性，Actor 实例分布在整个集群中，Dapr 会根据需要自动将它们从故障节点迁移到健康节点。

Actor 分布在 Actor 服务的各个实例中，而这些实例又分布在集群中的各个节点上。每个服务实例包含给定 Actor 类型的一组 Actor。

### Actor 放置服务

Dapr Actor 运行时通过 Actor `Placement` 服务为你管理分布方案和键范围设置。当创建服务的新实例时：

1. 边车调用 Actor 服务，以检索已注册的 Actor 类型和配置设置。
1. 相应的 Dapr 运行时注册其可以创建的 Actor 类型。
1. `Placement` 服务计算给定 Actor 类型在所有实例中的分区。

每个 Actor 类型的分区数据表都会在环境中运行的每个 Dapr 实例中更新和存储，并且会随着 Actor 服务实例的创建和销毁而动态变化。

{{< diagram actors-placement-registration >}}

当客户端调用具有特定 ID 的 Actor（例如，actor id 123）时，客户端的 Dapr 实例会对 Actor 类型和 ID 进行哈希处理，并利用该结果调用能够处理该特定 Actor ID 请求的对应 Dapr 实例。因此，对于任何给定的 Actor ID，始终会调用同一个分区（或服务实例）。下图展示了这一点。

{{< diagram actors-id-hashing >}}

这种设计简化了一些选择，但也需要注意以下几点：

- 默认情况下，Actor 会被随机放置到 pod 中，从而实现均匀分布。
- 由于 Actor 是随机放置的，因此应当预期 Actor 操作总是需要网络通信，包括方法调用数据的序列化和反序列化，从而带来延迟和开销。

{{% alert title="注意" color="primary" %}}
 注意：Dapr Actor Placement 服务仅用于 Actor 放置，因此如果你的服务没有使用 Dapr Actor，则不需要它。Placement 服务可以在所有[托管环境]({{% ref hosting %}})中运行，包括自托管和 Kubernetes 模式。在自托管和 Kubernetes 两种模式下，Actor 放置也可以由 [Scheduler 服务]({{% ref "placement#serving-placement-from-the-scheduler-service" %}})提供，而不必使用独立的 Placement 服务。这对应用程序和边车而言是透明的。
{{% /alert %}}

## Actor 通信

你可以通过调用 HTTP 端点与 Dapr 交互，以调用 Actor 方法。

```bash
POST/GET/PUT/DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/<method/state/timers/reminders>
```

你可以在请求正文中为 Actor 方法提供任意数据，请求的响应会放在响应正文中，即来自 Actor 调用的数据。

另一种可能更方便的与 Actor 交互的方式是通过 SDK。Dapr 目前支持 [.NET]({{% ref "dotnet-actors" %}})、[Java]({{% ref "java#actors" %}}) 和 [Python]({{% ref "python-actor" %}}) 的 Actor SDK。

有关更多详细信息，请参阅 [Dapr Actor 功能]({{% ref howto-actors %}})。

### 并发

Dapr Actor 运行时为访问 Actor 方法提供了一种简单的基于轮次的访问模型。这意味着在任何时候，Actor 对象的代码中都只能有一个线程处于活动状态。基于轮次的访问大大简化了并发系统，因为无需为数据访问使用同步机制。这也意味着，系统设计时必须特别考虑每个 Actor 实例的单线程访问特性。

单个 Actor 实例一次不能处理多个请求。如果期望一个 Actor 实例处理并发请求，它可能会成为吞吐量瓶颈。

如果两个 Actor 之间存在循环请求，同时又有外部请求发给其中某个 Actor，这些 Actor 之间就可能相互死锁。Dapr Actor 运行时会在 Actor 调用时自动超时，并向调用方抛出异常，以中断可能出现的死锁情况。

{{< diagram name="actors-communication" width="80" >}}

#### 重入

要允许 Actor “重入”并调用其自身的方法，请参阅 [Actor 重入]({{%ref actor-reentrancy%}})。

### 基于轮次的访问

一个轮次包括：响应来自其他 Actor 或客户端的请求而对 Actor 方法进行的完整执行，或定时器/提醒回调的完整执行。尽管这些方法和回调都是异步的，但 Dapr Actor 运行时不会交错执行它们。在一个轮次完全结束之前，不允许开始新的轮次。换句话说，当前正在执行的 Actor 方法或定时器/提醒回调必须完全结束后，才允许调用新的方法或回调。只有当方法或回调已经返回，且其返回的任务也已完成时，才视为该方法或回调已结束。值得强调的是，即使在不同的方法、定时器和回调之间，同样会遵守基于轮次的并发。

Dapr Actor 运行时通过在轮次开始时获取每个 Actor 的锁、并在轮次结束时释放该锁，来强制执行基于轮次的并发。因此，基于轮次的并发是针对每个 Actor 单独强制执行的，而不是跨 Actor 执行的。Actor 方法和定时器/提醒回调可以代表不同的 Actor 同时执行。

以下示例说明了上述概念。假设某个 Actor 类型实现了两个异步方法（例如 Method1 和 Method2）、一个定时器和一个提醒。下图展示了代表属于该 Actor 类型的两个 Actor（ActorId1 和 ActorId2）执行这些方法和回调的时间线示例。

{{< diagram actors-concurrency >}}

## 后续步骤

{{< button text="定时器和提醒 >>" page="actors-timers-reminders.md" >}}

## 相关链接

- [Actors API 参考]({{% ref actors_api %}})
- [Actors 概述]({{% ref actors-overview %}})
- [操作指南：在 Dapr 中使用虚拟 Actor]({{% ref howto-actors %}})
