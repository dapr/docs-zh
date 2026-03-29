---
type: docs
title: "声明式、流式和编程式订阅类型"
linkTitle: "订阅类型"
weight: 3000
description: "了解允许您订阅消息主题的订阅类型。"
---

## 发布订阅 API 订阅类型

Dapr 应用程序可以通过三种订阅类型订阅已发布的主题，这些类型支持相同的功能：声明式、流式和编程式。

| 订阅类型 | 描述 |
| ------------------- | ----------- |
| [**声明式**]({{% ref "subscription-methods#declarative-subscriptions" %}}) | 订阅在**外部文件**中定义。声明式方法从代码中移除了 Dapr 依赖，允许现有应用程序订阅主题，而无需更改代码。 |
| [**流式**]({{% ref "subscription-methods#streaming-subscriptions" %}}) | 订阅在**应用程序代码**中定义。流式订阅是动态的，这意味着它们允许在运行时添加或删除订阅。它们不需要在应用程序中设置订阅端点（编程式和声明式订阅都需要），使其易于在代码中配置。流式订阅也不需要将应用程序配置为通过边车来接收消息。 |
| [**编程式**]({{% ref "subscription-methods#programmatic-subscriptions" %}}) | 订阅在**应用程序代码**中定义。编程式方法实现静态订阅并要求代码中有一个端点。 |

下面的示例演示了 `checkout` 应用程序和 `orderprocessing` 应用程序之间通过 `orders` 主题进行的发布订阅消息传递。这些示例演示了同一个 Dapr 发布订阅组件首先以声明方式使用，然后以编程方式使用。

### 声明式订阅

{{% alert title="注意" color="primary" %}}
此功能目前处于预览状态。
Dapr 可以"热重载"声明式订阅，从而自动获取更新而无需重启。
这是通过 [`HotReload` 功能门控]({{% ref "support-preview-features" %}})启用的。
为了防止重新处理或丢失未处理的消息，Dapr 与应用程序之间正在传输的消息在热重载事件期间不受影响。
{{% /alert %}}

您可以使用外部组件文件以声明方式订阅主题。此示例使用名为 `subscription.yaml` 的 YAML 组件文件：

```yaml
apiVersion: dapr.io/v2alpha1
kind: Subscription
metadata:
  name: order
spec:
  topic: orders
  routes:
    default: /orders
  pubsubname: pubsub
scopes:
- orderprocessing
```

这里名为 `order` 的订阅：
- 使用名为 `pubsub` 的发布订阅组件订阅名为 `orders` 的主题。
- 设置 `route` 字段以将所有主题消息发送到应用程序中的 `/orders` 端点。
- 设置 `scopes` 字段以将此订阅的范围限制为仅由 ID 为 `orderprocessing` 的应用程序访问。

运行 Dapr 时，设置 YAML 组件文件路径以将 Dapr 指向该组件。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```bash
dapr run --app-id myapp --resources-path ./myComponents -- dotnet run
```

{{% /tab %}}

{{% tab "Java" %}}

```bash
dapr run --app-id myapp --resources-path ./myComponents -- mvn spring-boot:run
```

{{% /tab %}}

{{% tab "Python" %}}

```bash
dapr run --app-id myapp --resources-path ./myComponents -- python3 app.py
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```bash
dapr run --app-id myapp --resources-path ./myComponents -- npm start
```

{{% /tab %}}

{{% tab "Go" %}}

```bash
dapr run --app-id myapp --resources-path ./myComponents -- go run app.go
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

在 Kubernetes 中，将组件应用到集群：

```bash
kubectl apply -f subscription.yaml
```

{{% /tab %}}

{{< /tabpane >}}

在应用程序代码中，订阅 Dapr 发布订阅组件中指定的主题。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
 //Subscribe to a topic 
[HttpPost("orders")]
public void getCheckout([FromBody] int orderId)
{
    Console.WriteLine("Subscriber received : " + orderId);
}
```

{{% /tab %}}

{{% tab "Java" %}}

```java
import io.dapr.client.domain.CloudEvent;

 //Subscribe to a topic
