---
type: docs
title: "如何：使用托管标识"
linkTitle: "如何：使用托管标识"
weight: 40000
aliases:
  - "/zh-hans/developing-applications/integrations/azure/azure-authentication/howto-msi/"
  - "/zh-hans/developing-applications/integrations/azure/azure-authentication/howto-mi/"
description: "了解如何使用托管标识"
---

使用托管标识时，只要你的应用运行在具有系统托管或用户分配标识的 Azure 服务上，身份验证就会自动完成。

要开始使用，你需要在各个 Azure 服务中将托管标识作为服务选项或功能启用，这一步与 Dapr 无关。启用后，会在底层为 Microsoft Entra ID（前称 Azure Active Directory ID）创建一个标识（或应用程序）。

之后，你的 Dapr 服务即可利用该标识向 Microsoft Entra ID 进行身份验证，无需你指定任何凭据，过程完全透明。

在本指南中，你将学习如何：
- 按照 Azure 官方文档，为你所使用的 Azure 服务授予该标识权限
- 在你的组件中设置系统托管标识或用户分配标识

基本就是这些内容。

{{% alert title="注意" color="primary" %}}
在组件 YAML 中，只有在使用用户分配标识时才需要 [`azureClientId` 属性]({{% ref "authenticating-azure.md#authenticating-with-managed-identities-mi" %}})。否则，对于系统托管标识，可以省略该属性，系统会默认使用它。
{{% /alert %}}

## 授予服务访问权限

为你的系统托管标识或用户分配标识，针对某个特定 Azure 资源（由资源范围指定）设置所需的 Microsoft Entra ID 角色分配或自定义权限。

你可以为新建或已有的 Azure 资源设置托管标识。具体步骤取决于所用的服务。请查阅以下官方文档，找到最合适的说明：

- [Azure Kubernetes Service (AKS)](https://docs.microsoft.com/azure/aks/use-managed-identity)
- [Azure Container Apps (ACA)](https://learn.microsoft.com/azure/container-apps/dapr-components?tabpane=yaml#using-managed-identity)
- [Azure App Service](https://docs.microsoft.com/azure/app-service/overview-managed-identity)（包括 Azure Web Apps 和 Azure Functions）
- [Azure Virtual Machines (VM)](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/qs-configure-cli-windows-vm)
- [Azure Virtual Machines Scale Sets (VMSS)](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/qs-configure-cli-windows-vmss)
- [Azure Container Instance (ACI)](https://docs.microsoft.com/azure/container-instances/container-instances-managed-identity)

为 Azure 资源分配系统托管标识后，你将获得类似下面的凭据：

```json
{
    "principalId": "<object-id>",
    "tenantId": "<tenant-id>",
    "type": "SystemAssigned",
    "userAssignedIdentities": null
}
```

从返回的值中记下 **`principalId`** 的值，它就是[为你的标识创建的服务主体 ID]({{% ref "howto-aad.md#create-a-service-principal" %}})。请使用该值为你的 Azure 资源授予访问此标识的权限，以便组件能够访问它。

{{% alert title="Azure Container Apps 中的托管标识" color="primary" %}}
每个容器应用都有各自完全不同的系统托管标识，要在多个应用之间处理所需的角色分配，管理起来非常困难。

因此，_强烈建议_改用用户分配标识，并将其附加到所有需要加载该组件的应用上。然后，将该组件的作用范围限定为这些相同的应用。
{{% /alert %}}

## 在组件中设置标识

默认情况下，Dapr 的 Azure 组件会查找其运行环境的系统托管标识，并以该标识进行身份验证。通常，对于某个组件，使用系统托管标识时，除了服务名称、存储帐户名称以及 Azure 服务所要求的其他属性（见文档列出的内容）之外，没有其他必填属性。

对于用户分配标识，除了你所用服务所需的基本属性外，还需要在组件中指定 `azureClientId`（即用户分配标识的 ID）。请确保该用户分配标识已附加到 Dapr 所运行的 Azure 服务上，否则将无法使用该标识。

{{% alert title="注意" color="primary" %}}
如果边车加载了一个未指定 `azureClientId` 的组件，它只会尝试系统分配标识。如果组件指定了 `azureClientId` 属性，它则只会尝试该 ID 对应的特定用户分配标识。
{{% /alert %}}

以下示例演示了如何在 Azure KeyVault secrets 组件中设置系统托管标识或用户分配标识。

{{< tabpane text=true >}}

 <!-- system managed -->
{{% tab "系统托管" %}}

如果你使用 Azure KeyVault 组件设置系统托管标识，YAML 会如下所示：

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

在此示例中，系统托管标识会查找服务标识，并与 `mykeyvault` 密钥保管库通信。接下来，请为你的系统托管标识授予访问所需服务的权限。

{{% /tab %}}

 <!-- user assigned -->
{{% tab "用户分配" %}}

如果你使用 Azure KeyVault 组件设置用户分配标识，YAML 会如下所示：

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

在组件 YAML 中设置好 `azureClientId` 属性后，即可为你的用户分配标识授予访问服务的权限。

{{% /tab %}}

 <!-- k8s -->
{{% tab "Kubernetes" %}}

关于 Kubernetes 或 AKS 中的组件配置，请参阅 [工作负载身份指南。](https://learn.microsoft.com/azure/aks/workload-identity-overview?tabpane=dotnet)

{{% /tab %}}

{{< /tabpane >}}

## 故障排除

如果你收到错误，或者托管标识未按预期工作，请检查以下各项是否成立：

- 系统托管标识或用户分配标识在目标资源上没有所需的权限。
- 用户分配标识没有附加到你加载该组件的 Azure 服务（容器应用或 Pod）上。这种情况尤其可能发生在以下场景中：
  - 你使用了未限定作用范围的组件（即由环境中的所有容器应用，或 AKS 集群中的所有部署加载的组件）。
  - 你只将用户分配标识附加到了一个容器应用或 AKS 中的一个部署上（使用 [Azure 工作负载身份](https://learn.microsoft.com/azure/aks/workload-identity-overview?tabpane=dotnet)）。

  在这种情况下，由于该标识并未附加到 AKS 中的其他每个容器应用或部署上，通过 `azureClientId` 引用该用户分配标识的组件会失败。

> **最佳实践：** 使用用户分配标识时，请确保将组件的作用范围限定到特定应用！

## 后续步骤

{{< button text="参阅 Azure 组件规范 >>" page="components-reference.md" >}}
