---
type: docs
title: "Dapr 边车 (daprd) 概述"
linkTitle: "边车"
weight: 100
description: "Dapr 边车进程概述"
---

Dapr 使用[边车模式]({{% ref "overview#sidecar-architecture" %}})——Dapr API 在独立于应用程序的进程中运行，即 Dapr 边车，与您的应用程序并行运行。Dapr 边车进程名为 `daprd`，其启动方式因托管环境而异。

Dapr 边车提供以下功能：

- 供应用程序业务逻辑使用的[构建块 API]({{% ref building-blocks-concept%}})
- 用于发现能力和设置属性的[元数据 API]({{% ref metadata_api%}})
- 用于确定健康状态及边车就绪状态和存活状态的[健康检查 API]({{% ref sidecar-health%}})

Dapr 边车在应用程序可在其配置的端口上访问后即进入就绪状态。应用程序在启动/初始化期间无法访问 Dapr 组件。

<img src="/images/overview-sidecar-apis.png" width=700>

边车 API 通过本地 HTTP 或 gRPC 端点从您的应用程序调用。
<img src="/images/overview-sidecar-model.png" width=700>

## 使用 `dapr run` 的自托管模式

当 Dapr 以[自托管模式]({{% ref self-hosted%}})安装时，`daprd` 二进制文件会被下载并放置在用户主目录下（Linux/macOS 为 `$HOME/.dapr/bin`，Windows 为 `%USERPROFILE%\.dapr\bin\`）。

在自托管模式下，运行 Dapr CLI [`run` 命令]({{% ref dapr-run %}})会启动 `daprd` 可执行文件，同时运行提供的应用程序可执行文件。这是在本地场景（如开发和测试）中运行 Dapr 边车的推荐方式。

您可以在 [Dapr run 命令参考文档]({{% ref dapr-run%}})中找到 CLI 暴露的用于配置边车的各种参数。

## Kubernetes 与 `dapr-sidecar-injector`

在 [Kubernetes]({{% ref kubernetes %}}) 上，Dapr 控制平面包含 [dapr-sidecar-injector 服务]({{% ref kubernetes-overview %}})——该服务监视带有 `dapr.io/enabled` 注解的新 Pod，并在 Pod 内注入包含 `daprd` 进程的容器。在这种情况下，边车参数可以通过注解传递，如[此表]({{% ref arguments-annotations-overview%}})中 **Kubernetes 注解**列所述。

### 原生边车（Kubernetes 1.28+）

默认情况下，`daprd` 作为常规容器与您的应用程序一起注入。通过 [Kubernetes 原生边车](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)（[KEP-753](https://github.com/kubernetes/enhancements/issues/753)），`daprd` 改为作为带有 `restartPolicy: Always` 的 init 容器注入。行为和生命周期语义的详细信息请参阅 [Kubernetes 边车容器文档](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)。

通过 Helm 全局启用原生边车：

```yaml
dapr_sidecar_injector:
  nativeSidecar: true
```

或通过注解为每个 Pod 启用：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/enable-native-sidecar: "true"
```

## 直接运行边车

在大多数情况下，您无需显式运行 `daprd`，因为边车由 [CLI]({{% ref cli-overview%}})（自托管模式）或 dapr-sidecar-injector 服务（Kubernetes）启动。对于高级用例（调试、脚本化部署等），可以直接启动 `daprd` 进程。

有关所有可用参数的详细列表，请运行 `daprd --help` 或参阅[此表]({{% ref arguments-annotations-overview %}})——它概述了 `daprd` 参数如何与 CLI 参数和 Kubernetes 注解对应。

### 示例

1. 通过指定唯一 ID 启动与应用程序并行的边车。

   **注意：** `--app-id` 是必填字段，且不能包含点号。

   ```bash
   daprd --app-id myapp
   ```

1. 指定应用程序监听的端口

   ```bash
   daprd --app-id myapp --app-port 5000
   ```

1. 如果您使用多个自定义资源并想指定资源定义文件的位置，请使用 `--resources-path` 参数：

   ```bash
   daprd --app-id myapp --resources-path <PATH-TO-RESOURCES-FILES>
   ```

1. 如果您已将组件和其他资源（例如弹性策略、订阅或配置）组织到单独的文件夹或共享文件夹中，您可以指定多个资源路径：

   ```bash
   daprd --app-id myapp --resources-path <PATH-1-TO-RESOURCES-FILES> --resources-path <PATH-2-TO-RESOURCES-FILES>
   ```

1. 在运行应用程序时启用 Prometheus 指标收集

   ```bash
   daprd --app-id myapp --enable-metrics
   ```

1. 仅监听 IPv4 和 IPv6 loopback

   ```bash
   daprd --app-id myapp --dapr-listen-addresses '127.0.0.1,[::1]'
   ```
