---
type: docs
title: "消息生存时间 (TTL)"
linkTitle: "消息 TTL"
weight: 7000
description: "在发布订阅消息中使用生存时间。"
---

## 简介

Dapr 支持每条消息设置生存时间（TTL）。这意味着应用程序可以为每条消息设置生存时间，订阅者在消息过期后将不会收到这些消息。

所有 Dapr [发布订阅组件]({{% ref supported-pubsub %}})都兼容消息 TTL，因为 Dapr 在运行时内部处理 TTL 逻辑。只需在发布消息时设置 `ttlInSeconds` 元数据即可。

对于某些组件（如 Kafka），可以通过 `retention.ms` 在主题级别配置生存时间，详见 [文档](https://kafka.apache.org/documentation/#topicconfigs_retention.ms)。通过 Dapr 的消息 TTL，使用 Kafka 的应用程序现在可以除了按主题设置外，还可以为每条消息设置生存时间。

## 原生消息 TTL 支持

当发布订阅组件原生支持消息生存时间时，Dapr 直接转发 TTL 配置，不添加任何额外逻辑，保持可预测的行为。这在组件以不同方式处理过期消息时很有帮助。例如，使用 Azure Service Bus 时，过期消息会被存储在死信队列中，而不会被简单删除。

{{% alert title="注意" color="primary" %}}
你也可以在创建消息代理时设置消息 TTL。请查看你正在使用的组件的具体特性，以确定这是否适合你的场景。

{{% /alert %}

### 支持的组件

#### Azure Service Bus

Azure Service Bus 支持[实体级别生存时间](https://docs.microsoft.com/azure/service-bus-messaging/message-expiration)。这意味着消息具有默认生存时间，但也可以在发布时设置为更短的时间范围。Dapr 会传播消息的 TTL 元数据，并让 Azure Service Bus 直接处理过期。

## 非 Dapr 订阅者

如果消息被不使用 Dapr 的订阅者消费，过期消息不会被自动丢弃，因为过期处理是由 Dapr 运行时在 Dapr 边车接收消息时执行的。但是，订阅者可以通过添加逻辑来处理云事件中的 `expiration` 属性来以编程方式丢弃过期消息，该属性遵循 [RFC3339](https://tools.ietf.org/html/rfc3339) 格式。

当非 Dapr 订阅者使用原生处理消息 TTL 的组件（如 Azure Service Bus）时，它们不会收到过期的消息。这种情况下，不需要额外逻辑。

## 示例

消息 TTL 可以作为发布请求的一部分在元数据中设置：

{{< tabpane text=true >}}

{{% tab "curl" %}}
```bash
curl -X "POST" http://localhost:3500/v1.0/publish/pubsub/TOPIC_A?metadata.ttlInSeconds=120 -H "Content-Type: application/json" -d '{"order-number": "345"}'
```
{{% /tab %}}
[%] (tab "Python SDK" %%)
```python
from dapr.clients import DaprClient

with DaprClient() as d:
    req_data = {
        'order-number': '345'
    }
    # Create a typed message with content type and body
    resp = d.publish_event(
        pubsub_name='pubsub',
        topic='TOPIC_A',
        data=json.dumps(req_data),
        publish_metadata={'ttlInSeconds': '120'}
    )
    # Print the request
    print(req_data, flush=True)
```
{{% /tab %}}
[%] (tab "PHP SDK" %%)
```php
<?php

require_once __DIR__.'/vendor/autoload.php';

$app = \Dapr\App::create();
$app->run(function(\DI\FactoryInterface $factory) {
    $publisher = $factory->make(\Dapr\PubSub\Publish::class, ['pubsub' => 'pubsub']);
    $publisher->topic('TOPIC_A')->publish('data', ['ttlInSeconds' => '120']);
});
```
[%] (/tab "PHP SDK" %%)
[%] (/tabpane >)

有关发布订阅 API 的参考，请参阅[本指南]({{% ref pubsub_api %}})。

## 下一步

- 了解[主题作用域]({{% ref pubsub-scopes %}})
- 了解[如何配置多命名空间的发布订阅组件]({{% ref pubsub-namespaces %}})
- [发布订阅组件]({{% ref supported-pubsub %}})列表
- 阅读 [API 参考]({{% ref pubsub_api %}})
