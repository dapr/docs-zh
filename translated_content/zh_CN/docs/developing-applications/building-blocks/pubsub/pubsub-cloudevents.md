---
type: docs
title: "使用 CloudEvents 发布和订阅消息"
linkTitle: "使用 CloudEvents 消息"
weight: 2100
description: "了解 Dapr 为何使用 CloudEvents、它们如何在 Dapr 发布订阅中工作，以及如何创建 CloudEvents。"
---

为启用消息路由并为每条消息提供额外的上下文，Dapr 使用 [CloudEvents 1.0 规范](https://github.com/cloudevents/spec/tree/v1.0) 作为其消息格式。应用程序使用 Dapr 发送到主题的任何消息都会自动包装在 CloudEvents 信封中，并使用 [`Content-Type` 头部的值]({{% ref "pubsub-overview#content-types" %}}) 作为 `datacontenttype` 属性。

Dapr 使用 CloudEvents 为事件负载提供额外的上下文，从而启用以下功能：

- 追踪
- 用于正确反序列化事件数据的内容类型
- 验证发送方应用程序

你可以通过发布订阅选择三种方法之一来发布 CloudEvent：

1. 发送一个发布订阅事件，然后由 Dapr 将其包装在 CloudEvents 信封中。
2. 通过覆盖标准 CloudEvent 属性来替换 Dapr 提供的特定 CloudEvents 属性。
3. 在发布订阅事件中自行编写 CloudEvent 信封。

## Dapr 生成的 CloudEvents 示例

向 Dapr 发送发布操作会自动将其包装在包含以下字段的 CloudEvent 信封中：

- `id`
- `source`
- `specversion`
- `type`
- `traceparent`
- `traceid`
- `tracestate`
- `topic`
- `pubsubname`
- `time`
- `datacontenttype`（可选）

以下示例演示了 Dapr 为发布到 `orders` 主题的操作生成的 CloudEvent，其中包括：
- W3C `traceid`，对每条消息唯一
- `data` 和 CloudEvent 的字段，其中数据内容被序列化为 JSON

```json
{
  "topic": "orders",
  "pubsubname": "order_pub_sub",
  "traceid": "00-113ad9c4e42b27583ae98ba698d54255-e3743e35ff56f219-01",
  "tracestate": "",
  "data": {
    "orderId": 1
  },
  "id": "5929aaac-a5e2-4ca1-859c-edfe73f11565",
  "specversion": "1.0",
  "datacontenttype": "application/json; charset=utf-8",
  "source": "checkout",
  "type": "com.dapr.event.sent",
  "time": "2020-09-23T06:23:21Z",
  "traceparent": "00-113ad9c4e42b27583ae98ba698d54255-e3743e35ff56f219-01"
}
```

作为 v1.0 CloudEvent 的另一个示例，以下显示数据作为 XML 内容在序列化为 JSON 的 CloudEvent 消息中：

```json
{
  "topic": "orders",
  "pubsubname": "order_pub_sub",
  "traceid": "00-113ad9c4e42b27583ae98ba698d54255-e3743e35ff56f219-01",
  "tracestate": "",
  "data" : "<note><to></to><from>user2</from><message>Order</message></note>",
  "id" : "id-1234-5678-9101",
  "specversion" : "1.0",
  "datacontenttype" : "text/xml",
  "subject" : "Test XML Message",
  "source" : "https://example.com/message",
  "type" : "xml.message",
   "time" : "2020-09-23T06:23:21Z"
}
```

## 替换 Dapr 生成的 CloudEvents 值

Dapr 自动生成多个 CloudEvent 属性。你可以通过提供以下可选元数据键/值来替换这些生成的 CloudEvent 属性：

- `cloudevent.id`：覆盖 `id`
- `cloudevent.source`：覆盖 `source`
- `cloudevent.type`：覆盖 `type`
- `cloudevent.traceid`：覆盖 `traceid`
- `cloudevent.tracestate`：覆盖 `tracestate`
- `cloudevent.traceparent`：覆盖 `traceparent`

使用这些元数据属性替换 CloudEvents 属性的能力适用于所有发布订阅组件。

### 示例

例如，要在代码中替换[上述 CloudEvent 示例]({{% ref "#cloudevents-example" %}})中的 `source` 和 `id` 值：

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}
```python
with DaprClient() as client:
    order = {'orderId': i}
    # Publish an event/message using Dapr PubSub
    result = client.publish_event(
        pubsub_name='order_pub_sub',
        topic_name='orders',
        publish_metadata={'cloudevent.id': 'd99b228f-6c73-4e78-8c4d-3f80a043d317', 'cloudevent.source': 'payment'}
    )

    # or

    cloud_event = {
        'specversion': '1.0',
        'type': 'com.example.event',
        'source': 'payment',
        'id': 'd99b228f-6c73-4e78-8c4d-3f80a043d317',
        'data': {'orderId': i},
        'datacontenttype': 'application/json',
        ...
    }

    # Set the data content type to 'application/cloudevents+json'
    result = client.publish_event(
        pubsub_name='order_pub_sub',
        topic_name='orders',
        data=json.dumps(cloud_event),
        data_content_type='application/cloudevents+json',
    )
```
{{% /tab %}}


 <!-- .NET -->
{{% tab ".NET" %}}
```csharp
var order = new Order(i);
using var client = new DaprClientBuilder().Build();

// Override cloudevent metadata
var metadata = new Dictionary<string,string>() {
    { "cloudevent.source", "payment" },
    { "cloudevent.id", "d99b228f-6c73-4e78-8c4d-3f80a043d317" }
}

// Publish an event/message using Dapr PubSub
await client.PublishEventAsync("order_pub_sub", "orders", order, metadata);
Console.WriteLine("Published data: " + order);

await Task.Delay(TimeSpan.FromSeconds(1));
```
{{% /tab %}}


