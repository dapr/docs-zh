---
type: docs
title: "概览"
linkTitle: "概览"
weight: 100
description: >
  分布式应用运行时简介
---

Dapr 是一个可移植的、事件驱动的运行时，它使任何开发者都能轻松构建具有弹性的无状态和有状态应用程序，这些应用程序可运行在云和边缘环境，并拥抱语言和开发者框架的多样性。

{{< youtube id=9o9iDAgYBA8 >}}

## 任何语言、任何框架、任何地方

<img src="/images/overview.png" width=1200 style="padding-bottom:15px;">

随着当前云采用浪潮，Web + 数据库应用架构（如经典的三层设计）正越来越多地转向微服务应用架构，这种架构本质上是分布式的。你不应该仅仅为了创建微服务应用程序就必须成为分布式系统专家。

这正是 Dapr 发挥作用的地方。Dapr 将构建微服务应用程序的*最佳实践*编码为开放、独立的 API，称为[构建块]({{% ref "#microservice-building-blocks-for-cloud-and-edge" %}})。Dapr 的构建块：
- 使你能够使用你选择的语言和框架构建可移植的应用程序。
- 完全独立
- 在应用程序中使用多少个没有限制

使用 Dapr，你可以将现有应用程序逐步迁移到微服务架构，从而采用云原生模式，如水平扩展/收缩、弹性和独立部署。

Dapr 与平台无关，这意味着你可以在以下位置运行应用程序：
- 本地
- 在任何 Kubernetes 集群上
- 在虚拟机或物理机上
- 在 Dapr 集成的其他托管环境中。

这使你能够构建可以在云和边缘运行的微服务应用程序。

## 面向云和边缘的微服务构建块

<img src="/images/building_blocks.png" width=1200 style="padding-bottom:15px;">

Dapr 提供分布式系统构建块，供你以标准方式构建微服务应用程序并部署到任何环境。

这些构建块 API 中的每一个都是独立的，这意味着你可以在应用程序中使用其中任意数量的 API。

| 构建块 | 描述 |
|----------------|-------------|
| [**服务调用**]({{% ref "service-invocation-overview" %}})  | 弹性的服务调用使你能够在远程服务上进行方法调用（包括重试），无论它们位于支持的托管环境中的何处。 |
| [**发布订阅**]({{% ref "pubsub-overview" %}}) | 在服务之间发布事件和订阅主题使事件驱动架构能够简化水平可扩展性并使其对故障具有弹性。Dapr 提供至少一次消息传递保证、消息 TTL、消费者组和其他高级功能。 |
| [**工作流**]({{% ref "workflow-overview" %}}) | 工作流 API 可以与其他 Dapr 构建块结合使用，以定义跨越多个微服务的长时间运行的持久化进程或使用 Dapr 工作流的数据流。 |
| [**状态管理**]({{% ref "state-management-overview" %}}) | 通过用于存储和查询键/值对的状态管理，可以轻松地在应用程序中的无状态服务旁边编写长时间运行、高可用的有状态服务。状态存储是可插拔的，示例包括 AWS DynamoDB、Azure Cosmos DB、Azure SQL Server、GCP Firebase、PostgreSQL 或 Redis 等。 |
| [**资源绑定**]({{% ref "bindings-overview" %}}) | 带有触发器的资源绑定通过从任何外部源（如数据库、队列、文件系统等）接收和发送事件，进一步构建了事件驱动架构以实现可扩展性和弹性。 |
| [**Actors**]({{% ref "actors-overview" %}}) | 一种有状态和无状态对象的模式，通过方法和状态封装使并发变得简单。Dapr 在其 actor 运行时中提供了许多功能，包括并发、状态，以及 actor 激活/停用的生命周期管理，以及用于唤醒 actor 的定时器和提醒。 |
| [**密钥**]({{% ref "secrets-overview" %}}) | 密钥管理 API 与公共云和本地密钥存储集成，以检索密钥供应用程序代码使用。 |
| [**配置**]({{% ref "configuration-api-overview" %}})  | 配置 API 使你能够从配置存储中检索和订阅应用程序配置项。 |
| [**分布式锁**]({{% ref "distributed-lock-api-overview" %}})  | 分布式锁 API 使你的应用程序能够为任何资源获取锁，从而赋予其独占访问权限，直到应用程序释放锁或租约超时为止。 |
| [**密码学**]({{% ref "cryptography-overview" %}}) | 密码学 API 在密钥保管库等安全基础设施之上提供抽象层。它包含允许你执行密码学操作的 API，例如加密和解密消息，而不会向你的应用程序暴露密钥。 |
| [**作业**]({{% ref "jobs-overview" %}}) | 作业 API 使你能够在特定时间或间隔安排作业。 |
| [**对话**]({{% ref "conversation-overview" %}}) | 对话 API 使你能够抽象与大型语言模型（LLM）交互的复杂性，并包括提示缓存、响应格式化、使用度量和个人身份信息（PII）混淆等功能。使用[对话组件]({{% ref supported-conversation %}})，你可以提供提示以与不同的 LLM 进行对话。 |

