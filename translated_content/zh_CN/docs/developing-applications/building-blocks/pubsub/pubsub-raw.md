---
type: docs
title: "不使用 CloudEvents 发布和订阅消息"
linkTitle: "不使用 CloudEvents 的消息"
weight: 2200
description: "了解何时可能不使用 CloudEvents 以及如何禁用它们。"
---

在向应用程序添加 Dapr 时，某些服务可能仍需要通过未封装在 CloudEvents 中的发布/订阅消息进行通信，原因可能是兼容性要求，或某些应用程序未使用 Dapr。这些被称为"原始"发布/订阅消息。Dapr 使应用程序能够[发布和订阅原始事件]({{% ref "pubsub-cloudevents#publishing-raw-messages" %}})，这些事件未包装在 CloudEvent 中，以实现兼容性并发送不可 JSON 序列化的数据。

## 发布原始消息

Dapr 应用程序能够向发布/订阅主题发布不包含 CloudEvent 封装的原始事件，以实现与非 Dapr 应用程序的兼容。

<img src="/images/pubsub_publish_raw.png" alt="图表展示当订阅者不使用 Dapr 或 CloudEvent 时如何使用 Dapr 发布消息" width=1000>

{{% alert title="警告" color="warning" %}}
不使用 CloudEvents 将禁用对追踪、基于 messageId 的事件去重、内容类型元数据以及使用 CloudEvent schema 构建的任何其他功能的支持。
{{% /alert %}}

要禁用 CloudEvent 包装，请在发布请求中设置 `rawPayload` 元数据为 `true`。这允许订阅者接收这些消息而无需解析 CloudEvent schema。

{{< tabpane text=true >}}

{{% tab "curl" %}}
```bash
curl -X "POST" http://localhost:3500/v1.0/publish/pubsub/TOPIC_A?metadata.rawPayload=true -H "Content-Type: application/json" -d '{"order-number": "345"}'
```
{{% /tab %}}

{{% tab ".NET" %}}

```csharp
using Dapr.Client;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers().AddDapr();

var app = builder.Build();

app.MapPost("/publish", async (DaprClient daprClient) =>
{
    var message = new Message(
        Guid.NewGuid().ToString(),
        $"Hello at {DateTime.UtcNow}",
        DateTime.UtcNow
    );

    await daprClient.PublishEventAsync(
        "pubsub",           // pubsub name
        "messages",         // topic name
        message,           // message data
        new Dictionary<string, string> 
        { 
            { "rawPayload", "true" },
            { "content-type", "application/json" }
        }
    );
    
    return Results.Ok(message);
});

app.Run();
```

{{% /tab %}}

{{% tab "Python" %}}
```python
from dapr.clients import DaprClient

with DaprClient() as d:
    req_data = {
        'order-number': '345'
    }
    # Create a typed message with content type and body
    resp = d.publish_event(
        pubsub_name='pubsub',
        topic_name='TOPIC_A',
        data=json.dumps(req_data),
        publish_metadata={'rawPayload': 'true'}
    )
    # Print the request
    print(req_data, flush=True)
```
{{% /tab %}}

{{% tab "PHP" %}}

```php
<?php

require_once __DIR__.'/vendor/autoload.php';

$app = \Dapr\App::create();
$app->run(function(\DI\FactoryInterface $factory) {
    $publisher = $factory->make(\Dapr\PubSub\Publish::class, ['pubsub' => 'pubsub']);
    $publisher->topic('TOPIC_A')->publish('data', ['rawPayload' => 'true']);
});
```

{{% /tab %}}

{{% tab "Java" %}}

```java
@RestController
@PathMapping("/publish")
public class PublishController {

    @Inject
    DaprClient client;

    @PostMapping
    public void sendRawMessage() {

        Map<String, String> metadata = new HashMap<>();
        metatada.put("content-type", "application/json");
        metadata.put("rawPayload", "true");

        Message message = new Message(UUID.random().toString(), "Hello from Dapr");

        client.publishEvent(
            "pubsub", // pubsub name
            "messages", // topic name
            message, // message data
            metadata) // metadata
                .block(); // wait for completion
    }
}
```
{{% /tab %}}

{{< /tabpane >}}

## 订阅原始消息

