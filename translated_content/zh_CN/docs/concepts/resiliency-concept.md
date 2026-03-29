---
type: docs
title: "弹性"
linkTitle: "弹性"
weight: 400
description: "配置策略并监控应用和边车健康状况"
---

分布式应用通常由许多微服务组成，有数十个——有时数百个——实例在底层基础设施上扩缩容。随着这些分布式解决方案的规模和复杂性不断增长，系统故障的潜在风险也必然增加。由于硬件故障、意外的吞吐量或应用生命周期事件（如扩容和应用重启）等各种问题，服务实例可能会失败或变得无响应。设计和实施一个能够检测、减轻和响应故障的自愈解决方案至关重要。

## 弹性策略
<img src="/images/resiliency_diagram.png" width="1200" alt="Diagram showing the resiliency applied to Dapr APIs">

Dapr 为定义和应用容错弹性策略提供了能力。您可以为以下弹性模式定义策略：

- 超时
- 重试/退避
- 熔断器

当使用[弹性规范]({{% ref resiliency-overview %}})调用组件时，这些策略可以应用于任何 Dapr API 调用。

## 应用健康检查
<img src="/images/observability-app-health.webp" width="800" alt="Diagram showing the app health feature. Running Dapr with app health enabled causes Dapr to periodically probe the app for its health">

应用可能因多种原因变得无响应。例如，它们可能太忙而无法接受新工作，可能已崩溃，或处于死锁状态。有时这种情况可能是暂时的或持续的。

Dapr 提供了通过探针监控应用健康状况的能力，探针会检查应用的健康状况并对状态变化做出反应。当检测到不健康的应用时，Dapr 将停止代表该应用接受新工作。

阅读更多关于如何将[应用健康检查]({{% ref app-health %}})应用于您的应用的信息。

## 边车健康检查
<img src="/images/sidecar-health.png" width="800" alt="Diagram showing the app health feature. Running Dapr with app health enabled causes Dapr to periodically probe the app for its health">

Dapr 提供了一种使用 [HTTP `/healthz` 端点]({{% ref health_api %}})来确定其健康状况的方法。通过该端点，*daprd* 进程或边车可以：

- 探查其健康状况
- 确定就绪性和存活性

阅读更多关于如何将 [dapr 健康检查]({{% ref sidecar-health %}})应用于您的应用的信息。

## 后续步骤

- [了解有关弹性的更多信息]({{% ref resiliency-overview %}})
- 尝试以下弹性快速入门之一：
  - [弹性：服务到服务]({{% ref resiliency-serviceinvo-quickstart %}})
  - [弹性：状态管理]({{% ref resiliency-state-quickstart %}})
