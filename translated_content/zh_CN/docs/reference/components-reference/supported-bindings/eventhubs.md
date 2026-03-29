---
type: docs
title: "Azure Event Hubs 绑定规约"
linkTitle: "Azure Event Hubs"
description: "Azure Event Hubs 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/eventhubs/"
---

## 组件格式

要设置 Azure Event Hubs 绑定，请创建一个类型为 `bindings.azure.eventhubs` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。

请参阅[此文档](https://docs.microsoft.com/azure/event-hubs/event-hubs-dotnet-framework-getstarted-send)了解如何设置 Event Hub。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.eventhubs
  version: v1
  metadata:
    # Hub 名称（"topic"）
    - name: eventHub
      value: "mytopic"
    - name: consumerGroup
      value: "myapp"
    # connectionString 或 eventHubNamespace 其中之一是必需的
    # 当*不*使用 Microsoft Entra ID 时使用 connectionString
    - name: connectionString
      value: "Endpoint=sb://{EventHubNamespace}.servicebus.windows.net/;SharedAccessKeyName={PolicyName};SharedAccessKey={Key};EntityPath={EventHub}"
    # 使用 Microsoft Entra ID 时使用 eventHubNamespace
    - name: eventHubNamespace
      value: "namespace"
    - name: enableEntityManagement
      value: "false"
    - name: enableInOrderMessageDelivery
      value: "false"
    # 仅当 enableEntityManagement 设置为 true 时才需要以下四个属性
    - name: resourceGroupName
      value: "test-rg"
    - name: subscriptionID
      value: "value of Azure subscription ID"
    - name: partitionCount
      value: "1"
    - name: messageRetentionInDays
      value: "3"
    # 检查点存储属性
    - name: storageAccountName
      value: "myeventhubstorage"
    - name: storageAccountKey
      value: "112233445566778899"
    - name: storageContainerName
      value: "myeventhubstoragecontainer"
    # 传递 storageAccountKey 的替代方案
    - name: storageConnectionString
      value: "DefaultEndpointsProtocol=https;AccountName=<account>;AccountKey=<account-key>"
    # 可选元数据
    - name: getAllMessageProperties
      value: "true"
    - name: direction
      value: "input, output"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规格元数据字段

| 字段              | 必填 | 绑定支持 | 详情                                                                                                                                                                                                                         | 示例 |
|--------------------|:--------:|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| `eventHub` | Y* | 输入/输出 | Event Hubs hub 的名称（"topic"）。当使用 Microsoft Entra ID 身份验证或连接字符串不包含 `EntityPath` 值时必需                                                                 | `mytopic` |
| `connectionString`    | Y*  | 输入/输出 | Event Hub 或 Event Hub 命名空间的连接字符串。<br>* 与 `eventHubNamespace` 字段互斥。<br>* 当不使用 [Microsoft Entra ID 身份验证]({{% ref "authenticating-azure.md" %}})时必需 | `"Endpoint=sb://{EventHubNamespace}.servicebus.windows.net/;SharedAccessKeyName={PolicyName};SharedAccessKey={Key};EntityPath={EventHub}"` 或 `"Endpoint=sb://{EventHubNamespace}.servicebus.windows.net/;SharedAccessKeyName={PolicyName};SharedAccessKey={Key}"`
| `eventHubNamespace` | Y* | 输入/输出 | Event Hub 命名空间名称。<br>* 与 `connectionString` 字段互斥。<br>* 当使用 [Microsoft Entra ID 身份验证]({{% ref "authenticating-azure.md" %}})时必需                                        | `"namespace"`
| `enableEntityManagement` | N | 输入/输出 | 允许管理 EventHub 命名空间和存储帐户的布尔值。默认值：`false`                                                                                                                               | `"true"`, `"false"`
| `enableInOrderMessageDelivery` | N | 输入/输出 | 允许按发布顺序传递消息的布尔值。这假设在发布或发布时设置了 `partitionKey` 以确保跨分区的顺序。默认值：`false`                    | `"true"`, `"false"`
| `resourceGroupName` | N | 输入/输出 | Event Hub 命名空间所属的资源组名称。当启用实体管理时必需                                                                                                                       | `"test-rg"`
| `subscriptionID` | N | 输入/输出 | Azure 订阅 ID 值。当启用实体管理时必需                                                                                                                                                         | `"azure subscription id"`
| `partitionCount` | N | 输入/输出 | 新 Event Hub 命名空间的分区数。仅在启用实体管理时使用。默认值：`"1"`                                                                                                               | `"2"`
| `messageRetentionInDays` | N | 输入/输出 | 在新创建的 Event Hub 命名空间中保留消息的天数。仅在启用实体管理时使用。默认值：`"1"`                                                                                     | `"90"`
| `consumerGroup` | Y | 输入 | 要侦听的 [Event Hubs 消费者组](https://docs.microsoft.com/azure/event-hubs/event-hubs-features#consumer-groups)的名称                                                                                       | `"group1"` |
| `storageAccountName`  | Y  | 输入 | 用于检查点存储的存储帐户名称。                                                                                                                                                                           |`"myeventhubstorage"`
| `storageAccountKey`   | Y*  | 输入 | 检查点存储帐户的存储帐户密钥。<br>* 使用 Microsoft Entra ID 时，如果服务主体也有权访问存储帐户，则可以省略此字段。                                            | `"112233445566778899"`
| `storageConnectionString`   | Y*  | 输入 | 检查点存储的连接字符串，是指定 `storageAccountKey` 的替代方案                                                                                                                                       | `"DefaultEndpointsProtocol=https;AccountName=myeventhubstorage;AccountKey=<account-key>"`
| `storageContainerName` | Y | 输入 | 存储帐户名称的存储容器名称。                                                                                                                                                                            | `"myeventhubstoragecontainer"`
| `getAllMessageProperties` | N | 输入 | 当设置为 `true` 时，从 Event Hub 消息中检索所有用户/应用程序/自定义属性，并在返回的事件元数据中转发它们。默认设置为 `"false"`。                                                         | `"true"`, `"false"`
| `direction` | N | 输入/输出 | 绑定的方向。                                                                                                                                                                                                   | `"input"`, `"output"`, `"input, output"`

### Microsoft Entra ID 身份验证

Azure Event Hubs 发布/订阅组件支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息以及根据选择的 Microsoft Entra ID 身份验证机制需要提供的相关组件元数据字段，请参阅[向 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})。

## 绑定支持

此组件支持**输出绑定**，具有以下操作：

- `create`：向 Azure Event Hubs 发布新消息

## 输入绑定到 Azure IoT Hub 事件

Azure IoT Hub 提供一个[与 Event Hubs 兼容的端点](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-messages-read-builtin#read-from-the-built-in-endpoint)，因此 Dapr 应用程序可以创建输入绑定，使用 Event Hubs 绑定组件来读取 Azure IoT Hub 事件。

由 Azure IoT Hub 设备创建的设备到云事件将包含其他[IoT Hub 系统属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-messages-construct#system-properties-of-d2c-iot-hub-messages)，Dapr 的 Azure Event Hubs 绑定将在响应元数据中返回以下内容：

| 系统属性名称 | 描述与路由查询关键字 |
|----------------------|:------------------------------------|
| `iothub-connection-auth-generation-id` | 发送消息的设备的 **connectionDeviceGenerationId**。请参阅 [IoT Hub 设备标识属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-connection-auth-method` | 用于对发送消息的设备进行身份验证的 **connectionAuthMethod**。 |
| `iothub-connection-device-id` | 发送消息的设备的 **deviceId**。请参阅 [IoT Hub 设备标识属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-connection-module-id` | 发送消息的设备的 **moduleId**。请参阅 [IoT Hub 设备标识属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-enqueuedtime` | 设备到云消息被 IoT Hub 接收的 **enqueuedTime**，采用 RFC3339 格式。 |
| `message-id` | 用户可设置的 AMQP **messageId**。 |

例如，HTTP `Read()` 响应的标头将包含：

```js
{
  'user-agent': 'fasthttp',
  'host': '127.0.0.1:3000',
  'content-type': 'application/json',
  'content-length': '120',
  'iothub-connection-device-id': 'my-test-device',
  'iothub-connection-auth-generation-id': '637618061680407492',
  'iothub-connection-auth-method': '{"scope":"module","type":"sas","issuer":"iothub","acceptingIpFilterRule":null}',
  'iothub-connection-module-id': 'my-test-module-a',
  'iothub-enqueuedtime': '2021-07-13T22:08:09Z',
  'message-id': 'my-custom-message-id',
  'x-opt-sequence-number': '35',
  'x-opt-enqueued-time': '2021-07-13T22:08:09Z',
  'x-opt-offset': '21560',
  'traceparent': '00-4655608164bc48b985b42d39865f3834-ed6cf3697c86e7bd-01'
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
