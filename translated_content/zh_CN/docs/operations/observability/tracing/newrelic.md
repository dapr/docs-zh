---
type: docs
title: "操作指南：设置 New Relic 进行分布式追踪"
linkTitle: "New Relic"
weight: 2000
description: "设置 New Relic 进行分布式追踪"
---

## 前置条件

- 永久免费的 [New Relic 账户](https://newrelic.com/signup?ref=dapr)，每月 100 GB 免费数据接入，1 个免费全权限用户，无限免费基础用户

## 配置 Dapr 追踪

Dapr 原生捕获可以直接发送到 New Relic 的指标和链路。最简单的导出方式是将 Dapr 配置为使用 Zipkin 追踪格式将链路发送到 [New Relic 的 Trace API](https://docs.newrelic.com/docs/distributed-tracing/trace-api/report-zipkin-format-traces-trace-api/)。

为了让集成将数据发送到 New Relic [遥测数据平台](https://newrelic.com/platform/telemetry-data-platform)，你需要一个 [New Relic Insights Insert API 密钥](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/#insights-insert-key)。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "https://trace-api.newrelic.com/trace/v1?Api-Key=<NR-INSIGHTS-INSERT-API-KEY>&Data-Format=zipkin&Data-Format-Version=2"
```

### 查看追踪

New Relic 分布式追踪概览
![New Relic Kubernetes Cluster Explorer App](/images/nr-distributed-tracing-overview.png)

New Relic 分布式追踪详情
![New Relic Kubernetes Cluster Explorer App](/images/nr-distributed-tracing-detail.png)

## （可选）New Relic Instrumentation

为了让集成将数据发送到 New Relic 遥测数据平台，你需要一个 [New Relic 许可证密钥](https://docs.newrelic.com/docs/accounts/accounts-billing/account-setup/new-relic-license-key) 或 [New Relic Insights Insert API 密钥](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/#insights-insert-key)。

### OpenTelemetry instrumentation

利用不同语言的特定 OpenTelemetry 实现，例如 [New Relic Telemetry SDK 和 OpenTelemetry 对 .NET 的支持](https://github.com/newrelic/newrelic-telemetry-sdk-dotnet)。在这种情况下，使用 [OpenTelemetry Trace Exporter](https://github.com/newrelic/newrelic-telemetry-sdk-dotnet/tree/main/src/NewRelic.OpenTelemetry)。参见[示例](https://github.com/harrykimpel/quickstarts/blob/master/distributed-calculator/csharp-otel/Startup.cs)。

### New Relic 语言代理

与 OpenTelemetry instrumentation 类似，你也可以利用 New Relic 语言代理。例如，[New Relic 代理对 .NET Core 的 instrumentation](https://docs.newrelic.com/docs/agents/net-agent/other-installation/install-net-agent-docker-container)是 Dockerfile 的一部分。参见[示例](https://github.com/harrykimpel/quickstarts/blob/master/distributed-calculator/csharp/Dockerfile)。

## （可选）启用 New Relic Kubernetes 集成

如果 Dapr 和你的应用程序在 Kubernetes 环境中运行，你可以启用额外的指标和日志。

安装 New Relic Kubernetes 集成的最简单方法是使用[自动化安装程序](https://one.newrelic.com/launcher/nr1-core.settings?pane=eyJuZXJkbGV0SWQiOiJrOHMtY2x1c3Rlci1leHBsb3Jlci1uZXJkbGV0Lms4cy1zZXR1cCJ9)生成清单。它不仅打包了集成 DaemonSets，还包含其他 New Relic Kubernetes 配置，如 [Kubernetes 事件](https://docs.newrelic.com/docs/integrations/kubernetes-integration/kubernetes-events/install-kubernetes-events-integration)、[Prometheus OpenMetrics](https://docs.newrelic.com/docs/integrations/prometheus-integrations/get-started/send-prometheus-metric-data-new-relic/)和 [New Relic 日志监控](https://docs.newrelic.com/docs/logs/ui-data/use-logs-ui/)。

### New Relic Kubernetes Cluster Explorer

[New Relic Kubernetes Cluster Explorer](https://docs.newrelic.com/docs/integrations/kubernetes-integration/understand-use-data/kubernetes-cluster-explorer)为 Kubernetes 集成收集的整个数据和部署提供了独特的可视化。

这是观察所有数据并深入了解应用程序或微服务内部发生的任何性能问题或事件的良好起点。

![New Relic Kubernetes Cluster Explorer App](/images/nr-k8s-cluster-explorer-app.png)

自动化关联是 New Relic 可视化功能的一部分。

### Pod 级别详情

![New Relic K8s Pod Level Details](/images/nr-k8s-pod-level-details.png)

### Logs in Context

![New Relic K8s Logs In Context](/images/nr-k8s-logs-in-context.png)

## New Relic 仪表板

### Kubernetes 概览

![New Relic Dashboard Kubernetes Overview](/images/nr-dashboard-k8s-overview.png)

### Dapr 系统服务

![New Relic Dashboard Dapr System Services](/images/nr-dashboard-dapr-system-services.png)

### Dapr 指标

![New Relic Dashboard Dapr Metrics 1](/images/nr-dashboard-dapr-metrics-1.png)

## New Relic Grafana 集成

New Relic 与 [Grafana Labs](https://grafana.com/)合作，你可以将[遥测数据平台](https://newrelic.com/platform/telemetry-data-platform)用作 Prometheus 指标的数据源，并在现有仪表板中查看它们，无缝利用 New Relic 提供的可靠性、规模和安全性。

用于监控 Dapr 系统服务和边车的 [Grafana 仪表板模板](https://github.com/dapr/dapr/blob/227028e7b76b7256618cd3236d70c1d4a4392c9a/grafana/README.md)无需任何更改即可轻松使用。New Relic 提供了用于 Grafana 的 [Prometheus 指标原生端点](https://docs.newrelic.com/docs/integrations/grafana-integrations/set-configure/configure-new-relic-prometheus-data-source-grafana)。可以轻松设置数据源：

![New Relic Grafana Data Source](/images/nr-grafana-datasource.png)

并且可以从 Dapr 导入完全相同的仪表板模板来可视化 Dapr 系统服务和边车。

![New Relic Grafana Dashboard](/images/nr-grafana-dashboard.png)

## New Relic 告警

从 Dapr、Kubernetes 或其上运行的任何服务收集的所有数据都可以用于在您选择的首选渠道中设置告警和通知。参见[告警和 Applied Intelligence](https://docs.newrelic.com/docs/alerts-applied-intelligence/overview/)。

## 相关链接/参考

* [New Relic 账户注册](https://newrelic.com/signup)
* [遥测数据平台](https://newrelic.com/platform/telemetry-data-platform)
* [分布式追踪](https://docs.newrelic.com/docs/distributed-tracing/concepts/introduction-distributed-tracing/)
* [New Relic Trace API](https://docs.newrelic.com/docs/distributed-tracing/trace-api/introduction-trace-api/)
* [New Relic API 密钥类型](https://docs.newrelic.com/docs/apis/intro-apis/new-relic-api-keys/)
* [New Relic OpenTelemetry 用户体验](https://blog.newrelic.com/product-news/opentelemetry-user-experience/)
* [告警和 Applied Intelligence](https://docs.newrelic.com/docs/alerts-applied-intelligence/overview/)
