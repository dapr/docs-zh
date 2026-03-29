---
type: docs
title: "如何：使用托管标识"
linkTitle: "如何：使用托管标识"
weight: 40000
aliases:
  - "/zh-hans/developing-applications/integrations/azure/azure-authentication/howto-msi/"
description: "了解如何使用托管标识"
---

使用托管标识时，身份验证会自动进行，因为你的应用程序运行在已启用系统托管标识或用户分配标识的 Azure 服务之上。

要开始使用，你需要在各种 Azure 服务中启用托管标识作为服务选项/功能，这与 Dapr 无关。启用此功能会在底层为 Microsoft Entra ID（以前称为 Azure Active Directory ID）创建一个标识（或应用程序）。

然后，你的 Dapr 服务可以利用该标识与 Microsoft Entra ID 进行身份验证，这一过程是透明的，无需你指定任何凭据。

在本指南中，你将学习如何：
- 通过官方 Azure 文档向你的标识授予对正在使用的 Azure 服务的访问权限
- 在你的组件中设置系统托管标识或用户分配标识

大概就是这么多了。

{{% alert title="注意" color="primary" %}}
在你的组件 YAML 中，仅在使用用户分配标识时才需要 [`azureClientId` 属性]({{% ref "authenticating-azure.md#authenticating-with-managed-identities-mi" %}})。否则，你可以省略此属性以默认使用系统托管标识。
{{% /alert %}}

## 向服务授予权限

为特定的 Azure 资源（由资源范围标识）设置所需的 Microsoft Entra ID 角色分配或自定义权限，以应用于你的系统托管标识或用户分配标识。

你可以将托管标识设置到新的或现有的 Azure 资源上。具体说明取决于所使用的服务。请查看以下官方文档以获取最合适的说明：

- [Azure Kubernetes Service (AKS)](https://docs.microsoft.com/azure/aks/use-managed-identity)
- [Azure Container Apps (ACA)](https://learn.microsoft.com/azure/container-apps/dapr-components?tabpane=yaml#using-managed-identity)
- [Azure App Service](https://docs.microsoft.com/azure/app-service/overview-managed-identity)（包括 Azure Web Apps 和 Azure Functions）
- [Azure Virtual Machines (VM)](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/qs-configure-cli-windows-vm)
- [Azure Virtual Machines Scale Sets (VMSS)](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/qs-configure-cli-windows-vmss)
- [Azure Container Instance (ACI)](https://docs.microsoft.com/azure/container-instances/container-instances-managed-identity)

在将系统托管标识分配给你的 Azure 资源后，你将获得类似以下的凭据：

```json
{
    "principalId": "<object-id>",
    "tenantId": "<tenant-id>",
    "type": "SystemAssigned",
    "userAssignedIdentities": null
}
```

从返回的值中，请注意 **`principalId`** 值，这是[为你的标识创建的服务主体 ID]({{% ref "howto-aad.md#create-a-service-principal" %}})。使用该值授予你的 Azure 资源组件访问该标识的权限。

{{% alert title="Azure Container Apps 中的托管标识" color="primary" %}}
每个容器应用都有完全不同的系统托管标识，这使得在多个应用之间管理所需的角色分配变得非常困难。

相反，_强烈建议_使用用户分配标识并将其附加到所有应加载该组件的应用上。然后，你应该将组件范围限定为这些相同的应用。
{{% /alert %}}

## 在组件中设置标识

默认情况下，Dapr Azure 组件会查找其运行环境的系统托管标识并以此身份进行身份验证。通常，对于给定组件，除了服务名称、存储帐户名称以及 Azure 服务所需的任何其他属性（在文档中列出）之外，使用系统托管标识不需要其他必需属性。

对于用户分配标识，除了所使用服务所需的基本属性外，你还需要在组件中指定 `azureClientId`（用户分配标识 ID）。确保用户分配标识已附加到运行 Dapr 的 Azure 服务上，否则你将无法使用该标识。

{{% alert title="注意" color="primary" %}}
如果边车加载的组件未指定 `azureClientId`，它只会尝试系统分配标识。如果组件指定了 `azureClientId` 属性，它只会尝试具有该 ID 的特定用户分配标识。
{{% /alert %}}

以下示例演示如何在 Azure KeyVault secrets 组件中设置系统托管标识或用户分配标识。

{{< tabpane text=true >}}

 <!-- system managed -->
{{% tab "系统托管" %}}

如果你使用 Azure KeyVault 组件设置系统托管标识，YAML 将如下所示：

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: mykeyvault
```

在此示例中，系统托管标识会查找服务标识并与 `mykeyvault` 保管库通信。接下来，向你的系统托管标识授予对所需服务的访问权限。

{{% /tab %}}

 <!-- user assigned -->
{{% tab "用户分配" %}}

如果你使用 Azure KeyVault 组件设置用户分配标识，YAML 将如下所示：

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: mykeyvault
  - name: azureClientId
    value: someAzureIdentityClientIDHere
```

一旦你使用 `azureClientId` 属性设置了组件 YAML，你就可以向你的用户分配标识授予对服务的访问权限。

{{% /tab %}}

 <!-- k8s -->
{{% tab "Kubernetes" %}}

对于 Kubernetes 或 AKS 中的组件配置，请参阅 [Workload Identity 指南。](https://learn.microsoft.com/azure/aks/workload-identity-overview?tabpane=dotnet)

{{% /tab %}}

{{< /tabpane >}}

## 故障排除

如果你收到错误或托管标识未按预期工作，请检查以下项目是否为真：

- 系统托管标识或用户分配标识在目标资源上没有所需的权限。
- 用户分配标识未附加到正在加载组件的 Azure 服务（容器应用或 Pod）。这种情况特别可能发生在：
  - 你有一个未限定范围的组件（一个由环境中所有容器应用或 AKS 集群中所有部署加载的组件）。
  - 你只将用户分配标识附加到一个容器应用或 AKS 中的一个部署（使用 [Azure Workload Identity](https://learn.microsoft.com/azure/aks/workload-identity-overview?tabpane=dotnet)）。
  
  在此场景中，由于标识未附加到 AKS 中的每个其他容器应用或部署，因此通过 `azureClientId` 引用用户分配标识的组件会失败。

> **最佳实践：** 使用用户分配标识时，请务必将组件范围限定到特定应用！

## 后续步骤

{{< button text="参考 Azure 组件规范 >>" page="components-reference.md" >}}
