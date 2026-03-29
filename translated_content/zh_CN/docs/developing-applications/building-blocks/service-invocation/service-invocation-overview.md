---
type: docs
title: "服务调用概述"
linkTitle: "概述"
weight: 10
description: "服务调用 API 构建块概述"
---

通过服务调用，您的应用程序可以使用标准的 [gRPC](https://grpc.io) 或 [HTTP](https://www.w3.org/Protocols/) 协议可靠且安全地与其他应用程序通信。

在许多基于微服务的应用程序中，多个服务需要相互通信的能力。这种服务间通信要求应用程序开发者处理以下问题：

- **服务发现。** 如何发现不同的服务？
- **标准化服务间 API 调用。** 如何在不同服务之间调用方法？
- **安全的服务间通信。** 如何通过加密安全地调用其他服务，并对方法实施访问控制？
- **缓解请求超时或故障。** 如何处理重试和瞬态错误？
- **实现可观测性和追踪。** 如何使用追踪来查看带有指标的调用图，以诊断生产环境中的问题？

## 服务调用 API

Dapr 通过提供服务调用 API 来应对这些挑战，该 API 的行为类似于具有内置服务发现功能的反向代理，同时利用了内置的分布式追踪、指标、错误处理、加密等功能。

Dapr 使用边车架构。要使用 Dapr 调用应用程序：
- 您可以在 Dapr 实例上使用 `invoke` API。
- 每个应用程序与其自己的 Dapr 实例通信。
- Dapr 实例之间相互发现和通信。

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=mtLMrajE5wVXJYz8&t=3598) 演示了 Dapr 服务调用的工作原理。

{{< youtube id=0y7ne6teHT4 start=3598 >}}

下图是 Dapr 服务调用在两个 Dapr 化应用程序之间工作方式的概述。

<img src="/images/service-invocation-overview.png" width=800 alt="显示服务调用步骤的图表">

1. 服务 A 发送 HTTP 或 gRPC 调用到服务 B。调用首先到达本地 Dapr 边车。
2. Dapr 使用[名称解析组件]({{% ref supported-name-resolution %}})发现服务 B 的位置，该组件运行在给定的[托管平台]({{% ref "hosting" %}})上。
3. Dapr 将消息转发到服务 B 的 Dapr 边车
   - **注意**：Dapr 边车之间的所有调用都通过 gRPC 进行以提高性能。只有服务与 Dapr 边车之间的调用可以是 HTTP 或 gRPC。
4. 服务 B 的 Dapr 边车将请求转发到服务 B 上的指定端点（或方法）。然后服务 B 执行其业务逻辑代码。
5. 服务 B 向服务 A 发送响应。响应首先到达服务 B 的边车。
6. Dapr 将响应转发到服务 A 的 Dapr 边车。
7. 服务 A 接收响应。

您还可以使用服务调用 API 调用非 Dapr HTTP 端点。例如，您可能只在部分整体应用程序中使用 Dapr，可能无法访问用于将现有应用程序迁移到使用 Dapr 的代码，或者只是需要调用外部 HTTP 服务。阅读["如何：使用 HTTP 调用非 Dapr 端点"]({{% ref howto-invoke-non-dapr-endpoints %}}) 获取更多信息。

## 功能特性
服务调用提供了多项功能，使您可以轻松地在应用程序之间调用方法或调用外部 HTTP 端点。

### HTTP 和 gRPC 服务调用
- **HTTP**：如果您已经在应用程序中使用 HTTP 协议，使用 Dapr HTTP 头可能是最简单的入门方式。您无需更改现有的端点 URL；只需添加 `dapr-app-id` 头即可。更多信息请参阅[使用 HTTP 调用服务]({{% ref howto-invoke-discover-services %}})。
- **gRPC**：Dapr 允许用户保留自己的 proto 服务并原生使用 gRPC。这意味着您可以使用服务调用来调用现有的 gRPC 应用程序，而无需包含任何 Dapr SDK 或自定义 gRPC 服务。更多信息请参阅 [Dapr 和 gRPC 操作指南]({{% ref howto-invoke-services-grpc %}})。

### 服务到服务安全

通过 Dapr Sentry 服务，Dapr 应用程序之间的所有调用都可以使用托管平台上的相互（mTLS）身份验证来保证安全，包括自动证书轮换。

