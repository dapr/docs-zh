---
type: docs
title: "可观测性"
linkTitle: "可观测性"
weight: 500
description: >
  通过追踪、指标、日志和健康检查来观测应用程序
---

在构建应用程序时，理解系统行为是运行应用的重要且具有挑战性的部分，例如：
- 观察应用程序的内部调用
- 评估其性能
- 在问题发生时立即感知

对于由多个微服务组成的分布式系统，这可能尤其具有挑战性，因为由多个调用组成的流程可能从一个微服务开始，然后在另一个微服务中继续。

对应用程序的可观测性在生产环境中至关重要，在开发期间也很有用，可以：
- 理解瓶颈
- 提高性能
- 跨微服务的范围执行基本调试

虽然关于应用程序的某些数据点可以从底层基础设施收集（内存消耗、CPU 使用率），但其他有意义的信息必须从"应用感知"层收集——该层可以展示一系列重要的调用如何在微服务之间执行。通常，您需要添加一些代码来插桩应用程序，这仅仅是收集的数据（如追踪和指标）发送到可观测性工具或服务，这些工具或服务可以帮助存储、可视化和分析所有这些信息。

维护这些插桩代码（它不是应用程序核心逻辑的一部分）需要了解可观测性工具的 API、使用额外的 SDK 等。这种插桩也可能给应用程序带来可移植性挑战，需要根据应用程序部署的位置使用不同的插桩。例如：
- 不同的云提供商提供不同的可观测性工具
- 本地部署可能需要自托管解决方案

## 使用 Dapr 的应用程序可观测性

当您利用 Dapr API 构建块执行服务间调用、发布订阅消息传递和其他 API 时，Dapr 在[分布式追踪]({{% ref tracing %}})方面提供了优势。由于这种服务间通信流经 Dapr 运行时（或"边车"），Dapr 处于卸载应用程序级插桩负担的独特位置。

### 分布式追踪

Dapr 可以[配置为发出追踪数据]({{% ref setup-tracing %}})，使用广泛采用的 [Open Telemetry (OTEL)](https://opentelemetry.io/) 和 [Zipkin](https://zipkin.io/) 协议。这使得它可以轻松与多个可观测性工具集成。

<img src="/images/observability-tracing.png" width=1000 alt="使用 Dapr 的分布式追踪">

### 自动追踪上下文生成

Dapr 使用 [W3C 追踪]({{% ref tracing %}})规范（作为 Open Telemetry (OTEL) 的一部分包含在内）为应用程序生成并传播上下文头部，或传播用户提供的上下文头部。这意味着您默认就可以通过 Dapr 获得追踪功能。

## Dapr 边车和控制平面的可观测性

您还可以通过以下方式观测 Dapr 本身：
- 生成 Dapr 边车和 Dapr 控制平面服务发出的日志
- 收集有关性能、吞吐量和延迟的指标
- 使用健康端点探测来指示 Dapr 边车的健康状态

<img src="/images/observability-sidecar.png" width=1000 alt="Dapr 边车指标、日志和健康检查">

### 日志

Dapr 生成[日志]({{% ref logs %}})以：
- 提供对边车操作的可见性
- 帮助用户识别问题并执行调试

日志事件包含 Dapr 系统服务产生的警告、错误、信息和调试消息。您还可以配置 Dapr 将日志发送到收集器，例如 [Open Telemetry Collector]({{% ref otel-collector %}})、[Fluentd]({{% ref fluentd %}})、[New Relic]({{% ref "operations/observability/logging/newrelic.md" %}})、[Azure Monitor]({{% ref azure-monitor %}}) 和其他可观测性工具，以便可以搜索和分析日志以提供洞察。

### 指标

指标是一系列随时间收集和存储的测量值和计数。[Dapr 指标]({{% ref metrics %}})提供监控功能，以了解 Dapr 边车和控制平面的行为。例如，Dapr 边车与用户应用程序之间的指标显示调用延迟、流量故障、请求错误率等。

Dapr [控制平面指标](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics)显示边车注入失败和控制平面服务的健康状况，包括 CPU 使用率、执行的 actor 放置数量等。

### 健康检查

Dapr 边车公开了一个 HTTP 端点用于[健康检查]({{% ref sidecar-health %}})。使用此 API，用户代码或托管环境可以探测 Dapr 边车以确定其状态并识别边车准备就绪方面的问题。

相反，可以配置 Dapr 来探测[应用程序的健康状况]({{% ref app-health %}})，并对应用程序健康状况的变化做出反应，包括停止发布订阅订阅和短路服务调用。

## 下一步

- [了解使用 Dapr 开发时的可观测性的更多信息]({{% ref tracing %}})
- [了解使用 Dapr 运维时的可观测性的更多信息]({{% ref tracing %}})
