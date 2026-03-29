---
type: docs
title: "批量发布和订阅消息"
linkTitle: "批量发布和订阅消息"
weight: 7100
description: "了解如何在 Dapr 中使用批量发布和订阅 API。"

使用批量发布和订阅 API，您可以在单个请求中发布和订阅多条消息。在编写需要发送或接收大量消息的应用程序时，使用批量操作可以通过减少 Dapr 边车、应用程序与底层发布订阅代理之间的请求总数来实现高吞吐量。

## 批量发布消息

### 批量发布消息时的限制

批量发布 API 允许您在单个请求中向主题发布多条消息。它是*非事务性的*，即从单个批量请求中，某些消息可能成功，某些消息可能失败。如果任何消息发布失败，批量发布操作将返回失败消息的列表。

批量发布操作也不保证消息的任何顺序。

### 示例

{{< tabpane text=true >}}

{{% tab "Java" %}}

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.BulkPublishResponse;
import io.dapr.client.domain.BulkPublishResponseFailedEntry;
import java.util.ArrayList;
import java.util.List;

class BulkPublisher {
  private static final String PUBSUB_NAME = "my-pubsub-name";
  private static final String TOPIC_NAME = "topic-a";

  public void publishMessages() {
    try (DaprClient client = (new DaprClientBuilder()).build()) {
      // 创建要发布的消息列表
      List<String> messages = new ArrayList<>();
      for (int i = 0; i < 10; i++) {
        String message = String.format("This is message #%d", i);
        messages.add(message);
      }

      // 使用批量发布 API 发布消息列表
      BulkPublishResponse<String> res = client.publishEvents(PUBSUB_NAME, TOPIC_NAME, "text/plain", messages).block();
    }
  }
}
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```typescript

import { DaprClient } from "@dapr/dapr";

const pubSubName = "my-pubsub-name";
const topic = "topic-a";

async function start() {
    const client = new DaprClient();

    // 向主题发布多条消息。
    await client.pubsub.publishBulk(pubSubName, topic, ["message 1", "message 2", "message 3"]);

    // 向主题发布多条消息，并使用显式的批量发布消息。
    const bulkPublishMessages = [
    {
      entryID: "entry-1",
      contentType: "application/json",
      event: { hello: "foo message 1" },
    },
    {
      entryID: "entry-2",
      contentType: "application/cloudevents+json",
      event: {
        specversion: "1.0",
        source: "/some/source",
        type: "example",
        id: "1234",
        data: "foo message 2",
        datacontenttype: "text/plain"
      },
    },
    {
      entryID: "entry-3",
      contentType: "text/plain",
      event: "foo message 3",
    },
  ];
  await client.pubsub.publishBulk(pubSubName, topic, bulkPublishMessages);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
using System;
using System.Collections.Generic;
using Dapr.Client;

const string PubsubName = "my-pubsub-name";
const string TopicName = "topic-a";
IReadOnlyList<object> BulkPublishData = new List<object>() {
    new { Id = "17", Amount = 10m },
    new { Id = "18", Amount = 20m },
    new { Id = "19", Amount = 30m }
};

using var client = new DaprClientBuilder().Build();

var res = await client.BulkPublishEventAsync(PubsubName, TopicName, BulkPublishData);
if (res == null) {
    throw new Exception("null response from dapr");
}
if (res.FailedEntries.Count > 0)
{
    Console.WriteLine("Some events failed to be published!");
    foreach (var failedEntry in res.FailedEntries)
    {
        Console.WriteLine("EntryId: " + failedEntry.Entry.EntryId + " Error message: " +
                          failedEntry.ErrorMessage);
    }
}
else
{
    Console.WriteLine("Published all events!");
}
```

{{% /tab %}}

{{% tab "Python" %}}

```python
import requests
import json

base_url = "http://localhost:3500/v1.0/publish/bulk/{}/{}"
pubsub_name = "my-pubsub-name"
topic_name = "topic-a"
payload = [
  {
    "entryId": "ae6bf7c6-4af2-11ed-b878-0242ac120002",
    "event": "first text message",
    "contentType": "text/plain"
  },
  {
    "entryId": "b1f40bd6-4af2-11ed-b878-0242ac120002",
    "event": {
      "message": "second JSON message"
    },
    "contentType": "application/json"
  }
]

response = requests.post(base_url.format(pubsub_name, topic_name), json=payload)
print(response.status_code)
```

