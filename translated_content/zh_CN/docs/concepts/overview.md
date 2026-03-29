---
type: docs
title: "概述"
linkTitle: "概述"
weight: 100
description: >
  分布式应用运行时介绍
---

Dapr 是一个可移植、事件驱动的运行时，可以轻松让任何开发者构建在云和边缘运行的有弹性的无状态和有状态应用程序，并且支持多种语言和开发者框架。

{{< youtube id=9o9iDAgYBA8 >}}

## 任何语言，任何框架，任何地方

<img src="/images/overview.png" width=1200 style="padding-bottom:15px;">

随着当前云采用的浪潮，Web + 数据库应用程序架构（如经典的三层设计）正越来越多地转向微服务应用程序架构，而微服务架构本质上是分布式的。您不需要成为分布式系统专家才能创建微服务应用程序。

这就是 Dapr 的用武之地。Dapr 将构建微服务应用程序的*最佳实践*编码为开放的、独立的功能接口，称为[构建块]({{% ref "#microservice-building-blocks-for-cloud-and-edge" %}})。Dapr 的构建块：
- 使您能够使用您选择的语言和框架构建可移植的应用程序。
- 完全独立
- 在您的应用程序中使用的数量没有限制

使用 Dapr，您可以增量迁移现有应用程序到微服务架构，从而采用云原生模式，如横向扩展/缩减、弹性和独立部署。

Dapr 是平台无关的，这意味着您可以运行您的应用程序：
- 本地
- 在任何 Kubernetes 集群上
- 在虚拟机或物理机上
- 在 Dapr 集成的其他托管环境中。

这使您能够构建可以在云和边缘运行的微服务应用程序。

## 面向云和边缘的微服务构建块

<img src="/images/building_blocks.png" width=1200 style="padding-bottom:15px;">

Dapr 提供了分布式系统构建块，帮助您以标准方式构建微服务应用程序并部署到任何环境。

每个构建块接口都是独立的，这意味着您可以在应用程序中使用任意数量的构建块。

| 构建块 | 描述 |
|----------------|-------------|
| [**服务到服务调用**]({{% ref "service-invocation-overview" %}})  | 有弹性的服务到服务调用能够调用远程服务的方法，包括重试，无论它们位于支持的托管环境中的什么位置。 |
| [**发布和订阅**]({{% ref "pubsub-overview" %}}) | 服务之间的事件发布和订阅支持事件驱动架构，简化横向扩展并使其能够抵御故障。Dapr 提供至少一次消息传递保证、消息 TTL、消费者组和其他高级功能。 |
| [**工作流**]({{% ref "workflow-overview" %}}) | 工作流 API 可以与 Dapr 的其他构建块结合使用，定义跨越多个微服务的长时间运行、持久化的进程或数据流。 |
| [**状态管理**]({{% ref "state-management-overview" %}}) | 通过状态管理存储和查询键值对，可以轻松地在应用程序中与无状态服务一起编写高度可用的有状态服务。状态存储是可选的，示例包括 AWS DynamoDB、Azure Cosmos DB、Azure SQL Server、GCP Firebase、PostgreSQL 或 Redis 等。 |
| [**资源绑定**]({{% ref "bindings-overview" %}}) | 带触发器的资源绑定进一步建立在事件驱动架构之上，实现扩展和弹性，可以接收和发送来自任何外部源（如数据库、队列、文件系统等）的事件。 |
| [** Actors**]({{% ref "actors-overview" %}}) | 一种有状态和无状态对象的模式，使并发变得简单，具有方法和状态封装。Dapr 在其 Actor 运行时中提供了许多功能，包括并发的并发、状态和生命周期管理，用于 Actor 的激活/停用，以及用于唤醒 Actor 的定时器和提醒器。 |
| [**密钥管理**]({{% ref "secrets-overview" %}}) | 密钥管理 API 与公共云和本地密钥存储集成，用于检索应用程序代码中使用的密钥。 |
| [**配置**]({{% ref "configuration-api-overview" %}})  | 配置 API 使您能够从配置存储中检索和订阅应用程序配置项。 |
| [**分布式锁**]({{% ref "distributed-lock-api-overview" %}})  | 分布式锁 API 使您的应用程序能够获取对任何资源的锁，使其具有独占访问权，直到应用程序释放锁或租约超时。 |
| [**加密**]({{% ref "cryptography-overview" %}}) | 加密 API 在密钥保管库等安全基础设施之上提供了一个抽象层。它包含允许您执行加密操作的 API，例如加密和解密消息，而不会向您的应用程序暴露密钥。 |
| [**作业**]({{% ref "jobs-overview" %}}) | 作业 API 使您能够在特定时间或时间间隔调度作业。 |
| [**对话**]({{% ref "conversation-overview" %}}) | 对话 API 使您能够抽象出与大语言模型 (LLM) 交互的复杂性，并包括提示缓存、响应格式化、使用指标和个人身份信息 (PII) 混淆等功能。使用[对话组件]({{% ref supported-conversation %}})，您可以提供提示以与不同的 LLM 对话。 |

