---
type: docs
title: "Azure Storage Queues binding spec"
linkTitle: "Azure Storage Queues"
description: "Detailed documentation on the Azure Storage Queues binding component"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/storagequeues/"
---

## 组件格式

若要设置 Azure Storage Queues 绑定，请创建类型为 `bindings.azure.storagequeues` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.storagequeues
  version: v1
  metadata:
  - name: accountName
    value: "account1"
  - name: accountKey
    value: "***********"
  - name: queueName
    value: "myqueue"
# - name: pollingInterval
#   value: "30s"
# - name: ttlInSeconds
#   value: "60"
# - name: decodeBase64
#   value: "false"
# - name: encodeBase64
#   value: "false"
# - name: endpoint
#   value: "http://127.0.0.1:10001"
# - name: visibilityTimeout
#   value: "30s"
# - name: initialVisibilityDelay
#   value: "30s"
# - name: direction 
#   value: "input, output"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥以纯文本字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})所述，使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详细信息 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `accountName` | Y | Input/Output | Azure 存储账户的名称 | `"account1"` |
| `accountKey` | Y* | Input/Output | Azure 存储账户的访问密钥。仅在不使用 Microsoft Entra ID 身份验证时需要。 | `"access-key"` |
| `queueName` | Y | Input/Output | Azure 存储队列的名称 | `"myqueue"` |
| `pollingInterval` | N | Output | 设置轮询 Azure Storage Queues 以获取新消息的间隔，以 Go duration 值表示。默认：`"10s"` | `"30s"` |
| `ttlInSeconds` | N | Output | 用于设置默认消息生存时间的参数。如果省略此参数，消息将在 10 分钟后过期。另请参阅[此处](#specifying-a-ttl-per-message) | `"60"` |
| `decodeBase64` | N | Input | 配置是否将从存储队列接收的 base64 内容解码为字符串。默认为 `false` | `true`, `false` |
| `encodeBase64` | N | Output | 如果启用，在上传到 Azure 存储队列之前将数据负载进行 base64 编码。默认 `false`。 | `true`, `false` |
| `endpoint` | N | Input/Output | 可选的自定义端点 URL。这在使用 [Azurite 模拟器](https://github.com/Azure/azurite)或为 Azure 存储使用自定义域时很有用（尽管后者不受官方支持）。端点必须是完整的基础 URL，包括协议（`http://` 或 `https://`）、IP 或 FQDN 以及可选端口。 | `"http://127.0.0.1:10001"` 或 `"https://accountName.queue.example.com"` |
| `initialVisibilityDelay` | N | Input | 允许设置自定义队列可见性超时，以避免立即重试最近失败的消息。默认为 30 秒。 | `"100s"` |
| `visibilityTimeout` | N | Input | 设置消息在添加到队列后变为可见之前的延迟。还可以通过在调用请求的元数据中设置 `initialVisibilityDelay` 属性来为每条消息指定此延迟。默认为 0 秒。 | `"30s"` |
| `direction` | N | Input/Output | 绑定的方向。 | `"input"`, `"output"`, `"input, output"` |

### Microsoft Entra ID 身份验证

Azure Storage Queue 绑定组件支持使用所有 Microsoft Entra ID 机制进行身份验证。请参阅[向 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})，根据您选择的 Microsoft Entra ID 身份验证机制，了解相关的组件元数据字段。

## 绑定支持

此组件同时支持 **输入和输出** 绑定接口。

此组件支持具有以下操作的 **输出绑定**：

- `create`

## 为每条消息指定 TTL

生存时间可以在队列级别定义（如上所示）或在消息级别定义。在消息级别定义的值会覆盖在队列级别设置的任何值。

要在消息级别设置生存时间，请在绑定调用期间使用请求正文中的 `metadata` 部分。

字段名称为 `ttlInSeconds`。

示例：

```shell
curl -X POST http://localhost:3500/v1.0/bindings/myStorageQueue \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        },
        "metadata": {
          "ttlInSeconds": "60"
        },
        "operation": "create"
      }'
```

## 为每条消息指定初始可见性延迟

初始可见性延迟可以在队列级别或消息级别定义。在消息级别定义的值会覆盖在队列级别设置的任何值。

要在消息级别设置初始可见性延迟值，请在绑定调用期间使用请求正文中的 `metadata` 部分。

字段名称为 `initialVisbilityDelay`。

示例：

```shell
curl -X POST http://localhost:3500/v1.0/bindings/myStorageQueue \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        },
        "metadata": {
          "initialVisbilityDelay": "30"
        },
        "operation": "create"
      }'
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
