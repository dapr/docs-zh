---
type: docs
title: "操作指南：为分布式追踪设置 Datadog"
linkTitle: "Datadog"
weight: 5000
description: "为分布式追踪设置 Datadog"
---

Dapr 可以捕获指标和链路追踪数据，并通过 OpenTelemetry Collector 的 Datadog 导出器直接发送到 Datadog。

## 使用 OpenTelemetry Collector 和 Datadog 配置 Dapr 追踪

使用 OpenTelemetry Collector 的 Datadog 导出器，你可以配置 Dapr 为 Kubernetes 集群中的每个应用创建链路追踪，并在 Datadog 中收集它们。

> 在开始之前，[先设置 OpenTelemetry Collector]({{% ref "open-telemetry-collector.md#setting-opentelemetry-collector" %}})。

1. 将你的 Datadog API 密钥添加到 `./deploy/opentelemetry-collector-generic-datadog.yaml` 文件的 `datadog` 导出器配置部分中：
    ```yaml
    data:
      otel-collector-config:
        ...
        exporters:
          ...
          datadog:
            api:
              key: <YOUR_API_KEY>
    ```

1. 通过运行以下命令来应用 `opentelemetry-collector` 配置。

    ```sh
    kubectl apply -f ./deploy/open-telemetry-collector-generic-datadog.yaml
    ```

1. 创建一个 Dapr 配置文件，用于启用追踪并部署一个使用 OpenTelemetry Collector 的追踪导出器组件。

   ```sh
   kubectl apply -f ./deploy/collector-config.yaml

1. 通过向希望参与分布式追踪的容器添加 `dapr.io/config` 注解来应用 `appconfig` 配置。

   ```yml
   annotations:
      dapr.io/config: "appconfig"

1. 创建并配置应用程序。一旦运行，遥测数据将发送到 Datadog，并可在 Datadog APM 中查看。

<img src="/images/datadog-traces.png" width=1200 alt="Datadog APM showing telemetry data.">


## 相关链接/参考

* [在 Kubernetes 集群上设置 Dapr 的完整示例](https://github.com/ericmustin/quickstarts/tree/master/hello-kubernetes)
* [关于 OpenTelemetry 支持的 Datadog 文档](https://docs.datadoghq.com/opentelemetry/)
* [Datadog 应用性能监控](https://docs.datadoghq.com/tracing/)
