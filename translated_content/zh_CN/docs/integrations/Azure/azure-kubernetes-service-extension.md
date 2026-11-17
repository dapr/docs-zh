---
type: docs
title: "Azure Kubernetes Service (AKS) 的 Dapr 扩展"
linkTitle: "Azure Kubernetes Service (AKS) 的 Dapr 扩展"
description: "使用 Dapr 扩展在你的 Azure Kubernetes Service (AKS) 集群上部署 Dapr"
weight: 4000
aliases:
  - /zh-hans/developing-applications/integrations/azure/azure-kubernetes-service-extension/
---

在 AKS 上安装 Dapr 的推荐方式是使用 AKS Dapr extension。该扩展提供以下功能：
- 通过 Azure CLI 的命令行参数支持所有原生 Dapr 配置功能
- 可选择启用 Dapr 运行时的自动次版本升级

{{% alert title="注意" color="warning" %}}
如果你通过 AKS 扩展安装 Dapr，最佳实践是之后继续使用该扩展管理 Dapr，_而不是 Dapr CLI_。同时使用这两种工具可能会产生冲突，导致非预期的行为。
{{% /alert %}}

使用 AKS Dapr extension 的前提条件：
- [Azure 订阅](https://azure.microsoft.com/free/?WT.mc_id=A261C142F)
- [最新版本的 Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- [现有的 AKS 集群](https://learn.microsoft.com/azure/aks/tutorial-kubernetes-deploy-cluster)
- [Azure Kubernetes Service RBAC 管理员角色](https://learn.microsoft.com/azure/role-based-access-control/built-in-roles#azure-kubernetes-service-rbac-admin)

{{< button text="了解有关 AKS Dapr 扩展的更多信息" link="https://learn.microsoft.com/azure/aks/dapr" >}}
