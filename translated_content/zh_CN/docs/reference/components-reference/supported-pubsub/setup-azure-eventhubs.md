---
type: docs
title: "Azure Event Hubs"
linkTitle: "Azure Event Hubs"
description: "Azure Event Hubs pubsub 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-azure-eventhubs/"
---

## Component format

要设置 Azure Event Hubs pub/sub，请创建一个类型为 `pubsub.azure.eventhubs` 的 component。请参阅 [pub/sub broker component 文件]({{% ref setup-pubsub.md %}})，了解 ConsumerID 是如何自动生成的。阅读[操作指南：发布和订阅]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})，了解如何创建和应用 pub/sub 配置。

除了下面显示的配置元数据字段外，Azure Event Hubs 还支持 [Azure 身份验证]({{% ref "authenticating-azure.md" %}})机制。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eventhubs-pubsub
spec:
  type: pubsub.azure.eventhubs
  version: v1
  metadata:
    # connectionString 或 eventHubNamespace 是必需的
    # 不使用 Microsoft Entra ID 时使用 connectionString
    - name: connectionString
      value: "Endpoint=sb://{EventHubNamespace}.servicebus.windows.net/;SharedAccessKeyName={PolicyName};SharedAccessKey={Key};EntityPath={EventHub}"
    # 使用 Microsoft Entra ID 时使用 eventHubNamespace
    - name: eventHubNamespace
      value: "namespace"
    - name: consumerID # 可选。如果未提供，运行时将创建一个。
      value: "channel1"
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
```

{{% alert title="警告" color="warning" %}}
上述示例以纯字符串形式使用 secrets。建议按照[此处]({{% ref component-secrets.md %}})的说明，为 secrets 使用 secret store。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情                                                                                                                                                                                                                                                                                                                                 | 示例 |
|--------------------|:--------:|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------|
| `connectionString`    | Y*  | Event Hub 或 Event Hub namespace 的连接字符串。<br>* 与 `eventHubNamespace` 字段互斥。<br>* 在不使用 [Microsoft Entra ID 身份验证]({{% ref "authenticating-azure.md" %}})时必需。                                                                                                         | `"Endpoint=sb://{EventHubNamespace}.servicebus.windows.net/;SharedAccessKeyName={PolicyName};SharedAccessKey={Key};EntityPath={EventHub}"` 或 `"Endpoint=sb://{EventHubNamespace}.servicebus.windows.net/;SharedAccessKeyName={PolicyName};SharedAccessKey={Key}"`
| `eventHubNamespace` | Y* | Event Hub namespace 名称。<br>* 与 `connectionString` 字段互斥。<br>* 在使用 [Microsoft Entra ID 身份验证]({{% ref "authenticating-azure.md" %}})时必需。                                                                                                                                                | `"namespace"` 
| `consumerID`       | N | 消费者 ID（消费者标签）将一个或多个消费者组织为一个组。具有相同消费者 ID 的消费者作为一个虚拟消费者工作；例如，一条消息只会被组中的某一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用程序 ID（`appID`）的值。 | 可以设置为字符串值（如上例中的 `"channel1"`），也可以设置为字符串格式的值（如 `"{podName}"` 等）。[查看你可以在 component metadata 中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| `enableEntityManagement` | N | 布尔值，允许管理 EventHub namespace 和存储账户。默认值：`false`                                                                                                                                                                                                                                       | `"true", "false"`
| `enableInOrderMessageDelivery` | N | 布尔值，控制消息是否在每个分区内按顺序处理。这假定在发布时设置了 `partitionKey`，以保证相关消息的顺序。默认值：`false`。<br><br>当为 `true` 时，component 按分区顺序每次处理一个批次。当为 `false` 时，handlers 并发运行。两种模式都提供至少一次投递，并且只对连续成功处理的消息设置 checkpoint。 | `"true"`, `"false"`
| `maxConcurrentHandlers` | N | 仅当 `enableInOrderMessageDelivery` 为 `false` 时适用。每个分区中未完成的 handler 调用数量上限。一次调用在运行直至成功之前处于未完成状态；若分区上较早的调用尚未成功，则它在自身成功之后仍处于未完成状态。待该次调用及其之前的所有调用都成功后，槽位即被释放，与 checkpoint 是否已写入无关。达到上限时，component 会停止从该分区接收消息，直到有槽位释放。参见[消息投递行为](#消息投递行为)。必须大于 `0`。默认值：`100`。 | `"100"`
| `storageAccountName`  | Y  | 用于 checkpoint store 的存储账户名称。                                                                                                                                                                                                                                                                                   |`"myeventhubstorage"`
| `storageAccountKey`   | Y*  | checkpoint store 账户的存储账户密钥。<br>* 使用 Microsoft Entra ID 时，如果服务主体也有权访问存储账户，则可以省略此项。                                                                                                                                                    | `"112233445566778899"`
| `storageConnectionString`   | Y*  | checkpoint store 的连接字符串，可替代指定 `storageAccountKey`                                                                                                                                                                                                                                               | `"DefaultEndpointsProtocol=https;AccountName=myeventhubstorage;AccountKey=<account-key>"`
| `storageContainerName` | Y | 存储账户名称对应的存储容器名称。                                                                                                                                                                                                                                                                                    | `"myeventhubstoragecontainer"`
| `resourceGroupName` | N | Event Hub namespace 所属资源组的名称。启用 entity management时必需                                                                                                                                                                                                                               | `"test-rg"`
| `subscriptionID` | N | Azure 订阅 ID 值。启用 entity management时必需                                                                                                                                                                                                                                                                 | `"azure subscription id"`
| `partitionCount` | N | 新 Event Hub namespace 的分区数量。仅在启用 entity management时使用。默认值：`"1"`                                                                                                                                                                                                                       | `"2"`
| `messageRetentionInDays` | N | 在新创建的 Event Hub namespace 中保留消息的天数。仅在启用 entity management时使用。默认值：`"1"`                                                                                                                                                                                             | `"90"`

### Microsoft Entra ID 身份验证

Azure Event Hubs pub/sub component 支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息，以及根据所选的 Microsoft Entra ID 身份验证机制需要提供的 metadata 字段，请参阅[Azure 身份验证文档]({{% ref authenticating-azure.md %}})。

#### 配置示例

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: eventhubs-pubsub
spec:
  type: pubsub.azure.eventhubs
  version: v1
  metadata:
    # 使用的 Azure 身份验证
    - name: azureTenantId
      value: "***"
    - name: azureClientId
      value: "***"
    - name: azureClientSecret
      value: "***"
    - name: eventHubNamespace 
      value: "namespace"
    - name: enableEntityManagement
      value: "false"
    # 仅当 enableEntityManagement 设置为 true 时才需要以下四个属性
    - name: resourceGroupName
      value: "test-rg"
    - name: subscriptionID
      value: "value of Azure subscription ID"
    - name: partitionCount
      value: "1"
    - name: messageRetentionInDays
    # checkpoint store 属性
    # 在此情况下，我们也使用 Microsoft Entra ID 访问存储账户
    - name: storageAccountName
      value: "myeventhubstorage"
    - name: storageContainerName
      value: "myeventhubstoragecontainer"
```

