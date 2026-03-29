---
type: docs
title: "如何使用工作负载身份联合"
linkTitle: "如何使用工作负载身份联合"
weight: 20000
description: "了解如何配置 Dapr 在 Azure 上使用工作负载身份联合。"
---

本指南将帮助你配置 Kubernetes 集群，以在 Azure 上运行 Dapr 并使用工作负载身份联合。

## 它是什么？

[工作负载身份联合](https://learn.microsoft.com/entra/workload-id/workload-identities-overview) 是一种让应用程序向 Azure 进行身份验证的方式，无需在发布过程中存储或管理凭据。

通过使用工作负载身份联合，任何在 Kubernetes 和 AKS 上运行并面向 Azure 的 Dapr 组件都可以透明地进行身份验证，无需额外配置。

## 指南

我们将演示如何针对 AKS 集群配置 Azure Key Vault 资源。你可以根据需要调整本指南，将其应用于不同的 Dapr Azure 组件。

在本操作指南中，我们将使用此 [Dapr AKS secrets 示例应用](https://github.com/dapr/samples/dapr-aks-workload-identity-federation)。

### 前提条件

 - 已启用工作负载身份的 AKS 集群
 - Microsoft Entra ID 租户

### 1 - 启用工作负载身份联合

按照 [在 AKS 集群上启用工作负载身份联合的 Azure 文档](https://learn.microsoft.com/azure/aks/workload-identity-deploy-cluster#deploy-your-application4) 进行操作。

该操作指南将引导你配置 Azure Entra ID 租户以信任来自 AKS 集群颁发者的身份。它还会指导你设置一个 [Kubernetes 服务账户](https://kubernetes.io/docs/concepts/security/service-accounts/)，该账户与你创建的 Azure 托管标识相关联。

完成后，返回此处继续执行步骤 2。

### 2 - 向 Azure Key Vault 添加密钥

在你创建的 Azure Key Vault 中，添加一个名为 `dapr` 的密钥，其值为 `Hello Dapr!`。

### 3 - 配置 Azure Key Vault dapr 组件

此时，你应该拥有一个名称类似于 `workload-identity-sa0a1b2c` 的 Kubernetes 服务账户。

将以下内容应用到你的 Kubernetes 集群，记得将 `your-key-vault` 替换为你的密钥保管库名称：

```yaml
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: demo-secret-store # 请勿更改此名称，我们的应用将查找它。
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: your-key-vault # 替换
```

你会注意到，我们在组件定义中没有提供任何与身份验证相关的详细信息。这是有意为之，因为 Dapr 能够利用 Kubernetes 服务账户向 Azure 进行透明身份验证。

### 4 - 部署测试应用程序

前往 [工作负载身份联合示例应用程序](https://github.com/dapr/samples/dapr-aks-workload-identity-federation) 并准备镜像的构建。

确保镜像已推送到你的 AKS 集群可见并有权拉取的注册表。

接下来，为我们的示例 AKS secrets 应用容器创建一个部署，同时包含一个 Dapr 边车。

记得将 `dapr-wif-k8s-service-account` 替换为你的服务账户名称，将 `dapraksworkloadidentityfederation` 替换为你的集群可以解析的镜像：


```yaml
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: aks-dapr-wif-secrets
  labels:
    app: aks-dapr-wif-secrets
spec:
  replicas: 1
  selector:
    matchLabels:
      app: aks-dapr-wif-secrets
  template:
    metadata:
      labels:
        app: aks-dapr-wif-secrets
        azure.workload.identity/use: "true" # 重要
      annotations:
        dapr.io/enabled: "true" # 启用 Dapr
        dapr.io/app-id: "aks-dapr-wif-secrets"
    spec:
      serviceAccountName: dapr-wif-k8s-service-account # 记得替换
      containers:
        - name: workload-id-demo
          image: dapraksworkloadidentityfederation # 记得替换
          imagePullPolicy: Always
```
应用程序启动并运行后，应该输出以下内容：

```
Fetched Secret: Hello dapr!
```
