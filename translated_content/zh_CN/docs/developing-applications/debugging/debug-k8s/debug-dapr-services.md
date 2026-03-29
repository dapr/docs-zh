---
type: docs
title: "在 Kubernetes 上调试 Dapr 控制平面"
linkTitle: "Dapr 控制平面"
weight: 1000
description: "如何在 Kubernetes 集群上调试 Dapr 控制平面"
---

## 概述

有时有必要了解 Dapr 控制平面（即 Kubernetes 服务）内部发生了什么，包括 `dapr-sidecar-injector`、`dapr-operator`、`dapr-placement` 和 `dapr-sentry`，尤其是当你诊断 Dapr 应用程序并怀疑 Dapr 本身是否存在问题时。此外，你可能正在为 Kubernetes 上的 Dapr 开发新功能并希望调试代码。

本指南将介绍如何使用 Dapr 调试二进制文件在 Kubernetes 集群上调试 Dapr 服务。

## 调试 Dapr Kubernetes 服务

### 前置条件

- 熟悉[本指南]({{% ref kubernetes-deploy.md %}})以了解如何将 Dapr 部署到 Kubernetes 集群。
- 设置你的[开发环境](https://github.com/dapr/dapr/blob/master/docs/development/developing-dapr.md)
- [Helm](https://github.com/helm/helm/releases)

### 1. 构建 Dapr 调试二进制文件

为了调试 Dapr Kubernetes 服务，需要重新构建所有 Dapr 二进制文件和 Docker 镜像以禁用编译器优化。为此，执行以下命令：

```bash
git clone https://github.com/dapr/dapr.git
cd dapr
make release GOOS=linux GOARCH=amd64 DEBUG=1
```

> 在 Windows 上下载 [MingGW](https://sourceforge.net/projects/mingw/files/MinGW/Extension/make/mingw32-make-3.80-3/) 并使用 `ming32-make.exe` 代替 `make`。

在上述命令中，'DEBUG' 被指定为 '1' 以禁用编译器优化。'GOOS=linux' 和 'GOARCH=amd64' 也是必需的，因为二进制文件将在下一步被打包到基于 Linux 的 Docker 镜像中。

二进制文件可以在 'dapr' 目录下的 'dist/linux_amd64/debug' 子目录中找到。

### 2. 构建 Dapr 调试 Docker 镜像

使用以下命令将调试二进制文件打包到 Docker 镜像中。在此之前，你需要登录到 docker.io 账户，如果你还没有账户，可能需要考虑从 "https://hub.docker.com/" 注册一个。

```bash
export DAPR_TAG=dev
export DAPR_REGISTRY=<your docker.io id>
docker login
make docker-push DEBUG=1
```

一旦 Dapr Docker 镜像构建完成并推送到 Docker hub，你就可以在 Kubernetes 集群中重新安装 Dapr 了。

### 3. 安装 Dapr 调试二进制文件

如果 Kubernetes 集群中已经安装了 Dapr，请先卸载：

```bash
dapr uninstall -k
```

我们将使用 'helm' 来安装 Dapr 调试二进制文件。在以下章节中，我们将以 Dapr operator 为例演示如何在 Kubernetes 环境中配置、安装和调试 Dapr 服务。

首先使用这些选项配置一个 values 文件：

```yaml
global:
   registry: docker.io/<your docker.io id>
   tag: "dev-linux-amd64"
dapr_operator:
  debug:
    enabled: true
    initialDelaySeconds: 3000
```

{{% alert title="注意" color="primary" %}}
如果需要调试 Dapr 服务的启动时间，需要考虑将 `initialDelaySeconds` 配置为一个很长的时间值，例如 "3000" 秒。如果不是这种情况，将其配置为一个短时间值，例如 "3" 秒。
{{% /alert %}}

然后进入本指南开始时从 GitHub 克隆的 'dapr' 目录（如果还没有的话），并执行以下命令：

```bash
helm install dapr charts/dapr --namespace dapr-system --values values.yml --wait
```

### 4. 转发调试端口

要调试目标 Dapr 服务（在此例中为 Dapr operator），其预配置的调试端口需要对你的 IDE 可见。为了实现这一点，我们首先需要找到目标 Dapr 服务的 pod：

```bash
$ kubectl get pods -n dapr-system -o wide

NAME                                     READY   STATUS    RESTARTS   AGE   IP            NODE       NOMINATED NODE   READINESS GATES
dapr-dashboard-64b46f98b6-dl2n9          1/1     Running   0          61s   172.17.0.9    minikube   <none>           <none>
dapr-operator-7878f94fcd-6bfx9           1/1     Running   1          61s   172.17.0.7    minikube   <none>           <none>
dapr-placement-server-0                  1/1     Running   1          61s   172.17.0.8    minikube   <none>           <none>
dapr-sentry-68c7d4c7df-sc47x             1/1     Running   0          61s   172.17.0.6    minikube   <none>           <none>
dapr-sidecar-injector-56c8f489bb-t2st9   1/1     Running   0          61s   172.17.0.10   minikube   <none>           <none>
```

然后使用 kubectl 的 `port-forward` 命令将内部调试端口暴露给外部 IDE：

```bash
$ kubectl port-forward dapr-operator-7878f94fcd-6bfx9 40000:40000 -n dapr-system

Forwarding from 127.0.0.1:40000 -> 40000
Forwarding from [::1]:40000 -> 40000
```

完成了。现在你可以指向端口 40000 并从你喜欢的 IDE 启动远程调试会话。

## 相关链接

- [Dapr on Kubernetes 概述]({{% ref kubernetes-overview %}})
- [将 Dapr 部署到 Kubernetes 集群]({{% ref kubernetes-deploy %}})
- [Dapr Kubernetes 快速入门](https://github.com/dapr/quickstarts/tree/master/tutorials/hello-kubernetes)