## 发送和接收多条消息

Azure Eventhubs 支持使用 bulk pub/sub API，在单个操作中发送和接收多条消息。

### 配置批量发布

要设置批量发布操作的 metadata，请在 HTTP 请求或 gRPC metadata 上设置查询参数，[如 API 参考中所述]({{% ref pubsub_api %}})。

| Metadata | 默认值 |
|----------|---------|
| `metadata.maxBulkPubBytes` | `1000000` |

### 配置批量订阅

订阅 topic 时，你可以配置 `bulkSubscribe` 选项。更多详情请参阅[批量订阅消息]({{% ref "pubsub-bulk#subscribing-messages-in-bulk" %}})，并了解 [bulk subscribe API]({{% ref pubsub-bulk.md %}})。

| 配置 | 默认值 |
|---------------|---------|
| `maxMessagesCount` | `100` |
| `maxAwaitDurationMs` | `10000` |

## 消息投递行为

当 `enableInOrderMessageDelivery` 为 `true` 时，component 按分区顺序每次处理一条消息；对于批量订阅，则每次处理一个批次。当为 `false` 时，handlers 并发运行。两种模式都提供至少一次投递。component 会使用已配置的退避时间无限期重试失败的 handler 调用，直到处理成功或订阅被取消。

在并发模式下，`maxConcurrentHandlers` 限制每个分区中未完成的 handler 调用数量。每次调用处理一条消息；对于批量订阅，则处理一个批次。调用在运行或重试期间占用其槽位；若分区上较早的调用尚未成功，则该调用在自身成功之后仍占用槽位。待该次调用及其之前的所有调用都成功后，component 释放该槽位。当所有槽位都在使用中时，component 会停止从该分区接收消息，直到有槽位释放。持续失败的消息会占用其槽位，之后的每次调用也都会占用槽位，因此一旦达到上限，该分区便会停止接收消息。

