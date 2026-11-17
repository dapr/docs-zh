---
type: docs
title: "service invocation 概述"
linkTitle: "概述"
weight: 10
description: "service invocation API building block 概述"
---

通过 service invocation，您的应用程序可以使用标准的 [gRPC](https://grpc.io) 或 [HTTP](https://www.w3.org/Protocols/) 协议，可靠且安全地与其他应用程序通信。

在许多基于微服务的应用程序中，多个服务需要相互通信。这种服务间通信要求应用程序开发者处理以下问题：

- **服务发现。** 如何发现我的不同服务？
- **标准化服务间 API 调用。** 如何在服务之间调用方法？
- **安全的服务间通信。** 如何通过加密安全地调用其他服务，并对方法实施访问控制？
- **缓解请求超时或故障。** 如何处理重试和瞬时错误？
-  **实现 observability 和追踪。** 如何使用追踪查看带有指标的调用图，以便诊断生产环境中的问题？

## service invocation API

Dapr 通过提供 service invocation API 应对这些挑战。该 API 的行为类似于带有内置服务发现功能的反向代理，同时利用内置的分布式追踪、指标、错误处理、加密等功能。

Dapr 采用 sidecar 架构。要使用 Dapr 调用应用程序：
- 您在 Dapr 实例上使用 `invoke` API。
- 每个应用程序与其自身的 Dapr 实例通信。
- Dapr 实例之间相互发现并通信。

[以下概述视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=mtLMrajE5wVXJYz8&t=3598) 演示了 Dapr service invocation 的工作原理。

{{< youtube id=0y7ne6teHT4 start=3598 >}}

下图概述了 Dapr service invocation 在两个 Dapr 化应用程序之间的工作方式。

{{< diagram name="service-invocation-overview" width="75" >}}

1. 服务 A 发起针对服务 B 的 HTTP 或 gRPC 调用。调用首先到达本地 Dapr sidecar。
2. Dapr 使用 [name resolution component]({{% ref supported-name-resolution %}}) 发现服务 B 的位置，该组件运行在给定的 [hosting platform]({{% ref "hosting" %}}) 上。
3. Dapr 将消息转发到服务 B 的 Dapr sidecar。
   - **注意**：Dapr sidecar 之间的所有调用都通过 gRPC 进行，以提高性能。只有服务与 Dapr sidecar 之间的调用可以是 HTTP 或 gRPC。
4. 服务 B 的 Dapr sidecar 将请求转发到服务 B 上指定的端点（或方法）。然后服务 B 执行其业务逻辑代码。
5. 服务 B 向服务 A 发送响应。响应首先到达服务 B 的 sidecar。
6. Dapr 将响应转发到服务 A 的 Dapr sidecar。
7. 服务 A 接收响应。

您还可以使用 service invocation API 调用非 Dapr HTTP 端点。例如，您可能只在整体应用程序的一部分中使用 Dapr，可能无法访问用于将现有应用程序迁移到 Dapr 的代码，或者只是需要调用外部 HTTP 服务。更多信息请阅读 ["如何：使用 HTTP 调用非 Dapr 端点"]({{% ref howto-invoke-non-dapr-endpoints %}})。

## 功能特性

service invocation 提供多项功能，让您可以轻松地在应用程序之间调用方法，或调用外部 HTTP 端点。

### HTTP 和 gRPC service invocation
- **HTTP**：如果您的应用程序已经在使用 HTTP 协议，那么使用 Dapr HTTP 标头可能是最简单的入门方式。您无需更改现有的端点 URL，只需添加 `dapr-app-id` 标头即可开始使用。更多信息请参阅[使用 HTTP 调用服务]({{% ref howto-invoke-discover-services %}})。
- **gRPC**：Dapr 允许用户保留自己的 proto 服务并原生使用 gRPC。这意味着您可以使用 service invocation 调用现有的 gRPC 应用，而无需引入任何 Dapr SDK 或自定义 gRPC 服务。更多信息请参阅 [Dapr 和 gRPC 操作指南]({{% ref howto-invoke-services-grpc %}})。

### 服务到服务安全

通过 Dapr Sentry 服务，Dapr 应用程序之间的所有调用都可以在托管平台上通过相互（mTLS）身份验证得到安全保障，包括自动证书轮换。

更多信息请阅读[服务到服务安全]({{% ref "security-concept#sidecar-to-sidecar-communication" %}})文章。

### 包括重试在内的 resiliency

在发生调用失败和瞬时错误时，service invocation 提供 resiliency 功能，该功能会按退避时间段自动执行重试。要了解更多信息，请参阅[Resiliency 文章]({{% ref resiliency-overview %}})。

{{% alert title="注意" color="primary" %}}
对于 HTTP service invocation，retry policies（包括内置策略和用户配置的策略）会自动跳过流式请求（即使用分块传输编码或没有已知 `Content-Length` 的请求）。由于请求正文在读取时即被消耗，无法在重试时重放。具有已知 `Content-Length` 的非流式请求仍像以前一样支持重试。更多详情请参阅[HTTP service invocation 流式传输](#http-service-invocation-流式传输)。
{{% /alert %}}

### 通过 observability 实现追踪和指标

默认情况下，应用程序之间的所有调用都会被追踪，并收集指标，以便为应用程序提供洞察和诊断。这在生产场景中尤为重要，可以提供服务之间调用的调用图和指标。更多信息请阅读 [observability]({{% ref observability-concept %}})。

### 访问控制

借助访问策略，应用程序可以控制：

- 哪些应用程序被允许调用它们。
- 哪些应用程序被授权执行哪些操作。

例如，您可以防止未经授权的应用程序访问包含人员信息的敏感应用程序。结合服务到服务的安全通信，您可以为软多租户部署提供保障。

更多信息请阅读[service invocation 的访问控制允许列表]({{% ref invoke-allowlist %}})文章。

### namespace 作用域

您可以将应用程序限定在 namespace 中进行部署和安全控制，并在部署到不同 namespace 的服务之间进行调用。更多信息请阅读[跨 namespace 的 service invocation]({{% ref "service-invocation-namespaces" %}})文章。

### 使用 mDNS 的轮询负载均衡

Dapr 通过 mDNS 协议为 service invocation 请求提供轮询负载均衡，例如在单台机器上，或在多台联网的物理机器上。

下图展示了这一工作方式的示例。如果您有 1 个 App ID 为 `FrontEnd` 的应用实例，以及 3 个 App ID 为 `Cart` 的应用实例，当您从 `FrontEnd` 应用调用 `Cart` 应用时，Dapr 会在这 3 个实例之间轮询分发。这些实例可以位于同一台机器上，也可以位于不同的机器上。

{{< diagram name="service-invocation-mdns" width="70" >}}

**注意**：App ID 对应的是_应用_，而不是应用实例。无论该应用因扩缩容而存在多少个实例，它们都共享同一个 App ID。

### 可替换的服务发现

Dapr 可以运行在多种 [hosting platforms]({{% ref hosting %}})上。为了在 service invocation 中实现可替换的服务发现，Dapr 使用 [name resolution components]({{% ref supported-name-resolution %}})。例如，Kubernetes name resolution component 使用 Kubernetes DNS 服务来解析集群中其他正在运行的应用的位置。

自托管机器可以使用 mDNS name resolution component。作为替代方案，您可以在单节点环境和本地开发场景中使用 SQLite name resolution component 来运行 Dapr。属于集群一部分的 Dapr sidecar 将其信息存储在本地机器上的 SQLite 数据库中。

Consul name resolution component 特别适合多机器部署，可用于任何托管环境，包括 Kubernetes、多台虚拟机或自托管环境。

### 逐跳（hop-by-hop）标头剥离

在代理 HTTP service invocation 时，Dapr 会在将请求转发到上游应用或 [HTTPEndpoint]({{% ref "httpendpoints-schema.md" %}}) 之前，以及在将上游的响应返回给调用方之前，移除 [RFC 7230 Section 6.1](https://datatracker.ietf.org/doc/html/rfc7230#section-6.1) 中定义的标准逐跳标头。这些标头包括：`Connection`、`Keep-Alive`、`Proxy-Connection`、`Transfer-Encoding`、`Upgrade`、`HTTP2-Settings`、`TE`、`Trailer` 和 `Proxy-Authorization`。

端到端标头（`Accept`、`Authorization`、`Content-Type`、自定义 `X-*` 标头等）不受影响，并会继续原样转发。

### HTTP service invocation 流式传输

您可以在 HTTP service invocation 中以流的形式处理数据。当使用 Dapr 通过 HTTP 调用另一个服务，且请求或响应正文较大时，这可以提升性能并降低内存占用。

下图展示了数据流的六个步骤。

{{< diagram name="service-invocation-simple" width="65" >}}

1. 请求：从 "服务 A" 到 "Dapr sidecar A"
1. 请求：从 "Dapr sidecar A" 到 "Dapr sidecar B"
1. 请求：从 "Dapr sidecar B" 到 "服务 B"
1. 响应：从 "服务 B" 到 "Dapr sidecar B"
1. 响应：从 "Dapr sidecar B" 到 "Dapr sidecar A"
1. 响应：从 "Dapr sidecar A" 到 "服务 A"

#### 流式请求和 resiliency

Dapr 会自动检测流式 HTTP 请求，即使用分块传输编码或没有已知 `Content-Length` 标头的请求（例如文件上传、管道传输的正文或长时间运行的数据流）。对于这些请求：

- **请求正文不会缓存在内存中。** Dapr sidecar 会在读取请求正文时直接转发，避免大负载占用过多内存。
- **响应正文不会缓存在内存中。** 流式响应（例如服务器发送事件、文件下载或长时间运行的数据流）会直接转发给调用方。
- **Retry policies 会被绕过。** 内置重试逻辑以及用户配置的[resiliency retry policies]({{% ref resiliency-overview %}})都会被自动跳过，因为请求正文在读取时即被消耗，无法重放。
- **其他 resiliency 功能仍然适用。** 断路器对流式请求仍会正常跟踪失败。
- **非流式请求不受影响。** 具有已知 `Content-Length` 的请求仍像以前一样支持重试和缓冲的错误处理。

## 示例架构

按照上述调用顺序，假设您拥有 [Hello World 教程](https://github.com/dapr/quickstarts/blob/master/tutorials/hello-world/README) 中描述的应用，其中一个 python 应用调用一个 node.js 应用。在这种场景中，python 应用为"服务 A"，Node.js 应用为"服务 B"。

下图在本地机器上再次展示了序列 1-7，并显示了 API 调用：

{{< diagram name="service-invocation-example-detailed" width="85" >}}

1. Node.js 应用的 Dapr App ID 为 `nodeapp`。python 应用通过 POST 请求 `http://localhost:3500/v1.0/invoke/nodeapp/method/neworder` 调用 Node.js 应用的 `neworder` 方法，该请求首先发送到 python 应用的本地 Dapr sidecar。
2. Dapr 使用名称解析组件（在本例中，自托管环境下为 mDNS）发现 Node.js 应用的位置，该组件运行在您的本地机器上。
3. Dapr 使用刚获取的位置，将请求转发到 Node.js 应用的 sidecar。
4. Node.js 应用的 sidecar 将请求转发给 Node.js 应用。Node.js 应用执行其业务逻辑，记录收到的消息，然后将订单 ID 持久化到 Redis（图中未显示）。
5. Node.js 应用通过 Node.js sidecar 向 Python 应用发送响应。
6. Dapr 将响应转发到 Python Dapr sidecar。
7. Python 应用接收响应。

## 试用 service invocation 
### Quickstarts 与教程
Dapr 文档包含多个 quickstart，它们在不同的示例架构中使用 service invocation 构建块。要直观地了解 service invocation API 及其功能，我们建议从以下 quickstart 和教程开始：

| Quickstart/教程 | 描述 |
| ------------------- | ----------- |
| [Service invocation quickstart]({{% ref serviceinvocation-quickstart %}}) | 本 quickstart 可让您直接与 service invocation 构建块交互。 |
| [Hello world 教程](https://github.com/dapr/quickstarts/blob/master/tutorials/hello-world/README.md) | 本教程演示如何在本机上本地运行，同时使用 service invocation 和 State Management 构建块。 |
| [Hello world Kubernetes 教程](https://github.com/dapr/quickstarts/blob/master/tutorials/hello-kubernetes/README.md) | 本教程介绍如何在 Kubernetes 中使用 Dapr，同时涵盖 service invocation 和 State Management 构建块。 |


### 直接在您的应用程序中开始使用 service invocation
不想先做 quickstart？没问题。您可以直接在应用程序中试用 service invocation 构建块，以安全地与其他服务通信。在[安装 Dapr](https://docs.dapr.io/getting-started)之后，您可以通过以下方式开始使用 service invocation API。

通过以下方式调用服务：
- **HTTP 和 gRPC service invocation**（推荐的设置方式）
  - *HTTP*：只需添加 `dapr-app-id` 标头即可开始使用。详情请阅读[使用 HTTP 调用服务]({{% ref howto-invoke-discover-services %}})。
  - *gRPC*：对于基于 gRPC 的应用程序，同样提供 service invocation API。运行 gRPC 服务器，然后使用 Dapr CLI 调用服务。更多信息请阅读[配置 Dapr 以使用 gRPC]({{% ref grpc %}})和[使用 gRPC 调用服务]({{% ref howto-invoke-services-grpc %}})。
- **直接调用 API**：除了代理之外，您还可以直接调用 service invocation API 来调用 GET 端点。只需将地址 URL 更新为 `localhost:<dapr-http-port>`，即可直接调用该 API。您还可以在上面链接的 _使用 HTTP 调用服务_ 文档的 HTTP 代理部分中阅读更多相关内容。
- **SDK**：如果您使用 Dapr SDK，可以直接通过 SDK 使用 service invocation。选择所需的 SDK，并使用 Dapr 客户端调用服务。更多信息请阅读 [Dapr SDK]({{% ref sdks %}})。

如需快速测试，可以尝试使用 Dapr CLI 进行 service invocation：
- **Dapr CLI 命令**：安装并设置 Dapr CLI 后，使用 `dapr invoke --method <method-name>` 命令，并附带 method 标志和要调用的方法。更多信息请阅读 [Dapr CLI]({{% ref dapr-invoke %}})。

### 在本地检查 service invocation

在本地开发期间，您可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看在本机上运行的应用，包括其健康状况、应用端口和 sidecar 端口以及进程 ID。这是一种快速的方式，可在调用服务之前确认服务已在 Dapr 中注册。该面板还会流式显示每个应用的应用日志和 sidecar 日志，因此您可以在调用的两端跟踪失败的调用。

## 后续步骤
- 阅读 [service invocation API 规范]({{% ref service_invocation_api %}})。该参考指南介绍了如何调用其他服务上的方法。
- 了解 [service invocation 性能数据](https://github.com/dapr/dapr/tree/release-1.16/tests/perf/report/charts/)。
- 查看 [observability]({{% ref observability %}})。在这里您可以深入了解 Dapr 的监控工具，如追踪、指标和日志记录。
- 阅读我们的[安全实践]({{% ref security-concept %}})，了解围绕 mTLS 加密、令牌身份验证和端点授权的相关内容。
