---
type: docs
title: "适用于 Azure Kubernetes Service (AKS) 的 Dapr 扩展"
linkTitle: "适用于 Azure Kubernetes Service (AKS) 的 Dapr 扩展"
description: "使用 Dapr 扩展在你的 Azure Kubernetes Service (AKS) 集群上配置 Dapr"
weight: 4000
---

在 AKS 上安装 Dapr 的推荐方法是使用 AKS Dapr 扩展。该扩展提供以下功能：
- 通过 Azure CLI 命令行参数支持所有原生 Dapr 配置功能
- 可选择启用 Dapr 运行时的自动次版本升级

{{% alert title="注意" color="warning" %}}
如果你通过 AKS 扩展安装 Dapr，最佳实践是继续使用该扩展进行 Dapr 的未来管理，_而不是使用 Dapr CLI_。同时使用这两种工具可能会导致冲突并产生意外行为。
{{% /alert %}}

使用 AKS 的 Dapr 扩展的前提条件：
- [Azure 订阅](https://azure.microsoft.com/free/?WT.mc_id=A261C142F)
- [最新版本的 Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [现有的 AKS 集群](https://learn.microsoft.com/azure/aks/tutorial-kubernetes-deploy-cluster)
- [Azure Kubernetes Service RBAC 管理员角色](https://learn.microsoft.com/azure/role-based-access-control/built-in-roles#azure-kubernetes-service-rbac-admin)

{{< button text="详细了解适用于 AKS 的 Dapr 扩展" link="https://learn.microsoft.com/azure/aks/dapr" >}}