{{% /tab %}}

{{% tab "Go" %}}

```go
package main

import (
  "fmt"
  "strings"
  "net/http"
  "io/ioutil"
)

const (
  pubsubName = "my-pubsub-name"
  topicName = "topic-a"
  baseUrl = "http://localhost:3500/v1.0/publish/bulk/%s/%s"
)

func main() {
  url := fmt.Sprintf(baseUrl, pubsubName, topicName)
  method := "POST"
  payload := strings.NewReader(`[
        {
            "entryId": "ae6bf7c6-4af2-11ed-b878-0242ac120002",
            "event":  "first text message",
            "contentType": "text/plain"
        },
        {
            "entryId": "b1f40bd6-4af2-11ed-b878-0242ac120002",
            "event":  {
                "message": "second JSON message"
            },
            "contentType": "application/json"
        }
]`)

  client := &http.Client {}
  req, _ := http.NewRequest(method, url, payload)

  req.Header.Add("Content-Type", "application/json")
  res, err := client.Do(req)
  // ...
}
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST http://localhost:3500/v1.0/publish/bulk/my-pubsub-name/topic-a \
  -H 'Content-Type: application/json' \
  -d '[
        {
            "entryId": "ae6bf7c6-4af2-11ed-b878-0242ac120002",
            "event":  "first text message",
            "contentType": "text/plain"
        },
        {
            "entryId": "b1f40bd6-4af2-11ed-b878-0242ac120002",
            "event":  {
                "message": "second JSON message"
            },
            "contentType": "application/json"
        },
      ]'
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Uri 'http://localhost:3500/v1.0/publish/bulk/my-pubsub-name/topic-a' `
-Body '[
        {
            "entryId": "ae6bf7c6-4af2-11ed-b878-0242ac120002",
            "event":  "first text message",
            "contentType": "text/plain"
        },
        {
            "entryId": "b1f40bd6-4af2-11ed-b878-0242ac120002",
            "event":  {
                "message": "second JSON message"
            },
            "contentType": "application/json"
        },
      ]'
```

{{% /tab %}}

{{< /tabpane >}}

## 批量订阅消息

批量订阅 API 允许您在单个请求中从主题订阅多条消息。
正如我们从[如何：发布和订阅主题]({{% ref howto-publish-subscribe %}})中所知，有三种订阅主题的方式：

- **声明式** - 订阅在外部文件中定义。
- **编程式** - 订阅在代码中定义。
- **流式** - 批量订阅*不支持*，因为消息会被发送到处理程序代码。

要批量订阅主题，我们只需要使用 `bulkSubscribe` 规范属性，如下所示：

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
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
    maxAwaitDurationMs: 40
scopes:
- orderprocessing
- checkout
```

在上面的示例中，`bulkSubscribe` 是_可选的_。如果您使用 `bulkSubscribe`，则：
- `enabled` 是必需的，用于启用或禁用此主题的批量订阅
- 您可以选择配置批量消息中传递的最大消息数（`maxMessagesCount`）。
对于不支持批量订阅的组件，`maxMessagesCount` 的默认值为 100，即应用程序与 Dapr 之间的默认批量事件。请参阅[组件如何处理发布和订阅批量消息]({{% ref pubsub-bulk %}})。
如果组件支持批量订阅，则可以在该组件文档中找到此参数的默认值。
- 您可以选择提供在批量消息发送到应用之前等待的最大持续时间（`maxAwaitDurationMs`）。
对于不支持批量订阅的组件，`maxAwaitDurationMs` 的默认值为 1000，即应用程序与 Dapr 之间的默认批量事件。请参阅[组件如何处理发布和订阅批量消息]({{% ref pubsub-bulk %}})。
如果组件支持批量订阅，则可以在该组件文档中找到此参数的默认值。

