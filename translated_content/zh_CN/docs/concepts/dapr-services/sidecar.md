---
type: docs
title: "Dapr sidecar（daprd）概述"
linkTitle: "Sidecar"
weight: 100
description: "Dapr sidecar 进程概述"
---

Dapr 使用 [sidecar 模式]({{% ref "overview#sidecar-architecture" %}})，这意味着 Dapr API 在一个单独的进程中运行和暴露，该进程称为 Dapr sidecar，与您的应用并行运行。Dapr sidecar 进程名为 `daprd`，根据托管环境的不同，以不同的方式启动。

Dapr sidecar 暴露：

- 您的应用业务逻辑所使用的 [building block API]({{% ref building-blocks-concept%}})
- 用于发现能力和设置属性的 [metadata API]({{% ref metadata_api%}})
- 用于确定健康状态以及 sidecar 就绪性和存活性的 [健康 API]({{% ref sidecar-health%}})

当应用在其配置的端口上可访问时，Dapr sidecar 将达到就绪状态。在应用启动/初始化期间，应用无法访问 Dapr 组件。

{{< diagram name="sidecar-apis" width="65" >}}

sidecar API 通过本地 http 或 gRPC 端点从您的应用调用。
{{< diagram name="sidecar-model" width="65" >}}

## 自托管模式下使用 `dapr run`

当 Dapr 以[自托管模式]({{% ref self-hosted%}})安装时，`daprd` 二进制文件会被下载并放置在用户主目录下（Linux/macOS 为 `$HOME/.dapr/bin`，Windows 为 `%USERPROFILE%\.dapr\bin\`）。

在自托管模式下，运行 Dapr CLI 的 [`run` 命令]({{% ref dapr-run %}}) 会使用提供的应用可执行文件启动 `daprd` 可执行文件。这是在本地开发和测试等场景中运行 Dapr sidecar 的推荐方式。

您可以在 [Dapr run 命令参考]({{% ref dapr-run%}}) 中找到 CLI 暴露的用于配置 sidecar 的各种参数。

## Kubernetes 集群中使用 `dapr-sidecar-injector`

在 [Kubernetes]({{% ref kubernetes %}}) 上，Dapr control plane 包含 [dapr-sidecar-injector 服务]({{% ref kubernetes-overview %}})，该服务监视带有 `dapr.io/enabled` 注解的新 Pod，并在 Pod 内注入一个包含 `daprd` 进程的容器。在这种情况下，sidecar 参数可以通过注解传递，如[此表]({{% ref arguments-annotations-overview%}})中的 **Kubernetes 注解** 列所述。

### 原生 sidecar（Kubernetes 1.28+）

默认情况下，`daprd` 作为常规容器与您的应用一起注入。使用 [Kubernetes 原生 sidecar](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)（[KEP-753](https://github.com/kubernetes/enhancements/issues/753)）时，`daprd` 改为作为带有 `restartPolicy: Always` 的初始化容器注入。有关行为和生命周期语义的详细信息，请参阅 [Kubernetes sidecar 容器文档](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)。

通过 Helm 全局启用原生 sidecar：

```yaml
dapr_sidecar_injector:
  nativeSidecar: true
```

或通过注解按 Pod 启用：

```yaml
annotations:
  dapr.io/enabled: "true"
  dapr.io/enable-native-sidecar: "true"
```

## 直接运行 sidecar

在大多数情况下，您不需要显式运行 `daprd`，因为 sidecar 由 [CLI]({{% ref cli-overview %}})（自托管模式）或 dapr-sidecar-injector 服务（Kubernetes）启动。对于高级用例（调试、脚本部署等），可以直接启动 `daprd` 进程。

有关所有可用参数的详细列表，请运行 `daprd --help`，或参阅[此表]({{% ref arguments-annotations-overview %}})，该表概述了 `daprd` 参数与 CLI 参数和 Kubernetes 注解的对应关系。

### 示例

1. 通过指定唯一 ID 在应用旁边启动 sidecar。

   **注意：** `--app-id` 是必填字段，且不能包含点。

   ```bash
   daprd --app-id myapp
   ```

1. 指定应用正在监听的端口

   ```bash
   daprd --app-id myapp --app-port 5000
   ```

1. 如果您使用多个自定义资源并希望指定资源定义文件的位置，请使用 `--resources-path` 参数：

   ```bash
   daprd --app-id myapp --resources-path <PATH-TO-RESOURCES-FILES>
   ```

1. 如果您将 components 和其他资源（例如，resiliency 策略、订阅或配置）组织到单独的文件夹或共享文件夹中，可以指定多个资源路径：

   ```bash
   daprd --app-id myapp --resources-path <PATH-1-TO-RESOURCES-FILES> --resources-path <PATH-2-TO-RESOURCES-FILES>
   ```

1. 运行应用时启用 Prometheus 指标收集

   ```bash
   daprd --app-id myapp --enable-metrics
   ```

1. 仅监听 IPv4 和 IPv6 回环地址

   ```bash
   daprd --app-id myapp --dapr-listen-addresses '127.0.0.1,[::1]'
   ```
