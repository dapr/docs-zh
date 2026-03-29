---
type: docs
title: "操作指南：生成新的 Microsoft Entra ID 应用程序和服务主体"
linkTitle: "操作指南：生成 Microsoft Entra ID 和服务主体"
weight: 30000
description: "了解如何生成 Microsoft Entra ID 并将其用作服务主体"
---

## 前置条件

- [Azure 订阅](https://azure.microsoft.com/free/)
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [jq](https://stedolan.github.io/jq/download/)
- OpenSSL（默认包含在所有 Linux 和 macOS 系统以及 WSL 中）
- 确保您使用的是 bash 或 zsh shell

## 使用 Azure CLI 登录 Azure

在新的终端中，运行以下命令：

```sh
az login
az account set -s [your subscription id]
```

### 创建 Microsoft Entra ID 应用程序

使用以下命令创建 Microsoft Entra ID 应用程序：

```sh
# 应用程序 / 服务主体的友好名称
APP_NAME="dapr-application"

# 创建应用程序
APP_ID=$(az ad app create --display-name "${APP_NAME}"  | jq -r .appId)
```

选择您希望传递凭据的方式。

{{< tabpane text=true >}}

{{% tab "Client secret" %}}

要创建 **client secret（客户端密钥）**，请运行以下命令。

```sh
az ad app credential reset \
  --id "${APP_ID}" \
  --years 2
```

这将基于 `base64` 字符集生成一个随机的 40 字符长度的密码。此密码有效期为 2 年，之后您需要轮换它。

保存返回的输出值；Dapr 需要这些值来向 Azure 进行身份验证。预期输出：

```json
{
  "appId": "<your-app-id>",
  "password": "<your-password>",
  "tenant": "<your-azure-tenant>"
}
```

将返回的值添加到 Dapr 组件的元数据时：

- `appId` 是 `azureClientId` 的值
- `password` 是 `azureClientSecret` 的值（这是随机生成的）
- `tenant` 是 `azureTenantId` 的值

{{% /tab %}}

{{% tab "PFX certificate" %}}
对于 **PFX (PKCS#12) 证书**，请运行以下命令来创建自签名证书：

```sh
az ad app credential reset \
  --id "${APP_ID}" \
  --create-cert
```

> **注意：** 自签名证书仅建议用于开发环境。在生产环境中，您应该使用由 CA 签名并通过 `--cert` 标志导入的证书。

上述命令的输出应如下所示：

保存返回的输出值；Dapr 需要这些值来向 Azure 进行身份验证。预期输出：

```json
{
  "appId": "<your-app-id>",
  "fileWithCertAndPrivateKey": "<file-path>",
  "password": null,
  "tenant": "<your-azure-tenant>"
}
```

将返回的值添加到 Dapr 组件的元数据时：

- `appId` 是 `azureClientId` 的值
- `tenant` 是 `azureTenantId` 的值
- `fileWithCertAndPrivateKey` 指示自签名 PFX 证书和私钥的位置。使用该文件的内容作为 `azureCertificate`（或将其写入服务器上的文件并使用 `azureCertificateFile`）

> **注意：** 虽然生成的文件具有 `.pem` 扩展名，但它包含以 PFX (PKCS#12) 编码的证书和私钥。

{{% /tab %}}

{{< /tabpane >}}

### 创建服务主体

创建 Microsoft Entra ID 应用程序后，为该应用程序创建服务主体。使用此服务主体，您可以授予其对 Azure 资源的访问权限。

要创建服务主体，请运行以下命令：

```sh
SERVICE_PRINCIPAL_ID=$(az ad sp create \
  --id "${APP_ID}" \
  | jq -r .id)
echo "Service Principal ID: ${SERVICE_PRINCIPAL_ID}"
```

预期输出：

```text
Service Principal ID: 1d0ccf05-5427-4b5e-8eb4-005ac5f9f163
```

上面返回的值是 **服务主体 ID**，它不同于 Microsoft Entra ID 应用程序 ID（客户端 ID）。服务主体 ID 在 Azure 租户内定义，用于授予应用程序对 Azure 资源的访问权限。

您将使用服务主体 ID 来授予应用程序访问 Azure 资源的权限。

同时，**客户端 ID** 由您的应用程序用于身份验证。您将在 Dapr 清单中使用客户端 ID 来配置与 Azure 服务的身份验证。

请记住，刚刚创建的服务主体默认情况下无权访问任何 Azure 资源。需要根据需要授予对每个资源的访问权限，如组件文档中所述。

## 后续步骤

{{< button text="使用托管标识 >>" page="howto-mi.md" >}}