@PostMapping(path = "/orders")
public Mono<Void> getCheckout(@RequestBody(required = false) CloudEvent<String> cloudEvent) {
    return Mono.fromRunnable(() -> {
        try {
            log.info("Subscriber received: " + cloudEvent.getData());
        } 
    });
}
```

{{% /tab %}}

{{% tab "Python" %}}

```python
from cloudevents.sdk.event import v1

#Subscribe to a topic 
@app.route('/orders', methods=['POST'])
def checkout(event: v1.Event) -> None:
    data = json.loads(event.Data())
    logging.info('Subscriber received: ' + str(data))
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json({ type: 'application/*+json' }));

// listen to the declarative route
app.post('/orders', (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});
```

{{% /tab %}}

{{% tab "Go" %}}

```go
//Subscribe to a topic
var sub = &common.Subscription{
	PubsubName: "pubsub",
	Topic:      "orders",
	Route:      "/orders",
}

func eventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
	log.Printf("Subscriber received: %s", e.Data)
	return false, nil
}
```

{{% /tab %}}

{{< /tabpane >}}

`/orders` 端点与订阅中定义的 `route` 匹配，这是 Dapr 将所有主题消息发送到的地方。

### 流式订阅

流式订阅是在应用程序代码中定义的订阅，可以在运行时动态停止和启动。
消息由应用程序从 Dapr 拉取。这意味着不需要端点来订阅主题，并且可以在边车上根本没有配置任何应用程序的情况下进行订阅。
可以同时订阅任意数量的发布订阅和主题。
当消息发送到给定的消息处理程序代码时，没有路由或批量订阅的概念。

下面的示例展示了流式订阅主题的不同方式。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

您可以使用 `DaprPublishSubscribeClient` 上的 `SubscribeAsync` 方法来配置用于从流中拉取消息的消息处理程序。

```c#
using System.Text;
using Dapr.Messaging.PublishSubscribe;
using Dapr.Messaging.PublishSubscribe.Extensions;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprPubSubClient();
var app = builder.Build();

var messagingClient = app.Services.GetRequiredService<DaprPublishSubscribeClient>();

//Create a dynamic streaming subscription and subscribe with a timeout of 30 seconds and 10 seconds for message handling
var cancellationTokenSource = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var subscription = await messagingClient.SubscribeAsync("pubsub", "myTopic",
    new DaprSubscriptionOptions(new MessageHandlingPolicy(TimeSpan.FromSeconds(10), TopicResponseAction.Retry)),
    HandleMessageAsync, cancellationTokenSource.Token);

await Task.Delay(TimeSpan.FromMinutes(1));

//When you're done with the subscription, simply dispose of it
await subscription.DisposeAsync();
return;

//Process each message returned from the subscription
Task<TopicResponseAction> HandleMessageAsync(TopicMessage message, CancellationToken cancellationToken = default)
{
    try
    {
        //Do something with the message
        Console.WriteLine(Encoding.UTF8.GetString(message.Data.Span));
        return Task.FromResult(TopicResponseAction.Success);
    }
    catch
    {
        return Task.FromResult(TopicResponseAction.Retry);
    }
}
```

[了解有关使用 .NET SDK 客户端进行流式订阅的更多信息。]({{% ref "dotnet-messaging-pubsub-howto" %}})

{{% /tab %}}


{{% tab "Python" %}}

您可以使用 `subscribe` 方法，该方法返回一个 `Subscription` 对象，并允许您通过调用 `next_message` 方法从流中拉取消息。这在等待消息时运行并可能阻塞主线程。 

```python
import time

from dapr.clients import DaprClient
from dapr.clients.grpc.subscription import StreamInactiveError

counter = 0


def process_message(message):
    global counter
    counter += 1
    # Process the message here
    print(f'Processing message: {message.data()} from {message.topic()}...')
    return 'success'


def main():
    with DaprClient() as client:
        global counter

        subscription = client.subscribe(
            pubsub_name='pubsub', topic='orders', dead_letter_topic='orders_dead'
        )

        try:
            while counter < 5:
                try:
                    message = subscription.next_message()

                except StreamInactiveError as e:
                    print('Stream is inactive. Retrying...')
                    time.sleep(1)
                    continue
                if message is None:
                    print('No message received within timeout period.')
                    continue

                # Process the message
                response_status = process_message(message)

                if response_status == 'success':
                    subscription.respond_success(message)
                elif response_status == 'retry':
                    subscription.respond_retry(message)
                elif response_status == 'drop':
                    subscription.respond_drop(message)

        finally:
            print("Closing subscription...")
            subscription.close()


