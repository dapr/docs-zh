---
type: docs
title: "应用程序和控制平面配置"
linkTitle: "配置"
weight: 400
description: "更改 Dapr 应用程序边车的行为，或全局更改 Dapr 控制平面系统服务的行为"
---

使用 Dapr 配置，你可以通过设置和策略更改：
- 单个 Dapr 应用程序的行为
- Dapr 控制平面系统服务的全局行为

例如，在应用程序边车配置中设置采样率策略，以指示其他应用程序可以调用哪些方法。如果在 Dapr 控制平面配置中设置策略，则可以更改部署到应用程序边车实例的所有证书的续订周期。

配置以 YAML 文件的形式定义和部署。在以下应用程序配置示例中，设置了一个跟踪端点，用于指定指标信息的发送位置，并捕获所有采样跟踪数据。

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

上述 YAML 配置用于记录指标的跟踪。你可以通过以下任一方式在本地自托管模式下加载它：
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

默认情况下，Dapr 控制平面系统服务会安装一个名为 `daprsystem` 的配置文件。该配置文件应用全局控制平面设置，并在将 Dapr 部署到 Kubernetes 时进行配置。

[详细了解配置选项。]({{% ref "configuration-overview" %}})

在本地运行 Dapr 时，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看每个应用使用的配置，这有助于验证跟踪、功能标志和访问控制策略等设置。

{{% alert title="重要" color="warning" %}}
不要将 Dapr 应用程序和控制平面配置与[配置构建块 API]({{% ref configuration-api-overview %}})混淆；后者使应用程序能够从配置存储组件检索键值数据。
{{% /alert %}}

## 后续步骤

{{< button text="详细了解配置" page="configuration-overview.md" >}}