Checkpoint 只会沿着连续成功处理的消息向前推进。例如，若消息 1、2 和 4 已成功，而消息 3 仍在运行或重试，则 checkpoint 无法越过消息 2。待消息 3 成功后，下一个符合条件的 checkpoint 即可推进至消息 4。关于 component 写入 checkpoint 的频率，请参阅[配置 checkpoint 频率](#配置-checkpoint-频率)。

## 配置 checkpoint 频率

订阅 topic 时，你可以通过[在 HTTP 或 gRPC 订阅请求中设置 metadata]({{% ref "pubsub_api.md#http-request-2" %}})来配置分区中的检查点频率。默认频率为 `1`。该频率统计的是连续成功处理的事件数，对于批量订阅则统计批次数。当频率大于 `1` 时，重启后可能会重新投递在最近一次已存储的 checkpoint 之后成功处理的消息。

将频率设置为 `0` 会停止写入新的 checkpoint，但不会删除已存储的 checkpoint。已存在的 checkpoint 仍是重启位置。如果不存在 checkpoint，则有序投递和并发投递都会从最早保留的事件开始。

[了解有关检查点的更多信息](https://learn.microsoft.com/azure/event-hubs/event-hubs-features#checkpointing)。

| Metadata | 默认值 |
| -------- | ------- |
| `metadata.checkPointFrequencyPerPartition` | `1` |

以下示例展示了使用 `checkPointFrequencyPerPartition` metadata 的 [Declarative subscription]({{% ref "subscription-methods.md#declarative-subscriptions" %}}) 订阅文件示例。同样，你也可以在 [Programmatic subscriptions]({{% ref "subscription-methods.md#programmatic-subscriptions" %}}) 中传递 metadata。

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-pub-sub
spec:
  topic: orders
  routes: 
    default: /checkout
  pubsubname: order-pub-sub
  metadata:
    checkPointFrequencyPerPartition: 1
scopes:
- orderprocessing
- checkout
```

{{% alert title="注意" color="primary" %}}
使用 `BulkSubscribe` 订阅 topic 时，你需要将检查点配置为在指定数量的 _批次_ 之后发生，而不是事件之后；其中 _批次_ 指在单个请求中接收到的事件集合。失败的批量批次会被整体重试，这会提供至少一次投递，并且其中成功的条目可能会被投递多次。
{{% /alert %}}

## 创建 Azure Event Hub

按照[文档](https://docs.microsoft.com/azure/event-hubs/event-hubs-create)中的说明设置 Azure Event Hubs。

由于此 component 使用 Azure Storage 作为 checkpoint store，你还需要一个 [Azure Storage 账户](https://docs.microsoft.com/azure/storage/common/storage-account-create?tabpane=azure-portal)。按照[文档](https://docs.microsoft.com/azure/storage/common/storage-account-keys-manage)中的说明管理存储账户访问密钥。

请参阅[文档](https://docs.microsoft.com/azure/event-hubs/authorize-access-shared-access-signature)了解如何获取 Event Hubs 连接字符串（注意这不是 Event Hubs namespace 的连接字符串）。

### 为每个订阅者创建消费者组

对于每个想要订阅事件的 Dapr 应用程序，请创建一个以 Dapr App ID 命名的 Event Hubs 消费者组。例如，一个在 Kubernetes 上运行且 `dapr.io/app-id: "myapp"` 的 Dapr 应用程序将需要一个名为 `myapp` 的 Event Hubs 消费者组。

注意：Dapr 会将消费者组的名称传递给 Event Hub，因此无需在 metadata 中提供。

## Entity Management

当在 metadata 中启用 entity management时，只要应用程序具有操作 Event Hub namespace 的正确角色和权限，Dapr 就可以自动为你创建 Event Hub 和消费者组。

Event Hub 名称是发布或订阅的传入请求中的 `topic` 字段，而消费者组名称是订阅给定 Event Hub 的 Dapr 应用程序的名称。例如，一个在 Kubernetes 上运行且名称为 `dapr.io/app-id: "myapp"` 的 Dapr 应用程序需要一个名为 `myapp` 的 Event Hubs 消费者组。

只有在使用 [Microsoft Entra ID 身份验证]({{% ref "authenticating-azure.md" %}})而非连接字符串时，才能使用 Entity management。

> Dapr 会将消费者组的名称传递给 Event Hub，因此无需在 metadata 中提供该名称。

## 接收自定义属性

默认情况下，Dapr 不会转发[自定义属性](https://learn.microsoft.com/azure/event-hubs/add-custom-data-event)。但是，通过将订阅 metadata `requireAllProperties` 设置为 `"true"`，你可以将自定义属性作为 HTTP 头接收。

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order-pub-sub
spec:
  topic: orders
  routes: 
    default: /checkout
  pubsubname: order-pub-sub
  metadata:
    requireAllProperties: "true"
```

也可以使用 Dapr SDK 实现相同的效果：

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
[Topic("order-pub-sub", "orders")]
[TopicMetadata("requireAllProperties", "true")]
[HttpPost("checkout")]
public ActionResult Checkout(Order order, [FromHeader] int priority)
{
    return Ok();
}
```

{{% /tab %}}

{{< /tabpane >}}

## 订阅 Azure IoT Hub 事件

Azure IoT Hub 提供了一个[与 Event Hubs 兼容的端点](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-messages-read-builtin#read-from-the-built-in-endpoint)，因此 Azure Event Hubs pubsub component 也可用于订阅 Azure IoT Hub 事件。

由 Azure IoT Hub 设备创建的设备到云事件将包含额外的 [IoT Hub 系统属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-messages-construct#system-properties-of-d2c-iot-hub-messages)，Dapr 的 Azure Event Hubs pubsub component 将在响应 metadata 中返回以下内容：

| 系统属性名称 | 描述和路由查询关键字 |
|----------------------|:------------------------------------|
| `iothub-connection-auth-generation-id` | 发送消息的设备的 **connectionDeviceGenerationId**。请参阅 [IoT Hub 设备身份属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-connection-auth-method` | 用于对发送消息的设备进行身份验证的 **connectionAuthMethod**。 |
| `iothub-connection-device-id` | 发送消息的设备的 **deviceId**。请参阅 [IoT Hub 设备身份属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-connection-module-id` | 发送消息的设备的 **moduleId**。请参阅 [IoT Hub 设备身份属性](https://docs.microsoft.com/azure/iot-hub/iot-hub-devguide-identity-registry#device-identity-properties)。 |
| `iothub-enqueuedtime` | IoT Hub 接收到该设备到云消息的 RFC3339 格式 **enqueuedTime**。 |
| `message-id` | 用户可设置的 AMQP **messageId**。 |

例如，已投递的 HTTP 订阅消息的头将包含：

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
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})，了解配置 pub/sub component 的说明
- [pub/sub building block]({{% ref pubsub %}})
- [Azure 身份验证]({{% ref "authenticating-azure.md" %}})
