---
type: docs
title: "Azure SignalR 绑定规范"
linkTitle: "Azure SignalR"
description: "Azure SignalR 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/signalr/"
---

## 组件格式

若要设置 Azure SignalR 绑定，需创建一个类型为 `bindings.azure.signalr` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.signalr
  version: v1
  metadata:
  - name: connectionString
    value: "Endpoint=https://<your-azure-signalr>.service.signalr.net;AccessKey=<your-access-key>;Version=1.0;"
  - name: hub  # Optional
    value: "<hub name>"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥以纯字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `connectionString` | Y | Output | Azure SignalR 连接字符串 | `"Endpoint=https://<your-azure-signalr>.service.signalr.net;AccessKey=<your-access-key>;Version=1.0;"` |
| `hub` | N | Output | 定义消息发送到的 Hub。Hub 可以在发布到输出绑定时作为元数据值（键为 "hub"）动态定义 | `"myhub"` |
| `endpoint` | N | Output | Azure SignalR 的终结点；如果 `connectionString` 中未包含或使用 Microsoft Entra ID 时必需 | `"https://<your-azure-signalr>.service.signalr.net"`
| `accessKey` | N | Output | 访问密钥 | `"your-access-key"`

### Microsoft Entra ID 身份验证

Azure SignalR 绑定组件支持使用所有 Microsoft Entra ID 机制进行身份验证。请参阅[向 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})，根据您选择的 Microsoft Entra ID 身份验证机制了解相关组件元数据字段。

您可以通过两种选项使用 Microsoft Entra ID 对此组件进行身份验证：

- 传递单独的元数据键：
  - `endpoint` 用于终结点
  - 如需要：`azureClientId`、`azureTenantId` 和 `azureClientSecret`
- 传递指定了 `AuthType=aad` 的连接字符串：
  - 系统分配的托管标识：`Endpoint=https://<servicename>.service.signalr.net;AuthType=aad;Version=1.0;`
  - 用户分配的托管标识：`Endpoint=https://<servicename>.service.signalr.net;AuthType=aad;ClientId=<clientid>;Version=1.0;`
  - Microsoft Entra ID 应用程序：`Endpoint=https://<servicename>.service.signalr.net;AuthType=aad;ClientId=<clientid>;ClientSecret=<clientsecret>;TenantId=<tenantid>;Version=1.0;`  
  注意，如果您的应用程序的 ClientSecret 包含 `;` 字符，则不能使用连接字符串。

## 绑定支持

此组件支持 **输出绑定**，具有以下操作：

- `create`

## 其他信息

默认情况下，Azure SignalR 输出绑定将向所有已连接的用户广播消息。若要缩小受众范围，有两个选项，均可在消息的 Metadata 属性中进行配置：

- group：将消息发送到特定的 Azure SignalR 组
- user：将消息发送到特定的 Azure SignalR 用户

向 Azure SignalR 输出绑定发布的应用程序应发送具有以下合约的消息：

```json
{
    "data": {
        "Target": "<enter message name>",
        "Arguments": [
            {
                "sender": "dapr",
                "text": "Message from dapr output binding"
            }
        ]
    },
    "metadata": {
        "group": "chat123"
    },
    "operation": "create"
}
```

有关将 Azure SignalR 集成到解决方案中的更多信息，请查看[文档](https://docs.microsoft.com/azure/azure-signalr/)

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作方法：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作方法：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
