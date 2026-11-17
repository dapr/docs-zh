---
type: docs
title: "Dapr 与服务网格"
linkTitle: "服务网格"
weight: 200
description: >
  Dapr 如何与 Linkerd、Istio 等服务网格解决方案进行比较与协作
---

Dapr 采用 sidecar 架构，作为独立进程与应用程序并肩运行，并包含 service invocation、网络安全和[分布式追踪](https://middleware.io/blog/what-is-distributed-tracing/)等功能。这经常会引发一个问题：Dapr 与 [Linkerd](https://linkerd.io/)、[Istio](https://istio.io/) 和 [Open Service Mesh](https://openservicemesh.io/) 等服务网格解决方案相比如何？

## Dapr 与服务网格的对比
虽然 Dapr 与服务网格确实提供了一些重叠的能力，但**Dapr 不是服务网格**，这里的服务网格被定义为一种*网络*服务网格。与专注于网络关注点的服务网格不同，Dapr 专注于提供 building block，使开发者更容易以微服务方式构建应用程序。Dapr 以开发者为中心，而服务网格以基础设施为中心。

在大多数情况下，开发者无需关心其构建的应用程序会部署在包含服务网格的环境中，因为服务网格会拦截网络流量。服务网格通常由系统运维人员管理和部署，而 Dapr building block API 则是供开发者在代码中显式调用的。

Dapr 与服务网格共享的一些常见能力包括：
- 使用 mTLS 加密的安全服务间通信
- 服务间指标收集
- 服务间分布式追踪
- 通过重试实现的 resiliency

 重要的是，Dapr 通过名称提供服务发现和调用，这是以开发者为中心的关注点。这意味着开发者通过 Dapr 的 service invocation API 调用某个服务名称上的方法，而服务网格处理的是 IP 地址和 DNS 地址等网络概念。不过，Dapr 不提供路由或流量分割等流量行为能力。流量路由通常由应用程序的入口代理（ingress proxy）来处理，不一定要使用服务网格。此外，Dapr 还提供其他应用级 building block，如 State Management、pub/sub、Actor 等。

Dapr 与服务网格之间的另一个区别是 observability（追踪和指标）。服务网格在网络层面运行，追踪服务之间的网络调用；Dapr 则通过 service invocation 实现这一点。此外，Dapr 还通过在 Cloud Events 信封中写入追踪 ID，为 pub/sub 调用提供 observability（追踪和指标）。这意味着，对于同时使用服务间调用和 pub/sub 进行通信的应用程序，Dapr 的指标和追踪比服务网格更加全面。

下图展示了 Dapr 与服务网格各自提供的重叠功能和独特能力：

{{< diagram service-mesh >}}

## 将 Dapr 与服务网格一起使用
Dapr 确实可以与服务网格协同工作。当两者一同部署时，应用程序环境中会同时运行 Dapr sidecar 和服务网格 sidecar。在这种情况下，建议只让 Dapr 或只让服务网格来执行 mTLS 加密和分布式追踪。

请观看以下 Dapr 社区会议录像，它们展示了 Dapr 与不同服务网格一起运行的演示：
- [Dapr 与 Linkerd](https://youtu.be/xxU68ewRmz8?t=142) 的概述和演示
- 运行 [Dapr 与 Istio](https://youtu.be/ngIDOQApx8g?t=335) 的演示

### Kubernetes 中 Dapr 服务的协议声明

Dapr 创建的每个 Kubernetes Service 都会在其每个端口上设置 [`appProtocol`](https://kubernetes.io/docs/concepts/services-networking/service/#application-protocol) 字段。这包括 Dapr Helm Chart 安装的 control plane Service，以及 Dapr operator 为每个启用 Dapr 的应用创建的 `<app-id>-dapr` Service。Istio 等服务网格会读取该字段来选择端口的协议，而不是根据流量内容或端口名称进行推断。

在 Dapr mTLS 中承载 gRPC 的端口应声明为 `tls`，而不是 `grpc`。Istio 会将 `appProtocol: grpc` 视为明文 HTTP/2（h2c）。如果这些端口声明为 `grpc`，网格代理会把 TLS 字节按 HTTP/2 解析，从而导致连接中断。

| Service | 端口 | `appProtocol` |
|---------|------|---------------|
| `<app-id>-dapr` | `dapr-http`、`dapr-metrics` | `http` |
| `<app-id>-dapr` | `dapr-grpc` | `grpc` |
| `<app-id>-dapr` | `dapr-internal` | 在 `daprsystem` Configuration 中启用 mTLS 时为 `tls`，否则为 `grpc` |
| `dapr-api` | `grpc`、`legacy` | `tls` |
| `dapr-webhook` | webhook 端口（443） | `https` |
| `dapr-sentry` | `grpc` | `tls` |
| `dapr-sentry` | `oidc` | `dapr_sentry.oidc.tls.enabled` 为 `true` 时为 `https`，否则为 `http` |
| `dapr-placement-server` | `api`、`raft-node` | `tls` |
| `dapr-scheduler-server` | `api`、`etcd-peer` | `tls` |
| `dapr-scheduler-server` | `etcd-client` | `tcp` |
| `dapr-sidecar-injector` | `https` | `https` |
| 所有 control plane Service | `metrics` | `http` |

{{% alert title="注意" color="primary" %}}
Dapr 从 1.19 版本开始设置 `appProtocol`。在更早的版本中，该字段未设置，Istio 会回退到协议检测。部分 Dapr control plane 端口名为 `grpc`，但实际承载 TLS，因此在这些版本中，基于名称的检测可能会对它们分类错误。
{{% /alert %}}

## 何时使用 Dapr、服务网格或两者兼用
你应该使用 Dapr、服务网格，还是两者兼用？答案取决于你的需求。例如，如果你希望将 Dapr 用于一个或多个 building block（如 State Management 或 pub/sub），并且你正在考虑仅为了网络安全或 observability 而使用服务网格，你可能会发现 Dapr 已经足够适用，无需使用服务网格。

通常，当企业策略要求所有应用程序的网络流量都必须加密时，你会将服务网格与 Dapr 一起使用。例如，你可能只在应用程序的一部分中使用 Dapr，而应用程序中未使用 Dapr 的其他服务和进程同样需要对其流量进行加密。在这种情况下，服务网格是更好的选择，你很可能应当在服务网格上使用 mTLS 和分布式追踪，并在 Dapr 上禁用它们。

如果你需要为 A/B 测试场景进行流量分割，使用服务网格会更有益，因为 Dapr 不提供这些能力。

在某些情况下，当你需要两者各自独有的能力时，同时利用 Dapr 和服务网格会很有用；如上所述，二者可以一起使用，没有任何限制。