### 跨领域 API

除了构建块之外，Dapr 还提供了跨领域的 API，这些 API 适用于您使用的所有构建块。

| 构建块 | 描述 |
|----------------|-------------|
|  [**弹性**]({{% ref "resiliency-concept" %}}) | Dapr 提供了通过弹性规范定义和应用容错弹性策略的能力。支持规范的弹性模式策略包括超时、重试/退避和断路器。 |
|  [**可观测性**]({{% ref "observability-concept" %}}) | Dapr 发出指标、日志和追踪，用于调试和监控 Dapr 和用户应用程序。Dapr 支持分布式追踪，使用 W3C Trace Context 标准和 Open Telemetry 轻松诊断和生产环境中的服务间调用，以发送到不同的监控工具。 |
|  [**安全**]({{% ref "security-concept" %}}) | Dapr 支持使用 Dapr 控制平面 Sentry 服务对 Dapr 实例之间的通信进行传输中加密。您可以自带证书，或者让 Dapr 自动创建并持久化自签名根证书和颁发者证书。 |

## 边车架构

Dapr 将其 HTTP 和 gRPC API 作为边车架构公开，可以作为容器或进程，不需要应用程序代码包含任何 Dapr 运行时代码。这使得从其他运行时与 Dapr 的集成变得简单，同时也为应用程序逻辑提供了分离以提高可支持性。

<img src="/images/overview-sidecar-model.png" width=900>

## 托管环境

Dapr 可以在多种环境中托管，包括：
- 在 Windows/Linux/macOS 机器上自托管，用于本地开发和生产
- 在 Kubernetes 或物理机或虚拟机集群上进行生产

### 自托管本地开发

在[自托管模式]({{% ref self-hosted-overview %}})下，Dapr 作为单独的边车进程运行，您的服务代码可以通过 HTTP 或 gRPC 调用。每个运行的服务都有一个配置为使用状态存储、发布订阅、绑定组件和其他构建块的 Dapr 运行时进程（或边车）。