Dapr 应用程序可以订阅来自发布/订阅主题的原始消息，即使这些消息不是作为 CloudEvents 发布的。然而，订阅的 Dapr 进程仍会在将这些原始消息传递给订阅应用程序之前将其包装在 CloudEvent 中。

<img src="/images/pubsub_subscribe_raw.png" alt="图表展示当发布者不使用 Dapr 或 CloudEvent 时如何使用 Dapr 订阅消息" width=1000>

### 以编程方式订阅原始事件

以编程方式订阅时，添加 `rawPayload` 的额外元数据条目以允许订阅者接收未由 CloudEvent 包装的消息。对于 .NET，此元数据条目称为 `isRawPayload`。

使用原始负载时，消息始终使用 base64 编码，内容类型为 `application/octet-stream`。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/dapr/subscribe", () =>
{
    var subscriptions = new[]
    {
        new
        {
            pubsubname = "pubsub",
            topic = "messages",
            route = "/messages",
            metadata = new Dictionary<string, string>
            {
                { "rawPayload", "true" },
                { "content-type", "application/json" }
            }
        }
    };
    return Results.Ok(subscriptions);
});

app.MapPost("/messages", async (HttpContext context) =>
{
    using var reader = new StreamReader(context.Request.Body);
    var json = await reader.ReadToEndAsync();

    Console.WriteLine($"Raw message received: {json}");

    return Results.Ok();
});

app.Run();
```

{{% /tab %}}

{{% tab "Python" %}}

```python
import flask
from flask import request, jsonify
from flask_cors import CORS
import json
import sys

app = flask.Flask(__name__)
CORS(app)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [{'pubsubname': 'pubsub',
                      'topic': 'deathStarStatus',
                      'route': 'dsstatus',
                      'metadata': {
                          'rawPayload': 'true',
                      } }]
    return jsonify(subscriptions)

@app.route('/dsstatus', methods=['POST'])
def ds_subscriber():
    print(request.json, flush=True)
    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}

app.run()
```

{{% /tab %}}
{{% tab "PHP" %}}

```php
<?php

require_once __DIR__.'/vendor/autoload.php';

$app = \Dapr\App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions(['dapr.subscriptions' => [
    new \Dapr\PubSub\Subscription(pubsubname: 'pubsub', topic: 'deathStarStatus', route: '/dsstatus', metadata: [ 'rawPayload' => 'true'] ),
]]));

$app->post('/dsstatus', function(
    #[\Dapr\Attributes\FromBody]
    \Dapr\PubSub\CloudEvent $cloudEvent,
    \Psr\Log\LoggerInterface $logger
    ) {
        $logger->alert('Received event: {event}', ['event' => $cloudEvent]);
        return ['status' => 'SUCCESS'];
    }
);

$app->start();
```
{{% /tab %}}

{{% tab "Java" %}}
```java
@RequestMapping("/consumer")
@RestController
public class MessageConsumerController {

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    @Topic(pubsubName = "pubsub", name = "messages", metadata = "{\"rawPayload\":\"true\", \"content-type\": \"application/json\"}")
    public void consume(@RequestBody Message message) {
        System.out.println("Message received: " + message);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    @Topic(pubsubName = "pubsub", name = "another-topic", metadata = """
            {"rawPayload": "true", "content-type": "application/json"}
            """) // Using Java 15 text block
    public void consumeAnother(@RequestBody Message message) {
        System.out.println("Message received: " + message);
    }
}

```
{{% /tab %}}

{{< /tabpane >}}

## 以声明方式订阅原始事件

同样，您可以通过在订阅规范中添加 `rawPayload` 元数据条目来以声明方式订阅原始事件。

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: myevent-subscription
spec:
  topic: deathStarStatus
  routes: 
    default: /dsstatus
  pubsubname: pubsub
  metadata:
    isRawPayload: "true"
scopes:
- app1
- app2
```

## 后续步骤

- 了解更多关于[发布和订阅消息]({{% ref pubsub-overview %}})
- [发布/订阅组件]({{% ref supported-pubsub %}})列表
- 阅读[API 参考文档]({{% ref pubsub_api %}})
- 阅读关于如何[不使用 CloudEvents 消费 Kafka 消息](https://github.com/dapr/samples/pubsub-raw-payload)的 .NET 示例
