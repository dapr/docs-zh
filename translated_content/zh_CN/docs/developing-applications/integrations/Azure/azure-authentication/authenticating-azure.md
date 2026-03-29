---
type: docs
title: "向 Azure 进行身份验证"
linkTitle: "概述"
description: "如何使用 Microsoft Entra ID 和/或托管标识对 Azure 组件进行身份验证"
aliases:
  - "/operations/components/setup-secret-store/supported-secret-stores/azure-keyvault-managed-identity/"
  - "/reference/components-reference/supported-secret-stores/azure-keyvault-managed-identity/"
weight: 10000
---

## 关于使用 Microsoft Entra ID 进行身份验证

Microsoft Entra ID 是 Azure 的标识和访问管理 (IAM) 解决方案，用于对用户和服务进行身份验证和授权。它构建在 OAuth 2.0 等开放标准之上，允许服务（应用程序）获取访问令牌以向 Azure 服务发出请求，包括 Azure Storage、Azure Service Bus、Azure Key Vault、Azure Cosmos DB、Azure Database for Postgres、Azure SQL 等。

## 身份验证选项

应用程序可以通过多种方法使用 Microsoft Entra ID 进行身份验证并获取访问令牌以向 Azure 服务发出请求：

 - [工作负载标识联合]({{< ref howto-wif.md >}}) - 配置 Microsoft Entra ID 租户以信任外部标识提供者的推荐方式。这包括来自 Kubernetes 或 AKS 集群的服务账户。[了解有关工作负载标识联合的更多信息](https://learn.microsoft.com/entra/workload-id/workload-identities-overview)。
 - [系统分配和用户分配的托管标识]({{< ref howto-mi.md >}}) - 不如工作负载标识联合精细，但保留了部分优势。[了解有关系统分配和用户分配的托管标识的更多信息](https://learn.microsoft.com/azure/aks/use-managed-identity)。
 - [客户端 ID 和密钥]({{ < ref howto-aad.md >}}) - 不推荐，因为它要求您在应用程序级别维护和关联凭据。
 - Pod 标识 - [已弃用的方法，用于对在 Kubernetes Pod 上运行的应用程序进行身份验证](https://learn.microsoft.com/azure/aks/use-azure-ad-pod-identity)，在 Pod 级别进行。不应再使用此方法。

如果您刚刚开始，建议使用工作负载标识联合。

## 托管标识和工作负载标识联合

使用托管标识 (MI)，您的应用程序可以使用 Microsoft Entra ID 进行身份验证并获取访问令牌以向 Azure 服务发出请求。当您的应用程序在支持的 Azure 服务（例如 Azure VM、Azure Container Apps、Azure Web Apps 等）上运行时，可以在基础设施级别为您的应用程序分配标识。您还可以设置 Microsoft Entra ID 以使用[联合标识凭据](https://learn.microsoft.com/graph/api/resources/federatedidentitycredentials-overview?view=graph-rest-1.0)直接将联合信任委托给您的 Dapr 应用程序标识。这允许您配置对 Microsoft 资源的访问权限，即使不在 Microsoft 基础设施上运行也是如此。要了解如何配置 Dapr 以使用联合标识，请参阅[使用联合标识凭据进行身份验证](#authenticating-with-a-federated-identity-credential)部分。
这是通过[系统分配或用户分配的托管标识]({{< ref howto-mi.md >}})或[工作负载标识联合]({{< ref howto-wif.md >}})完成的。

使用托管标识后，您的代码不必处理凭据，这可以：

- 消除安全管理凭据的挑战
- 允许开发团队和运营团队之间更好地分离关注点
- 减少有权访问凭据的人数
- 简化操作方面——尤其是在使用多个环境时

虽然某些 Dapr Azure 组件提供替代身份验证方法，例如基于"共享密钥"或"访问令牌"的系统，但只要有可能，您应该始终尝试使用 Microsoft Entra ID 对 Dapr 组件进行身份验证。这提供了许多好处，包括：

- [基于角色的访问控制](#role-based-access-control)
- [审核](#auditing)
- [(可选) 使用证书进行身份验证](#optional-authentication-using-certificates)

建议在 Azure Kubernetes Service 上运行的应用程序利用[工作负载标识联合](https://learn.microsoft.com/entra/workload-id/workload-identity-federation)自动为各个 Pod 提供标识。

### 基于角色的访问控制

在对受支持的服务使用 Azure 基于角色的访问控制 (RBAC) 时，可以微调授予应用程序的权限。例如，您可以限制对数据子集的访问或使访问变为只读。

### 审核

使用 Microsoft Entra ID 可提供改进的访问审核体验。租户管理员可以查看审核日志以跟踪身份验证请求。

### (可选) 使用证书进行身份验证

虽然 Microsoft Entra ID 允许您使用 MI，但您仍然可以选择使用证书进行身份验证。

## 对其他 Azure 环境的支持

默认情况下，Dapr 组件配置为与"公有云"中的 Azure 资源进行交互。如果您的应用程序部署到另一个云，例如 Azure China 或 Azure Government（"主权云"），可以通过将 `azureEnvironment` 元数据属性设置为支持的值之一，为支持的组件启用该功能：

- Azure 公有云（默认）: `"AzurePublicCloud"`
- Azure 中国: `"AzureChinaCloud"`
- Azure 政府: `"AzureUSGovernmentCloud"`

> 对主权云的支持是实验性的。

## 凭据元数据字段

要使用 Microsoft Entra ID 进行身份验证，您需要将以下凭据作为值添加到您的 [Dapr 组件](#example-usage-in-a-dapr-component)的元数据中。

### 元数据选项

根据您如何将凭据传递给 Dapr 服务，您有多个元数据选项。

- [使用客户端凭据](#authenticating-using-client-credentials)
- [使用证书](#authenticating-using-a-certificate)
- [使用托管标识 (MI)](#authenticating-with-managed-identities-mi)
- [在 AKS 上使用工作负载标识](#authenticating-with-workload-identity-on-aks)
- [使用 Azure CLI 凭据（仅限开发）](#authenticating-using-azure-cli-credentials-development-only)

#### 使用客户端凭据进行身份验证

| 字段               | 必填 | 详情                              | 示例                                      |
|---------------------|----------|--------------------------------------|----------------------------------------------|
| `azureTenantId`     | Y        | Microsoft Entra ID 租户的 ID            | `"cd4b2887-304c-47e1-b4d5-65447fdd542b"`     |
| `azureClientId`     | Y        | 客户端 ID (应用程序 ID)           | `"c7dd251f-811f-4ba2-a905-acd4d3f8f08b"`     |
| `azureClientSecret` | Y        | 客户端密钥 (应用程序密码) | `"Ecy3XG7zVZK3/vl/a2NSB+a1zXLa8RnMum/IgD0E"` |

在 Kubernetes 上运行时，您还可以对上述任何或所有值使用对 Kubernetes 机密的引用。

#### 使用证书进行身份验证

| 字段 | 必填 | 详情 | 示例 |
|--------|--------|--------|--------|
| `azureTenantId` | Y | Microsoft Entra ID 租户的 ID | `"cd4b2887-304c-47e1-b4d5-65447fdd542b"` |
| `azureClientId` | Y | 客户端 ID (应用程序 ID) | `"c7dd251f-811f-4ba2-a905-acd4d3f8f08b"` |
| `azureCertificate` | `azureCertificate` 和 `azureCertificateFile` 之一 | 证书和私钥 (PFX/PKCS#12 格式) | `"-----BEGIN PRIVATE KEY-----\n MIIEvgI... \n -----END PRIVATE KEY----- \n -----BEGIN CERTIFICATE----- \n MIICoTC... \n -----END CERTIFICATE-----"` |
| `azureCertificateFile` | `azureCertificate` 和 `azureCertificateFile` 之一 | 包含证书和私钥的 PFX/PKCS#12 文件的路径 | `"/path/to/file.pem"` |
| `azureCertificatePassword` | N | 证书的密码（如果已加密） | `"password"` |

在 Kubernetes 上运行时，您还可以对上述任何或所有值使用对 Kubernetes 机密的引用。

#### 使用托管标识 (MI) 进行身份验证

| 字段           | 必填 | 详情                    | 示例                                  |
|-----------------|----------|----------------------------|------------------------------------------|
| `azureClientId` | N        | 客户端 ID (应用程序 ID) | `"c7dd251f-811f-4ba2-a905-acd4d3f8f08b"` |

[使用托管标识]({{% ref howto-mi.md %}})，通常推荐使用 `azureClientId` 字段。使用系统分配的标识时，该字段是可选的，但在使用用户分配的标识时可能是必需的。

#### 在 AKS 上使用工作负载标识进行身份验证

在 Azure Kubernetes Service (AKS) 上运行时，您可以使用工作负载标识对组件进行身份验证。请参阅 Azure AKS 文档中关于为 Kubernetes 资源[启用工作负载标识](https://learn.microsoft.com/azure/aks/workload-identity-overview)的内容。

#### 使用联合标识凭据进行身份验证

您可以使用 Microsoft Entra ID 中的[联合标识凭据](https://learn.microsoft.com/graph/api/resources/federatedidentitycredentials-overview?view=graph-rest-1.0)直接将联合信任委托给您的 Dapr 安装，无论其运行在何处。这允许您跨不同云一致地针对 Dapr 应用程序的 [SPIFFE](https://spiffe.io/) ID 轻松配置访问规则。

为了联合信任，您必须运行启用了 JWT 颁发和 OIDC 发现的 Dapr Sentry。可以使用以下 Dapr Sentry helm 值配置这些功能：

```yaml
jwt:
  # 通过 Sentry 启用 JWT 令牌颁发
  enabled: true
  # JWT 令牌的颁发者值
  issuer: "<your-issuer-domain>"

oidc:
  enabled: true
  server:
    # OIDC HTTP 服务器的端口
    port: 9080
  tls:
    # 为 OIDC HTTP 服务器启用 TLS
    enabled: true
    # OIDC HTTP 服务器的 TLS 证书文件
    certFile: "<path-to-tls-cert.pem>"
    # OIDC HTTP 服务器的 TLS 证书文件
    keyFile: "<path-to-tls-key.pem>"
```

{{% alert title="警告" color="warning" %}}
`issuer` 值必须与您在 Microsoft Entra ID 中创建联合标识凭据时提供的值完全匹配。
{{% /alert %}}

提供这些设置后，在提供的 OIDC HTTP 端口上的 Dapr Sentry 安装上会公开以下端点：
```
/.well-known/openid-configuration
/jwks.json
```

您还需要提供 Dapr 运行时配置以请求具有 Azure 受众 `api://AzureADTokenExchange` 的 JWT 令牌。
在独立模式下运行时，可以使用标志 `--sentry-request-jwt-audiences=api://AzureADTokenExchange` 提供。
在 Kubernetes 上运行时，可以通过使用注解 `"dapr.io/sentry-request-jwt-audiences": "api://AzureADTokenExchange"` 修饰应用程序 Kubernetes 清单来提供。
这可确保 Sentry 服务颁发具有正确受众的 JWT 令牌，这是 Microsoft Entra ID 验证令牌所必需的。

为了使 Microsoft Entra ID 能够访问 OIDC 端点，您必须在公共地址上公开它们。您必须确保提供这些端点的域与配置 Dapr Sentry 时提供的颁发者相同。

现在您可以在 Microsoft Entra ID 中创建联合凭据。

```shell
cat > creds.json <<EOF
{ 
  "name": "DaprAppIDSpiffe",
  "issuer": "https://<your-issuer-domain>",
  "subject": spiffe://public/ns/<dapr-app-id-namespace>/<dapr-app-id>",
  "audiences": ["api://AzureADTokenExchange"],
  "description": "Credential for Dapr App ID"
}
EOF

export APP_ID=$(az ad app create --display-name my-dapr-app --enable-access-token-issuance --enable-id-token-issuance | jq .id)
az ad sp create --id $APP_ID
az ad app federated-credential create --id $APP_ID --parameters ./creds.json
```

现在您已经有了 Microsoft Entra ID 应用程序注册的联合凭据，可以为其服务主体分配所需的角色。

下面是分配"Storage Blob Data Owner"角色的示例。
```shell
az role assignment create --assignee-object-id $APP_ID --assignee-principal-type ServicePrincipal --role "Storage Blob Data Owner" --scope "/subscriptions/$SUBSCRIPTION/resourceGroups/$GROUP/providers/Microsoft.Storage/storageAccounts/$ACCOUNT_NAME"
```

要配置 Dapr 组件以使用联合凭据访问 Azure 资源，首先需要获取您的 `clientId` 和 `tenantId`：
```shell
CLIENT_ID=$(az ad app show --id $APP_ID --query appId --output tsv)
TENANT_ID=$(az account show --query tenantId --output tsv)
```

然后您可以创建 Azure Dapr 组件并只需提供这些值：
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azureblob
spec:
  type: state.azure.blobstorage
  version: v2
  initTimeout: 10s # 增加初始化超时以允许 Azure 有足够的时间执行令牌交换
  metadata:
  - name: clientId
    value: $CLIENT_ID
  - name: tenantId
    value:  $TENANT_ID
  - name: accountName
    value: $ACCOUNT_NAME
  - name: containerName
    value: $CONTAINER_NAME
```

Dapr 运行时使用这些详细信息通过 Microsoft Entra ID 进行身份验证，使用 Dapr Sentry 颁发的 JWT 令牌交换访问令牌以访问 Azure 资源。

#### 使用 Azure CLI 凭据进行身份验证（仅限开发）

> **重要提示：** 此身份验证方法仅建议用于**开发**。

此身份验证方法在本地计算机上开发时可能很有用。您需要：

- [已安装 Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- 已成功使用 `az login` 命令进行身份验证

当 Dapr 在有 Azure CLI 凭据可用的主机上运行时，如果没有配置其他身份验证方法，组件可以使用这些凭据自动进行身份验证。

使用此身份验证方法不需要设置任何元数据选项。

### 在 Dapr 组件中的使用示例

在此示例中，您将设置一个使用 Microsoft Entra ID 进行身份验证的 Azure Key Vault 机密存储组件。

{{< tabpane text=true >}}

{{% tab "自托管" %}}

要使用**客户端密钥**，在组件目录中创建一个名为 `azurekeyvault.yaml` 的文件，填入上述设置过程中的详细信息：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
  namespace: default
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

如果您想使用保存在本地磁盘上的**证书**，请改用：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
  namespace: default
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
在 Kubernetes 中，您将客户端密钥或证书存储到 Kubernetes 机密存储中，然后在 YAML 文件中引用它们。

要使用**客户端密钥**：

1. 使用以下命令创建 Kubernetes 机密：

   ```bash
   kubectl create secret generic [your_k8s_secret_name] --from-literal=[your_k8s_secret_key]=[your_client_secret]
   ```

    - `[your_client_secret]` 是如上生成的应用程序客户端密钥
    - `[your_k8s_secret_name]` 是 Kubernetes 机密存储中的机密名称
    - `[your_k8s_secret_key]` 是 Kubernetes 机密存储中的机密键

1. 创建一个 `azurekeyvault.yaml` 组件文件。

    组件 yaml 使用 `auth` 属性引用 Kubernetes 机密存储，`secretKeyRef` 引用存储在 Kubernetes 机密存储中的客户端密钥。

    ```yaml
    apiVersion: dapr.io/v1alpha1
    kind: Component
    metadata:
      name: azurekeyvault
      namespace: default
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

要使用**证书**：

1. 使用以下命令创建 Kubernetes 机密：

   ```bash
   kubectl create secret generic [your_k8s_secret_name] --from-file=[your_k8s_secret_key]=[pfx_certificate_file_fully_qualified_local_path]
   ```

    - `[pfx_certificate_file_fully_qualified_local_path]` 是您之前获得的 PFX 文件的路径
    - `[your_k8s_secret_name]` 是 Kubernetes 机密存储中的机密名称
    - `[your_k8s_secret_key]` 是 Kubernetes 机密存储中的机密键

1. 创建一个 `azurekeyvault.yaml` 组件文件。

    组件 yaml 使用 `auth` 属性引用 Kubernetes 机密存储，`secretKeyRef` 引用存储在 Kubernetes 机密存储中的证书。

    ```yaml
    apiVersion: dapr.io/v1alpha1
    kind: Component
    metadata:
      name: azurekeyvault
      namespace: default
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

{{% /tab %}}

{{< /tabpane >}}

## 后续步骤

{{< button text="生成新的 Microsoft Entra ID 应用程序和服务主体 >>" page="howto-aad.md" >}}

## 参考

- [Microsoft Entra ID 应用凭据: Azure CLI 参考](https://docs.microsoft.com/cli/azure/ad/app/credential)
- [Azure 托管服务标识 (MSI) 概述](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
- [机密构建块]({{% ref secrets %}})
- [操作方法: 检索机密]({{% ref "howto-secrets.md" %}})
- [操作方法: 在 Dapr 组件中引用机密]({{% ref component-secrets.md %}})
- [机密 API 参考]({{% ref secrets_api.md %}})