### 横切关注点 API

除了构建块之外，Dapr 还提供了跨你使用的所有构建块应用的横切关注点 API。

| 构建块 | 描述 |
|----------------|-------------|
|  [**弹性**]({{% ref "resiliency-concept" %}}) | Dapr 提供通过弹性规范定义和应用容错弹性策略的功能。支持的规范为超时、重试/退避和断路器等弹性模式定义策略。 |
|  [**可观测性**]({{% ref "observability-concept" %}}) | Dapr 发出指标、日志和跟踪以调试和监视 Dapr 和用户应用程序。Dapr 支持使用 W3C 跟踪上下文标准和 Open Telemetry 发送到不同监视工具的分布式跟踪，以便在生产环境中轻松诊断和服务间调用。 |
|  [**安全性**]({{% ref "security-concept" %}}) | Dapr 支持使用 Dapr 控制平面 Sentry 服务在 Dapr 实例之间进行传输中加密通信。你可以引入自己的证书，或让 Dapr 自动创建并持久化自签名根证书和颁发者证书。 |

## 边车架构

Dapr 将其 HTTP 和 gRPC API 作为边车架构公开，可以是容器或进程，不需要应用程序代码包含任何 Dapr 运行时代码。这使得与其他运行时的集成变得容易，并提供了应用程序逻辑的分离以提高可支持性。

<img src="/images/overview-sidecar-model.png" width=900>

## 托管环境

Dapr 可以托管在多个环境中，包括：
- 在 Windows/Linux/macOS 机器上自托管，用于本地开发和在生产中
- 在 Kubernetes 或生产中的物理或虚拟机集群上

### 自托管本地开发

在[自托管模式]({{% ref self-hosted-overview %}})中，Dapr 作为单独的边车进程运行，你的服务代码可以通过 HTTP 或 gRPC 调用该进程。每个运行的服务都有一个 Dapr 运行时进程（或边车），配置为使用状态存储、发布订阅、绑定组件和其他构建块。

