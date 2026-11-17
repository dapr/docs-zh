---
type: docs
title: "Dapr Actors (Next) in the .NET SDK"
linkTitle: "Actors (Next)"
weight: 80000
description: "面向 .NET 的现代化 Dapr Actors 实现概述（Dapr.Actors.Next）"
---

`Dapr.Actors.Next` 是 .NET 中 Dapr Actors building block 的重新实现。原有的 `Dapr.Actors` 包已经服役很长时间，早于现代 Dapr .NET SDK 所依赖的许多机制，因此本包将 Actor 体验更新到与之匹配：它通过 Dapr 1.18 引入的双向 gRPC 流与运行时通信，从 Actor 路径中移除了反射，并使 Actor 与 SDK 其他部分所用的依赖注入、选项、序列化和源生成器模式保持一致。

Actor 模型本身没有变化：Actor 仍然是虚拟的，通过类型和 ID 寻址，并具备重入、timer、reminder 和代理功能。`Dapr.Actors.Next` 是一个独立的包系列，与 `Dapr.Actors` 不具备 API 兼容性，但与 Dapr runtime 在协议层面完全兼容。因此采用它无需对运行时做任何改动，唯一的要求是 Dapr runtime 为 v1.18 或更高版本。

{{% alert title="运行时要求与连接" color="primary" %}}
`Dapr.Actors.Next` 要求 Dapr runtime v1.18.0 或更高版本。它通过持久的、由应用发起的 `SubscribeActorEvents` gRPC 流托管 Actor，因此 Actor 回调经由该流到达，而不是作为入站 HTTP 请求发送到已映射的 Actor handler 端点，而后者正是 `Dapr.Actors` 所要求的方式。应用仍需暴露其 gRPC 服务器端口，运行时用它进行前置条件检查；变化的是 Actor 回调的投递方式，而不是应用是否运行 gRPC 服务器。
{{% /alert %}}

{{% alert title="Dapr.Actors 的状态" color="warning" %}}
`Dapr.Actors` 的积极开发已经停止；该包现在只接收安全修复，所有新的 Actor 开发都在 [`Dapr.Actors.Next`]({{% ref dotnet-actors-next %}}) 中进行。`Dapr.Actors` 没有弃用日期，但它被视为仅维护模式。
{{% /alert %}}

{{% alert title="从 Dapr.Actors 迁移是渐进式的，不必一次完成" color="primary" %}}
`Dapr.Actors.Next` 是一个 API 不同的新包系列，因此采用它意味着重写 Actor 层，而不是原地升级。它与运行时在协议层面兼容，并且使用相同的类型名称寻址 Actor，因此你可以一次迁移一个 Actor 类型，而不必一刀切地一次完成。我们建议在彼此独立的项目或服务中进行迁移，而不要在同一个项目中同时承载两套 SDK：`Dapr.Actors` 与 `Dapr.Actors.Next` 在托管、派发和序列化等方面的行为有明显差异，混用会让人难以分辨某个 Actor 归哪个 SDK 管理。我们也没有任何测试能够确凿地证明两个包可以在同一项目中并存运行，因此虽然技术上可行，但我们不建议这样做。当负载的序列化方式一致时，跨 SDK 调用是可行的：新 SDK 默认使用 System.Text.Json，这与旧的非远程处理（JSON）代理一致，但与旧的 DataContract 远程处理路径不一致。迁移某个类型之前，最需要验证的是其现有的持久化状态在新序列化器下仍可读取。更多信息请参阅[迁移指南]({{< ref "dotnet-actorsnext-migration.md" >}})。
{{% /alert %}}

## 变更内容

这次重写源于两个核心理念：

1) 第一个是 SDK 与运行时的交互方式。Actor 回调（invoke、reminder、timer 和 deactivate）现在通过长期存活的双向 gRPC 流到达，而不再是对已托管 Actor 端点的逐次请求。这降低了每次调用的开销，也无需映射入站的 Actor handler。这与 Dapr 在 pub/sub 订阅和 workflow 派发中已采用的流式模式一致。
2) 第二个是 SDK 现在在该连接的你这一侧（无论是构建时还是运行时）本地完成的工作量，以使 Actor 代码更易于编写且更安全。源生成器取代了基于反射的代理与派发机制，这既消除了运行时开销，也使 Native AOT 成为可能。序列化迁移到与 State Management 和 workflow 相同的可插拔 `IDaprSerializer`。状态迁移、状态机编程模型、由 pub/sub 驱动的 Actor，以及确定性的内存测试运行时，均已内置提供。其目标是让你能够直接使用现代 Dapr .NET SDK 的其他部分来构建高性能的 Actor 应用，而不必遵循一套独立的 Actor 专属约定。

## 源生成器与编译期检查

源生成器完成了大部分连接工作，这些工作过去需要你手写，或者旧 SDK 通过反射完成。从你的 Actor 接口和实现出发，生成器会产生客户端代理、服务端分发器、激活工厂、注册代码，以及一个描述每个 Actor 及其方法签名的 Actor 注册表。这些都不需要手写，且在调用时也不通过反射运行，这正是该路径对 AOT 友好的原因。

除生成器外，该包还附带了分析器和代码修复程序，可在你编写代码时发现 Actor 相关的错误：例如方法不可序列化或不返回任务类型、在轮次中进行阻塞调用或线程逃逸、从时钟而非注入的 `TimeProvider` 读取时间、会导致现有数据反序列化失败的状态变更，或状态迁移链中的缺口。凡是可以机械修复的，分析器都会提供修复建议。完整列表见[诊断参考]({{< ref "dotnet-actorsnext-howto.md#analyzers-and-diagnostics" >}})。

## 与 `Dapr.Actors` 的区别

