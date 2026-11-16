---
type: docs
title: "Actor 概述"
linkTitle: "概述"
weight: 10
description: "Actor API 构建块的概述"
aliases:
  - "/zh-hans/developing-applications/building-blocks/actors/actors-background"
---

[Actor 模式](https://en.wikipedia.org/wiki/Actor_model)将 actor 描述为最低级别的“计算单元”。换句话说，你需要将代码编写在一个自包含的单元（称为 actor）中，该单元接收消息并一次处理一条消息，无需任何并发或线程机制。

当代码处理消息时，它可以向其他 actor 发送一条或多条消息，或创建新的 actor。底层运行时负责管理每个 actor 的运行方式、运行时间和运行位置，并在 actor 之间路由消息。

大量 actor 可以同时执行，并且 actor 之间相互独立地执行。

## Dapr 中的 Actor

Dapr 包含一个专门实现[虚拟 Actor 模式](https://www.microsoft.com/research/project/orleans-virtual-actors/)的运行时。借助 Dapr 的实现，你可以按照 actor 模型编写 Dapr actor，Dapr 则利用底层平台提供的可扩展性和可靠性保证。

每个 actor 都定义为 actor 类型的实例，就像对象是类的实例一样。例如，可能有一个实现计算器功能的 actor 类型，并且该类型的许多 actor 可以分布在集群中的各个节点上。每个这样的 actor 都通过 actor ID 唯一标识。

{{< diagram name="actors-game-example" width="65" >}}

[下面的概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=dWNgtsp61f3Sjq0n&t=10797)展示了 Dapr 中 actor 的工作原理。

{{< youtube id=0y7ne6teHT4 start=10797 >}}

## Dapr actor 与 Dapr Workflow 的对比

Dapr actor 基于状态管理和服务调用 API 构建，用于创建具有身份标识的有状态、长时间运行的对象。[Dapr Workflow]({{% ref workflow-overview %}}) 与 Dapr Actors 相关：工作流构建在 actor 之上，提供更高级别的抽象来编排一组 actor，实现常见的工作流模式，并代你管理 actor 的生命周期。

Dapr actor 旨在提供一种在分布式系统中封装状态和行为的方式。actor 可以由客户端应用程序按需激活。actor 被激活时会被分配一个唯一身份，使其能够在多次调用之间维护自身状态。这使得 actor 非常适合构建有状态、可扩展且容错的分布式应用程序。

另一方面，Dapr Workflow 提供了一种定义和编排复杂工作流的方式，这些工作流涉及分布式系统中的多个服务和组件。工作流允许你定义需要按特定顺序执行的一系列步骤或任务，可用于实现业务流程、事件驱动的工作流以及其他类似场景。

如上所述，Dapr Workflow 构建在 Dapr Actors 之上，管理其激活和生命周期。

### 何时使用 Dapr actor

与任何其他技术决策一样，你应该根据要解决的问题来决定是否使用 actor。例如，如果你正在构建聊天应用程序，你可能会使用 Dapr actor 来实现聊天室以及用户之间的单独聊天会话，因为每个聊天会话都需要维护自己的状态，并且要具备可扩展性和容错能力。

一般来说，如果满足以下条件，请考虑使用 actor 模式为你的问题或场景建模：

- 你的问题空间涉及大量（数千个或更多）小型、独立且相互隔离的状态与逻辑单元。
- 你希望使用单线程对象，这些对象不需要来自外部组件的大量交互，包括跨一组 actor 查询状态。
- 你的 actor 实例不会通过发起 I/O 操作而以不可预测的延迟阻塞调用者。

### 何时使用 Dapr Workflow

当你需要定义和编排涉及多个服务和组件的复杂工作流时，就应使用 Dapr Workflow。例如，沿用[前面的聊天应用程序示例]({{% ref "#何时使用-dapr-actor" %}})，你可以使用 Dapr Workflow 定义应用程序的整体工作流，例如如何注册新用户、如何发送和接收消息，以及应用程序如何处理错误和异常。

[了解有关 Dapr Workflow 以及如何在应用程序中使用工作流的更多信息。]({{% ref workflow-overview %}})

## Actor 类型和 actor ID

Actor 通过 actor 类型的实例进行唯一定义，类似于对象是类的实例。例如，你可能有一个实现计算器功能的 actor 类型。该类型的许多 actor 可以分布在集群中的各个节点上。

每个 actor 都通过 actor ID 唯一标识。actor ID 可以是你选择的*任意*字符串值。如果你没有提供 actor ID，Dapr 会为你生成一个随机字符串作为 ID。

## 功能

### 命名空间 Actor

Dapr 支持命名空间 actor。actor 类型可以部署到不同的命名空间中。你可以调用同一命名空间中这些 actor 的实例。

[了解有关命名空间 actor 及其工作原理的更多信息。]({{% ref namespaced-actors %}})

### Actor 生命周期

由于 Dapr actor 是虚拟的，因此无需显式创建或销毁它们。Dapr actor 运行时会：
1. 在收到针对某个 actor ID 的首次请求后，自动激活该 actor。
1. 对未使用的 actor 的内存对象进行垃圾回收。
1. 保留 actor 存在的信息，以便之后重新激活。

actor 的状态比对象的生命周期更长，因为 state store 在为 Dapr 运行时配置的状态提供程序中。

[了解有关 actor 生命周期的更多信息。]({{% ref "actors-features-concepts#actor-lifetime" %}})

### 分布和故障转移

为了提供可扩展性和可靠性，actor 实例分布在整个集群中。Dapr 在整个集群中分布 actor 实例，并自动将它们迁移到健康的节点上。

[了解有关 Dapr actor 放置的更多信息。]({{% ref "actors-features-concepts#actor-placement-service" %}})

### Actor 通信

你可以通过 HTTP 调用 actor 方法，如下面的通用示例所示。

{{< diagram name="actors-calling-method" width="60" >}}

1. 服务调用边车上的 actor API。
1. 边车利用放置服务提供的缓存分区信息，确定哪个 actor 服务实例将托管 actor ID **3**。调用会被转发到相应的边车。
1. Pod 2 中的边车实例调用服务实例，以调用 actor 并执行 actor 方法。

[了解有关调用 actor 方法的更多信息。]({{% ref "actors-features-concepts#actor-communication" %}})

#### 并发性

Dapr actor 运行时为访问 actor 方法提供了一种简单的基于轮次的访问模型。基于轮次的访问极大地简化了并发系统，因为无需使用同步机制来访问数据。

- [了解有关 actor 可重入性的更多信息]({{% ref "actor-reentrancy" %}})
- [了解有关基于轮次的访问模型的更多信息]({{% ref "actors-features-concepts#turn-based-access" %}})

### 状态

可以使用事务性 state store 来存储 actor 状态。无论你是否打算在 actor 中存储任何状态，都必须在 state store 组件的元数据部分为属性 `actorStateStore` 指定值 `true`。actor 状态以特定方案存储在事务性 state store 中，从而支持一致的查询。只能使用单个 state store 组件作为所有 actor 的 state store。阅读[状态 API 参考]({{% ref state_api %}})和 [actor API 参考]({{% ref actors_api %}})，了解有关 actor state store 的更多信息。

{{% alert title="提示" color="primary" %}}
在本地开发期间，使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 检查正在运行的应用的 actor 类型以及每种类型的活动 actor 数量，并浏览 state store 中的 actor 状态。
{{% /alert %}}

### Actor 定时器和提醒

Actor 可以通过注册定时器或提醒，为自己安排周期性工作。

定时器和提醒的功能非常相似。主要区别在于：Dapr actor 运行时在 actor 停用后不保留有关定时器的任何信息，而是使用 Dapr actor 状态提供程序持久化有关提醒的信息。

这一区别让用户可以在轻量但无状态的定时器，与资源需求更高但有状态的提醒之间进行权衡。

[下面的概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=2_xX6mkU3UCy2Plr&t=6607)展示了 actor 定时器和提醒的工作原理。

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/0y7ne6teHT4?si=73VqYUUvNfFw3x5_&amp;start=12184" title="YouTube video player" style="padding-bottom:25px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

- [了解有关 actor 定时器的更多信息。]({{% ref "actors-features-concepts#timers" %}})
- [了解有关 actor 提醒的更多信息。]({{% ref "actors-features-concepts#reminders" %}})
- [了解有关定时器和提醒错误处理及故障转移的更多信息。]({{% ref "actors-features-concepts#timers-and-reminders-error-handling" %}})

## 后续步骤

{{< button text="Actor 功能和概念 >>" page="actors-features-concepts.md" >}}

## 相关链接

- [Actor API 参考]({{% ref actors_api %}})
- 请参阅 [Dapr SDK 文档和示例]({{% ref "developing-applications/sdks/_index.md#sdk-languages" %}})。
