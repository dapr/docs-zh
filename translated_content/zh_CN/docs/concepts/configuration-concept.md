---
type: docs
title: "应用程序和控制平面配置"
linkTitle: "配置"
weight: 400
description: "更改 Dapr 应用程序边车或 Dapr 控制平面系统服务的全局行为"
---

使用 Dapr 配置，您可以通过设置和策略来更改：
- 单个 Dapr 应用程序的行为
- Dapr 控制平面系统服务的全局行为

例如，在应用程序边车配置上设置采样率策略，以指示可以从另一个应用程序调用哪些方法。如果在 Dapr 控制平面配置上设置策略，可以更改部署到应用程序边车实例的所有证书的证书续订周期。

配置被定义并部署为 YAML 文件。在以下应用程序配置示例中，设置了一个链路追踪端点，用于指定指标信息的发送位置，捕获所有示例链路。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprConfig
  namespace: default
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://localhost:9411/api/v2/spans"
```

上述 YAML 配置用于指标记录的链路追踪。您可以通过以下方式在本地自托管模式下加载它：
- 编辑 `.dapr` 目录中名为 `config.yaml` 的默认配置文件，或
- 使用 `kubectl/helm` 将其应用到 Kubernetes 集群

以下示例展示了 `dapr-system` 命名空间中名为 `daprsystem` 的 Dapr 控制平面配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprsystem
  namespace: dapr-system
spec:
  mtls:
    enabled: true
    workloadCertTTL: "24h"
    allowedClockSkew: "15m"
```

默认情况下，Dapr 控制平面系统服务安装了一个名为 `daprsystem` 的配置文件。该配置文件应用全局控制平面设置，并在将 Dapr 部署到 Kubernetes 时进行设置。

[了解有关配置选项的更多信息。]({{% ref "configuration-overview" %}})

{{% alert title="重要" color="warning" %}}
不要将 Dapr 应用程序和控制平面配置与[配置构建块 API]({{% ref configuration-api-overview %}})混淆，后者使应用程序能够从配置存储组件检索键值数据。
{{% /alert %}}

## 后续步骤

{{< button text="了解有关配置的更多信息" page="configuration-overview.md" >}}
