---
type: docs
title: "不使用 CloudEvents 发布和订阅消息"
linkTitle: "不使用 CloudEvents 的消息"
weight: 2200
description: "了解何时可能不使用 CloudEvents 以及如何禁用它们。"
---

在向应用程序添加 Dapr 时，某些服务可能仍需要通过未封装在 CloudEvents 中的发布订阅消息进行通信，原因可能是兼容性要求，也可能是某些应用程序并未使用 Dapr。这些消息被称为“原始”发布订阅消息。Dapr 使应用程序能够[发布和订阅原始事件]({{% ref "pubsub-cloudevents#publishing-raw-messages" %}})，即未包装在 CloudEvent 中的事件，以实现兼容性，并发送无法进行 JSON 序列化的数据。

## 发布原始消息

Dapr 应用程序能够在不进行 CloudEvent 封装的情况下，向发布订阅主题发布原始事件，以便与非 Dapr 应用程序兼容。

{{< diagram name="pubsub-publish-raw" width="65" >}}

{{% alert title="警告" color="warning" %}}
不使用 CloudEvents 会禁用对追踪、基于 messageId 的事件去重、内容类型（content-type）元数据，以及使用 CloudEvent schema 构建的任何其他功能的支持。
{{% /alert %}}

要禁用 CloudEvent 封装，请在发布请求中将 `rawPayload` 元数据设置为 `true`。这样，订阅者无需解析 CloudEvent schema 即可接收这些消息。

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
        "pubsub",           // pubsub 名称
        "messages",         // 主题名称
        message,           // 消息数据
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
    # 创建包含内容类型和正文的类型化消息
    resp = d.publish_event(
        pubsub_name='pubsub',
        topic_name='TOPIC_A',
        data=json.dumps(req_data),
        publish_metadata={'rawPayload': 'true'}
    )
    # 打印请求
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
            "pubsub", // pubsub 名称
            "messages", // 主题名称
            message, // 消息数据
            metadata) // 元数据
                .block(); // 等待完成
    }
}
```
{{% /tab %}}

{{< /tabpane >}}

## 订阅原始消息

Dapr 应用程序可以订阅来自发布订阅主题的原始消息，即使这些消息并非以 CloudEvents 形式发布。然而，订阅端的 Dapr 进程在将这些原始消息交付给订阅应用程序之前，仍会将其包装在 CloudEvent 中。

{{< diagram name="pubsub-subscribe-raw" width="65" >}}

### 以编程方式订阅原始事件

以编程方式订阅时，请添加 `rawPayload` 这一额外的元数据条目，以允许订阅者接收未被 CloudEvent 包装的消息。对于 .NET，此元数据条目名为 `isRawPayload`。

使用原始负载时，消息始终以 base64 编码，内容类型为 `application/octet-stream`。

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
            """) // 使用 Java 15 文本块
    public void consumeAnother(@RequestBody Message message) {
        System.out.println("Message received: " + message);
    }
}

```
{{% /tab %}}

{{< /tabpane >}}

## 以声明方式订阅原始事件

同样，你可以通过在订阅规范中添加 `rawPayload` 元数据条目，以声明方式订阅原始事件。

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

- 进一步了解[发布和订阅消息]({{% ref pubsub-overview %}})
- [发布订阅组件]({{% ref supported-pubsub %}})列表
- 阅读 [API 参考文档]({{% ref pubsub_api %}})
- 阅读关于如何[不使用 CloudEvents 消费 Kafka 消息](https://github.com/dapr/samples/pubsub-raw-payload)的 .NET 示例
