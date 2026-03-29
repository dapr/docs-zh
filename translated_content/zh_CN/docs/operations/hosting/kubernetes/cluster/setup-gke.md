---
type: docs
title: "设置 Google Kubernetes Engine (GKE) 集群"
linkTitle: "Google Kubernetes Engine (GKE)"
weight: 3000
description: "设置 Google Kubernetes Engine 集群"
---

### 前置条件

- 安装：
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
   - [Google Cloud SDK](https://cloud.google.com/sdk)

## 创建新集群

通过运行以下命令创建 GKE 集群：

```bash
$ gcloud services enable container.googleapis.com && \
  gcloud container clusters create $CLUSTER_NAME \
  --zone $ZONE \
  --project $PROJECT_ID
```
更多选项：
- 参考 [Google Cloud SDK 文档](https://cloud.google.com/sdk/gcloud/reference/container/clusters/create)。
- 通过 [Cloud Console](https://console.cloud.google.com/kubernetes) 创建集群以获得更具交互性的体验。

## 私有 GKE 集群的边车注入

_**私有集群的边车注入需要额外步骤。**_

在私有 GKE 集群中，为 master 访问自动创建的防火墙规则不会打开端口 4000，而 Dapr 需要该端口进行边车注入。

查看相关的防火墙规则：

```bash
$ gcloud compute firewall-rules list --filter="name~gke-${CLUSTER_NAME}-[0-9a-z]*-master"
```

替换现有规则并允许 Kubernetes master 访问端口 4000：

```bash
$ gcloud compute firewall-rules update <firewall-rule-name> --allow tcp:10250,tcp:443,tcp:4000
```

## 获取 `kubectl` 凭据

运行以下命令获取凭据：

```bash
$ gcloud container clusters get-credentials $CLUSTER_NAME \
    --zone $ZONE \
    --project $PROJECT_ID
```

## 安装 Helm v3（可选）

如果您使用 Helm，请安装 [Helm v3 客户端](https://helm.sh/docs/intro/install/)。

{{% alert title="重要" color="warning" %}}
最新的 Dapr Helm chart 不再支持 Helm v2。[从 Helm v2 迁移到 Helm v3](https://helm.sh/blog/migrate-from-helm-v2-to-helm-v3/)。
{{% /alert %}}

## 故障排查

### Kubernetes dashboard 权限

假设您收到类似以下的错误消息：

```
configmaps is forbidden: User "system:serviceaccount:kube-system:kubernetes-dashboard" cannot list configmaps in the namespace "default"
```

执行此命令：

```bash
kubectl create clusterrolebinding kubernetes-dashboard -n kube-system --clusterrole=cluster-admin --serviceaccount=kube-system:kubernetes-dashboard
```

## 相关链接
- [了解更多关于 GKE 集群的信息](https://cloud.google.com/kubernetes-engine/docs)
- [尝试 Dapr 快速入门]({{% ref quickstarts.md %}})
- 了解如何[在集群上部署 Dapr]({{% ref kubernetes-deploy.md %}})
- [在 Kubernetes 上升级 Dapr]({{% ref kubernetes-upgrade.md %}})
- [Kubernetes 生产指南]({{% ref kubernetes-production.md %}})
