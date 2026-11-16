---
type: docs
title: "Azure 身份验证"
linkTitle: "概述"
description: "如何使用 Microsoft Entra ID 和/或托管标识对 Azure 组件进行身份验证"
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/azure-keyvault-managed-identity/"
  - "/zh-hans/reference/components-reference/supported-secret-stores/azure-keyvault-managed-identity/"
  - "/zh-hans/developing-applications/integrations/azure/azure-authentication/authenticating-azure/"
weight: 10000
---

## 关于 Microsoft Entra ID 的身份验证

Microsoft Entra ID 是 Azure 的身份与访问管理（IAM）解决方案，用于对用户和服务进行身份验证与授权。它基于 OAuth 2.0 等开放标准构建，允许服务（应用程序）获取访问令牌，从而向 Azure 服务发出请求，包括 Azure Storage、Azure Service Bus、Azure 密钥保管库、Azure Cosmos DB、Azure Database for Postgres、Azure SQL 等。

## 身份验证选项

应用程序可以通过以下几种方式向 Microsoft Entra ID 进行身份验证，并获取访问令牌，以便向 Azure 服务发出请求：

 - [工作负载身份联合]({{< ref howto-wif.md >}}) - 推荐的方式，用于配置 Microsoft Entra ID 租户以信任外部身份提供方。这包括来自 Kubernetes 或 AKS 集群的服务账号。[了解有关工作负载身份联合的更多信息](https://learn.microsoft.com/entra/workload-id/workload-identities-overview)。
 - [系统分配和用户分配的托管标识]({{< ref howto-mi.md >}}) - 粒度不如工作负载身份联合细，但保留了其中的部分优势。[了解有关系统分配和用户分配托管标识的更多信息](https://learn.microsoft.com/azure/aks/use-managed-identity)。
 - [客户端 ID 和密钥]({{ < ref howto-aad.md >}}) - 不推荐，因为它要求你在应用程序级别维护并关联凭据。
 - Pod 标识 - [已弃用的方法，用于在 Pod 级别对运行在 Kubernetes 上的应用程序进行身份验证](https://learn.microsoft.com/azure/aks/use-azure-ad-pod-identity)。不应再使用。

如果你刚刚开始，建议使用工作负载身份联合。

## 托管标识与工作负载身份联合

使用托管标识（MI）时，应用程序可以通过 Microsoft Entra ID 进行身份验证，并获取访问令牌，以便向 Azure 服务发出请求。当应用程序运行在受支持的 Azure 服务（例如 Azure VM、Azure Container Apps、Azure Web Apps 等）上时，可以在基础设施层为应用程序分配一个标识。你也可以在 Microsoft Entra ID 中设置联合，直接将信任关系联合到你的 Dapr 应用身份，方法是使用[联合标识凭据](https://learn.microsoft.com/graph/api/resources/federatedidentitycredentials-overview?view=graph-rest-1.0)。这样，即使不在 Microsoft 基础设施上运行，也能配置对 Microsoft 资源的访问。要了解如何配置 Dapr 使用联合标识，请参阅[使用联合标识凭据进行身份验证](#使用联合标识凭据进行身份验证)一节。
这通过[系统或用户分配的托管标识]({{< ref howto-mi.md >}})，或[工作负载身份联合]({{< ref howto-wif.md >}})实现。

使用托管标识后，你的代码无需处理凭据，这带来以下好处：

- 无需再安全地管理凭据这一难题
- 使开发团队与运维团队之间的职责划分更加清晰
- 减少可以访问凭据的人员数量
- 简化运维工作，在使用多个环境时尤其明显

虽然部分 Dapr Azure 组件也提供其他身份验证方式，例如基于“共享密钥”或“访问令牌”的方式，但只要可能，你都应该尝试使用 Microsoft Entra ID 对 Dapr 组件进行身份验证。这样做有许多好处，包括：

- [基于角色的访问控制](#基于角色的访问控制)
- [审核](#审核)
- [（可选）使用证书进行身份验证](#可选使用证书进行身份验证)

建议在 Azure Kubernetes Service 上运行的应用程序利用[工作负载身份联合](https://learn.microsoft.com/entra/workload-id/workload-identity-federation)，为各个 Pod 自动提供标识。

### 基于角色的访问控制

在受支持的服务中使用 Azure 基于角色的访问控制（RBAC）时，可以精细调整授予应用程序的权限。例如，你可以将访问限制为部分数据，或将访问设为只读。

### 审核

使用 Microsoft Entra ID 可以为访问提供更完善的审核体验。租户管理员可以查阅审核日志，以跟踪身份验证请求。

### （可选）使用证书进行身份验证

虽然 Microsoft Entra ID 允许你使用托管标识（MI），但你仍可以选择使用证书进行身份验证。

## 其他 Azure 环境的支持

默认情况下，Dapr 组件配置为与“公有云”中的 Azure 资源交互。如果你的应用程序部署在其他云环境中，例如 Azure 中国或 Azure 政府云（“主权云”），你可以为受支持的组件启用相应配置，方法是将 `azureEnvironment` 元数据属性设置为以下受支持的值之一：

- Azure 公有云（默认）：`"AzurePublicCloud"`
- Azure 中国：`"AzureChinaCloud"`
- Azure 政府云：`"AzureUSGovernmentCloud"`

> 对主权云的支持处于实验阶段。

## 凭据元数据字段

要使用 Microsoft Entra ID 进行身份验证，你需要将以下凭据作为值，添加到你的 [Dapr 组件](#在-dapr-组件中的示例用法)的元数据中。

### 元数据选项

根据你向 Dapr 服务传递凭据的方式，可以使用多种元数据选项。

- [使用客户端凭据](#使用客户端凭据进行身份验证)
- [使用证书](#使用证书进行身份验证)
- [使用托管标识（MI）](#使用托管标识mi进行身份验证)
- [在 AKS 上使用工作负载身份](#在-aks-上使用工作负载身份进行身份验证)
- [使用 Azure CLI 凭据（仅用于开发）](#使用-azure-cli-凭据进行身份验证仅限开发)

你还可以使用 `azureAuthMethods` 元数据字段，[控制 Dapr 尝试的身份验证方法及其顺序](#指定要使用的身份验证方法)。

#### 使用客户端凭据进行身份验证

| 字段                | 必需 | 详细信息                             | 示例                                         |
|---------------------|------|--------------------------------------|----------------------------------------------|
| `azureTenantId`     | Y    | Microsoft Entra ID 租户的 ID         | `"cd4b2887-304c-47e1-b4d5-65447fdd542b"`     |
| `azureClientId`     | Y    | 客户端 ID（应用程序 ID）             | `"c7dd251f-811f-4ba2-a905-acd4d3f8f08b"`     |
| `azureClientSecret` | Y    | 客户端密钥（应用程序密码）           | `"Ecy3XG7zVZK3/vl/a2NSB+a1zXLa8RnMum/IgD0E"` |

在 Kubernetes 上运行时，你也可以对上述任意或全部值使用 Kubernetes 机密引用。

#### 使用证书进行身份验证

| 字段 | 必需 | 详细信息 | 示例 |
|--------|--------|--------|--------|
| `azureTenantId` | Y | Microsoft Entra ID 租户的 ID | `"cd4b2887-304c-47e1-b4d5-65447fdd542b"` |
| `azureClientId` | Y | 客户端 ID（应用程序 ID） | `"c7dd251f-811f-4ba2-a905-acd4d3f8f08b"` |
| `azureCertificate` | `azureCertificate` 和 `azureCertificateFile` 二者之一 | 证书和私钥（PFX/PKCS#12 格式） | `"-----BEGIN PRIVATE KEY-----\n MIIEvgI... \n -----END PRIVATE KEY----- \n -----BEGIN CERTIFICATE----- \n MIICoTC... \n -----END CERTIFICATE-----` |
| `azureCertificateFile` | `azureCertificate` 和 `azureCertificateFile` 二者之一 | 包含证书和私钥的 PFX/PKCS#12 文件路径 | `"/path/to/file.pem"` |
| `azureCertificatePassword` | N | 证书的密码（如果已加密） | `"password"` |

在 Kubernetes 上运行时，你也可以对上述任意或全部值使用 Kubernetes 机密引用。

#### 使用托管标识（MI）进行身份验证

| 字段            | 必需 | 详细信息                   | 示例                                     |
|-----------------|------|----------------------------|------------------------------------------|
| `azureClientId` | N    | 客户端 ID（应用程序 ID）   | `"c7dd251f-811f-4ba2-a905-acd4d3f8f08b"` |

使用[托管标识]({{% ref howto-mi.md %}})时，通常推荐使用 `azureClientId` 字段。使用系统分配标识时，该字段是可选的；但使用用户分配的标识时，可能需要该字段。

#### 在 AKS 上使用工作负载身份进行身份验证

在 Azure Kubernetes Service（AKS）上运行时，你可以使用工作负载身份对组件进行身份验证。关于为你的 Kubernetes 资源[启用工作负载身份](https://learn.microsoft.com/azure/aks/workload-identity-overview)，请参阅 Azure AKS 文档。

#### 使用联合标识凭据进行身份验证

你可以在 Microsoft Entra ID 中使用[联合标识凭据](https://learn.microsoft.com/graph/api/resources/federatedidentitycredentials-overview?view=graph-rest-1.0)，直接将信任联合到你的 Dapr 安装实例，无论它运行在何处。这样，你就可以在不同云之间一致地，针对 Dapr 应用的 [SPIFFE](https://spiffe.io/) ID 配置访问规则。

要联合信任，你必须运行启用了 JWT 签发和 OIDC 发现功能的 Dapr Sentry。可以使用以下 Dapr Sentry Helm 值进行配置：

```yaml
jwt:
  # 启用 Sentry 签发 JWT 令牌
  enabled: true
  # JWT 令牌的签发者值
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
`issuer` 的值必须与你在 Microsoft Entra ID 中创建联合标识凭据时提供的值完全一致。
{{% /alert %}}

设置这些选项后，你的 Dapr Sentry 安装实例将在指定的 OIDC HTTP 端口上暴露以下端点：
```
/.well-known/openid-configuration
/jwks.json
```

你还需要提供 Dapr 运行时配置，以请求受众为 `api://AzureADTokenExchange` 的 JWT 令牌。在独立模式下运行时，可以使用参数 `--sentry-request-jwt-audiences=api://AzureADTokenExchange` 进行设置。在 Kubernetes 中运行时，可以为应用程序的 Kubernetes 清单添加注解 `"dapr.io/sentry-request-jwt-audiences": "api://AzureADTokenExchange"` 进行设置。这可确保 Sentry 服务签发具有正确受众的 JWT 令牌，而这是 Microsoft Entra ID 验证该令牌所必需的。

为使 Microsoft Entra ID 能够访问 OIDC 端点，你必须将它们暴露在公网地址上。你还必须确保提供这些端点的域名，与配置 Dapr Sentry 时提供的签发者一致。

现在，你可以在 Microsoft Entra ID 中创建联合凭据了。

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

现在你已经为 Microsoft Entra ID 应用注册创建了联合凭据，可以为其服务主体分配所需的角色。

下面是分配“Storage Blob Data Owner”角色的示例。
```shell
az role assignment create --assignee-object-id $APP_ID --assignee-principal-type ServicePrincipal --role "Storage Blob Data Owner" --scope "/subscriptions/$SUBSCRIPTION/resourceGroups/$GROUP/providers/Microsoft.Storage/storageAccounts/$ACCOUNT_NAME"
```

要配置 Dapr 组件使用联合凭据访问 Azure 资源，首先需要获取你的 `clientId` 和 `tenantId`：
```shell
CLIENT_ID=$(az ad app show --id $APP_ID --query appId --output tsv)
TENANT_ID=$(az account show --query tenantId --output tsv)
```

然后，你可以创建 Azure Dapr 组件，只需提供以下值：
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azureblob
spec:
  type: state.azure.blobstorage
  version: v2
  initTimeout: 10s # 增加初始化超时时间，以便 Azure 有足够的时间完成令牌交换
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

Dapr 运行时使用这些详细信息向 Microsoft Entra ID 进行身份验证，并使用 Dapr Sentry 签发的 JWT 令牌交换访问令牌，以访问 Azure 资源。

#### 使用 Azure CLI 凭据进行身份验证（仅限开发）

> **重要：** 此身份验证方法仅推荐用于**开发**环境。

在本地机器上开发时，此身份验证方法很有用。你需要：

- 已[安装 Azure CLI](https://learn.microsoft.com/cli/azure/install-azure-cli)
- 已成功使用 `az login` 命令完成身份验证

当 Dapr 运行在存在 Azure CLI 可用凭据的主机上时，如果未配置其他身份验证方法，组件可以自动使用这些凭据进行身份验证。

使用此身份验证方法无需设置任何元数据选项。

### 指定要使用的身份验证方法

默认情况下，Dapr Azure 组件会按固定顺序尝试每种受支持的身份验证方法，并使用第一个成功的方法：

1. 客户端凭据（客户端 ID、客户端密钥和租户 ID）
1. 客户端证书
1. 工作负载身份（AKS）
1. SPIFFE 工作负载身份（联合标识凭据）
1. 托管标识（MI）
1. Azure CLI

可以使用可选的 `azureAuthMethods` 元数据字段覆盖此行为，例如将 Dapr 限制为某一种特定的身份验证方法，或更改尝试各方法的顺序。

| 字段 | 必需 | 详细信息 | 示例 |
|-------|----------|---------|---------|
| `azureAuthMethods` | N | 逗号分隔的有序列表，表示 Dapr 应尝试的身份验证方法。设置后，**仅**尝试列出的方法，并按给定顺序尝试。 | `"managedidentity"`, `"workloadidentity,managedidentity"` |

受支持的值（不区分大小写）如下：

| 值 | 别名 | 身份验证方法 |
|-------|-------|-----------------------|
| `clientcredentials` | `creds` | [客户端凭据](#使用客户端凭据进行身份验证) |
| `clientcertificate` | `cert` | [客户端证书](#使用证书进行身份验证) |
| `workloadidentity` | `wi` | [AKS 上的工作负载身份](#在-aks-上使用工作负载身份进行身份验证) |
| `spiffeworkloadidentity` | `spiffe` | [SPIFFE 工作负载身份（联合标识凭据）](#使用联合标识凭据进行身份验证) |
| `managedidentity` | `mi` | [托管标识（MI）](#使用托管标识mi进行身份验证) |
| `commandlineinterface` | `cli` | [Azure CLI（仅用于开发）](#使用-azure-cli-凭据进行身份验证仅限开发) |
| `none` | | 完全禁用 Microsoft Entra ID 身份验证 |

例如，要让 Service Bus 组件仅使用托管标识进行身份验证，并跳过所有其他方法：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
spec:
  type: pubsub.azure.servicebus.topics
  version: v1
  metadata:
  - name: namespaceName
    value: "[your_servicebus_namespace].servicebus.windows.net"
  - name: azureClientId
    value: "[your_client_id]"
  - name: azureTenantId
    value: "[your_tenant_id]"
  - name: azureAuthMethods
    value: "managedidentity"
```

### 在 Dapr 组件中的示例用法

在此示例中，你将设置一个使用 Microsoft Entra ID 进行身份验证的 Azure 密钥保管库机密存储组件。

{{< tabpane text=true >}}

{{% tab "自托管" %}}

要使用**客户端密钥**，请在组件目录中创建名为 `azurekeyvault.yaml` 的文件，并填入上述设置过程中获得的详细信息：

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

如果你想改用保存在本地磁盘上的**证书**，请使用以下配置：

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
在 Kubernetes 中，你需要将客户端密钥或证书存储到 Kubernetes 机密存储中，然后在 YAML 文件中引用它们。

要使用**客户端密钥**：

1. 使用以下命令创建 Kubernetes 机密：

   ```bash
   kubectl create secret generic [your_k8s_secret_name] --from-literal=[your_k8s_secret_key]=[your_client_secret]
   ```

    - `[your_client_secret]` 是上面生成的应用程序客户端密钥
    - `[your_k8s_secret_name]` 是 Kubernetes 机密存储中的机密名称
    - `[your_k8s_secret_key]` 是 Kubernetes 机密存储中的机密键

1. 创建 `azurekeyvault.yaml` 组件文件。

    组件 YAML 通过 `auth` 属性引用 Kubernetes 机密存储，`secretKeyRef` 则指向存储在 Kubernetes 机密存储中的客户端密钥。

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

    - `[pfx_certificate_file_fully_qualified_local_path]` 是你之前获得的 PFX 文件的路径
    - `[your_k8s_secret_name]` 是 Kubernetes 机密存储中的机密名称
    - `[your_k8s_secret_key]` 是 Kubernetes 机密存储中的机密键

1. 创建 `azurekeyvault.yaml` 组件文件。

    组件 YAML 通过 `auth` 属性引用 Kubernetes 机密存储，`secretKeyRef` 则指向存储在 Kubernetes 机密存储中的证书。

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

## 参考资料

- [Microsoft Entra ID 应用凭据：Azure CLI 参考](https://docs.microsoft.com/cli/azure/ad/app/credential)
- [Azure 托管服务标识（MSI）概述](https://docs.microsoft.com/azure/active-directory/managed-identities-azure-resources/overview)
- [机密构建块]({{% ref secrets %}})
- [操作指南：检索机密]({{% ref "howto-secrets.md" %}})
- [操作指南：在 Dapr 组件中引用机密]({{% ref component-secrets.md %}})
- [机密 API 参考]({{% ref secrets_api.md %}})
