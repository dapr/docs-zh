---
type: docs
title: "概览"
linkTitle: "概览"
weight: 5
description: >
  Dapr 简介：面向工作流与 AI 代理的持久执行引擎
---

Dapr 提供持久、可验证的执行能力，让你的工作流和 AI 代理能够经受故障并持续运行至完成。其核心是一个持久执行工作流引擎，即使发生崩溃、重启和网络中断，也能保证每个步骤都运行至完成，并从中断处精确恢复状态。工作流执行历史可以[进行加密签名并验证]({{% ref workflow-history-signing.md %}})，使运行过的内容可被篡改检测、便于审计；同一引擎也驱动着持久 AI 代理，使其能够推理、调用工具，并从任何故障点恢复，而不丢失进度。

作为 CNCF 分布式应用运行时，Dapr 具有可移植和事件驱动的特性，让任何开发者都能轻松构建在云端和边缘运行的、具备弹性的无状态及有状态应用，并兼容各种语言和开发者框架。

{{< youtube id=9o9iDAgYBA8 >}}

## 任何语言、任何框架、任何位置

{{< diagram overview >}}

随着当前的云化浪潮，Web 加数据库的应用架构（例如经典的 3 层架构）正日益转向微服务架构，而微服务本质上是分布式的。你不应当为了构建微服务应用而先成为分布式系统专家。

Dapr 正是为此而生。Dapr 将构建微服务应用的*最佳实践*固化为开放、独立的 API，称为[构建块]({{% ref "#面向云与边缘的微服务构建块" %}})。Dapr 的构建块：
- 让你能够使用自己选择的语言和框架构建可移植的应用。
- 彼此完全独立。
- 在应用中可以使用的数量没有上限。

借助 Dapr，你可以逐步将现有应用迁移为微服务架构，从而采用云原生模式，例如横向扩缩容、弹性以及独立部署。

Dapr 与平台无关，这意味着你可以在以下环境中运行应用：
- 本地
- 任何 Kubernetes 集群上
- 虚拟机或物理机上
- 在 Dapr 集成的其他托管环境中。

这使你能够构建可在云端和边缘运行的微服务应用。

## 面向云与边缘的微服务构建块

{{< diagram building-blocks >}}

Dapr 提供分布式系统构建块，让你能够以标准化的方式构建微服务应用，并部署到任何环境中。

这些构建块 API 彼此独立，这意味着你可以在应用中使用任意数量的构建块。

| 构建块 | 说明 |
|----------------|-------------|
| [**工作流**]({{% ref "workflow-overview" %}}) | Dapr 的持久执行引擎，用于定义跨越多个微服务的长时间运行、持久化的流程或数据流，保证每个步骤在发生故障时仍能运行至完成。工作流 API 可以与其他 Dapr 构建块组合使用，且工作流历史可以被加密签名并验证。
| [**服务调用**]({{% ref "service-invocation-overview" %}})  | 具备弹性的服务间调用，可对远程服务进行方法调用（包括重试），无论这些服务位于受支持托管环境中的哪个位置。
| [**发布订阅**]({{% ref "pubsub-overview" %}}) | 服务之间的事件发布与主题订阅，使事件驱动架构能够简化水平扩展，并对故障具备弹性。Dapr 提供至少一次的消息投递保证、消息 TTL、消费者组等其他高级功能。
| [**状态管理**]({{% ref "state-management-overview" %}}) | 借助用于存储和查询键值对的状态管理，你可以在无状态服务之外，轻松编写长时间运行、高可用的有状态服务。状态存储是可插拔的，示例包括 AWS DynamoDB、Azure Cosmos DB、Azure SQL Server、GCP Firebase、PostgreSQL 或 Redis 等。
| [**二进制存储**]({{% ref "binarystore-overview" %}}) | 二进制存储 API 使你能够存储、检索和删除过大而无法放入状态存储的文件。文件内容在你的应用与已配置的存储之间以流的方式传输，而不是作为 JSON 值缓冲在 Dapr 边车中。
| [**资源绑定**]({{% ref "bindings-overview" %}}) | 带触发器的资源绑定进一步构建在事件驱动架构之上，通过接收和发送来自数据库、队列、文件系统等任何外部源的事件，实现扩展性与弹性。
| [**Actor**]({{% ref "actors-overview" %}}) | 一种面向有状态和无状态对象的模式，通过方法与状态的封装，让并发变得简单。Dapr 在其 Actor 运行时中提供了许多能力，包括并发、状态，以及 Actor 激活与停用的生命周期管理，还有用于唤醒 Actor 的定时器和提醒。
| [**机密**]({{% ref "secrets-overview" %}}) | 机密管理 API 与公有云和本地机密存储集成，以便在应用代码中获取所需的机密。
| [**配置**]({{% ref "configuration-api-overview" %}})  | 配置 API 使你能够从配置存储中检索应用配置项，并订阅其变化。
| [**分布式锁**]({{% ref "distributed-lock-api-overview" %}})  | 分布式锁 API 使你的应用能够为任意资源获取锁，从而获得对该资源的独占访问权，直到应用释放锁或租约超时为止。
| [**加密**]({{% ref "cryptography-overview" %}}) | 加密 API 在密钥保管库等安全基础设施之上提供了一层抽象。它包含的 API 允许你执行加解密等密码学操作，而无需将密钥暴露给你的应用。
| [**作业**]({{% ref "jobs-overview" %}}) | Jobs API 使你能够在指定时间或按指定间隔调度作业。
| [**对话**]({{% ref "conversation-overview" %}}) | 对话 API 使你能够屏蔽与大型语言模型 (LLM) 交互的复杂性，并包含提示缓存、个人身份信息（PII）混淆等功能。通过[对话组件]({{% ref supported-conversation %}})，你可以提供提示词，与不同的 LLM 进行对话。
| [**搜索**]({{% ref "search-overview" %}}) | 搜索 API 使你能够通过统一的可移植 API，在全文搜索引擎中索引、检索和查询文档。借助[搜索组件]({{% ref supported-search %}})，你可以在不更改应用代码的情况下更换搜索引擎。
| [**向量**]({{% ref "vector-overview" %}}) | 向量 API 使你能够存储嵌入向量，并通过统一的可移植 API 对向量数据库执行相似性查询。借助[向量组件]({{% ref supported-vector %}})，你可以在不更改应用代码的情况下更换向量数据库。

