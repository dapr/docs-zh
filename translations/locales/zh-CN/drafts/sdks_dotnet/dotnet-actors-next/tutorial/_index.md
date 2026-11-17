---
type: docs
title: "教程：通过示例了解 Dapr.Actors.Next"
linkTitle: "教程"
weight: 160000
description: "通过六个示例，循序渐进地介绍现代化 Dapr Actors 实现的变化，以及每个示例对应的测试"
---

本教程通过六个完整示例，每次只讲解一项改进，并将每个示例的测试视为核心内容，而不是事后补充。更简洁的编写方式值得一看，但对其中多个示例而言，最大的亮点在于：你现在终于能够为它们编写测试了。

可运行的代码位于解决方案的 `/examples/Actor.Next/` 目录下，每个部分对应一个文件夹，每个文件夹都包含其 Actor 代码以及基于 xUnit v3 的测试。你可以克隆并运行这些代码，然后再回到这里了解其中的内容与原因。下文每个部分都链接到对应的示例文件夹。建议使用 `dapr init` 安装本地 Dapr 实例，这样可以创建示例用的 state store 和 PubSub component，并确保你使用的是最新的 v1.18 运行时版本。

{{% alert title="包引用" color="primary" %}}
Dapr .NET SDK 仓库中的所有项目都使用相对路径进行引用。像 `Dapr.Actors.Next` 这样的元包由其所有单独的项目（例如 `Dapr.Actors.Next.Streams`、`Dapr.Actors.Next.Testing` 等）组成，它们仅仅是构建流水线的产物。因此，下面示例中的各个项目会引用仓库中这些单独的项目。这些包并不打算发布到 NuGet，仅用于本地 SDK 实验和开发。在你自己的项目中使用该包时（无论是宿主项目还是测试项目），应当从 NuGet 安装 `Dapr.Actors.Next`。克隆本仓库后，项目会使用这些本地引用进行构建和运行，但 NuGet 上并没有与各个子项目对应的包，只有 `Dapr.Actors.Next`。
{{% /alert %}}

{{% alert title="暂时放在 `feature-actors-next` 分支中" color="primary" %}}
`Dapr.Actors.Next` 包已作为预览版发布，之后可能会有变化。它尚未合并到 [Dapr .NET SDK 仓库](https://github.com/dapr/dotnet-sdk) 的 `master` 分支中。如果你想克隆该分支以参与贡献或试验示例，可以在[这里](https://github.com/dapr/dotnet-sdk/tree/feature-actors-next)找到它。预计它将与 Dapr runtime v1.19 版本一同作为稳定版发布，届时会合并到 master 分支，并更易于获取。
{{% /alert %}}

## 教程内容

前三个部分围绕同一个购物车场景展开，故事前后连贯；后三个部分则各自独立。从头到尾阅读，编写方式每次都会更进一步，而测试始终是稳定的收获：它所需的基础设施更少，每一步能覆盖的范围也更广。

- [第 1 部分：购物车，现代化的基线]({{< ref dotnet-actorsnext-tutorial-cart.md >}})。你已经熟悉的 Actor，去掉了繁琐的样板代码。过去需要 sidecar 才能完成的 reminder 测试，现在什么都不需要。
- [第 2 部分：演进购物车的状态]({{< ref dotnet-actorsnext-tutorial-migration.md >}})。一项破坏性的状态变更会变成编译错误，并转化为可进行单元测试的迁移，且无需数据库。
- [第 3 部分：会响应事件的购物车]({{< ref dotnet-actorsnext-tutorial-pubsub.md >}})。只需一个特性即可实现动态 pub/sub。事件驱动的流程无需 broker 即可得到验证。
- [第 4 部分：拍卖]({{< ref dotnet-actorsnext-tutorial-auction.md >}})。一个状态机，并将以往无法测试的“timer 与消息竞争”问题，编写为确定性的单元测试。
- [第 5 部分：运行时定义的状态机]({{< ref dotnet-actorsnext-tutorial-interpreted.md >}})。以数据形式在运行时提供状态机，在上线前进行验证，并动态驱动它们。
- [第 6 部分：将 interpreted Actor 与 workflow 组合]({{< ref dotnet-actorsnext-tutorial-approvals.md >}})。运行时定义的审批状态机交接给结算 workflow，并带有重试与补偿机制，无需 sidecar 即可测试。

贯穿整个系列的核心理念是：旧版 SDK 能够运行 Actor，而新版则让你能够证明它们是正确的。测试正是让这句口号落到实处的地方。

## 前提条件

- .NET 8、9、10 或 11 SDK（示例以 .NET 10 为目标）。
- `Dapr.Actors.Next` 包（或解决方案中的项目引用），以及用于测试项目的 `Dapr.Actors.Next.Testing`。
  - 如果你直接基于本解决方案进行构建，可以使用示例所用的引用包；否则请使用 NuGet 上的组合包。
- Dapr runtime 至少为 v1.18，这是 `Dapr.Actors.Next` 实现所要求的。本教程中的每个单元测试都无需 sidecar、无需 state store，也无需 Docker（使用内置的测试功能进行测试），但在实际环境中，你还需要针对 Dapr runtime 和 component 补充你自己的集成测试与端到端（E2E）测试。

{{% alert title=".NET 版本支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。二者的支持将在 Dapr v1.20 中停止；只有 .NET 10 和 .NET 11 将支持至 2027 年底。
{{% /alert %}}

如果你是 SDK 的新手，请先浏览[概述]({{< ref _index.md >}})；每个部分都链接到相关的概念页面，以便查阅详细参考信息。

## 后续步骤

- [第 1 部分：购物车，现代化的基线]({{< ref dotnet-actorsnext-tutorial-cart.md >}})
