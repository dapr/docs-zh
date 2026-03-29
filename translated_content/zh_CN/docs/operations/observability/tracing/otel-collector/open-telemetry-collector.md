---
type: docs
title: "使用 OpenTelemetry Collector 收集追踪数据"
linkTitle: "使用 OpenTelemetry Collector"
weight: 900
description: "如何使用 Dapr 通过 OpenTelemetry Collector 推送追踪事件。"
---

Dapr 使用 OpenTelemetry (OTLP) 协议直接写入追踪数据，这是**推荐**的方法。对于直接支持 OTLP 的可观测性工具，建议使用 [OpenTelemetry Collector](https://github.com/open-telemetry/opentelemetry-collector)，因为它允许应用程序快速卸载数据，并包含重试、批处理和加密等功能。更多信息，请阅读 OpenTelemetry Collector [文档](https://opentelemetry.io/docs/collector/#when-to-use-a-collector)。

Dapr 也可以使用 Zipkin 协议写入追踪数据。在支持 OTLP 协议之前，Zipkin 协议与 OpenTelemetry Collector 一起使用，将追踪数据发送到 AWS X-Ray、Google Cloud Operations Suite 和 Azure Monitor 等可观测性工具。两种协议方法都是有效的，但 OpenTelemetry 协议是推荐的选择。

![使用 OpenTelemetry Collector 与多个后端集成](/images/open-telemetry-collector.png)

## 前提条件

- [在 Kubernetes 上安装 Dapr]({{% ref kubernetes %}})
- 验证您的追踪后端已设置好接收追踪数据
- 查看您的 OTEL Collector exporter 所需的参数：
  - [`opentelemetry-collector-contrib/exporter`](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter)
  - [`opentelemetry-collector/exporter`](https://github.com/open-telemetry/opentelemetry-collector/tree/main/exporter)

## 设置 OTEL Collector 以推送到您的追踪后端

1. 查看 [`open-telemetry-collector-generic.yaml`](/docs/open-telemetry-collector/open-telemetry-collector-generic.yaml)。

1. 将 `<your-exporter-here>` 部分替换为您的追踪 exporter 的正确设置。
   - 参考[前提条件部分]({{% ref "#prerequisites.md" %}})中的 OTEL Collector 链接来确定正确的设置。

1. 使用以下命令应用配置：

   ```sh
   kubectl apply -f open-telemetry-collector-generic.yaml
   ```

## 设置 Dapr 以将追踪数据发送到 OTEL Collector

设置一个 Dapr 配置文件来启用追踪，并部署一个使用 OpenTelemetry Collector 的追踪 exporter 组件。

1. 使用此 [`collector-config.yaml`](/docs/open-telemetry-collector/collector-config.yaml) 文件创建您自己的配置。

1. 使用以下命令应用配置：

   ```sh 
   kubectl apply -f collector-config.yaml
   ```

## 使用追踪功能部署您的应用

通过在要参与分布式追踪的容器上添加 `dapr.io/config` 注解来应用 `appconfig` 配置，如下例所示：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  ...
spec:
  ...
  template:
    metadata:
      ...
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "MyApp"
        dapr.io/app-port: "8080"
        dapr.io/config: "appconfig"
```

{{% alert title="注意" color="primary" %}}
如果您正在使用某个 Dapr 教程（例如 [分布式计算器](https://github.com/dapr/quickstarts/tree/master/tutorials/distributed-calculator)），`appconfig` 配置已经配置好，因此无需额外设置。
{{% /alert %}}

您可以同时注册多个追踪 exporter，追踪日志会转发到所有已注册的 exporter。

就这样！无需包含任何 SDK 或检测您的应用程序代码。Dapr 会自动为您处理分布式追踪。

## 查看追踪数据

部署并运行一些应用程序。等待追踪数据传播到您的追踪后端，然后在那里查看它们。

## 相关链接
- 尝试[可观测性快速入门](https://github.com/dapr/quickstarts/tree/master/tutorials/observability/README.md)
- 了解如何设置[追踪配置选项]({{% ref "configuration-overview.md#tracing" %}})
