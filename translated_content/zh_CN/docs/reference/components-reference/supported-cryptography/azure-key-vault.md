---
type: docs
title: "Azure Key Vault"
linkTitle: "Azure Key Vault"
description: Azure Key Vault 加密组件的详细信息
---

## 组件格式

Dapr `crypto.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azurekeyvault
spec:
  type: crypto.azure.keyvault
  metadata:
  - name: vaultName
    value: mykeyvault
  # See authentication section below for all options
  - name: azureTenantId
    value: ${{AzureKeyVaultTenantId}}
  - name: azureClientId
    value: ${{AzureKeyVaultServicePrincipalClientId}}
  - name: azureClientSecret
    value: ${{AzureKeyVaultServicePrincipalClientSecret}}
```

{{% alert title="Warning" color="warning" %}}
上面的示例使用纯文本字符串来存储密钥。建议使用密钥存储来管理密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 使用 Microsoft Entra ID 进行身份验证

Azure Key Vault 加密组件仅支持使用 Microsoft Entra ID 进行身份验证。在启用此组件之前：

1. 阅读[向 Azure 进行身份验证]({{% ref "authenticating-azure.md" %}})文档。
1. 创建 [Microsoft Entra ID 应用程序]({{% ref "howto-aad.md" %}})（也称为服务主体）。
1. 或者，为您的应用程序平台创建[托管标识]({{% ref "howto-mi.md" %}})。

## 规范元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| `vaultName`   | Y | Azure Key Vault 名称  | `"mykeyvault"` |
| Auth metadata | Y | 有关更多信息，请参阅[向 Azure 进行身份验证]({{% ref "authenticating-azure.md" %}})  |  |

## 相关链接

- [加密构建块]({{% ref cryptography %}})
- [向 Azure 进行身份验证]({{% ref azure-authentication %}})
