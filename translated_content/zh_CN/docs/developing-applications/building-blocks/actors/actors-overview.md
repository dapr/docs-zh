---
type: docs
title: "Actor 概述"
linkTitle: "概述"
weight: 10
description: "Actor API 构建块的概述"
aliases:
  - "/developing-applications/building-blocks/actors/actors-background"
---

[Actor 模式](https://en.wikipedia.org/wiki/Actor_model)将 actor 描述为最低级别的"计算单元"。换句话说，你需要将代码编写在一个自包含的单元（称为 actor）中，该单元接收消息并一次处理一条消息，无需任何并发或线程机制。

当代码处理消息时，它可以向其他 actor 发送一条或多条消息，或创建新的 actor。底层运行时负责管理每个 actor 的运行方式、时间和位置，并在 actor 之间路由消息。

大量 actor 可以同时执行，并且 actor 之间相互独立执行。

## Dapr 中的 Actor

Dapr 包含一个专门实现[虚拟 Actor 模式](https://www.microsoft.com/research/project/orleans-virtual-actors/)的运行时。通过 Dapr 的实现，你可以根据 actor 模型编写 Dapr actor，Dapr 利用底层平台提供的可扩展性和可靠性保证。

每个 actor 都定义为 actor 类型的实例，就像对象是类的实例一样。例如，可能有一个实现了计算器功能的 actor 类型，并且可能有多个该类型的 actor 分布在集群中的各个节点上。每个这样的 actor 都通过 actor ID 进行唯一标识。

<img src="/images/actor_background_game_example.png" width=400 style="padding-bottom:25px;">

[下面的概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=dWNgtsp61f3Sjq0n&t=10797)展示了 Dapr 中 actor 的工作原理。 

{{< youtube id=0y7ne6teHT4 start=10797 >}}

## Dapr Actor 与 Dapr Workflow 的对比

Dapr actor 基于状态管理和服务调用 API 创建具有身份的有状态、长时间运行的对象。[Dapr Workflow]({{% ref workflow-overview %}}) 与 Dapr Actor 相关，workflow 构建在 actor 之上，提供更高级别的抽象来编排一组 actor，实现常见的 workflow 模式并代表你管理 actor 的生命周期。

Dapr actor 旨在提供一种在分布式系统中封装状态和行为的方式。actor 可以由客户端应用程序按需激活。当 actor 被激活时，它会被分配一个唯一的身份，这允许它在多次调用之间维护其状态。这使得 actor 非常适合构建有状态、可扩展和容错的分布式应用程序。

另一方面，Dapr Workflow 提供了一种定义和编排涉及分布式系统中多个服务和组件的复杂工作流的方式。Workflow 允许你定义需要按特定顺序执行的步骤或任务序列，并可用于实现业务流程、事件驱动的工作流和其他类似场景。

如上所述，Dapr Workflow 构建在 Dapr Actor 之上，管理其激活和生命周期。

### 何时使用 Dapr actor

与任何其他技术决策一样，你应该根据要解决的问题来决定是否使用 actor。例如，如果你正在构建聊天应用程序，你可能会使用 Dapr actor 来实现聊天室和用户之间的单独聊天会话，因为每个聊天会话都需要维护自己的状态并且是可扩展和容错的。

一般来说，如果满足以下条件，请考虑使用 actor 模式来为你的问题或场景建模：

- 你的问题空间涉及大量（数千或更多）小型、独立和隔离的状态与逻辑单元。
- 你希望使用单线程对象，这些对象不需要来自外部组件的大量交互，包括跨一组 actor 查询状态。
- 你的 actor 实例不会通过发出 I/O 操作来以不可预测的延迟阻塞调用者。

### 何时使用 Dapr Workflow

当你需要定义和编排涉及多个服务和组件的复杂工作流时，你将使用 Dapr Workflow。例如，使用[前面的聊天应用程序示例]({{% ref "#when-to-use-dapr-actors" %}})，你可能会使用 Dapr Workflow 来定义应用程序的总体工作流，例如如何注册新用户、如何发送和接收消息，以及应用程序如何处理错误和异常。

[了解有关 Dapr Workflow 的更多信息以及如何在应用程序中使用工作流。]({{% ref workflow-overview %}})

## Actor 类型和 actor ID

Actor 唯一定义为 actor 类型的实例，类似于对象是类的实例。例如，你可能有一个实现了计算器功能的 actor 类型。该类型的许多 actor 可能分布在集群中的各个节点上。

每个 actor 都通过 actor ID 进行唯一标识。actor ID 可以是你选择的_任何_字符串值。如果你不提供 actor ID，Dapr 会为你生成一个随机字符串作为 ID。

## 功能

### 命名空间 Actor

Dapr 支持命名空间 actor。可以将 actor 类型部署到不同的命名空间中。你可以在同一命名空间中调用这些 actor 的实例。
 
[了解有关命名空间 actor 及其工作原理的更多信息。]({{% ref namespaced-actors %}})

### Actor 生命周期

由于 Dapr actor 是虚拟的，因此不需要显式创建或销毁它们。Dapr actor 运行时：
1. 一旦接收到针对该 actor ID 的初始请求，就会自动激活 actor。
1. 对未使用的 actor 的内存对象进行垃圾回收。
1. 维护 actor 存在的知识，以防以后重新激活。

actor 的状态超出对象的生命周期，因为状态存储在为 Dapr 运行时配置的状态提供程序中。

[了解有关 actor 生命周期的更多信息。]({{% ref "actors-features-concepts#actor-lifetime" %}})

### 分布和故障转移

为了提供可扩展性和可靠性，actor 实例分布在集群中，Dapr 在整个集群中分布 actor 实例并自动将它们迁移到健康节点。

[了解有关 Dapr actor 放置的更多信息。]({{% ref "actors-features-concepts#actor-placement-service" %}})

### Actor 通信

你可以通过 HTTP 调用 actor 方法来调用它们，如下面的常规示例所示。

<img src="/images/actors-calling-method.png" width=900>

1. 服务调用边车上的 actor API。
1. 使用来自放置服务的缓存分区信息，边车确定哪个 actor 服务实例将托管 actor ID **3**。调用被转发到相应的边车。
1. Pod 2 中的边车实例调用服务实例以调用 actor 并执行 actor 方法。

[了解有关调用 actor 方法的更多信息。]({{% ref "actors-features-concepts#actor-communication" %}})

#### 并发性

Dapr actor 运行时为访问 actor 方法提供了一个简单的基于轮次的访问模型。基于轮次的访问大大简化了并发系统，因为不需要用于数据访问的同步机制。

- [了解有关 actor 可重入性的更多信息]({{% ref "actor-reentrancy" %}})
- [了解有关基于轮次的访问模型的更多信息]({{% ref "actors-features-concepts#turn-based-access" %}})

### 状态

事务性状态存储可用于存储 actor 状态。无论你是否打算在 actor 中存储任何状态，都必须在状态存储组件的元数据部分为属性 `actorStateStore` 指定值 `true`。Actor 状态以特定方案存储在事务性状态存储中，从而允许进行一致的查询。只能使用单个状态存储组件作为所有 actor 的状态存储。阅读[状态 API 参考]({{% ref state_api %}})和 [actor API 参考]({{% ref actors_api %}})以了解有关 actor 状态存储的更多信息。

### Actor 定时器和提醒

Actor 可以通过注册定时器或提醒来为自己安排定期工作。

定时器和提醒的功能非常相似。主要区别在于，Dapr actor 运行时在停用后不保留有关定时器的任何信息，而使用 Dapr actor 状态提供程序持久化有关提醒的信息。

这种区别允许用户在轻量级但无状态的定时器与资源需求更高但有状态的提醒之间进行权衡。

[下面的概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=2_xX6mkU3UCy2Plr&t=6607)展示了 actor 定时器和提醒的工作原理。 

<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/0y7ne6teHT4?si=73VqYUUvNfFw3x5_&amp;start=12184" title="YouTube video player" style="padding-bottom:25px;" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>

- [了解有关 actor 定时器的更多信息。]({{% ref "actors-features-concepts#timers" %}})
- [了解有关 actor 提醒的更多信息。]({{% ref "actors-features-concepts#reminders" %}})
- [了解有关定时器和提醒错误处理和故障转移的更多信息。]({{% ref "actors-features-concepts#timers-and-reminders-error-handling" %}})

## 后续步骤

{{< button text="Actor 功能和概念 >>" page="actors-features-concepts.md" >}}

## 相关链接

- [Actor API 参考]({{% ref actors_api %}})
- 请参阅 [Dapr SDK 文档和示例]({{% ref "developing-applications/sdks/_index.md#sdk-languages" %}})。