### 横切 API

除构建块之外，Dapr 还提供横切 API，它们适用于你所使用的所有构建块。

| 构建块 | 说明 |
|----------------|-------------|
|  [**弹性策略**]({{% ref "resiliency-concept" %}}) | Dapr 提供通过弹性策略规范定义并应用容错策略的能力。受支持的规范可为超时、重试/退避以及断路器等弹性模式定义策略。
|  [**可观测性**]({{% ref "observability-concept" %}}) | Dapr 输出指标、日志和追踪，用于调试和监控 Dapr 与用户应用。Dapr 支持分布式追踪，使用 W3C Trace Context 标准并通过 Open Telemetry 将数据发送到不同的监控工具，以便在生产环境中轻松诊断并支撑服务间调用。
|  [**安全**]({{% ref "security-concept" %}}) | Dapr 支持 Dapr 实例之间通信的传输中加密，借助 Dapr 控制平面中的 Sentry 服务实现。你可以带入自己的证书，也可以让 Dapr 自动创建并持久化自签名的根证书和颁发者证书。

## 边车架构

Dapr 以边车架构的形式暴露其 HTTP 和 gRPC API，既可以是容器，也可以是进程，应用代码无需包含任何 Dapr 运行时代码。这使得其他运行时也能轻松集成 Dapr，同时将应用逻辑与基础设施分离，以提升可维护性。

{{< diagram name="sidecar-model" width="65" >}}

## 托管环境

Dapr 可以托管在多种环境中，包括：
- 在 Windows/Linux/macOS 机器上自托管，用于本地开发和生产环境
- 在 Kubernetes 或由物理机或虚拟机组成的集群上，用于生产环境

### 自托管本地开发

在[自托管模式]({{% ref self-hosted-overview %}})下，Dapr 作为独立的边车进程运行，你的服务代码可以通过 HTTP 或 gRPC 调用它。每个正在运行的服务都有一个 Dapr 运行时进程（即边车），配置为使用状态存储、发布订阅、绑定组件以及其他构建块。

