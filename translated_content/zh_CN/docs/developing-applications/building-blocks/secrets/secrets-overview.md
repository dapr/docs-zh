---
type: docs
title: "密钥管理概览"
linkTitle: "概览"
weight: 1000
description: "密钥管理 API 构建块概览"
---

应用程序通常使用专用的密钥存储来存储敏感信息。例如，你使用存储在密钥存储（如 [AWS Secrets Manager、Azure Key Vault、Hashicorp Vault 等]({{% ref supported-secret-stores %}})）中的连接字符串、密钥、令牌和其他应用级密钥来对数据库、服务和外部系统进行身份验证。

要访问这些密钥存储，应用程序需要导入密钥存储 SDK，这通常需要大量无关的样板代码。在多云场景中，这会带来更大的挑战，因为可能会使用不同供应商特定的密钥存储。

## 密钥管理 API

Dapr 专用的密钥构建块 API 使开发者更容易从密钥存储中消费应用密钥。要使用 Dapr 的密钥存储构建块，你需要：

1. 为特定的密钥存储解决方案设置一个组件。
1. 在应用代码中使用 Dapr 密钥 API 检索密钥。
1. （可选）在 Dapr 组件文件中引用密钥。

[以下概览视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=3bmNSSyIEIVSF-Ej&t=9931)展示了 Dapr 密钥管理的工作原理。

{{< youtube id=0y7ne6teHT4 start=9931 >}}

## 功能特性

密钥管理 API 构建块为你的应用程序带来了多项功能。

### 无需更改应用代码即可配置密钥

你可以在应用代码中调用密钥 API 来检索和使用来自 Dapr 支持的密钥存储的密钥。观看[此视频](https://www.youtube.com/watch?v=OtbYCBt9C34&t=1818)，了解如何在你的应用程序中使用密钥管理 API 的示例。

{{< youtube id=OtbYCBt9C34 start=1818 >}}

例如，下图显示了一个应用程序从名为"vault"的密钥存储中请求名为"mysecret"的密钥，该密钥存储来自已配置的云密钥存储。

<img src="/images/secrets-overview-cloud-stores.png" width=600>

应用程序还可以使用密钥 API 访问 Kubernetes 密钥存储中的密钥。默认情况下，Dapr 在 Kubernetes 模式下启用内置的 [Kubernetes 密钥存储]({{% ref "kubernetes-secret-store" %}})，通过以下方式部署：

- Helm 默认值，或
- `dapr init -k`

如果你使用其他密钥存储，可以通过在 deployment.yaml 文件中添加注解 `dapr.io/disable-builtin-k8s-secret-store: "true"` 来禁用（不配置）Dapr Kubernetes 密钥存储。默认值为 `false`。

在下面的示例中，应用程序从 Kubernetes 密钥存储中检索相同的密钥"mysecret"。

<img src="/images/secrets-overview-kubernetes-store.png" width=600>

在 Azure 中，你可以配置 Dapr 使用托管身份通过 Azure Key Vault 进行身份验证来检索密钥。在下面的示例中：

1. 配置 [Azure Kubernetes Service (AKS) 群集](https://docs.microsoft.com/azure/aks)以使用托管身份。
1. Dapr 使用 [Pod 标识](https://docs.microsoft.com/azure/aks/operator-best-practices-identity#use-pod-identities)代表应用程序从 Azure Key Vault 检索密钥。

<img src="/images/secrets-overview-azure-aks-keyvault.png" width=600>

在上面的示例中，应用程序代码无需更改即可获取相同的密钥。Dapr 通过密钥管理构建块 API 使用密钥管理组件。

使用我们的快速入门或教程之一[试用密钥 API]({{% ref "#try-out-secrets-management" %}})。

### 在 Dapr 组件中引用密钥存储

在配置 Dapr 组件（如状态存储）时，通常需要在组件文件中包含凭证。或者，你可以将凭证放在 Dapr 支持的密钥存储中，并在 Dapr 组件中引用该密钥。这是首选方法，也是推荐的最佳实践，尤其是在生产环境中。

有关更多信息，请阅读[在组件中引用密钥存储]({{% ref component-secrets %}})。

### 限制对密钥的访问

为了对密钥访问提供更精细的控制，Dapr 提供了定义作用域和限制访问权限的功能。了解有关[使用密钥作用域]({{% ref secrets-scopes %}})的更多信息。

## 试用密钥管理

### 快速入门和教程

想要测试 Dapr 密钥管理 API？通过以下快速入门和教程了解 Dapr 密钥的实际应用：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [密钥管理快速入门]({{% ref secrets-quickstart %}}) | 使用密钥管理 API 从已配置的密钥存储在应用代码中检索密钥。 |
| [密钥存储教程](https://github.com/dapr/quickstarts/tree/master/tutorials/secretstore) | 演示如何使用 Dapr 密钥 API 访问密钥存储。 |

### 直接在你的应用中开始管理密钥

想跳过快速入门？没问题。你可以直接在你的应用程序中试用密钥管理构建块来检索和管理密钥。在[安装 Dapr]({{% ref "getting-started/_index" %}})后，你可以从[密钥操作指南]({{% ref howto-secrets %}})开始使用密钥管理 API。

## 后续步骤

- 了解[如何使用密钥作用域]({{% ref secrets-scopes %}})。
- 阅读[密钥 API 参考文档]({{% ref secrets_api %}})。