你可以使用 [Dapr CLI](https://github.com/dapr/cli#launch-dapr-and-your-app) 在本地计算机上运行启用了 Dapr 的应用程序。在下图中，Dapr 的本地开发环境使用 CLI `init` 命令进行配置。尝试使用[入门示例]({{% ref getting-started %}})。

<img src="/images/overview-standalone.png" width=1200 alt="Self-hosted 模式下 Dapr 的架构图">

### Kubernetes

Kubernetes 可用于：
- 本地开发（例如，使用 [minikube](https://minikube.sigs.k8s.io/docs/) 和 [k3S](https://k3s.io/)），或
- 在[生产]({{% ref kubernetes %}})中。

在 Kubernetes 等容器托管环境中，Dapr 作为边车容器与应用程序容器在同一 Pod 中运行。

Dapr 的 `dapr-sidecar-injector` 和 `dapr-operator` 控制平面服务提供一流集成，以：
- 在与服务容器相同的 Pod 中启动 Dapr 作为边车容器
- 提供在集群中预配的 Dapr 组件更新的通知

<!-- IGNORE_LINKS -->
`dapr-sentry` 服务是一个证书颁发机构，它启用 Dapr 边车实例之间的相互 TLS 以进行安全数据加密，以及通过 [Spiffe](https://spiffe.io/) 提供身份。有关 `Sentry` 服务的更多信息，请阅读[安全概览]({{% ref "security-concept#dapr-to-dapr-communication" %}})
<!-- END_IGNORE -->

将启用了 Dapr 的应用程序部署并运行到 Kubernetes 集群就像在部署方案中添加几个注释一样简单。访问 [Dapr on Kubernetes 文档]({{% ref kubernetes %}})。

<img src="/images/overview-kubernetes.png" width=1200 alt="Kubernetes 模式下 Dapr 的架构图">

### 物理或虚拟机集群

Dapr 控制平面服务可以在生产中部署到物理或虚拟机集群的高可用性（HA）模式。在下图中，Actor `Placement` 和安全 `Sentry` 服务在三台不同的 VM 上启动，以提供 HA 控制平面。为了使用 DNS 为集群中运行的应用程序提供名称解析，Dapr 默认使用多播 DNS，但也可以选择支持 [Hashicorp Consul 服务]({{% ref setup-nr-consul %}})。

<img src="/images/overview-vms-hosting.png" width=1200 alt="Dapr 控制平面和 Consul 部署到高可用性模式中的 VM 的架构图">

## 开发者语言 SDK 和框架

Dapr 提供各种 SDK 和框架，使你能够轻松使用你首选的语言开始使用 Dapr 进行开发。

### Dapr SDK

为了使使用 Dapr 对不同语言更自然，它还包括[特定语言的 SDK]({{% ref sdks %}})，用于：
- Go
- Java
- JavaScript
- .NET
- PHP
- Python

这些 SDK 通过类型化语言 API 公开 Dapr 构建块的功能，而不是调用 http/gRPC API。这使你能够使用你选择的语言编写无状态和有状态函数以及 actor 的组合。由于这些 SDK 共享 Dapr 运行时，因此你可以获得跨语言 actor 和函数支持。

### 开发者框架

Dapr 可以从任何开发者框架使用。以下是一些已与 Dapr 集成的框架：

#### Web

| 语言 | 框架 | 描述 |
|----------|------------|-------------|
| [.NET]({{% ref dotnet %}}) | [ASP.NET Core](https://github.com/dapr/dotnet-sdk/tree/master/examples/AspNetCore) | 提供响应来自其他服务的发布订阅事件的有状态路由控制器。也可以利用 [ASP.NET Core gRPC Services](https://docs.microsoft.com/aspnet/core/grpc/)。 |
| [Java]({{% ref java %}}) | [Spring Boot](https://spring.io/) | 使用 Dapr API 构建 Spring Boot 应用程序 |
| [Python]({{% ref python %}}) | [Flask]({{% ref python-flask %}}) | 使用 Dapr API 构建 Flask 应用程序 |
| [JavaScript](https://github.com/dapr/js-sdk) | [Express](https://expressjs.com/) | 使用 Dapr API 构建 Express 应用程序 |
| [PHP]({{% ref php %}}) | | 你可以使用 Apache、Nginx 或 Caddyserver 提供服务。 |

#### Dapr Agents

![Dapr Agents  Overview](/images/dapr-agents/concepts-agents-overview.png)

[Dapr Agents]({{% ref "../developing-ai/dapr-agents" %}}) 是一个 Python 框架，用于构建由 LLM 驱动的智能、持久的代理。它提供以代理为中心的功能，例如工具调用、内存管理、[MCP 支持](https://modelcontextprotocol.io/)和代理编排，同时利用 Dapr 实现持久性、可观测性和安全性，并支持大规模。

#### 集成和扩展

访问[集成]({{% ref integrations %}})页面，了解 Dapr 对各种框架和外部产品（包括以下内容）的一流支持：
- 公共云服务，如 Azure 和 AWS
- Visual Studio Code
- GitHub

## 为运维而设计

Dapr 是为[运维]({{% ref operations %}})和安全性而设计的。Dapr 边车、运行时、组件和配置都可以轻松安全地管理和部署，以满足你组织的需求。

通过 Dapr CLI 安装的[仪表板](https://github.com/dapr/dashboard)提供了一个基于 Web 的 UI，使你能够查看运行 Dapr 应用程序的信息、查看日志等。

Dapr 支持[监视工具]({{% ref observability %}})，以深入了解 Dapr 系统服务和边车，而 Dapr 的[可观测性功能]({{% ref "observability-concept" %}})则提供对应用程序的洞察，例如跟踪和指标。
