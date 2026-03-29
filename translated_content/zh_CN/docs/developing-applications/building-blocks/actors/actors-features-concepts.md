---
type: docs
title: "Actor 运行时功能"
linkTitle: "运行时功能"
weight: 20
description: "了解 Dapr 中 Actor 的功能和概念"
aliases:
  - "/developing-applications/building-blocks/actors/actors-background"
---

既然您已经从高层次了解了 [Actor 构建块]({{% ref "actors-overview" %}})，让我们深入探讨 Dapr 中 Actor 包含的功能和概念。

## Actor 生命周期

Dapr Actor 是虚拟的，这意味着它们的生命周期与其内存中的表示形式无关。因此，它们不需要被显式创建或销毁。Dapr Actor 运行时在首次收到针对该 Actor ID 的请求时自动激活 Actor。如果 Actor 在一段时间内未被使用，Dapr Actor 运行时会回收内存中的对象。如果稍后需要重新激活，它也会保留有关 Actor 存在的知识。

调用 Actor 方法、定时器和提醒会重置 Actor 空闲时间。例如，提醒触发会保持 Actor 处于活动状态。
- Actor 提醒无论 Actor 处于活动状态还是非活动状态都会触发。如果为非活动 Actor 触发，它会先激活该 Actor。
- Actor 定时器触发会重置空闲时间；但是，定时器仅在 Actor 处于活动状态时才会触发。

Dapr 运行时用于检查 Actor 是否可以被垃圾回收的空闲超时和扫描间隔是可配置的。当 Dapr 运行时调用 Actor 服务以获取支持的 Actor 类型时，可以传递此信息。

由于虚拟 Actor 模型，这种虚拟 Actor 生命周期抽象存在一些注意事项，实际上 Dapr Actor 的实现有时会偏离此模型。

首次向其 Actor ID 发送消息时，Actor 会自动激活（导致构造 Actor 对象）。一段时间后，Actor 对象被垃圾回收。将来，再次使用 Actor ID 会导致构造新的 Actor 对象。Actor 的状态比对象的生命周期更长，因为状态存储在为 Dapr 运行时配置的状态提供程序中。

## 分布和故障转移

为了提供可扩展性和可靠性，Actor 实例分布在整个集群中，Dapr 会根据需要自动将它们从故障节点迁移到健康节点。

Actor 分布在 Actor 服务的实例中，这些实例分布在集群中的节点上。每个服务实例包含给定 Actor 类型的一组 Actor。

### Actor 放置服务

Dapr Actor 运行时通过 Actor `Placement` 服务为您管理分布方案和键范围设置。当创建服务的新实例时：

1. 边车调用 Actor 服务以检索注册的 Actor 类型和配置设置。
1. 相应的 Dapr 运行时注册它可以创建的 Actor 类型。
1. `Placement` 服务计算给定 Actor 类型在所有实例中的分区。

每个 Actor 类型的此分区数据表会在环境中运行的每个 Dapr 实例中更新和存储，并且可以随着创建和销毁新的 Actor 服务实例而动态变化。

<img src="/images/actors_background_placement_service_registration.png" width=600>

当客户端调用具有特定 ID 的 Actor（例如，actor id 123）时，客户端的 Dapr 实例会对 Actor 类型和 ID 进行哈希处理，并使用该信息调用可以服务于该特定 Actor ID 请求的相应 Dapr 实例。因此，对于任何给定的 Actor ID，总是调用相同的分区（或服务实例）。下图显示了这一点。

<img src="/images/actors_background_id_hashing_calling.png" width=600>

这简化了一些选择，但也带来了一些考虑：

- 默认情况下，Actor 被随机放置到 pod 中，从而实现均匀分布。
- 由于 Actor 是随机放置的，因此应预期 Actor 操作始终需要网络通信，包括方法调用数据的序列化和反序列化，从而产生延迟和开销。

{{% alert title="注意" color="primary" %}}
 注意：Dapr Actor Placement 服务仅用于 Actor 放置，因此如果您的服务不使用 Dapr Actor，则不需要它。Placement 服务可以在所有[托管环境]({{% ref hosting %}})中运行，包括自托管和 Kubernetes。
{{% /alert %}}

## Actor 通信

您可以通过调用 HTTP 端点与 Dapr 交互以调用 Actor 方法。

```bash
POST/GET/PUT/DELETE http://localhost:3500/v1.0/actors/<actorType>/<actorId>/<method/state/timers/reminders>
```

您可以在请求正文中为 Actor 方法提供任何数据，请求的响应将在响应正文中，即来自 Actor 调用的数据。

另一种也许更方便的与 Actor 交互的方式是通过 SDK。Dapr 目前支持 [.NET]({{% ref "dotnet-actors" %}})、[Java]({{% ref "java#actors" %}}) 和 [Python]({{% ref "python-actor" %}}) 的 Actor SDK。

有关更多详细信息，请参阅 [Dapr Actor 功能]({{% ref howto-actors %}})。

### 并发

Dapr Actor 运行时为访问 Actor 方法提供了一个简单的基于轮次的访问模型。这意味着在任何时候，一个 Actor 对象的代码中只能有一个线程处于活动状态。基于轮次的访问大大简化了并发系统，因为不需要数据访问的同步机制。这也意味着系统在设计时必须特别考虑每个 Actor 实例的单线程访问性质。

单个 Actor 实例一次不能处理多个请求。如果期望 Actor 实例处理并发请求，它可能会导致吞吐量瓶颈。

如果两个 Actor 之间存在循环请求，同时对外部请求之一发出外部请求，Actor 可能会相互死锁。Dapr Actor 运行时会在 Actor 调用时自动超时并向调用者抛出异常，以中断可能的死锁情况。

<img src="/images/actors_background_communication.png" width=600>

#### 重入

要允许 Actor "重入"并调用自身的方法，请参阅 [Actor 重入]({{%ref actor-reentrancy%}})。

### 基于轮次的访问

一个轮次包括响应来自其他 Actor 或客户端的请求而对 Actor 方法进行的完整执行，或定时器/提醒回调的完整执行。尽管这些方法和回调是异步的，但 Dapr Actor 运行时不会交错它们。一个轮次必须完全完成后才允许进行新的轮次。换句话说，当前正在执行的 Actor 方法或定时器/提醒回调必须在允许新的方法或回调调用之前完全完成。如果执行已从方法或回调返回，并且方法或回调返回的任务已完成，则认为方法或回调已完成。值得强调的是，即使在不同方法、定时器和回调之间也会遵守基于轮次的并发。

Dapr Actor 运行时通过在轮次开始时获取每个 Actor 的锁并在轮次结束时释放锁来强制执行基于轮次的并发。因此，基于轮次的并发是针对每个 Actor 强制执行的，而不是跨 Actor 强制执行的。Actor 方法和定时器/提醒回调可以同时代表不同的 Actor 执行。

以下示例说明了上述概念。考虑一个实现两个异步方法（例如，Method1 和 Method2）、一个定时器和一个提醒的 Actor 类型。下图显示了代表属于此 Actor 类型的两个 Actor（ActorId1 和 ActorId2）执行这些方法和回调的时间线示例。

<img src="/images/actors_background_concurrency.png" width=600>

## 后续步骤

{{< button text="定时器和提醒 >>" page="actors-timers-reminders.md" >}}

## 相关链接

- [Actors API 参考]({{% ref actors_api %}})
- [Actors 概述]({{% ref actors-overview %}})
- [操作指南：在 Dapr 中使用虚拟 Actor]({{% ref howto-actors %}})
