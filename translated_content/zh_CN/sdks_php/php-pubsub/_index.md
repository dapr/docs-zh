---
type: docs
title: "使用 PHP 进行发布订阅"
linkTitle: "发布订阅"
weight: 1000
description: 如何使用
no_list: true
---

使用 Dapr，你可以发布任何内容，包括云事件。SDK 包含一个简单的云事件实现，但你也可以直接传递一个符合云事件规范的数组，或者使用其他库。

```php
<?php
$app->post('/publish', function(\Dapr\Client\DaprClient $daprClient) {
    $daprClient->publishEvent(pubsubName: 'pubsub', topicName: 'my-topic', data: ['something' => 'happened']);
});
```

有关发布/订阅的更多信息，请查看[操作指南]({{% ref howto-publish-subscribe.md %}})。

## 数据内容类型

PHP SDK 允许在构造自定义云事件或发布原始数据时设置数据内容类型。

{{< tabpane text=true >}}

{{% tab header="CloudEvent" %}}

```php
<?php
$event = new \Dapr\PubSub\CloudEvent();
$event->data = $xml;
$event->data_content_type = 'application/xml';
```

{{% /tab %}}
{{% tab header="Raw" %}}

```php
<?php
/**
 * @var \Dapr\Client\DaprClient $daprClient 
 */
$daprClient->publishEvent(pubsubName: 'pubsub', topicName: 'my-topic', data: $raw_data, contentType: 'application/octet-stream');
```

{{% alert title="Binary data" color="warning" %}}

二进制数据仅支持 `application/octet-steam`。

{{% /alert %}}

{{% /tab %}}

{{< /tabpane >}}

## 接收云事件

在你的订阅处理程序中，你可以让 DI 容器向你的控制器中注入 `Dapr\PubSub\CloudEvent` 或 `array`。前者会进行一些验证以确保你有一个正确的事件。如果你需要直接访问数据，或者事件不符合规范，请使用 `array`。