if __name__ == '__main__':
    main()

```

您也可以使用 `subscribe_with_handler` 方法，该方法接受一个回调函数，该函数对从流接收到的每条消息执行。这在单独的线程中运行，因此不会阻塞主线程。 

```python
import time

from dapr.clients import DaprClient
from dapr.clients.grpc._response import TopicEventResponse

counter = 0


def process_message(message):
    # Process the message here
    global counter
    counter += 1
    print(f'Processing message: {message.data()} from {message.topic()}...')
    return TopicEventResponse('success')


def main():
    with (DaprClient() as client):
        # This will start a new thread that will listen for messages
        # and process them in the `process_message` function
        close_fn = client.subscribe_with_handler(
            pubsub_name='pubsub', topic='orders', handler_fn=process_message,
            dead_letter_topic='orders_dead'
        )

        while counter < 5:
            time.sleep(1)

        print("Closing subscription...")
        close_fn()


if __name__ == '__main__':
    main()
```

[了解有关使用 Python SDK 客户端进行流式订阅的更多信息。]({{% ref "python-client#streaming-message-subscription" %}})

{{% /tab %}}

{{% tab "Go" %}}

```go
package main

import (
	"context"
	"log"

	"github.com/dapr/go-sdk/client"
)

func main() {
	cl, err := client.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	sub, err := cl.Subscribe(context.Background(), client.SubscriptionOptions{
		PubsubName: "pubsub",
		Topic:      "orders",
	})
	if err != nil {
		panic(err)
	}
	// Close must always be called.
	defer sub.Close()

	for {
		msg, err := sub.Receive()
		if err != nil {
			panic(err)
		}

		// Process the event

		// We _MUST_ always signal the result of processing the message, else the
		// message will not be considered as processed and will be redelivered or
		// dead lettered.
		// msg.Retry()
		// msg.Drop()
		if err := msg.Success(); err != nil {
			panic(err)
		}
	}
}
```

或

```go
package main

import (
	"context"
	"log"

	"github.com/dapr/go-sdk/client"
	"github.com/dapr/go-sdk/service/common"
)

func main() {
	cl, err := client.NewClient()
	if err != nil {
		log.Fatal(err)
	}

	stop, err := cl.SubscribeWithHandler(context.Background(),
		client.SubscriptionOptions{
			PubsubName: "pubsub",
			Topic:      "orders",
		},
		eventHandler,
	)
	if err != nil {
		panic(err)
	}

	// Stop must always be called.
	defer stop()

	<-make(chan struct{})
}

func eventHandler(e *common.TopicEvent) common.SubscriptionResponseStatus {
	// Process message here
    // common.SubscriptionResponseStatusRetry
    // common.SubscriptionResponseStatusDrop
			common.SubscriptionResponseStatusDrop, status);
	}

	return common.SubscriptionResponseStatusSuccess
}
```

{{% /tab %}}

{{< /tabpane >}}

## 演示

观看[此视频了解流式订阅的概述](https://youtu.be/57l-QDwgI-Y?t=841)：

{{< youtube id=57l-QDwgI-Y start=841 >}}

### 编程式订阅

与声明式方法的 `route` YAML 结构不同，动态编程式方法在代码中返回 `routes` JSON 结构。

> **注意：** 编程式订阅仅在应用程序启动期间读取一次。您不能动态添加新的编程式订阅，只能在编译时添加新的订阅。

{{% alert title="禁用编程式订阅" color="primary" %}}
如果您的应用程序不使用编程式订阅，可以禁用对 `/dapr/subscribe` 的自动 HTTP 调用以减少日志噪音。在 `dapr run` 中使用 `--disable-init-endpoints subscribe` 标志，或在 Kubernetes 中使用 `dapr.io/disable-init-endpoints: "subscribe"` 注解。[了解有关禁用初始化端点的更多信息。]({{% ref "arguments-annotations-overview#disable-init-endpoints" %}})
{{% /alert %}}

在下面的示例中，您在应用程序代码中定义上面[声明式 YAML 订阅](#declarative-subscriptions)中找到的值。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
[Topic("pubsub", "orders")]
[HttpPost("/orders")]
public async Task<ActionResult<Order>>Checkout(Order order, [FromServices] DaprClient daprClient)
{
    // Logic
    return order;
}
```

