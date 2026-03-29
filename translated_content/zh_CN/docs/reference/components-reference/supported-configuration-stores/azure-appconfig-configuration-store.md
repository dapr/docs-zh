---
type: docs
title: "Azure App Configuration"
linkTitle: "Azure App Configuration"
description: Azure App Configuration 配置存储组件的详细信息
aliases:
  - "/operations/components/setup-configuration-store/supported-configuration-stores/setup-azure-appconfig/"
---

## 组件格式

要设置 Azure App Configuration 配置存储，需创建一个类型为 `configuration.azure.appconfig` 的组件。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: configuration.azure.appconfig
  version: v1
  metadata:
  - name: host # 当使用 Azure 身份验证机制时应使用 host。
    value: <HOST>
  - name: connectionString # 当使用 Azure 身份验证机制时不应使用 connectionString。
    value: <CONNECTIONSTRING>
  - name: maxRetries
    value: # 可选
  - name: retryDelay
    value: # 可选
  - name: maxRetryDelay
    value: # 可选
  - name: azureEnvironment # 可选，默认为 AZUREPUBLICCLOUD
    value: "AZUREPUBLICCLOUD"
  # 请参阅下方的身份验证部分以了解所有选项
  - name: azureTenantId # 可选
    value: "[your_service_principal_tenant_id]"
  - name: azureClientId # 可选
    value: "[your_service_principal_app_id]"
  - name: azureCertificateFile # 可选
    value : "[pfx_certificate_file_fully_qualified_local_path]"
  - name: subscribePollInterval # 可选
    value: #可选 [期望格式示例 - 24h]

```

{{% alert title="Warning" color="warning" %}}
上述示例使用纯文本字符串表示密钥。建议使用密钥存储来管理密钥，详见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| Field                      | Required | Details                                                                                                                                                                                                                                                                                                                       | Example |
|----------------------------|:--------:|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| connectionString  | Y*       | Azure App Configuration 实例的连接字符串。无默认值。可以是 `secretKeyRef` 以使用密钥引用。*与 host 字段互斥。*使用 [Azure 身份验证](https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/authenticating-azure/)时不使用 | `Endpoint=https://foo.azconfig.io;Id=osOX-l9-s0:sig;Secret=00000000000000000000000000000000000000000000`
| host              | N*       | Azure App Configuration 实例的终端节点。无默认值。*与 connectionString 字段互斥。*使用 [Azure 身份验证](https://docs.dapr.io/developing-applications/integrations/azure/azure-authentication/authenticating-azure/)时使用                                                   | `https://dapr.azconfig.io`
| maxRetries                 | N        | 放弃前的最大重试次数。默认为 `3`                                                                                                                                                                                                                                                                   | `5`, `10`
| retryDelay                 | N        | 重试延迟指定在重试操作前的初始延迟量。延迟随每次重试呈指数级增长，直到最大重试延迟指定的最大值。默认为 `4` 秒；`"-1"` 禁用重试间的延迟。                                                                                                                                         | `4s`
| maxRetryDelay              | N        | 最大重试延迟指定重试操作前允许的最大延迟。该值通常应大于或等于重试延迟中指定的值。默认为 `120` 秒；`"-1"` 禁用该限制                                                                                                       | `120s`
| subscribePollInterval      | N        | 订阅轮询间隔指定以纳秒为单位轮询订阅键是否有任何更改的轮询间隔。未来将更新为 Go Time 格式。默认轮询间隔为 `24` 小时。                                                                                                        | `24h`

**注意**：必须指定 `host` 或 `connectionString` 其中之一。

## 使用连接字符串进行身份验证

使用连接字符串访问 App Configuration 实例，该字符串可在 Azure 门户中获取。由于连接字符串包含凭据信息，应将其视为密钥并[使用密钥存储]({{% ref component-secrets.md %}})。

## 使用 Microsoft Entra ID 进行身份验证

Azure App Configuration 配置存储组件还支持通过 Microsoft Entra ID 进行身份验证。在启用此组件之前：
- 阅读[向 Azure 进行身份验证]({{% ref authenticating-azure.md %}})文档。
- 创建 Microsoft Entra ID 应用程序（也称为服务主体）。 
- 或者，为你的应用程序平台创建托管标识。

## 设置 Azure App Configuration

你需要一个 Azure 订阅来设置 Azure App Configuration。

1. [启动 Azure App Configuration 创建流程](https://ms.portal.azure.com/#create/Microsoft.Azconfig)。必要时登录。
1. 点击**创建**开始部署你的 Azure App Configuration 实例。
1. 实例创建完成后，获取**主机（终端节点）**或**连接字符串**：
   - 对于主机：导航至资源的**概览**并复制**终端节点**。
   - 对于连接字符串：导航至**设置** > **访问密钥**并复制你的连接字符串。
1. 将你的主机或连接字符串添加到 Dapr 可应用的 `azappconfig.yaml` 文件中。
     
   将 `host` 键设置为 `[终端节点]`或将 `connectionString` 键设置为你之前保存的值。
   
   {{% alert title="Note" color="primary" %}}
   在生产级应用程序中，遵循[密钥管理]({{% ref component-secrets.md %}})说明以安全地管理你的密钥。
   {{% /alert %}}

## Azure App Configuration 请求元数据 

在 Azure App Configuration 中，你可以使用标签为同一键定义不同的值。例如，你可以为开发环境和生产环境定义一个具有不同值的单个键。你可以指定在连接到 App Configuration 时加载哪个标签

Azure App Configuration 存储组件支持以下可选的 `label` 元数据属性：

`label`：要检索的配置的标签。如果不存在，配置存储将返回指定键和空标签的配置。

标签可以通过请求 URL 中的查询参数来填充：

```bash
GET curl http://localhost:<daprPort>/v1.0/configuration/<store-name>?key=<key name>&metadata.label=<label value>
```

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [配置构建块]({{% ref configuration-api-overview %}})
