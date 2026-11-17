---
type: docs
title: "Azure Event Hubs binding 规约"
linkTitle: "Azure Event Hubs"
description: "Azure Event Hubs binding 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/eventhubs/"
---

## Component 格式

要设置 Azure Event Hubs binding，请创建一个类型为 `bindings.azure.eventhubs` 的 component。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用 binding 配置。

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
    - name: maxConcurrentHandlers
      value: "100"
    # 仅当 enableEntityManagement 设置为 true 时才需要以下四个属性
    - name: resourceGroupName
      value: "test-rg"
    - name: subscriptionID
      value: "value of Azure subscription ID"
    - name: partitionCount
      value: "1"
    - name: messageRetentionInDays
      value: "3"
    # checkpoint store 属性
    - name: storageAccountName
      value: "myeventhubstorage"
    - name: storageAccountKey
      value: "112233445566778899"
    - name: storageContainerName
      value: "myeventhubstoragecontainer"
    # 传递 storageAccountKey 的替代方案
    - name: storageConnectionString
      value: "DefaultEndpointsProtocol=https;AccountName=<account>;AccountKey=<account-key>"
    # 可选 metadata
    - name: getAllMessageProperties
      value: "true"
    - name: direction
      value: "input, output"
```

{{% alert title="警告" color="warning" %}}
上述示例将 secrets 以纯字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})的描述，使用 secret store 来管理 secrets。
{{% /alert %}}

## 规格 metadata 字段

| 字段              | 必填 | Binding 支持 | 详情                                                                                                                                                                                                                         | 示例 |
|--------------------|:--------:|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| `eventHub` | Y* | 输入/输出 | Event Hubs hub 的名称（"topic"）。当使用 Microsoft Entra ID 身份验证或连接字符串不包含 `EntityPath` 值时必需                                                                 | `mytopic` |
| `connectionString`    | Y*  | 输入/输出 | Event Hub 或 Event Hub namespace 的连接字符串。<br>* 与 `eventHubNamespace` 字段互斥。<br>* 当不使用 [Microsoft Entra ID 身份验证]({{% ref "authenticating-azure.md" %}})时必需 | `"Endpoint=sb://{EventHubNamespace}.servicebus.windows.net/;SharedAccessKeyName={PolicyName};SharedAccessKey={Key};EntityPath={EventHub}"` 或 `"Endpoint=sb://{EventHubNamespace}.servicebus.windows.net/;SharedAccessKeyName={PolicyName};SharedAccessKey={Key}"`
| `eventHubNamespace` | Y* | 输入/输出 | Event Hub namespace 的名称。<br>* 与 `connectionString` 字段互斥。<br>* 当使用 [Microsoft Entra ID 身份验证]({{% ref "authenticating-azure.md" %}})时必需                                        | `"namespace"`
| `enableEntityManagement` | N | 输入/输出 | 允许管理 Event Hub namespace 和存储帐户的布尔值。默认值：`false`                                                                                                                               | `"true"`, `"false"`
| `enableInOrderMessageDelivery` | N | 输入 | 控制消息是否在每个分区内按顺序处理的布尔值。这假设发布时设置了 `partitionKey`，以保持相关消息的顺序。默认值：`false` | `"true"`, `"false"`
| `maxConcurrentHandlers` | N | 输入 | 仅当 `enableInOrderMessageDelivery` 为 `false` 时适用。每个分区未完成的处理程序调用数上限。调用在运行期间、成功之前处于未完成状态；如果分区中更早的调用尚未成功，则在该调用已成功后也仍处于未完成状态。只有当该调用及其之前的所有调用都已成功后，槽位才会释放，与检查点是否已写入无关。达到上限时，component 会停止从该分区接收消息，直到有槽位释放。参见 [Input binding 投递行为](#input-binding-投递行为)。必须大于 `0`。默认值：`100`。 | `"100"`
| `resourceGroupName` | N | 输入/输出 | Event Hub namespace 所属的资源组名称。启用实体管理时必需                                                                                                                       | `"test-rg"`
| `subscriptionID` | N | 输入/输出 | Azure 订阅 ID 值。启用实体管理时必需                                                                                                                                                         | `"azure subscription id"`
| `partitionCount` | N | 输入/输出 | 新 Event Hub namespace 的分区数。仅在启用实体管理时使用。默认值：`"1"`                                                                                                               | `"2"`
| `messageRetentionInDays` | N | 输入/输出 | 在新创建的 Event Hub namespace 中保留消息的天数。仅在启用实体管理时使用。默认值：`"1"`                                                                                     | `"90"`
| `consumerGroup` | Y | 输入 | 要监听的 [Event Hubs 消费者组](https://docs.microsoft.com/azure/event-hubs/event-hubs-features#consumer-groups)的名称                                                                                       | `"group1"` |
| `storageAccountName`  | Y  | 输入 | 用于 checkpoint store 的存储帐户名称。                                                                                                                                                                           |`"myeventhubstorage"`
| `storageAccountKey`   | Y*  | 输入 | checkpoint store 的存储帐户密钥。<br>* 使用 Microsoft Entra ID 时，如果服务主体也有权访问存储帐户，则可以省略此项。                                            | `"112233445566778899"`
| `storageConnectionString`   | Y*  | 输入 | checkpoint store 的连接字符串，是指定 `storageAccountKey` 的替代方案                                                                                                                                       | `"DefaultEndpointsProtocol=https;AccountName=myeventhubstorage;AccountKey=<account-key>"`
| `storageContainerName` | Y | 输入 | 存储帐户名称对应的存储容器名称。                                                                                                                                                                            | `"myeventhubstoragecontainer"`
| `getAllMessageProperties` | N | 输入 | 设置为 `true` 时，从 Event Hub 消息中检索所有用户/应用程序/自定义属性，并在返回的事件 metadata 中转发。默认设置为 `"false"`。                                                         | `"true"`, `"false"`
| `direction` | N | 输入/输出 | binding 的方向。                                                                                                                                                                                                   | `"input"`, `"output"`, `"input, output"`

### Input binding 投递行为

当 `enableInOrderMessageDelivery` 为 `true` 时，component 按分区顺序每次处理一个事件。为 `false` 时，处理程序并发运行。两种模式都提供至少一次投递。component 会按照已配置的退避时间无限次重试失败的处理程序调用，直到处理成功或 binding 关闭。

在并发模式下，`maxConcurrentHandlers` 限制每个分区未完成的处理程序调用数。每次调用处理一个事件。调用在运行或重试期间会占用其槽位；如果分区中更早的调用尚未成功，即使该调用已成功，它也会继续占用槽位。只有当该调用及其之前的所有调用都已成功后，component 才会释放槽位。所有槽位都被占用时，component 会停止从该分区接收消息，直到有槽位释放。持续失败的事件会占用其槽位，之后的所有调用也同样会占用槽位，因此达到上限后，该分区将停止接收消息。

检查点只会随连续成功处理的事件向前推进。每当该范围向前推进时，component 都会写入一个检查点。例如，如果事件 1、2 和 4 已成功，而事件 3 仍在运行或重试，则检查点保持在事件 2。事件 3 成功后，检查点会推进到事件 4。已存储的检查点仍是重启位置。如果不存在检查点，则有序模式和并发模式都从最早保留的事件开始。

### Microsoft Entra ID 身份验证

Azure Event Hubs pub/sub component 支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息，以及根据所选 Microsoft Entra ID 身份验证机制需要提供的相关 component metadata 字段，请参阅[向 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})。

## Binding 支持

此 component 支持 **output binding**，具有以下操作：

- `create`：向 Azure Event Hubs 发布新消息

## Input Binding 到 Azure IoT Hub 事件

Azure IoT Hub 提供了一个[与 Event Hubs 兼容的端点](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-messages-read-builtin#read-from-the-built-in-endpoint)，因此 Dapr 应用程序可以创建 input binding，使用 Event Hubs binding component 读取 Azure IoT Hub 事件。

由 Azure IoT Hub 设备创建的设备到云事件将包含额外的[IoT Hub 系统属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-messages-construct#system-properties-of-d2c-iot-hub-messages)，并且 Dapr 的 Azure Event Hubs binding 会在响应 metadata 中返回以下内容：

| 系统属性名称 | 描述与路由查询关键字 |
|----------------------|:------------------------------------|
| `iothub-connection-auth-generation-id` | 发送消息的设备的 **connectionDeviceGenerationId**。请参阅 [IoT Hub 设备标识属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-connection-auth-method` | 用于对发送消息的设备进行身份验证的 **connectionAuthMethod**。 |
| `iothub-connection-device-id` | 发送消息的设备的 **deviceId**。请参阅 [IoT Hub 设备标识属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-connection-module-id` | 发送消息的设备的 **moduleId**。请参阅 [IoT Hub 设备标识属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-enqueuedtime` | 设备到云消息被 IoT Hub 接收时的 **enqueuedTime**，采用 RFC3339 格式。 |
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

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [Bindings building block]({{% ref bindings %}})
- [操作指南：使用 input binding 触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
