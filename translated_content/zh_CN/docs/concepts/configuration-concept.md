---
type: docs
title: "应用程序和控制平面配置"
linkTitle: "Configuration"
weight: 400
description: "更改 Dapr 应用程序边车或 Dapr 控制平面系统服务的全局行为"
---

通过 Dapr 配置，您可以使用设置和策略来更改：

- 单个 Dapr 应用程序的行为
- Dapr 控制平面系统服务的全局行为

例如，在应用程序边车配置上设置采样率策略，以指示可以从另一个应用程序调用哪些方法。如果您在 Dapr 控制平面配置上设置策略，则可以更改部署到应用程序边车实例的所有证书的证书续订期限。

配置定义为 YAML 文件并作为 YAML 文件部署。在以下应用程序配置示例中，设置了跟踪端点用于发送指标信息，捕获所有采样追踪。

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

上述 YAML 配置了用于指标记录的追踪。在本地自托管模式下，可以通过以下方式加载它：

- 编辑 `.dapr` 目录中名为 `config.yaml` 的默认配置文件，或
- 使用 `kubectl/helm` 将其应用到 Kubernetes 集群。

以下示例显示了在 `dapr-system` 命名空间中名为 `daprsystem` 的 Dapr 控制平面配置。

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

默认情况下，有一个名为 `daprsystem` 的配置文件随 Dapr 控制平面系统服务一起安装。此配置文件应用全局控制平面设置，并在 Dapr 部署到 Kubernetes 时设置。

[详细了解配置选项。]({{% ref "configuration-overview" %}})

{{% alert title="重要" color="warning" %}}
Dapr 应用程序和控制平面配置不应与[配置构建块 API]({{% ref configuration-api-overview %}}) 混淆，后者使应用程序能够从配置存储组件中检索键/值数据。
{{% /alert %}}
## 后续步骤

{{< button text="详细了解配置" page="configuration-overview.md" >}}