更多信息请阅读[服务到服务安全]({{% ref "security-concept#sidecar-to-sidecar-communication" %}})文章。

### 包括重试在内的弹性

在发生调用失败和瞬态错误的情况下，服务调用提供了一种弹性功能，可以执行带退避时间的自动重试。了解更多，请参阅[弹性文章]({{% ref resiliency-overview %}})。

### 可观测性追踪和指标

默认情况下，应用程序之间的所有调用都会被追踪，并收集指标以提供洞察和诊断。这在生产场景中尤为重要，提供服务间调用的调用图和指标。更多信息请阅读[可观测性]({{% ref observability-concept %}})。

### 访问控制

通过访问策略，应用程序可以控制：

- 允许哪些应用程序调用它们。
- 哪些应用程序被授权执行操作。

例如，您可以限制包含人员信息的敏感应用程序被未经授权的应用程序访问。结合服务到服务安全通信，您可以提供软多租户部署。

更多信息请阅读[服务调用的访问控制白名单]({{% ref invoke-allowlist %}})文章。

### 命名空间作用域

您可以将应用程序作用域限定到命名空间，用于部署和安全目的，并可以调用部署在不同命名空间中的服务。更多信息请阅读[跨命名空间的服务调用]({{% ref "service-invocation-namespaces" %}})文章。

### 使用 mDNS 的轮询负载均衡

Dapr 使用 mDNS 协议提供服务调用的轮询负载均衡，例如在单机上或多个联网的物理机器上。

下图展示了这如何工作的示例。如果您有 1 个应用程序 ID 为 `FrontEnd` 的应用程序实例和 3 个应用程序 ID 为 `Cart` 的应用程序实例，当您从 `FrontEnd` 应用调用 `Cart` 应用时，Dapr 会在这 3 个实例之间轮询。这些实例可以在同一台机器上，也可以在不同的机器上。

<img src="/images/service-invocation-mdns-round-robin.png" width=600 alt="显示服务调用步骤的图表" style="padding-bottom:25px;">

**注意**：应用程序 ID 在每个_应用程序_中是唯一的，而不是应用程序实例。无论该应用程序存在多少个实例（由于扩展），它们都将共享相同的应用程序 ID。

### 可交换的服务发现

Dapr 可以在各种[托管平台]({{% ref hosting %}})上运行。为了使服务调用支持可交换的服务发现，Dapr 使用[名称解析组件]({{% ref supported-name-resolution %}})。例如，Kubernetes 名称解析组件使用 Kubernetes DNS 服务来解析集群中运行的其他应用程序的位置。

自托管机器可以使用 mDNS 名称解析组件。作为替代方案，您可以使用 SQLite 名称解析组件在单节点环境和本地开发场景中运行 Dapr。作为集群一部分的 Dapr 边车将其信息存储在本地机器上的 SQLite 数据库中。

Consul 名称解析组件特别适用于多机器部署，可用于任何托管环境，包括 Kubernetes、多个虚拟机或自托管。

### HTTP 服务调用的流式处理

您可以在 HTTP 服务调用中将数据作为流处理。当使用 Dapr 通过 HTTP 调用另一个服务并处理大型请求或响应体时，这可以提供性能和内存利用率方面的改进。

下图演示了数据流的六个步骤。

<img src="/images/service-invocation-simple.webp" width=600 alt="显示服务调用步骤的图表，见下表" />

1. 请求："App A" 到 "Dapr sidecar A"
1. 请求："Dapr sidecar A" 到 "Dapr sidecar B"
1. 请求："Dapr sidecar B" 到 "App B"
1. 响应："App B" 到 "Dapr sidecar B"
1. 响应："Dapr sidecar B" 到 "Dapr sidecar A"
1. 响应："Dapr sidecar A" 到 "App A"

## 示例架构

