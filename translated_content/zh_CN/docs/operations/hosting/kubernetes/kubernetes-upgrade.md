---
type: docs
title: "在 Kubernetes 集群上升级 Dapr"
linkTitle: "升级 Dapr"
weight: 30000
description: "按照以下步骤在 Kubernetes 上升级 Dapr 并确保平滑升级。"
---

您可以使用 Dapr CLI 或 Helm 在 Kubernetes 集群上升级 Dapr 控制平面。

{{% alert title="注意" color="primary" %}}
请参阅 [Dapr 版本策略]({{% ref "support-release-policy.md#upgrade-paths" %}}) 以获取有关 Dapr 升级路径的指导。
{{% /alert %}}

{{< tabpane text=true >}}
 <!-- Dapr CLI -->
{{% tab "Dapr CLI" %}}
## 使用 Dapr CLI 升级

您可以使用 [Dapr CLI]({{% ref install-dapr-cli.md %}}) 来升级 Dapr。

### 前置条件

- [安装 Dapr CLI]({{% ref install-dapr-cli.md %}})
- 现有的 [运行 Dapr 的 Kubernetes 集群]({{% ref cluster %}})

### 升级现有集群至 {{% dapr-latest-version long="true" %}}

```bash
dapr upgrade -k --runtime-version={{% dapr-latest-version long="true" %}}
```

[您可以使用 Dapr CLI 提供所有可用的 Helm chart 配置。](https://github.com/dapr/cli#supplying-helm-values)

### 通过 CLI 进行升级的故障排查

在可能曾经安装过早于 1.0.0-rc.2 版本的集群上运行升级时，存在一个已知问题。

虽然这种情况很少见，但一些升级路径的边缘情况可能会在集群上留下不兼容的 `CustomResourceDefinition`。如果您遇到这种情况，您可能会看到类似如下的错误消息：

```
❌  Failed to upgrade Dapr: Warning: kubectl apply should be used on resource created by either kubectl create --save-config or kubectl apply
The CustomResourceDefinition "configurations.dapr.io" is invalid: spec.preserveUnknownFields: Invalid value: true: must be false in order to use defaults in the schema

```

#### 解决方案

1. 运行以下命令将 `CustomResourceDefinition` 升级到兼容版本：

    ```sh
    kubectl replace -f https://raw.githubusercontent.com/dapr/dapr/release-{{% dapr-latest-version short="true" %}}/charts/dapr/crds/configuration.yaml
    ```

1. 继续执行 `dapr upgrade --runtime-version {{% dapr-latest-version long="true" %}} -k` 命令。

{{% /tab %}}

 <!-- Helm -->
{{% tab "Helm" %}}
## 使用 Helm 升级

您可以使用 Helm v3 chart 升级 Dapr。

❗**重要提示：** 最新的 Dapr Helm chart 不再支持 Helm v2。[从 Helm v2 迁移到 Helm v3](https://helm.sh/blog/migrate-from-helm-v2-to-helm-v3/)。

### 前置条件

- [安装 Helm v3](https://github.com/helm/helm/releases)
- 现有的 [运行 Dapr 的 Kubernetes 集群]({{% ref cluster %}})

### 升级现有集群至 {{% dapr-latest-version long="true" %}}

从 1.0.0 版本开始，使用 Helm 升级 Dapr 时，现有的证书值将自动被复用。

> **注意** Helm 不处理资源的升级，因此您需要手动执行该操作。资源具有向后兼容性，应仅向前安装。

1. 将 Dapr 升级到版本 {{% dapr-latest-version long="true" %}}：

   ```bash
   kubectl replace -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/components.yaml
   kubectl replace -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/configuration.yaml
   kubectl replace -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/subscription.yaml
   kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/resiliency.yaml
   kubectl apply -f https://raw.githubusercontent.com/dapr/dapr/v{{% dapr-latest-version long="true" %}}/charts/dapr/crds/httpendpoints.yaml
   ```

   ```bash
   helm repo update
   ```

   ```bash
   helm upgrade dapr dapr/dapr --version {{% dapr-latest-version long="true" %}} --namespace dapr-system --wait
   ```
   > *如果您正在使用 values 文件，请记得在运行升级命令时添加 `--values` 选项。*

1. 确保所有 pod 都在运行：

   ```bash
   kubectl get pods -n dapr-system -w

   NAME                                     READY   STATUS    RESTARTS   AGE
   dapr-dashboard-69f5c5c867-mqhg4          1/1     Running   0          42s
   dapr-operator-5cdd6b7f9c-9sl7g           1/1     Running   0          41s
   dapr-placement-server-0                  1/1     Running   0          41s
   dapr-sentry-84565c747b-7bh8h             1/1     Running   0          35s
   dapr-sidecar-injector-68f868668f-6xnbt   1/1     Running   0          41s
   ```

1. 重启您的应用程序部署以更新 Dapr 运行时：

   ```bash
   kubectl rollout restart deploy/<DEPLOYMENT-NAME>
   ```

{{% /tab %}}

{{< /tabpane >}}


## 升级现有 Dapr 部署以启用高可用模式

[通过一些额外步骤在现有 Dapr 部署中启用高可用模式。]({{% ref "kubernetes-production.md#enabling-high-availability-in-an-existing-dapr-deployment" %}})

## 相关链接

- [Kubernetes 上的 Dapr]({{% ref kubernetes-overview.md %}})
- [更多关于使用 Helm 升级 Dapr 的信息]({{% ref "kubernetes-production.md#upgrade-dapr-with-helm" %}})
- [Dapr 生产指南]({{% ref kubernetes-production.md %}})