或

```csharp
// Dapr subscription in [Topic] routes orders topic to this route
app.MapPost("/orders", [Topic("pubsub", "orders")] (Order order) => {
    Console.WriteLine("Subscriber received : " + order);
    return Results.Ok(order);
});
```

上面定义的处理程序还需要映射到 `dapr/subscribe` 端点。这是在定义端点时的应用程序启动代码中完成的。

```csharp
app.UseEndpoints(endpoints =>
{
    endpoints.MapSubscribeHandler();
});
```

{{% /tab %}}

{{% tab "Java" %}}

```java
private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

@Topic(name = "orders", pubsubName = "pubsub")
@PostMapping(path = "/orders")
public Mono<Void> handleMessage(@RequestBody(required = false) CloudEvent<String> cloudEvent) {
  return Mono.fromRunnable(() -> {
    try {
      System.out.println("Subscriber received: " + cloudEvent.getData());
      System.out.println("Subscriber received: " + OBJECT_MAPPER.writeValueAsString(cloudEvent));
    } catch (Exception e) {
      throw new RuntimeException(e);
    }
  });
}
```

{{% /tab %}}

{{% tab "Python" %}}

```python
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [
      {
        'pubsubname': 'pubsub',
        'topic': 'orders',
        'routes': {
          'rules': [
            {
              'match': 'event.type == "order"',
              'path': '/orders'
            },
          ],
          'default': '/orders'
        }
      }]
    return jsonify(subscriptions)

@app.route('/orders', methods=['POST'])
def ds_subscriber():
    print(request.json, flush=True)
    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}
app.run()
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
const express = require('express')
const bodyParser = require('body-parser')
const app = express()
app.use(bodyParser.json({ type: 'application/*+json' }));

const port = 3000

app.get('/dapr/subscribe', (req, res) => {
  res.json([
    {
      pubsubname: "pubsub",
      topic: "orders",
      routes: {
        rules: [
          {
            match: 'event.type == "order"',
            path: '/orders'
          },
        ],
        default: '/products'
      }
    }
  ]);
})

app.post('/orders', (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});

app.listen(port, () => console.log(`consumer app listening on port ${port}!`))
```

{{% /tab %}}

{{% tab "Go" %}}

```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

const appPort = 3000

type subscription struct {
	PubsubName string            `json:"pubsubname"`
	Topic      string            `json:"topic"`
	Metadata   map[string]string `json:"metadata,omitempty"`
	Routes     routes            `json:"routes"`
}

type routes struct {
	Rules   []rule `json:"rules,omitempty"`
	Default string `json:"default,omitempty"`
}

type rule struct {
	Match string `json:"match"`
	Path  string `json:"path"`
}

// This handles /dapr/subscribe
func configureSubscribeHandler(w http.ResponseWriter, _ *http.Request) {
	t := []subscription{
		{
			PubsubName: "pubsub",
			Topic:      "orders",
			Routes: routes{
				Rules: []rule{
					{
						Match: `event.type == "order"`,
						Path:  "/orders",
					},
				},
				Default: "/orders",
			},
		},
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(t)
}

func main() {
	router := mux.NewRouter().StrictSlash(true)
	router.HandleFunc("/dapr/subscribe", configureSubscribeHandler).Methods("GET")
	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", appPort), router))
}
```
{{% /tab %}}

{{< /tabpane >}}

## 下一步

* 尝试[发布订阅快速入门]({{% ref pubsub-quickstart %}})
* 按照[操作指南：使用多个命名空间配置发布订阅组件]({{% ref pubsub-namespaces %}})
* 了解有关[声明式和编程式订阅方法]({{% ref subscription-methods %}})的更多信息。 
* 了解[主题作用域]({{% ref pubsub-scopes %}})
* 了解[消息 TTL]({{% ref pubsub-message-ttl %}})
* 了解有关[使用和不使用 CloudEvent 的发布订阅]({{% ref pubsub-cloudevents %}})
* [发布订阅组件]({{% ref supported-pubsub %}})列表
* 阅读[发布订阅 API 参考]({{% ref pubsub_api %}})