按照上述调用顺序，假设您有 [Hello World 教程](https://github.com/dapr/quickstarts/blob/master/tutorials/hello-world/README) 中描述的应用程序，其中一个 Python 应用程序调用一个 Node.js 应用程序。在这种情况下，Python 应用程序是"服务 A"，Node.js 应用程序是"服务 B"。

下图再次展示了在本地机器上显示 API 调用的序列 1-7：

<img src="/images/service-invocation-overview-example.png" width=800 style="padding-bottom:25px;">

1. Node.js 应用程序的 Dapr 应用程序 ID 为 `nodeapp`。Python 应用程序通过 POST `http://localhost:3500/v1.0/invoke/nodeapp/method/neworder` 来调用 Node.js 应用程序的 `neworder` 方法，该请求首先到达 Python 应用程序的本地 Dapr 边车。
2. Dapr 使用名称解析组件（在本例中为自托管时的 mDNS）发现 Node.js 应用程序的位置，该组件在您的本地机器上运行。
3. Dapr 使用刚刚获得的位置将请求转发到 Node.js 应用程序的边车。
4. Node.js 应用程序的边车将请求转发到 Node.js 应用程序。Node.js 应用程序执行业务逻辑，记录传入消息，然后将订单 ID 持久化到 Redis（图中未显示）。
5. Node.js 应用程序通过 Node.js 边车向 Python 应用程序发送响应。
6. Dapr 将响应转发到 Python Dapr 边车。
7. Python 应用程序接收响应。

## 试用服务调用
### 快速入门和教程
Dapr 文档包含多个快速入门，展示了在不同示例架构中利用服务调用构建块的方式。要直接了解服务调用 API 及其功能，我们建议从以下快速入门开始：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [服务调用快速入门]({{% ref serviceinvocation-quickstart %}}) | 此快速入门让您直接与服务调用构建块交互。 |
| [Hello world 教程](https://github.com/dapr/quickstarts/blob/master/tutorials/hello-world/README.md) | 本教程展示如何同时使用服务调用和状态管理构建块，全部在本地机器上运行。 |
| [Hello world Kubernetes 教程](https://github.com/dapr/quickstarts/blob/master/tutorials/hello-kubernetes/README.md) | 本教程介绍如何在 Kubernetes 中使用 Dapr，涵盖服务调用和状态管理构建块。 |


### 直接在您的应用程序中开始使用服务调用
想跳过快速入门吗？没问题。您可以直接在应用程序中试用服务调用构建块，与其他服务安全通信。[安装 Dapr](https://docs.dapr.io/getting-started) 后，您可以通过以下方式开始使用服务调用 API。

使用以下方式调用服务：
- **HTTP 和 gRPC 服务调用**（推荐的设置方法）
  - *HTTP* - 只需添加 `dapr-app-id` 头即可开始使用。点击此处了解更多：[使用 HTTP 调用服务。]({{% ref howto-invoke-discover-services %}})
  - *gRPC* - 对于基于 gRPC 的应用程序，服务调用 API 也可用。运行 gRPC 服务器，然后使用 Dapr CLI 调用服务。在[配置 Dapr 使用 gRPC]({{% ref grpc %}})和[使用 gRPC 调用服务]({{% ref howto-invoke-services-grpc %}})中了解更多。
- **直接调用 API** - 除了代理之外，还有一个选项是直接调用服务调用 API 来调用 GET 端点。只需将您的地址 URL 更新为 `localhost:<dapr-http-port>`，您就可以直接调用 API。您还可以在上面 HTTP 代理部分链接的"使用 HTTP 调用服务"文档中了解更多。
- **SDK** - 如果您使用的是 Dapr SDK，您可以通过 SDK 直接使用服务调用。选择您需要的 SDK 并使用 Dapr 客户端来调用服务。在 [Dapr SDK]({{% ref sdks %}})中了解更多。

要进行快速测试，请尝试使用 Dapr CLI 进行服务调用：
- **Dapr CLI 命令** - 设置 Dapr CLI 后，使用 `dapr invoke --method <method-name>` 命令以及方法标志和感兴趣的方法。在 [Dapr CLI]({{% ref dapr-invoke %}})中了解更多。

## 后续步骤
- 阅读[服务调用 API 规范]({{% ref service_invocation_api %}})。此服务调用参考指南描述了如何调用其他服务上的方法。
- 了解[服务调用性能数据](https://github.com/dapr/dapr/tree/release-1.16/tests/perf/report/charts/)。
- 查看[可观测性]({{% ref observability %}})。在这里您可以深入了解 Dapr 的监控工具，如追踪、指标和日志。
- 阅读我们的[mTLS 加密、令牌身份验证和端点授权]({{% ref security-concept %}})安全实践。