| 关注点 | `Dapr.Actors`（原版） | `Dapr.Actors.Next` |
| --- |------------------------------------------------------------------------------------| --- |
| 运行时连接 | 运行时每次调用时访问的入站 Actor handler 端点 | 通过出站的持久 `SubscribeActorEvents` 流接收 Actor 回调；无需映射 Actor 端点（应用的 gRPC 服务器端口仍然保留） |
| 代理与派发 | 反射（`DispatchProxy`、运行时 IL） | 源生成；热路径上无反射 |
| Native AOT 与裁剪 | 不支持 | 支持；运行时包可安全地进行裁剪与 AOT |
| 可空引用类型 | 部分支持 | 在公共接口范围内全面启用 |
| 注册 | 每个类型手动调用 `RegisterActor<T>()` | 源生成的发现机制；Actor 无需手动注册 |
| 宿主设置 | `app.MapActorsHandlers()` 端点映射 | 仅 `AddDaprActors()`；由宿主主动连接运行时 |
| 依赖注入 | 自定义实现 | 每次激活一个 DI 作用域；构造函数注入已注册的服务 |
| 代理类型 | 远程处理代理（.NET 到 .NET）与非远程处理代理（跨应用） | 单一代理；不再区分远程处理与非远程处理 |
| 序列化 | 通过远程处理代理使用 DataContract，或通过非远程处理代理使用 System.Text.Json | 每次调用都使用可插拔的 `IDaprSerializer`（默认 System.Text.Json）；内置不支持 DataContract |
| 配置 | 自定义实现 | 选项模式（`IOptions<DaprActorsOptions>`） |
| 测试 | 针对 sidecar 的集成测试 | 内存中的确定性运行时，以及可选的 Coyote 深度测试 |
| 状态版本管理 | 手动 | 状态信封的模式版本控制，支持升级器链 |
| 状态机 | 不提供 | 一流的 `StateMachineActor<TState, TData>` 模型 |
| pub/sub 集成 | 不提供 | 内置的 `[Subscribe]` Subscription streams |
| 每个 Actor 的状态缓存 | 有 | 有（保留） |

{{% alert title="序列化与 Dapr.Actors 彻底断开" color="warning" %}}
在 `Dapr.Actors` 中，序列化格式与你选择的代理绑定在一起。远程处理代理使用 DataContract，且只能在 .NET Actor 之间工作；非远程处理代理使用 System.Text.Json，并支持跨应用调用。`Dapr.Actors.Next` 消除了这种分裂：只有一条序列化路径，即 `IDaprSerializer`（默认 System.Text.Json），无论你以何种方式调用 Actor，都使用它；开箱即用不支持 DataContract。如果需要 DataContract，请通过自定义 `IDaprSerializer` 实现提供。强类型代理在调用语法上与以前的远程处理客户端相似，但这种相似并不意味着使用 DataContract，你调用 Actor 的方式与其负载如何序列化毫无关系。
{{% /alert %}}

### 可空性与现代化

公共接口已标注可空引用类型，因此编译器能够区分可能不返回值的 Actor 方法与总是返回结果的方法，并在构建时而非调用时标出这种差异。结合源生成的代理与序列化，这消除了基于反射的 SDK 只能在运行时才暴露的一类错误。

这种现代化是实质性的，而非表面上的。移除反射使 Native AOT 成为可能，并降低启动与内存开销。选项模式取代了自定义配置。真正的按激活划分的 DI 作用域意味着 Actor 的依赖项与 Actor 本身在同一生命周期内被解析和释放。单一的可插拔序列化器使 Actor、State Management 和 workflow 以相同的方式序列化。

## 核心概念

每个概念都有各自的页面：

- [编写、注册并调用 Actor]({{< ref dotnet-actorsnext-howto.md >}})：特性、源生成器产生的内容、必须注册的最少内容，以及跨程序集与跨应用的场景。
- [序列化]({{< ref dotnet-actorsnext-serialization.md >}})：可插拔序列化器与每个 Actor 的缓存。
- [状态迁移]({{< ref dotnet-actorsnext-statemigration.md >}})：状态信封，以及使用升级器进行的状态版本管理。
- [state machine Actor]({{< ref dotnet-actorsnext-statemachine.md >}})：`StateMachineActor` 模型、何时选择它而非 workflow，以及如何测试它。
- [Subscription streams]({{< ref dotnet-actorsnext-streams.md >}})：使用 `[Subscribe]` metadata 与显式流注册，由 pub/sub topic 驱动 Actor。
- [动态调用]({{< ref dotnet-actorsnext-dynamic.md >}})：在没有编译期契约的情况下，按类型、ID 和方法调用 Actor，适用于网关、工具以及跨语言调用方。
- [测试]({{< ref dotnet-actorsnext-testing.md >}})：内存测试运行时、远程调用模拟、暂停的状态写入与停用竞争、虚拟 timer 和 reminder、回调流故障注入，以及可选的 Coyote 集成。
- 每类型的运行时选项通过 `options.Actors.RegisterActor<TActor>(...)` 支持，包括空闲超时、重入、排空以及状态迁移覆盖。

## 通过示例学习

如果你更希望通过可运行的代码逐一了解这些改进，[教程]({{< ref "tutorial/_index.md" >}})通过六个带测试的示例进行讲解。解决方案还包含第七个[每类型选项示例]({{< ref "dotnet-actorsnext-howto.md#per-type-runtime-options" >}})，位于 `/examples/Actor.Next/` 下。这是理解变化内容及其原因最快的方式。

## 后续步骤

- [教程：通过示例了解 Dapr.Actors.Next]({{< ref "tutorial/_index.md" >}})
- [编写、注册并调用 Actor]({{< ref dotnet-actorsnext-howto.md >}})
- [测试 Actor]({{< ref dotnet-actorsnext-testing.md >}})