你可以使用 [Dapr CLI](https://github.com/dapr/cli#launch-dapr-and-your-app) 在本地机器上运行启用了 Dapr 的应用。在下图中，Dapr 的本地开发环境通过 CLI 的 `init` 命令进行配置。你可以通过[入门示例]({{% ref getting-started %}})进行尝试。

{{< diagram hosting-standalone >}}

### Kubernetes

Kubernetes 可用于以下两种场景：
- 本地开发（例如使用 [minikube](https://minikube.sigs.k8s.io/docs/) 和 [k3S](https://k3s.io/)），或
- [生产环境]({{% ref kubernetes %}})中

在 Kubernetes 等容器托管环境中，Dapr 以边车容器的形式与应用容器运行在同一个 Pod 中。

Dapr 的 `dapr-sidecar-injector` 和 `dapr-operator` 控制平面服务提供一流的集成，用于：
- 在与服务容器相同的 Pod 中启动 Dapr 边车容器
- 提供 Dapr 组件在集群中更新的通知

<!-- IGNORE_LINKS -->
`dapr-sentry` 服务是一个证书颁发机构，可在 Dapr 边车实例之间启用双向 TLS 以保证数据加密，并通过 [Spiffe](https://spiffe.io/) 提供身份。有关 `Sentry` 服务的更多信息，请阅读[安全概述]({{% ref "security-concept#dapr-to-dapr-communication" %}})。
<!-- END_IGNORE -->

将启用 Dapr 的应用部署并运行到 Kubernetes 集群中，只需在部署清单中添加几个注解即可。请参阅 [Dapr on Kubernetes 文档]({{% ref kubernetes %}})。

{{< diagram hosting-kubernetes >}}

### 物理机或虚拟机集群

在生产环境中，Dapr 控制平面服务可以以高可用（HA）模式部署到物理机或虚拟机集群上。在下图中，Actor `Placement` 服务和安全 `Sentry` 服务分别在三台不同的虚拟机上启动，以提供高可用的控制平面。为了让集群中运行的应用能够通过 DNS 进行名称解析，Dapr 默认使用组播 DNS，也可以选择支持 [Hashicorp Consul 服务]({{% ref setup-nr-consul %}})。

{{< diagram hosting-vms >}}

## 开发语言 SDK 与框架

Dapr 提供了多种 SDK 和框架，让你可以用自己偏好的语言轻松开始使用 Dapr 进行开发。

### Dapr SDK

为了让不同语言的开发者更自然地使用 Dapr，它还为以下语言提供了[特定语言 SDK]({{% ref sdks %}})：
- Go
- Java
- JavaScript
- .NET
- PHP
- Python

这些 SDK 通过带类型的语言 API 暴露 Dapr 构建块的功能，而无需直接调用 HTTP/gRPC API。这使你能够全部使用自己选择的语言，编写无状态和有状态函数以及 Actor 的组合。由于这些 SDK 共享同一个 Dapr 运行时，你还能获得跨语言的 Actor 与函数支持。

### 开发者框架

Dapr 可以在任何开发者框架中使用。以下是一些已与 Dapr 集成的框架：

#### Web

| 语言 | 框架 | 说明 |
|----------|------------|-------------|
| [.NET]({{% ref dotnet %}}) | [ASP.NET Core](https://github.com/dapr/dotnet-sdk/tree/master/examples/AspNetCore) | 提供有状态的路由控制器，用于响应来自其他服务的发布订阅事件。也可以利用 [ASP.NET Core gRPC 服务](https://docs.microsoft.com/aspnet/core/grpc/)。
| [Java]({{% ref java %}}) | [Spring Boot](https://spring.io/) | 使用 Dapr API 构建 Spring Boot 应用
| [Python]({{% ref python %}}) | [Flask]({{% ref python-flask %}}) | 使用 Dapr API 构建 Flask 应用
| [JavaScript](https://github.com/dapr/js-sdk) | [Express](https://expressjs.com/) | 使用 Dapr API 构建 Express 应用
| [PHP]({{% ref php %}}) | | 可以使用 Apache、Nginx 或 Caddy 服务器提供服务。

#### Dapr Agents

{{< diagram name="agents-overview" width="85" >}}


[Dapr Agents]({{% ref "../developing-ai/dapr-agents" %}}) 是一个 Python 框架，用于构建由 LLM 驱动的智能持久代理。它提供以代理为中心的能力，例如工具调用、记忆管理、[MCP 支持](https://modelcontextprotocol.io/)以及代理编排，同时借助 Dapr 大规模地实现持久性、可观测性和安全性。


#### 集成与扩展

请访问[集成]({{% ref integrations %}})页面，了解 Dapr 对各种框架和外部产品提供的一流支持，包括：
- 公有云服务，如 Azure 和 AWS
- Visual Studio Code
- GitHub

## 面向运维设计

Dapr 专为[运维]({{% ref operations %}})与安全而设计。Dapr 边车、运行时、组件和配置都可以被轻松、安全地管理和部署，以满足你所在组织的需求。

Dapr 支持[监控工具]({{% ref observability %}})，以便更深入地了解 Dapr 系统服务和边车；同时，Dapr 的[可观测性能力]({{% ref "observability-concept" %}})能够为你的应用提供洞察，例如追踪和指标。
