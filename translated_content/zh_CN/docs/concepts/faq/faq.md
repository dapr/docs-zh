---
type: docs
title: "Dapr 常见问题解答"
linkTitle: "常规问题"
weight: 100
description: "关于 Dapr 的常见问题"
---

## Dapr 与服务网格（如 Istio、Linkerd 或 OSM）相比如何？
Dapr 不是服务网格。虽然服务网格专注于细粒度的网络控制，但 Dapar 专注于帮助开发者构建分布式应用程序。Dapr 和服务网格都使用边车模式，并与应用程序一起运行。它们确实有一些重叠的功能，但也提供各自独特的优势。有关更多信息，请阅读 [Dapr & 服务网格]({{%ref service-mesh%}}) 概念页面。

## 性能基准测试
由于 Dapr 作为应用程序的边车，其项目特别关注性能。请参阅 [性能结果](https://github.com/dapr/dapr/tree/release-1.16/tests/perf/report/charts) 获取最新的性能数据。

## Actors

### Dapr、Orleans 和 Service Fabric Reliable Actors 之间是什么关系？

Dapr 中的 actors 基于 [Orleans](https://www.microsoft.com/research/project/orleans-virtual-actors/) 开创的虚拟 actor 概念，意味着它们在调用时激活，并在一段时间后停用。如果你熟悉 Orleans，Dapr C# actors 会让你感到熟悉。Dapr C# actors 基于 [Service Fabric Reliable Actors](https://docs.microsoft.com/azure/service-fabric/service-fabric-reliable-actors-introduction)（同样源自 Orleans），使你能够将 Service Fabric 中的 Reliable Actors 迁移到其他托管平台，例如 Kubernetes 或其他本地环境。

此外，Dapr 不仅仅是关于 actors。它为你提供了一套构建任何微服务应用程序的最佳实践构建块。请参阅 [Dapr 概述]({{% ref overview %}})。

### Dapr 与 actor 框架的区别

虚拟 actor 功能是 Dapr 在其运行时中提供的构建块之一。使用 Dapr，由于它具有编程语言无关的 http/gRPC API，可以从任何语言调用 actors。这允许用一种语言编写的 actors 调用用另一种语言编写的 actors。

创建新 actor 遵循本地调用，如 `http://localhost:3500/v1.0/actors/<actorType>/<actorId>/…`。例如，`http://localhost:3500/v1.0/actors/myactor/50/method/getData` 调用新创建的 id 为 `50` 的 `myactor` 上的 `getData` 方法。

Dapr 运行时 SDK 具有特定语言的 actor 框架。例如，.NET SDK 拥有 C# actors。目标是让所有 Dapr 语言 SDK 都拥有 actor 框架。目前 .NET、Java、Go 和 Python SDK 都拥有 actor 框架。

## 如果我想使用特定的编程语言或框架，Dapr 是否有我可以使用的 SDK？

为了让 Dapr 在不同语言中的使用更加自然，它包括 Go、Java、JavaScript、.NET、Python、PHP、Rust 和 C++ 的[特定语言 SDK]({{%ref sdks%}})。这些 SDK 通过类型化语言 API 而非调用 http/gRPC API 来暴露 Dapr 构建块中的功能，例如保存状态、发布事件或创建 actor。这使你能够用你选择的语言编写无状态和有状态函数及 actor 的组合。而且由于这些 SDK 共享 Dapr 运行时，你将获得跨语言的 actor 和函数支持。

## Dapr 与哪些框架集成？
Dapr 可以与任何开发者框架集成。例如，在 Dapr .NET SDK 中，你可以找到 ASP.NET Core 集成，它提供了响应来自其他服务的发布订阅事件的有状态路由控制器。

Dapr 与以下框架集成：

- Functions 与 Dapr [Azure Functions 扩展](https://github.com/dapr/azure-functions-extension)
- Java SDK 中的 Spring Boot Web 应用
- .NET SDK 中的 ASP.NET Core
- [Azure API Management](https://cloudblogs.microsoft.com/opensource/2020/09/22/announcing-dapr-integration-azure-api-management-service-apim/)
