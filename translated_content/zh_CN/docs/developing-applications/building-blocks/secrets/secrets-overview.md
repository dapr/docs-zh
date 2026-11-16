---
type: docs
title: "机密管理概览"
linkTitle: "概览"
weight: 1000
description: "机密管理 API 构建块概览"
---

应用程序通常使用专用的机密存储来保存敏感信息。例如，你使用存储在机密存储（如 [AWS Secrets Manager、Azure Key Vault、Hashicorp Vault 等]({{% ref supported-secret-stores %}})）中的连接字符串、密钥、令牌和其他应用级机密，来对数据库、服务和外部系统进行身份验证。

要访问这些机密存储，应用程序需要导入机密存储 SDK，这通常需要大量与业务无关的样板代码。在多云场景中，由于可能会使用不同供应商的机密存储，这一挑战更加突出。

## 机密管理 API

Dapr 专用的机密构建块 API 让开发者更容易从机密存储中获取应用机密。要使用 Dapr 的机密存储构建块，你需要：

1. 为特定的机密存储解决方案设置一个组件。
1. 在应用代码中使用 Dapr 机密 API 检索机密。
1. （可选）在 Dapr 组件文件中引用机密。

[以下概览视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=3bmNSSyIEIVSF-Ej&t=9931)展示了 Dapr 机密管理的工作原理。

{{< youtube id=0y7ne6teHT4 start=9931 >}}

## 功能特性

机密管理 API 构建块为你的应用程序带来了多项功能。

### 无需更改应用代码即可配置机密

你可以在应用代码中调用机密 API，以检索并使用 Dapr 支持的机密存储中的机密。观看[此视频](https://www.youtube.com/watch?v=OtbYCBt9C34&t=1818)，了解如何在应用程序中使用机密管理 API 的示例。

{{< youtube id=OtbYCBt9C34 start=1818 >}}

例如，下图展示了一个应用程序从已配置的云机密存储中，向名为 "vault" 的机密存储请求名为 "mysecret" 的机密。

{{< diagram name="secrets-cloud-stores" width="65" >}}

应用程序还可以使用机密 API 访问 Kubernetes 机密存储中的机密。默认情况下，Dapr 会以 Kubernetes 模式启用内置的 [Kubernetes 机密存储]({{% ref "kubernetes-secret-store" %}})，部署方式如下：

- Helm 默认值，或
- `dapr init -k`

如果你使用其他机密存储，可以通过在 deployment.yaml 文件中添加注解 `dapr.io/disable-builtin-k8s-secret-store: "true"` 来禁用（而非配置）Dapr 的 Kubernetes 机密存储。默认值为 `false`。

在下面的示例中，应用程序从 Kubernetes 机密存储中检索相同的机密 "mysecret"。

{{< diagram name="secrets-kubernetes-store" width="55" >}}

在 Azure 中，你可以配置 Dapr 使用托管身份，通过 Azure Key Vault 进行身份验证来检索机密。在下面的示例中：

1. 配置 [Azure Kubernetes Service (AKS) 群集](https://docs.microsoft.com/azure/aks)以使用托管身份。
1. Dapr 使用 [Pod 标识](https://docs.microsoft.com/azure/aks/operator-best-practices-identity#use-pod-identities)代表应用程序从 Azure Key Vault 检索机密。

{{< diagram name="secrets-azure-aks-keyvault" width="55" >}}

在上面的示例中，应用程序代码无需更改即可获取相同的机密。Dapr 通过机密管理构建块 API 使用机密管理组件。

通过我们的快速入门或教程之一[试用机密 API]({{% ref "#试用机密管理" %}})。

### 在 Dapr 组件中引用机密存储

在配置 Dapr 组件（如状态存储）时，通常需要在组件文件中包含凭证。或者，你也可以将凭证放在 Dapr 支持的机密存储中，并在 Dapr 组件中引用该机密。这是首选方法，也是推荐的最佳实践，尤其是在生产环境中。

在 Kubernetes 中运行，并引用内置 Kubernetes 机密存储中的机密时，如果被引用的机密值发生变化（例如凭证被轮换），Dapr 还会自动重新加载组件，无需重启应用程序。此功能默认启用，由[热重载]({{% ref "component-updates.md#hot-reloading" %}})特性提供支持。

有关更多信息，请阅读[在组件中引用机密存储]({{% ref component-secrets %}})以及[更新被引用的机密]({{% ref "component-secrets.md#updating-referenced-secrets" %}})。

### 限制对机密的访问

为了对机密访问提供更精细的控制，Dapr 支持定义作用域并限制访问权限。了解更多关于[使用机密作用域]({{% ref secrets-scopes %}})的信息。

## 试用机密管理

### 快速入门和教程

想测试 Dapr 机密管理 API？请参阅以下快速入门和教程，了解 Dapr 机密的实际应用：

| 快速入门/教程 | 描述 |
| ------------------- | ----------- |
| [机密管理快速入门]({{% ref secrets-quickstart %}}) | 使用机密管理 API，从已配置的机密存储中在应用代码里检索机密。 |
| [机密存储教程](https://github.com/dapr/quickstarts/tree/master/tutorials/secretstore) | 演示如何使用 Dapr 机密 API 访问机密存储。 |

### 直接在你的应用中开始管理机密

想跳过快速入门？没问题。你可以直接在应用程序中试用机密管理构建块，以检索和管理机密。在[安装 Dapr]({{% ref "getting-started/_index" %}})之后，你可以从[机密操作指南]({{% ref howto-secrets %}})开始使用机密管理 API。

## 后续步骤

- 了解[如何使用机密作用域]({{% ref secrets-scopes %}})。
- 阅读[机密 API 参考文档]({{% ref secrets_api %}})。