应用程序会收到与批量消息中每个条目（单独的消息）关联的 `EntryId`。应用程序必须使用此 `EntryId` 来传达该特定条目的状态。如果应用程序未能通知 `EntryId` 状态，则将其视为 `RETRY`。

需要发送一个 JSON 编码的负载主体，其中包含每个条目的处理状态：

```json
{
  "statuses":
  [
    {
    "entryId": "<entryId1>",
    "status": "<status>"
    },
    {
    "entryId": "<entryId2>",
    "status": "<status>"
    }
  ]
}
```

可能的状态值：

状态 | 描述
--------- | -----------
`SUCCESS` | 消息处理成功
`RETRY` | 消息将由 Dapr 重试
`DROP` | 记录警告并丢弃消息

有关响应的更多见解，请参阅[批量订阅的预期 HTTP 响应]({{% ref pubsub_api %}})。

### 示例

以下代码示例演示如何使用批量订阅。

{{< tabpane text=true >}}
{{% tab "Java" %}}

```java
import io.dapr.Topic;
import io.dapr.client.domain.BulkSubscribeAppResponse;
import io.dapr.client.domain.BulkSubscribeAppResponseEntry;
import io.dapr.client.domain.BulkSubscribeAppResponseStatus;
import io.dapr.client.domain.BulkSubscribeMessage;
import io.dapr.client.domain.BulkSubscribeMessageEntry;
import io.dapr.client.domain.CloudEvent;
import io.dapr.springboot.annotations.BulkSubscribe;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import reactor.core.publisher.Mono;

class BulkSubscriber {
  @BulkSubscribe()
  // @BulkSubscribe(maxMessagesCount = 100, maxAwaitDurationMs = 40)
  @Topic(name = "topicbulk", pubsubName = "orderPubSub")
  @PostMapping(path = "/topicbulk")
  public Mono<BulkSubscribeAppResponse> handleBulkMessage(
          @RequestBody(required = false) BulkSubscribeMessage<CloudEvent<String>> bulkMessage) {
    return Mono.fromCallable(() -> {
      List<BulkSubscribeAppResponseEntry> entries = new ArrayList<BulkSubscribeAppResponseEntry>();
      for (BulkSubscribeMessageEntry<?> entry : bulkMessage.getEntries()) {
        try {
          CloudEvent<?> cloudEvent = (CloudEvent<?>) entry.getEvent();
          System.out.printf("Bulk Subscriber got: %s\n", cloudEvent.getData());
          entries.add(new BulkSubscribeAppResponseEntry(entry.getEntryId(), BulkSubscribeAppResponseStatus.SUCCESS));
        } catch (Exception e) {
          e.printStackTrace();
          entries.add(new BulkSubscribeAppResponseEntry(entry.getEntryId(), BulkSubscribeAppResponseStatus.RETRY));
        }
      }
      return new BulkSubscribeAppResponse(entries);
    });
  }
}
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```typescript

import { DaprServer } from "@dapr/dapr";

const pubSubName = "orderPubSub";
const topic = "topicbulk";

const daprHost = process.env.DAPR_HOST || "127.0.0.1";
const daprPort = process.env.DAPR_HTTP_PORT || "3502";
const serverHost = process.env.SERVER_HOST || "127.0.0.1";
const serverPort = process.env.APP_PORT || 5001;

async function start() {
    const server = new DaprServer({
        serverHost,
        serverPort,
        clientOptions: {
            daprHost,
            daprPort,
        },
    });

    // 使用默认配置向主题发布多条消息。
    await client.pubsub.bulkSubscribeWithDefaultConfig(pubSubName, topic, (data) => console.log("Subscriber received: " + JSON.stringify(data)));

    // 使用特定的 maxMessagesCount 和 maxAwaitDurationMs 向主题发布多条消息。
    await client.pubsub.bulkSubscribeWithConfig(pubSubName, topic, (data) => console.log("Subscriber received: " + JSON.stringify(data)), 100, 40);
}