{{< /tabpane >}}

JSON 负载随后会反映新的 `source` 和 `id` 值：

```json
{
  "topic": "orders",
  "pubsubname": "order_pub_sub",
  "traceid": "00-113ad9c4e42b27583ae98ba698d54255-e3743e35ff56f219-01",
  "tracestate": "",
  "data": {
    "orderId": 1
  },
  "id": "d99b228f-6c73-4e78-8c4d-3f80a043d317",
  "specversion": "1.0",
  "datacontenttype": "application/json; charset=utf-8",
  "source": "payment",
  "type": "com.dapr.event.sent",
  "time": "2020-09-23T06:23:21Z",
  "traceparent": "00-113ad9c4e42b27583ae98ba698d54255-e3743e35ff56f219-01"
}
```

{{% alert title="重要" color="warning" %}}
虽然你可以替换 `traceid`/`traceparent` 和 `tracestate`，但这样做可能会干扰事件追踪，并在追踪工具中报告不一致的结果。建议使用 Open Telemetry 进行分布式追踪。[了解更多关于分布式追踪的信息。]({{% ref tracing-overview %}})  

{{% /alert %}}


## 发布你自己的 CloudEvent

如果你想使用自己的 CloudEvent，请确保将 [`datacontenttype`]({{% ref "pubsub-overview#setting-message-content-types" %}}) 指定为 `application/cloudevents+json`。

