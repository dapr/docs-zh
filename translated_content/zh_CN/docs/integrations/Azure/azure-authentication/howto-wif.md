---
type: docs
title: "操作指南：使用工作负载身份联合"
linkTitle: "操作指南：使用工作负载身份联合"
weight: 20000
description: "了解如何配置 Dapr 在 Azure 上使用工作负载身份联合。"
aliases:
  - /zh-hans/developing-applications/integrations/azure/azure-authentication/howto-wif/
---

本指南将帮助你配置 Kubernetes 集群，以便使用 Azure 工作负载身份联合运行 Dapr。

## 这是什么？

[工作负载身份联合](https://learn.microsoft.com/entra/workload-id/workload-identities-overview)是一种让应用程序向 Azure 进行身份验证的方式，无需将凭据作为发布流程的一部分进行存储或管理。

通过使用工作负载身份联合，任何在 Kubernetes 和 AKS 上运行、面向 Azure 的 Dapr component 都可以透明地完成身份验证，无需任何额外配置。

## 指南

我们将演示如何为你的 AKS 集群配置 Azure 密钥保管库资源。你可以根据需要替换 component 定义，将本指南用于其他 Dapr Azure component。

本操作指南将使用这个 [Dapr AKS secrets 示例应用](https://github.com/dapr/samples/dapr-aks-workload-identity-federation)。

### 前提条件

- 已启用工作负载身份的 AKS 集群
- Microsoft Entra ID 租户

### 1 - 启用工作负载身份联合

请按照 [Azure 文档中在 AKS 集群上启用工作负载身份联合的说明](https://learn.microsoft.com/azure/aks/workload-identity-deploy-cluster#deploy-your-application4)操作。

本操作指南将引导你配置 Azure Entra ID 租户，使其信任源自 AKS 集群颁发者的身份。此外，它还会引导你设置一个与你创建的 Azure 托管标识关联的 [Kubernetes service account](https://kubernetes.io/docs/concepts/security/service-accounts/)。

完成后，请返回此处继续第 2 步。

### 2 - 向 Azure 密钥保管库添加 secret

在你创建的 Azure 密钥保管库中，添加一个名为 `dapr`、值为 `Hello Dapr!` 的 secret。

### 3 - 配置 Azure 密钥保管库 dapr component

至此，你应该已有一个名称类似 `workload-identity-sa0a1b2c` 的 Kubernetes service account。

将以下内容应用到你的 Kubernetes 集群，并记得将 `your-key-vault` 更新为你的密钥保管库名称：

```yaml
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: demo-secret-store # 请勿更改此名称，因为我们的应用会查找该名称。
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: your-key-vault # 请替换
```

你会注意到，component 定义中没有提供任何与身份验证相关的具体细节。这是有意为之，因为 Dapr 能够利用 Kubernetes service account 透明地向 Azure 进行身份验证。

### 4 - 部署测试应用

前往 [工作负载身份联合示例应用](https://github.com/dapr/samples/dapr-aks-workload-identity-federation)，并构建该应用的镜像。

请确保将镜像推送到你的 AKS 集群可以访问且有权拉取的镜像仓库中。

接下来，创建一个 Deployment，同时包含示例 AKS secrets 应用容器和 Dapr sidecar。

请记得将 `dapr-wif-k8s-service-account` 更新为你的 service account 名称，并将 `dapraksworkloadidentityfederation` 更新为集群可以解析的镜像：


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
      serviceAccountName: dapr-wif-k8s-service-account # 请替换
      containers:
        - name: workload-id-demo
          image: dapraksworkloadidentityfederation # 请替换
          imagePullPolicy: Always
```
应用启动并运行后，应输出以下内容：

```
Fetched Secret: Hello dapr!
```