您可以使用 [Dapr CLI](https://github.com/dapr/cli#launch-dapr-and-your-app) 在本地机器上运行支持 Dapr 的应用程序。在下图中，Dapr 的本地开发环境使用 CLI `init` 命令进行配置。请尝试使用[入门示例]({{% ref getting-started %})进行体验。

<img src="/images/overview-standalone.png" width=1200 alt="Dapr 在自托管模式下架构图">

### Kubernetes

Kubernetes 可用于：
- 本地开发（例如，使用 [minikube](https://minikube.sigs.k8s.io/docs/) 和 [k3S](https://k3s.io/)），或
- 在[生产环境]({{% ref kubernetes %}})中。

在 Kubernetes 等容器托管环境中，Dapr 与应用程序容器运行在同一个 pod 中作为边车容器。

Dapr 的 `dapr-sidecar-injector` 和 `dapr-operator` 控制平面服务提供了一流集成，可以：
- 在与服务容器相同的 pod 中启动 Dapr 作为边车容器
- 提供集群中配置的 Dapr 组件更新的通知

<!-- IGNORE_LINKS -->
`dapr-sentry` 服务是一个证书颁发机构，支持 Dapr 边车实例之间的 mutual TLS 以实现安全数据加密，以及通过 [Spiffe](https://spiffe.io/) 提供身份验证。有关 `Sentry` 服务的更多信息，请阅读[安全概述]({{% ref "security-concept#dapr-to-dapr-communication" %}})
<!-- END_IGNORE -->

将支持 Dapr 的应用程序部署和运行到您的 Kubernetes 集群中非常简单，只需在部署方案中添加一些注解即可。访问 [Kubernetes 上的 Dapr 文档]({{% ref kubernetes %})。

<img src="/images/overview-kubernetes.png" width=1200 alt="Dapr 在 Kubernetes 模式下架构图">

### 物理机或虚拟机集群

Dapr 控制平面服务可以以高可用性 (HA) 模式部署到生产环境中的物理机或虚拟机集群。在下图下方，Actor `Placement` 和安全 `Sentry` 服务在三个不同的虚拟机上启动，以提供 HA 控制平面。为了在使用 DNS 进行名称解析，集群中运行的应用程序默认使用多播 DNS，但也可以选择支持 [Hashicorp Consul 服务]({{% ref setup-nr-consul %}})。

<img src="/images/overview-vms-hosting.png" width=1200 alt="Dapr 控制平面和 Consul 部署到高可用模式虚拟机的架构图">

## 开发者语言 SDK 和框架

Dapr 提供多种 SDK 和框架，让您轻松开始使用首选语言进行 Dapr 开发。

### Dapr SDK

为了让不同语言更自然地使用 Dapr，Dapr 还包括针对以下语言的[语言特定 SDK]({{% ref sdks %})：
- Go
- Java
- JavaScript
- .NET
- PHP
- Python

这些 SDK 通过类型化语言 API 公开 Dapr 构建块的功能，而不是调用 http/gRPC API。这使您能够使用您选择的语言编写有状态和无状态函数和 Actor 的组合。由于这些 SDK 共享 Dapr 运行时，您可以获得跨语言 Actor 和函数支持。

### 开发者框架

Dapr 可以从任何开发者框架使用。以下是一些已与 Dapr 集成的框架：

#### Web

| 语言 | 框架 | 描述 |
|----------|------------|-------------|
| [.NET]({{% ref dotnet %}}) | [ASP.NET Core](https://github.com/dapr/dotnet-sdk/tree/master/examples/AspNetCore) | 带来有状态的路由控制器，响应来自其他服务的发布/订阅事件。还可以利用 [ASP.NET Core gRPC Services](https://docs.microsoft.com/aspnet/core/grpc/)。 |
| [Java]({{% ref java %}}) | [Spring Boot](https://spring.io/) | 使用 Dapr API 构建 Spring Boot 应用程序 |
| [Python]({{% ref python %}}) | [Flask]({{% ref python-flask %}}) | 使用 Dapr API 构建 Flask 应用程序 |
| [JavaScript](https://github.com/dapr/js-sdk) | [Express](https://expressjs.com/) | 使用 Dapr API 构建 Express 应用程序 |
| [PHP]({{% ref php %}}) | | 您可以使用 Apache、Nginx 或 Caddy server 提供服务。 |

#### Dapr Agents

![Dapr Agents 概述](/images/dapr-agents/concepts-agents-overview.png)


[Dapr Agents]({{% ref "../developing-ai/dapr-agents" %}}) 是一个用于构建由 LLM 驱动的智能、持久 Agent 的 Python 框架。它提供以 Agent 为中心的功能，如工具调用、内存管理、[MCP 支持](https://modelcontextprotocol.io/) 和 Agent 编排，同时利用 Dapr 实现大规模的可持久性、可观测性和安全性。


#### 集成和扩展

访问[集成]({{% ref integrations %}})页面了解 Dapr 对各种框架和外部产品的一流支持，包括：
- 公共云服务，如 Azure 和 AWS
- Visual Studio Code
- GitHub

## 为运维而设计

Dapr 是为[运维]({{% ref operations %}})和安全而设计的。Dapr 边车、运行时、组件和配置都可以轻松且安全地管理和部署，以满足您组织的需要。

通过 Dapr CLI 安装的[仪表板](https://github.com/dapr/dashboard)提供了一个基于 Web 的 UI，使您能够查看信息、查看日志，以及更多运行中 Dapr 应用程序的信息。

Dapr 支持[监控工具]({{% ref observability %})，以更深入地了解 Dapr 系统服务和边车，而 Dapr 的[可观测性功能]({{% ref "observability-concept" %}})则提供对您应用程序的洞察，如追踪和指标。