如果应用程序编写的 CloudEvent 不包含 CloudEvent 规范中的[最小必填字段](https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/spec.md#required-attributes)，则消息会被拒绝。如果以下字段缺失，Dapr 会将它们添加到 CloudEvent 中：

- `time`
- `traceid`
- `traceparent`
- `tracestate`
- `topic`
- `pubsubname`
- `source`
- `type`
- `specversion`

你可以在自定义 CloudEvent 中添加不属于官方 CloudEvent 规范的额外字段。Dapr 会原样传递这些字段。

### 示例

{{< tabpane text=true >}}


{{% tab "Dapr CLI" %}}


向 `orders` 主题发布一个 CloudEvent：

```bash
dapr publish --publish-app-id orderprocessing --pubsub order-pub-sub --topic orders --data '{\"orderId\": \"100\"}'
```
{{% /tab %}}


{{% tab "HTTP API (Bash)" %}}


向 `orders` 主题发布一个 CloudEvent：

```bash
curl -X POST http://localhost:3601/v1.0/publish/order-pub-sub/orders -H "Content-Type: application/cloudevents+json" -d '{"specversion" : "1.0", "type" : "com.dapr.cloudevent.sent", "source" : "testcloudeventspubsub", "subject" : "Cloud Events Test", "id" : "someCloudEventId", "time" : "2021-08-02T09:00:00Z", "datacontenttype" : "application/cloudevents+json", "data" : {"orderId": "100"}}'
```
{{% /tab %}}


{{% tab "HTTP API (PowerShell)" %}}


向 `orders` 主题发布一个 CloudEvent：

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/cloudevents+json' -Body '{"specversion" : "1.0", "type" : "com.dapr.cloudevent.sent", "source" : "testcloudeventspubsub", "subject" : "Cloud Events Test", "id" : "someCloudEventId", "time" : "2021-08-02T09:00:00Z", "datacontenttype" : "application/cloudevents+json", "data" : {"orderId": "100"}}' -Uri 'http://localhost:3601/v1.0/publish/order-pub-sub/orders'
```
{{% /tab %}}


{{< /tabpane >}}


### 发布二进制 CloudEvents

在二进制模式下，传输负载仅包含事件主体，而 CloudEvent 属性通过以 `ce_` 前缀开头的传输元数据提供（HTTP 头、Kafka 头、NATS 头等）。这在你已经生成二进制模式事件或想要发送任意二进制数据而不将其包装在额外的 JSON 信封中时非常有用。

要将二进制 CloudEvent 发布到 Dapr（通过 HTTP/gRPC 发布 API 或直接发布到 Dapr 读取的代理）：

1. 将传输的原生 content-type 元数据（例如 HTTP `Content-Type` 头或 Kafka `content-type` 消息头）设置为表示二进制数据的 MIME 类型，即 `application/octet-stream`。

2. 将必填的 CloudEvent 属性（`ce_specversion`、`ce_type`、`ce_source`、`ce_id`）添加为传输元数据。可选属性如 `ce_subject`、`ce_time` 或 `ce_traceparent` 也会被识别。

3. 在消息主体中发送负载字节。

{{< tabpane text=true >}}


{{% tab "HTTP API (Bash)" %}}


向 orders 主题发布二进制 CloudEvent：

```bash
curl -X POST http://localhost:3500/v1.0/publish/order-pub-sub/orders \
  -H "Content-Type: application/octet-stream" \
  -H "ce_specversion: 1.0" \
  -H "ce_type: com.example.order.created" \
  -H "ce_source: urn:example:/checkout" \
  -H "ce_id: 2a8bbf52-1222-4c2c-85f0-8a8875c7bc10" \
  -H "ce_subject: orders/100" \
  --data-binary $'\x01\x02\x03\x04'
```
{{% /tab %}}


{{< /tabpane >}}


## 事件去重

使用 Dapr 创建的 cloud events 时，信封包含一个 `id` 字段，应用程序可以将其用于消息去重。Dapr 不会自动处理去重。Dapr 支持使用原生支持消息去重的消息代理。

## 下一步

- 了解为什么你可能[不想使用 CloudEvents]({{% ref pubsub-raw %}})
- 尝试[发布订阅快速入门]({{% ref pubsub-quickstart %}})
- [发布订阅组件]({{% ref setup-pubsub %}})列表
- 阅读 [API 参考]({{% ref pubsub_api %}})
