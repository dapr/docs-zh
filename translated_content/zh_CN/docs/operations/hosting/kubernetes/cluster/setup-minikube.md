---
type: docs
title: "设置 Minikube 集群"
linkTitle: "Minikube"
weight: 1000
description: >
  如何设置 Minikube 集群
---

## 前提条件

- 安装：
   - [Docker](https://docs.docker.com/install/)
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
   - [Minikube](https://minikube.sigs.k8s.io/docs/start/)
- 对于 Windows：
   - 在 BIOS 中启用虚拟化
   - [安装 Hyper-V](https://docs.microsoft.com/virtualization/hyper-v-on-windows/quick-start/enable-hyper-v)

{{% alert title="注意" color="primary" %}}
查看 [Minikube 官方文档] 以了解有关驱动程序的详细信息和插件安装方法。
{{% /alert %}}

## 启动 Minikube 集群

1. 如果您的项目需要，设置默认的虚拟机。

   ```bash
   minikube config set vm-driver [driver_name]
   ```

1. 启动集群。如果需要，使用 `--kubernetes-version` 指定 Kubernetes 1.13.x 或更新版本。

    ```bash
    minikube start --cpus=4 --memory=4096
    ```

1. 启用 Minikube 仪表板和 ingress 插件。

   ```bash
   # 启用仪表板
   minikube addons enable dashboard
   
   # 启用 ingress
   minikube addons enable ingress
   ```

## 安装 Helm v3（可选）

如果您使用 Helm，安装 [Helm v3 客户端](https://helm.sh/docs/intro/install/)。

{{% alert title="重要" color="warning" %}}
最新的 Dapr Helm chart 不再支持 Helm v2。[从 Helm v2 迁移到 Helm v3](https://helm.sh/blog/migrate-from-helm-v2-to-helm-v3/)。
{{% /alert %}}

## 故障排除

负载均衡器的外部 IP 地址在 `kubectl get svc` 中未显示。

在 Minikube 中，`kubectl get svc` 中的 `EXTERNAL-IP` 显示为 `<pending>` 状态。此时，您可以运行 `minikube service [service_name]` 来打开服务，即使没有外部 IP 地址。

```bash
$ kubectl get svc
NAME                        TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)            AGE
...
calculator-front-end        LoadBalancer   10.103.98.37     <pending>     80:30534/TCP       25h
calculator-front-end-dapr   ClusterIP      10.107.128.226   <none>        80/TCP,50001/TCP   25h
...

$ minikube service calculator-front-end
|-----------|----------------------|-------------|---------------------------|
| NAMESPACE |         NAME         | TARGET PORT |            URL            |
|-----------|----------------------|-------------|---------------------------|
| default   | calculator-front-end |             | http://192.168.64.7:30534 |
|-----------|----------------------|-------------|---------------------------|
🎉  正在默认浏览器中打开 Kubernetes 服务 default/calculator-front-end...
```

## 相关链接
- [尝试 Dapr 快速入门]({{% ref quickstarts.md %}})
- 学习如何在您的集群上 [部署 Dapr]({{% ref kubernetes-deploy.md %}})
- [在 Kubernetes 上升级 Dapr]({{% ref kubernetes-upgrade.md %}})
- [Kubernetes 生产指南]({{% ref kubernetes-production.md %}})