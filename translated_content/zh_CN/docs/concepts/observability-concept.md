---
type: docs
title: "Observability"
linkTitle: "Observability"
weight: 500
description: >
  通过追踪、指标、日志和健康检查观察应用程序
---

在构建应用程序时，理解系统行为是运行应用程序的重要组成部分，但也颇具挑战，例如：
- 观察应用程序的内部调用
- 评估其性能
- 在问题发生时及时发现

对于由多个微服务组成的分布式系统来说，这可能尤其具有挑战性，因为由多个调用组成的流程可能从一个微服务开始，然后在另一个微服务中继续。

在生产环境中，应用程序的 observability 至关重要；在开发过程中也很有用，可以帮助你：
- 了解瓶颈
- 提高性能
- 跨多个微服务进行基本调试

虽然可以从底层基础设施收集应用程序的某些数据点（例如内存消耗和 CPU 使用率），但其他有意义的信息必须从“应用感知”层收集，该层可以展示一系列重要调用如何在微服务之间执行。通常，你会添加一些代码来检测应用程序；这些代码只需将收集到的数据（例如追踪和指标）发送到 observability 工具或服务，以便存储、可视化和分析所有这些信息。

维护这些不属于应用程序核心逻辑的检测代码，需要了解 observability 工具的 API、使用额外的 SDK 等。这些检测也可能带来应用程序可移植性方面的挑战，因为你需要根据应用程序的部署位置采用不同的检测方式。例如：
- 不同的云提供商提供不同的 observability 工具
- 本地部署可能需要自托管解决方案

## 使用 Dapr 实现应用程序的 observability

当你利用 Dapr API building block 执行服务间调用、pub/sub 消息传递和其他 API 操作时，Dapr 在[分布式追踪]({{% ref tracing %}})方面具有优势。由于这些服务间通信都流经 Dapr runtime（或“sidecar”），Dapr 能够独特地卸载应用程序级检测的负担。

### 分布式追踪

Dapr 可以[配置为使用广泛采用的协议生成追踪数据]({{% ref setup-tracing %}})，例如 [Open Telemetry (OTEL)](https://opentelemetry.io/) 和 [Zipkin](https://zipkin.io)。因此，它能够轻松集成多种 observability 工具。

{{< diagram observability-tracing >}}

### 自动生成追踪上下文

Dapr 使用 [W3C 追踪]({{% ref tracing %}})规范处理追踪上下文。该规范是 Open Telemetry (OTEL) 的一部分，Dapr 会据此为应用程序生成并传播上下文标头，或传播用户提供的上下文标头。这意味着使用 Dapr 默认即可获得追踪功能。

## Dapr sidecar 和 control plane 的 observability

你还可以通过以下方式观察 Dapr 本身：
- 生成由 Dapr sidecar 和 Dapr control plane 服务发出的日志
- 收集有关性能、吞吐量和延迟的指标
- 使用健康端点探测来指示 Dapr sidecar 的健康状态

{{< diagram observability-sidecar >}}

### 日志记录

Dapr 生成[日志]({{% ref logs %}})，以便：
- 展示 sidecar 的运行情况
- 帮助用户发现问题并进行调试

日志事件包含 Dapr 系统服务生成的警告、错误、信息和调试消息。你还可以配置 Dapr 将日志发送到收集器，例如 [Open Telemetry Collector]({{% ref otel-collector %}})、[Fluentd]({{% ref fluentd %}})、[New Relic]({{% ref "operations/observability/logging/newrelic.md" %}})、[Azure Monitor]({{% ref azure-monitor %}}) 以及其他 observability 工具，以便搜索和分析日志，从中获得洞察。

### 指标

指标是随时间收集并存储的一系列测量值和计数。[Dapr 指标]({{% ref metrics %}})提供监控能力，帮助你了解 Dapr sidecar 和 control plane 的行为。例如，Dapr sidecar 与用户应用程序之间的指标会显示调用延迟、流量故障、请求错误率等信息。

Dapr [control plane 指标](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics)显示 sidecar 注入失败以及 control plane 服务的健康状况，包括 CPU 使用率、执行的 Actor placement 数量等。

### 健康检查

Dapr sidecar 会公开一个用于[健康检查]({{% ref sidecar-health %}})的 HTTP 端点。通过此 API，用户代码或托管环境可以探测 Dapr sidecar，以确定其状态并发现 sidecar 未就绪等问题。

反过来，也可以将 Dapr 配置为探测[应用程序的健康状况]({{% ref app-health %}})，并对应用程序健康状况的变化做出响应，包括停止 pub/sub 订阅和短路 service invocation。

## 后续步骤

- [了解使用 Dapr 进行开发时的 observability]({{% ref tracing %}})
- [了解使用 Dapr 进行运维时的 observability]({{% ref tracing %}})
