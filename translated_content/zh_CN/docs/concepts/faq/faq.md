---
type: docs
title: "Dapr 常见问题与解答"
linkTitle: "常见问题"
weight: 100
description: "关于 Dapr 的常见问题"
---

## Dapr 与 Istio、Linkerd 或 OSM 等服务网格相比如何？
Dapr 不是服务网格。服务网格专注于细粒度的网络控制，而 Dapr 专注于帮助开发者构建分布式应用程序。Dapr 和服务网格都使用边车模式，并与应用程序并行运行。它们确实有一些重叠的功能，但也提供独特的优势。更多信息请阅读 [Dapr & 服务网格]({{%ref service-mesh%}}) 概念页面。

## 性能基准测试
Dapr 项目专注于性能，因为 Dapr 作为应用程序边车的特性备受关注。查看[性能结果](https://github.com/dapr/dapr/tree/release-1.16/tests/perf/report/charts)了解最新的性能数据。

## Actor

### Dapr、Orleans 和 Service Fabric Reliable Actors 之间有什么关系？

Dapr 中的 actors 基于 [Orleans](https://www.microsoft.com/research/project/orleans-virtual-actors/) 开创的相同虚拟 actor 概念，这意味着它们在调用时被激活，在一段时间不活动后被停用。如果您熟悉 Orleans，Dapr C# actors 会让您感到熟悉。Dapr C# actors 基于 [Service Fabric Reliable Actors](https://docs.microsoft.com/azure/service-fabric/service-fabric-reliable-actors-introduction)（同样源自 Orleans），使您能够将 Service Fabric 中的 Reliable Actors 迁移到其他托管平台，如 Kubernetes 或其他本地环境。
此外，Dapr 不仅仅涉及 actors。它为您提供了一组最佳实践构建块，可用于构建任何微服务应用程序。请参阅 [Dapr 概述]({{% ref overview %}})。

### Dapr 与 actor 框架的区别

虚拟 actor 能力是 Dapr 在其运行时中提供的构建块之一。使用 Dapr，由于它是通过 http/gRPC API 与编程语言无关的，因此 actors 可以从任何语言调用。这允许用一种语言编写的 actors 调用用不同语言编写的 actors。

创建新 actor 遵循类似本地调用的模式：`http://localhost:3500/v1.0/actors/<actorType>/<actorId>/…`。例如，`http://localhost:3500/v1.0/actors/myactor/50/method/getData` 调用新创建的 `myactor` 上 id 为 `50` 的 `getData` 方法。

Dapr 运行时 SDK 有特定语言的 actor 框架。例如，.NET SDK 有 C# actors。所有 Dapr 语言 SDK 都应该有 actor 框架。目前 .NET、Java、Go 和 Python SDK 都有 actor 框架。

## 如果我想使用特定的编程语言或框架，Dapr 是否有 SDK 可用？

为了让不同语言更自然地使用 Dapr，Dapr 包含了[特定语言的 SDK]({{%ref sdks%}})，包括 Go、Java、JavaScript、.NET、Python、PHP、Rust 和 C++。这些 SDK 通过类型化语言 API 公开 Dapr 构建块的功能，例如保存状态、发布事件或创建 actor，而不是调用 http/gRPC API。这使您能够使用您选择的语言编写无状态和有状态函数及 actors 的组合。由于这些 SDK 共享 Dapr 运行时，您可以获得跨语言 actor 和函数支持。

## Dapr 集成了哪些框架？
Dapr 可以与任何开发框架集成。例如，在 Dapr .NET SDK 中，您可以找到 ASP.NET Core 集成，它带来了有状态路由控制器，可响应来自其他服务的发布订阅事件。

Dapr 与以下框架集成：

- Functions 与 Dapr [Azure Functions Extension](https://github.com/dapr/azure-functions-extension)
- Java SDK 中的 Spring Boot Web 应用程序
- .NET SDK 中的 ASP.NET Core
- [Azure API Management](https://cloudblogs.microsoft.com/opensource/2020/09/22/announcing-dapr-integration-azure-api-management-service-apim/)
