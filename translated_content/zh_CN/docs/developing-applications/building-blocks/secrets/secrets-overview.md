---
type: docs
title: "Secrets management overview"
linkTitle: "概览"
weight: 1000
description: "Secrets management API building block 概述"
---

应用程序通常使用专用的 secret store 来保存敏感信息。例如，你使用存储在 secret store（如 [AWS Secrets Manager、Azure Key Vault、Hashicorp Vault 等]({{% ref supported-secret-stores %}})）中的连接字符串、密钥、令牌和其他应用级 secrets，来对数据库、服务和外部系统进行身份验证。

要访问这些 secret store，应用程序需要导入 secret store SDK，这通常需要大量与业务无关的样板代码。在多云场景中，由于可能会使用不同供应商的 secret store，这一挑战更加突出。

## Secrets Management API

Dapr 专用的 secrets building block API 让开发者更容易从 secret store 中获取应用 secrets。要使用 Dapr 的 secret store building block，你需要：

1. 为特定的 secret store 解决方案设置一个 component。
1. 在应用代码中使用 Dapr secrets API 检索 secrets。
1. （可选）在 Dapr component 文件中引用 secrets。

[以下概览视频和演示](https://www.youtube.com/live/0y7ne6teHT4?si=3bmNSSyIEIVSF-Ej&t=9931)展示了 Dapr Secrets Management 的工作原理。

{{< youtube id=0y7ne6teHT4 start=9931 >}}

## 功能特性

Secrets Management API building block 为你的应用程序带来了多项功能。

### 无需更改应用代码即可配置 secrets

你可以在应用代码中调用 secrets API，以检索并使用 Dapr 支持的 secret store 中的 secrets。观看[此视频](https://www.youtube.com/watch?v=OtbYCBt9C34&t=1818)，了解如何在应用程序中使用 Secrets Management API 的示例。

{{< youtube id=OtbYCBt9C34 start=1818 >}}

例如，下图展示了一个应用程序从已配置的云 secret store 中，向名为 "vault" 的 secret store 请求名为 "mysecret" 的 secret。

{{< diagram name="secrets-cloud-stores" width="65" >}}

应用程序还可以使用 secrets API 访问 Kubernetes secret store 中的 secrets。默认情况下，Dapr 会以 Kubernetes 模式启用内置的 [Kubernetes secret store]({{% ref "kubernetes-secret-store" %}})，部署方式如下：

- Helm 默认值，或
- `dapr init -k`

如果你使用其他 secret store，可以通过在 deployment.yaml 文件中添加注解 `dapr.io/disable-builtin-k8s-secret-store: "true"` 来禁用（而非配置）Dapr 的 Kubernetes secret store。默认值为 `false`。

在下面的示例中，应用程序从 Kubernetes secret store 中检索相同的 secret "mysecret"。

{{< diagram name="secrets-kubernetes-store" width="55" >}}

在 Azure 中，你可以配置 Dapr 使用托管身份，通过 Azure Key Vault 进行身份验证来检索 secrets。在下面的示例中：

1. 配置 [Azure Kubernetes Service (AKS) 群集](https://docs.microsoft.com/azure/aks)以使用托管身份。
1. Dapr 使用 [Pod 标识](https://docs.microsoft.com/azure/aks/operator-best-practices-identity#use-pod-identities)代表应用程序从 Azure Key Vault 检索 secrets。

{{< diagram name="secrets-azure-aks-keyvault" width="55" >}}

在上面的示例中，应用程序代码无需更改即可获取相同的 secret。Dapr 通过 Secrets Management building block API 使用 secret management component。

通过我们的 Quickstart 或教程之一[试用 secrets API]({{% ref "#try-out-secrets-management" %}})。

### 在 Dapr component 中引用 secret store

在配置 Dapr component（如 state store）时，通常需要在 component 文件中包含凭证。或者，你也可以将凭证放在 Dapr 支持的 secret store 中，并在 Dapr component 中引用该 secret。这是首选方法，也是推荐的最佳实践，尤其是在生产环境中。

在 Kubernetes 中运行，并引用内置 Kubernetes secret store 中的 secrets 时，如果被引用的 secret 值发生变化（例如凭证被轮换），Dapr 还会自动重新加载 component，无需重启应用程序。此功能默认启用，由[热重载]({{% ref "component-updates.md#hot-reloading" %}})特性提供支持。

有关更多信息，请阅读[在 component 中引用 secret store]({{% ref component-secrets %}})以及[更新被引用的 secrets]({{% ref "component-secrets.md#updating-referenced-secrets" %}})。

### 限制对 secrets 的访问

为了对 secrets 的访问提供更精细的控制，Dapr 支持定义作用域并限制访问权限。了解更多关于[使用 secret scoping]({{% ref secrets-scopes %}})的信息。

## 试用 Secrets Management

{{< dapr-university-track track="dapr-secrets" position="middle" >}}

### Quickstart 和教程

想测试 Dapr Secrets Management API？请参阅以下 Quickstart 和教程，了解 Dapr secrets 的实际应用：

| Quickstart/教程 | 描述 |
| ------------------- | ----------- |
| [Secrets Management Quickstart]({{% ref secrets-quickstart %}}) | 使用 Secrets Management API，从已配置的 secret store 中在应用代码里检索 secrets。 |
| [Secret Store 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/secretstore) | 演示如何使用 Dapr secrets API 访问 secret store。 |

### 直接在你的应用中开始管理 secrets

想跳过 Quickstart？没问题。你可以直接在应用程序中试用 Secrets Management building block，以检索和管理 secrets。在[安装 Dapr]({{% ref "getting-started/_index" %}})之后，你可以从[secrets 操作指南]({{% ref howto-secrets %}})开始使用 Secrets Management API。

## 后续步骤

- 了解[如何使用 secret scoping]({{% ref secrets-scopes %}})。
- 阅读[secrets API 参考文档]({{% ref secrets_api %}})。
