---
type: docs
title: "设置 Azure Kubernetes Service (AKS) 集群"
linkTitle: "Azure Kubernetes Service (AKS)"
weight: 2000
description: >
  了解如何设置 Azure Kubernetes 集群
---

本指南将引导您完成安装 Azure Kubernetes Service (AKS) 集群的过程。如需更多信息，请参阅[快速入门：使用 Azure CLI 部署 AKS 集群](https://docs.microsoft.com/azure/aks/kubernetes-walkthrough)

## 前置条件

- 安装：
   - [Docker](https://docs.docker.com/install/)
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
   - [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)

## 部署 AKS 集群

1. 在终端中，登录到 Azure。

   ```bash
   az login
   ```

1. 设置您的默认订阅：

   ```bash
   az account set -s [your_subscription_id]
   ```

1. 创建资源组。

   ```bash
   az group create --name [your_resource_group] --location [region]
   ```

1. 创建 AKS 集群。若要使用特定版本的 Kubernetes，请使用 `--kubernetes-version`（需要 1.13.x 或更新版本）。

   ```bash
   az aks create --resource-group [your_resource_group] --name [your_aks_cluster_name] --location [region] --node-count 2 --enable-app-routing --generate-ssh-keys
   ```

1. 获取 AKS 集群的访问凭据。

   ```bash
   az aks get-credentials -n [your_aks_cluster_name] -g [your_resource_group]
   ```

## AKS Edge Essentials
若要使用 Azure Kubernetes Service (AKS) Edge Essentials 创建单机 K8s/K3s 仅 Linux 集群，您可以参阅[AKS Edge Essentials 快速入门指南](https://learn.microsoft.com/azure/aks/hybrid/aks-edge-quickstart)。

{{% alert title="注意" color="primary" %}}
AKS Edge Essentials 默认不提供存储类，这可能会导致部署 Dapr 时出现问题。为避免此问题，请确保在部署 Dapr 之前在集群上启用 **local-path-provisioner** 存储类。如需更多信息，请参阅[AKS EE 上的 Local Path Provisioner](https://learn.microsoft.com/azure/aks/hybrid/aks-edge-howto-use-storage-local-path)。
{{% /alert %}}

## 相关链接

- 了解有关[适用于 AKS 的 Dapr 扩展]({{% ref azure-kubernetes-service-extension %}}) 的更多信息
   - [安装适用于 AKS 的 Dapr 扩展](https://learn.microsoft.com/azure/aks/dapr)
   - [配置适用于 AKS 的 Dapr 扩展](https://learn.microsoft.com/azure/aks/dapr-settings)
   - [使用适用于 AKS 的 Dapr 扩展部署和运行工作流](https://learn.microsoft.com/azure/aks/dapr-workflow)