```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
using Microsoft.AspNetCore.Mvc;
using Dapr.AspNetCore;
using Dapr;

namespace DemoApp.Controllers;

[ApiController]
[Route("[controller]")]
public class BulkMessageController : ControllerBase
{
    private readonly ILogger<BulkMessageController> logger;

    public BulkMessageController(ILogger<BulkMessageController> logger)
    {
        this.logger = logger;
    }

    [BulkSubscribe("messages", 10, 10)]
    [Topic("pubsub", "messages")]
    public ActionResult<BulkSubscribeAppResponse> HandleBulkMessages([FromBody] BulkSubscribeMessage<BulkMessageModel<BulkMessageModel>> bulkMessages)
    {
        List<BulkSubscribeAppResponseEntry> responseEntries = new List<BulkSubscribeAppResponseEntry>();
        logger.LogInformation($"Received {bulkMessages.Entries.Count()} messages");
        foreach (var message in bulkMessages.Entries)
        {
            try
            {
                logger.LogInformation($"Received a message with data '{message.Event.Data.MessageData}'");
                responseEntries.Add(new BulkSubscribeAppResponseEntry(message.EntryId, BulkSubscribeAppResponseStatus.SUCCESS));
            }
            catch (Exception e)
            {
                logger.LogError(e.Message);
                responseEntries.Add(new BulkSubscribeAppResponseEntry(message.EntryId, BulkSubscribeAppResponseStatus.RETRY));
            }
        }
        return new BulkSubscribeAppResponse(responseEntries);
    }
    public class BulkMessageModel
    {
        public string MessageData { get; set; }
    }
}
```

{{% /tab %}}

{{% tab "Python" %}}
目前，您只能在 Python 中使用 HTTP 客户端进行批量订阅。

```python
import json
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    # 定义批量订阅配置
    subscriptions = [{
        "pubsubname": "pubsub",
        "topic": "TOPIC_A",
        "route": "/checkout",
        "bulkSubscribe": {
            "enabled": True,
            "maxMessagesCount": 3,
            "maxAwaitDurationMs": 40
        }
    }]
    print('Dapr pub/sub is subscribed to: ' + json.dumps(subscriptions))
    return jsonify(subscriptions)


# 定义处理传入消息的端点
@app.route('/checkout', methods=['POST'])
def checkout():
    messages = request.json
    print(messages)
    for message in messages:
        print(f"Received message: {message}")
    return json.dumps({'success': True}), 200, {'ContentType': 'application/json'}

if __name__ == '__main__':
    app.run(port=5000)

```

{{% /tab %}}

{{< /tabpane >}}

## 组件如何处理批量消息的发布和订阅

对于事件发布/订阅，涉及两种网络传输。
1. 从/到*应用程序*到/从*Dapr*。
1. 从/到*Dapr*到/从*发布订阅代理*。

这些是可能进行优化的机会。经过优化后，会发出批量请求，从而减少调用总数，从而提高吞吐量并提供更好的延迟。

在启用批量发布和/或批量订阅时，应用程序与 Dapr 边车之间的通信（上面的第 1 点）会针对**所有组件**进行优化。

从 Dapr 边车到发布订阅代理的优化取决于许多因素，例如：
- 代理必须本身支持批量发布/订阅
- Dapr 组件必须更新以支持代理提供的批量 API

目前，以下组件已更新以支持此级别的优化：

| 组件              | 批量发布 | 批量订阅 |
|:--------------------:|:--------:|--------|
| Kafka                 | 是       | 是 |
| Azure Servicebus      | 是       | 是 |
| Azure Eventhubs       | 是       | 是 |

## 演示

观看以下关于批量发布/订阅的演示和演讲。

### [KubeCon Europe 2023 演讲](https://youtu.be/WMBAo-UNg6o)

{{< youtube id=WMBAo-UNg6o >}}


### [Dapr Community Call #77 演讲](https://youtu.be/BxiKpEmchgQ?t=1170)

{{< youtube id=BxiKpEmchgQ start=1170 >}}

## 相关链接

- [支持的发布订阅组件]({{% ref supported-pubsub %}})列表
- 阅读 [API 参考]({{% ref pubsub_api %}})
