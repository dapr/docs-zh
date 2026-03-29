---
type: docs
title: "Azure Key Vault secret store"
linkTitle: "Azure Key Vault"
description: 关于 Azure Key Vault secret store 组件的详细信息
aliases:
  - "/operations/components/setup-secret-store/supported-secret-stores/azure-keyvault/"
---

## 组件格式

要设置 Azure Key Vault secret store，需创建一个类型为 `secretstores.azure.keyvault` 的组件。
- 请参阅 [secret store 组件指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}}) 了解如何创建和应用 secret store 配置。
- 请参阅 [引用 secret 指南]({{% ref component-secrets.md %}}) 以使用 Dapr 组件检索和使用 secret。
- 请参阅下方的 [配置组件部分](#configure-the-component)。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName # Required
    value: [your_keyvault_name]
  - name: azureEnvironment # Optional, defaults to AZUREPUBLICCLOUD
    value: "AZUREPUBLICCLOUD"
  # See authentication section below for all options
  - name: azureTenantId
    value: "[your_service_principal_tenant_id]"
  - name: azureClientId
    value: "[your_service_principal_app_id]"
  - name: azureCertificateFile
    value : "[pfx_certificate_file_fully_qualified_local_path]"
```

## 使用 Microsoft Entra ID 进行身份验证

Azure Key Vault secret store 组件仅支持使用 Microsoft Entra ID 进行身份验证。在启用此组件之前：
1. 阅读 [向 Azure 进行身份验证]({{% ref authenticating-azure.md %}}) 文档。
1. 创建一个 Microsoft Entra ID 应用程序（也称为服务主体）。
1. 或者，为你的应用程序平台创建一个托管标识。

## 规范元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| `vaultName` | Y | Azure Key Vault 的名称 | `"mykeyvault"` |
| `azureEnvironment` | N | 如果使用不同的 Azure 云，则为 Azure 环境的可选名称 | `"AZUREPUBLICCLOUD"`（默认值）、`"AZURECHINACLOUD"`、`"AZUREUSGOVERNMENTCLOUD"`、`"AZUREGERMANCLOUD"` |
| Auth metadata | | 有关更多信息，请参阅 [向 Azure 进行身份验证]({{% ref authenticating-azure.md %}})

此外，你必须提供 [向 Azure 进行身份验证]({{% ref authenticating-azure.md %}}) 文档中说明的身份验证字段。

## 可选的按请求元数据属性

从此 secret store 检索 secret 时，可以提供以下 [可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

Query Parameter | Description
--------- | -----------
`metadata.version_id` | 给定 secret 密钥的版本。
`metadata.maxresults` |（仅用于批量请求）要返回的 secret 数量，超过后将截断请求。

## 示例

### 先决条件

- Azure 订阅
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [jq](https://stedolan.github.io/jq/download/)
- 你正在使用 bash 或 zsh shell
- 你已按照 [向 Azure 进行身份验证]({{% ref authenticating-azure.md %}}) 中的说明创建了 Microsoft Entra ID 应用程序（服务主体）。你需要以下值：

   | Value | Description |
   | ----- | ----------- |
   | `SERVICE_PRINCIPAL_ID` | 你为给定应用程序创建的服务主体的 ID |

### 创建 Azure Key Vault 并为服务主体授权

1. 设置一个包含你创建的服务主体的变量：

  ```sh
  SERVICE_PRINCIPAL_ID="[your_service_principal_object_id]"
  ```

1. 设置一个用于创建所有资源的位置的变量：

  ```sh
  LOCATION="[your_location]"
  ```

  （你可以通过以下命令获取完整的选项列表：`az account list-locations --output tsv`）

1. 创建一个资源组，并给它取一个你喜欢的名称：

  ```sh
  RG_NAME="[resource_group_name]"
  RG_ID=$(az group create \
    --name "${RG_NAME}" \
    --location "${LOCATION}" \
    | jq -r .id)
  ```

1. 创建一个使用 Azure RBAC 进行授权的 Azure Key Vault：

  ```sh
  KEYVAULT_NAME="[key_vault_name]"
  az keyvault create \
    --name "${KEYVAULT_NAME}" \
    --enable-rbac-authorization true \
    --resource-group "${RG_NAME}" \
    --location "${LOCATION}"
  ```

1. 使用 RBAC 为 Microsoft Entra ID 应用程序分配角色，以便它可以访问 Key Vault。
  在本例中，分配 "Key Vault Secrets User" 角色，该角色具有对 Azure Key Vault 的 "Get secrets" 权限。

  ```sh
  az role assignment create \
    --assignee "${SERVICE_PRINCIPAL_ID}" \
    --role "Key Vault Secrets User" \
    --scope "${RG_ID}/providers/Microsoft.KeyVault/vaults/${KEYVAULT_NAME}"
  ```

根据你的应用程序，可以使用其他限制较少的角色，例如 "Key Vault Secrets Officer" 和 "Key Vault Administrator"。[请参阅 Microsoft Docs 以了解有关 Key Vault 的 Azure 内置角色的更多信息](https://docs.microsoft.com/azure/key-vault/general/rbac-guide?tabpane=azure-cli#azure-built-in-roles-for-key-vault-data-plane-operations)。

### 配置组件

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

#### 使用客户端密钥

要使用**客户端密钥**，请在 components 目录中创建一个名为 `azurekeyvault.yaml` 的文件。使用以下模板，填写 [你创建的 Microsoft Entra ID 应用程序]({{% ref authenticating-azure.md %}}) 的详细信息：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "[your_keyvault_name]"
  - name: azureTenantId
    value: "[your_tenant_id]"
  - name: azureClientId
    value: "[your_client_id]"
  - name: azureClientSecret
    value : "[your_client_secret]"
```

#### 使用证书

如果你想使用本地磁盘上保存的**证书**，请使用以下模板。填写 [你创建的 Microsoft Entra ID 应用程序]({{% ref authenticating-azure.md %}}) 的详细信息：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "[your_keyvault_name]"
  - name: azureTenantId
    value: "[your_tenant_id]"
  - name: azureClientId
    value: "[your_client_id]"
  - name: azureCertificateFile
    value : "[pfx_certificate_file_fully_qualified_local_path]"
```
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 中，你需要将客户端密钥或证书存储到 Kubernetes Secret Store 中，然后在 YAML 文件中引用它们。在开始之前，你需要 [你创建的 Microsoft Entra ID 应用程序]({{% ref authenticating-azure.md %}}) 的详细信息。

#### 使用客户端密钥

1. 使用以下命令创建一个 Kubernetes secret：

   ```bash
   kubectl create secret generic [your_k8s_secret_name] --from-literal=[your_k8s_secret_key]=[your_client_secret]
   ```

    - `[your_client_secret]` 是上面生成的应用程序客户端密钥
    - `[your_k8s_secret_name]` 是 Kubernetes secret store 中的 secret 名称
    - `[your_k8s_secret_key]` 是 Kubernetes secret store 中的 secret 密钥


1. 创建一个 `azurekeyvault.yaml` 组件文件。

    组件 yaml 使用 `auth` 属性引用 Kubernetes secretstore，`secretKeyRef` 引用存储在 Kubernetes secret store 中的客户端密钥。

    ```yaml
    apiVersion: dapr.io/v1alpha1
    kind: Component
    metadata:
      name: azurekeyvault
    spec:
      type: secretstores.azure.keyvault
      version: v1
      metadata:
      - name: vaultName
        value: "[your_keyvault_name]"
      - name: azureTenantId
        value: "[your_tenant_id]"
      - name: azureClientId
        value: "[your_client_id]"
      - name: azureClientSecret
        secretKeyRef:
          name: "[your_k8s_secret_name]"
          key: "[your_k8s_secret_key]"
    auth:
      secretStore: kubernetes
    ```

1. 应用 `azurekeyvault.yaml` 组件：

    ```bash
    kubectl apply -f azurekeyvault.yaml
    ```

#### 使用证书

1. 使用以下命令创建一个 Kubernetes secret：

   ```bash
   kubectl create secret generic [your_k8s_secret_name] --from-file=[your_k8s_secret_key]=[pfx_certificate_file_fully_qualified_local_path]
   ```

    - `[pfx_certificate_file_fully_qualified_local_path]` 是你之前获得的 PFX 文件的路径
    - `[your_k8s_secret_name]` 是 Kubernetes secret store 中的 secret 名称
    - `[your_k8s_secret_key]` 是 Kubernetes secret store 中的 secret 密钥

1. 创建一个 `azurekeyvault.yaml` 组件文件。

    组件 yaml 使用 `auth` 属性引用 Kubernetes secretstore，`secretKeyRef` 引用存储在 Kubernetes secret store 中的证书。

    ```yaml
    apiVersion: dapr.io/v1alpha1
    kind: Component
    metadata:
      name: azurekeyvault
    spec:
      type: secretstores.azure.keyvault
      version: v1
      metadata:
      - name: vaultName
        value: "[your_keyvault_name]"
      - name: azureTenantId
        value: "[your_tenant_id]"
      - name: azureClientId
        value: "[your_client_id]"
      - name: azureCertificate
        secretKeyRef:
          name: "[your_k8s_secret_name]"
          key: "[your_k8s_secret_key]"
    auth:
      secretStore: kubernetes
    ```

1. 应用 `azurekeyvault.yaml` 组件：

    ```bash
    kubectl apply -f azurekeyvault.yaml
    ```

#### 使用 Azure 托管标识

1. 确保你的 AKS 集群已启用托管标识，并按照 [使用托管标识的指南](https://docs.microsoft.com/azure/aks/use-managed-identity) 进行操作。
1. 创建一个 `azurekeyvault.yaml` 组件文件。

    组件 yaml 引用特定的 KeyVault 名称。你将在后续步骤中使用的托管标识必须获得对此特定 KeyVault 实例的读取访问权限。

    ```yaml
    apiVersion: dapr.io/v1alpha1
    kind: Component
    metadata:
      name: azurekeyvault
    spec:
      type: secretstores.azure.keyvault
      version: v1
      metadata:
      - name: vaultName
        value: "[your_keyvault_name]"
    ```

1. 应用 `azurekeyvault.yaml` 组件：

    ```bash
    kubectl apply -f azurekeyvault.yaml
    ```
1. 通过 [Microsoft Entra ID workload identity](https://learn.microsoft.com/azure/aks/workload-identity-overview) 在 Pod 级别创建并分配托管标识

1. 创建工作负载标识后，为其授予 `read` 权限：
   - [在你所需的 KeyVault 实例上](https://docs.microsoft.com/azure/key-vault/general/assign-access-policy?tabpane=azure-cli#assign-the-access-policy)
   - 在你的应用程序部署中。通过以下两种方式注入 Pod 标识：
     - 通过标签注释
     - 通过指定与所需工作负载标识关联的 Kubernetes 服务帐户

   ```yaml
   apiVersion: v1
   kind: Pod
   metadata:
     name: mydaprdemoapp
     labels:
       aadpodidbinding: $POD_IDENTITY_NAME
   ```

#### 直接使用 Azure 托管标识与通过 Microsoft Entra ID workload identity 使用托管标识的对比

当**直接使用托管标识**时，你可以将多个标识与一个应用关联，需要使用 `azureClientId` 来指定应使用哪个标识。

但是，当**通过 Microsoft Entra ID workload identity 使用托管标识**时，`azureClientId` 不是必需的，并且不起作用。要使用的 Azure 标识是从与 Azure 标识关联的服务帐户推断出来的，该关联是通过 Azure 联合标识建立的。

{{% /tab %}}

{{< /tabpane >}}

## 参考

- [向 Azure 进行身份验证]({{% ref authenticating-azure.md %}})
- [Azure CLI：keyvault 命令](https://docs.microsoft.com/cli/azure/keyvault?view=azure-cli-latest#az-keyvault-create)
- [Secrets 构建块]({{% ref secrets %}})
- [操作方法：检索 secret]({{% ref "howto-secrets.md" %}})
- [操作方法：在 Dapr 组件中引用 secret]({{% ref component-secrets.md %}})
- [Secrets API 参考]({{% ref secrets_api.md %}})
