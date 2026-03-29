---
type: docs
title: "设置 KiND 集群"
linkTitle: "KiND"
weight: 1100
description: >
  如何设置 KiND 集群
---

## 前置条件

- 安装：
   - [Docker](https://docs.docker.com/install/)
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
- 对于 Windows：
   - 在 BIOS 中启用虚拟化
   - [安装 Hyper-V](https://docs.microsoft.com/virtualization/hyper-v-on-windows/quick-start/enable-hyper-v)

## 安装和配置 KiND

[请参阅 KiND 文档进行安装。](https://kind.sigs.k8s.io/docs/user/quick-start)

如果您使用的是 Docker Desktop，请确保您已[配置推荐的设置](https://kind.sigs.k8s.io/docs/user/quick-start#settings-for-docker-desktop)。

## 配置和创建 KiND 集群

1. 创建一个名为 `kind-cluster-config.yaml` 的文件，并粘贴以下内容：

   ```yaml
   kind: Cluster
   apiVersion: kind.x-k8s.io/v1alpha4
   nodes:
   - role: control-plane
     kubeadmConfigPatches:
     - |
       kind: InitConfiguration
       nodeRegistration:
         kubeletExtraArgs:
           node-labels: "ingress-ready=true"
     extraPortMappings:
     - containerPort: 80
       hostPort: 8081
       protocol: TCP
     - containerPort: 443
       hostPort: 8443
       protocol: TCP
   - role: worker
   - role: worker
   ```

   此集群配置：
   - 请求 KiND 启动一个由控制平面和两个工作节点组成的 Kubernetes 集群。
   - 允许后续设置入口。
   - 将容器端口暴露到主机。

1. 运行 `kind create cluster` 命令，提供集群配置文件：

   ```bash
   kind create cluster --config kind-cluster-config.yaml
   ```

   **预期输出**

   ```md
   Creating cluster "kind" ...
    ✓ Ensuring node image (kindest/node:v1.21.1) 🖼
    ✓ Preparing nodes 📦 📦 📦
    ✓ Writing configuration 📜
    ✓ Starting control-plane 🕹️
    ✓ Installing CNI 🔌
    ✓ Installing StorageClass 💾
    ✓ Joining worker nodes 🚜
   Set kubectl context to "kind-kind"
   You can now use your cluster with:
   
   kubectl cluster-info --context kind-kind
   
   Thanks for using kind! 😊
   ```

## 初始化和运行 Dapr

1. 在 Kubernetes 中初始化 Dapr。

   ```bash
   dapr init --kubernetes
   ```

   Dapr 完成初始化后，您可以在集群上使用其核心组件。

1. 验证 Dapr 组件的状态：

   ```bash
   dapr status -k
   ```

   **预期输出**

   ```md
     NAME                   NAMESPACE    HEALTHY  STATUS   REPLICAS  VERSION  AGE  CREATED
     dapr-sentry            dapr-system  True     Running  1         1.5.1    53s  2021-12-10 09:27.17
     dapr-operator          dapr-system  True     Running  1         1.5.1    53s  2021-12-10 09:27.17
     dapr-sidecar-injector  dapr-system  True     Running  1         1.5.1    53s  2021-12-10 09:27.17
     dapr-dashboard         dapr-system  True     Running  1         0.9.0    53s  2021-12-10 09:27.17
     dapr-placement-server  dapr-system  True     Running  1         1.5.1    52s  2021-12-10 09:27.18
   ```

1. 转发端口到 [Dapr 仪表板](https://docs.dapr.io/reference/cli/dapr-dashboard/)：

   ```bash
   dapr dashboard -k -p 9999
   ```

1. 导航到 `http://localhost:9999` 以验证设置成功。

## 在 Kind Kubernetes 集群上安装 metrics-server

1. 获取 metrics-server 清单文件

   ```bash
   wget https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
   ```

1. 向 components.yaml 文件添加不安全的 TLS 参数

   ```yaml
   metadata:
      labels:
        k8s-app: metrics-server
    spec:
      containers:
      - args:
        - --cert-dir=/tmp
        - --secure-port=4443
        - --kubelet-preferred-address-types=InternalIP,ExternalIP,Hostname
        - --kubelet-use-node-status-port
        - --kubelet-insecure-tls   <==== 添加此行
        - --metric-resolution=15s
        image: k8s.gcr.io/metrics-server/metrics-server:v0.6.2
        imagePullPolicy: IfNotPresent
        livenessProbe:
          failureThreshold: 3
          httpGet:
            path: /livez
   ```

1. 应用修改后的清单文件

   ```bash
   kubectl apply -f components.yaml
   ```

## 相关链接
- [尝试 Dapr 快速入门]({{% ref quickstarts.md %}})
- 了解如何[在您的集群上部署 Dapr]({{% ref kubernetes-deploy.md %}})
- [在 Kubernetes 上升级 Dapr]({{% ref kubernetes-upgrade.md %}})
- [Kubernetes 生产指南]({{% ref kubernetes-production.md %}})
