---
type: docs
title: "部署到混合 Linux/Windows Kubernetes 集群"
linkTitle: "混合集群"
weight: 70000
description: "如何在带有 Windows 节点的 Kubernetes 集群上运行 Dapr 应用"
---

Dapr 支持在以下 Kubernetes 集群上运行微服务：
- Windows
- Linux
- 两者组合

这在将传统应用程序逐步迁移到 Dapr Kubernetes 集群时特别有用。

Kubernetes 使用一个称为**节点亲和性（node affinity）**的概念来表示你希望应用程序在 Linux 节点还是 Windows 节点上启动。当部署到同时具有 Windows 和 Linux 节点的集群时，必须为应用程序提供亲和性规则，否则 Kubernetes 调度器可能会在错误类型的节点上启动应用程序。

## 前置条件

在开始之前，请设置一个包含 Windows 节点的 Kubernetes 集群。许多 Kubernetes 提供商支持自动配置启用了 Windows 的 Kubernetes 集群。

1. 按照你选择的服务商的说明设置启用了 Windows 的集群。

   - [在 Azure AKS 上设置 Windows](https://docs.microsoft.com/azure/aks/windows-container-cli)
   - [在 AWS EKS 上设置 Windows](https://docs.aws.amazon.com/eks/latest/userguide/windows-support.html)
   - [在 Google Cloud GKE 上设置 Windows](https://cloud.google.com/kubernetes-engine/docs/how-to/creating-a-cluster-windows)

1. 设置集群后，验证 Windows 和 Linux 节点都可用。

   ```bash
   kubectl get nodes -o wide

   NAME                                STATUS   ROLES   AGE     VERSION   INTERNAL-IP    EXTERNAL-IP      OS-IMAGE                         KERNEL-VERSION      CONTAINER-RUNTIME
   aks-nodepool1-11819434-vmss000000   Ready    agent   6d      v1.17.9   10.240.0.4     <none>        Ubuntu 16.04.6    LTS               4.15.0-1092-azure   docker://3.0.10+azure
   aks-nodepool1-11819434-vmss000001   Ready    agent   6d      v1.17.9   10.240.0.35    <none>        Ubuntu 16.04.6    LTS               4.15.0-1092-azure   docker://3.0.10+azure
   aks-nodepool1-11819434-vmss000002   Ready    agent   5d10h   v1.17.9   10.240.0.129   <none>        Ubuntu 16.04.6    LTS               4.15.0-1092-azure   docker://3.0.10+azure
   akswin000000                        Ready    agent   6d      v1.17.9   10.240.0.66    <none>        Windows Server 2019    Datacenter   10.0.17763.1339     docker://19.3.5
   akswin000001                        Ready    agent   6d      v1.17.9   10.240.0.97    <none>        Windows Server 2019    Datacenter   10.0.17763.1339     docker://19.3.5
   ```

## 安装 Dapr 控制平面

如果你使用 Dapr CLI 或 Helm chart 安装，只需按照常规部署流程操作：[在 Kubernetes 集群上安装 Dapr]({{% ref "install-dapr-selfhost.md#installing-Dapr-on-a-kubernetes-cluster" %}})

亲和性将自动设置为 `kubernetes.io/os=linux`。这对大多数用户来说已足够，因为 Kubernetes 至少需要一个 Linux 节点池。

{{% alert title="注意" color="primary" %}}
Dapr 控制平面容器同时为 Windows 和 Linux 构建和测试。但是，建议使用 Linux 控制平面容器，因为它们通常更小且拥有更大的用户群。

如果你了解上述情况，但仍想将 Dapr 控制平面部署到 Windows，可以通过设置以下参数来实现：

```sh
helm install dapr dapr/dapr --set global.daprControlPlaneOs=windows
```
{{% /alert %}}

## 安装 Dapr 应用

### Windows 应用

1. [遵循 Microsoft 文档创建一个安装了你的应用的 Docker Windows 容器](https://learn.microsoft.com/virtualization/windowscontainers/quick-start/set-up-environment?tabpane=dockerce)。

1. 创建包含应用的 Docker 容器后，创建一个部署 YAML 文件，将节点亲和性设置为 `kubernetes.io/os: windows`。在下面的示例 `deploy_windows.yaml` 部署文件中：

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: yourwinapp
     labels:
       app: applabel
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: applablel
     template:
       metadata:
         labels:
           app: applabel
         annotations:
           dapr.io/enabled: "true"
           dapr.io/id: "addapp"
           dapr.io/port: "6000"
           dapr.io/config: "appconfig"
       spec:
         containers:
         - name: add
           image: yourreponsitory/your-windows-dapr-container:your-tag
           ports:
           - containerPort: 6000
           imagePullPolicy: Always
         affinity:
           nodeAffinity:
             requiredDuringSchedulingIgnoredDuringExecution:
               nodeSelectorTerms:
                 - matchExpressions:
                   - key: kubernetes.io/os
                     operator: In
                     values:
                     - windows
   ```
   
1. 将 YAML 文件部署到你的 Kubernetes 集群。

   ```bash
   kubectl apply -f deploy_windows.yaml
   ```

### Linux 应用

如果你已经有一个在 Linux 上运行的 Dapr 应用，仍然需要添加亲和性规则。

1. 创建一个部署 YAML 文件，将节点亲和性设置为 `kubernetes.io/os: linux`。在下面的示例 `deploy_linux.yaml` 部署文件中：

   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: yourlinuxapp
     labels:
       app: yourlabel
   spec:
     replicas: 1
     selector:
       matchLabels:
         app: yourlabel
     template:
       metadata:
         labels:
           app: yourlabel
         annotations:
           dapr.io/enabled: "true"
           dapr.io/id: "addapp"
           dapr.io/port: "6000"
           dapr.io/config: "appconfig"
       spec:
         containers:
         - name: add
           image: yourreponsitory/your-application:your-tag
           ports:
           - containerPort: 6000
           imagePullPolicy: Always
         affinity:
           nodeAffinity:
             requiredDuringSchedulingIgnoredDuringExecution:
               nodeSelectorTerms:
                 - matchExpressions:
                   - key: kubernetes.io/os
                     operator: In
                     values:
                     - linux
   ```

1. 将 YAML 部署到你的 Kubernetes 集群。

   ```bash
   kubectl apply -f deploy_linux.yaml
   ```

就是这样！

## 清理

要删除本指南中的部署，运行以下命令：

```bash
kubectl delete -f deploy_linux.yaml
kubectl delete -f deploy_windows.yaml
helm uninstall dapr
```

## 相关链接

- 查阅 [官方 Kubernetes 文档](https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/)了解通过节点亲和性进行更高级配置的示例
- [入门：为容器准备 Windows](https://docs.microsoft.com/virtualization/windowscontainers/quick-start/set-up-environment)
- [在 Azure AKS 上设置启用了 Windows 的 Kubernetes 集群](https://docs.microsoft.com/azure/aks/windows-container-cli)
- [在 AWS EKS 上设置启用了 Windows 的 Kubernetes 集群](https://docs.aws.amazon.com/eks/latest/userguide/windows-support.html)
- [在 Google Cloud GKE 上设置 Windows](https://cloud.google.com/kubernetes-engine/docs/how-to/creating-a-cluster-windows)
