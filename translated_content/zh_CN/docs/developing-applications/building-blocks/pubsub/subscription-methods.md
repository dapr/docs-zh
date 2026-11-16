---
type: docs
title: "声明式、流式和编程式订阅类型"
linkTitle: "订阅类型"
weight: 3000
description: "了解可用于订阅消息主题的订阅类型。"
---

## pub/sub API 订阅类型

Dapr 应用程序可以通过三种订阅类型订阅已发布的主题，这三种类型支持相同的功能：声明式、流式和编程式。

| 订阅类型 | 描述 |
| ------------------- | ----------- |
| [**声明式**]({{% ref "subscription-methods#声明式订阅" %}}) | 订阅在**外部文件**中定义。声明式方法让你的代码无需依赖 Dapr，允许现有应用程序在无需更改代码的情况下订阅主题。 |
| [**流式**]({{% ref "subscription-methods#流式订阅" %}}) | 订阅在**应用程序代码**中定义。流式订阅是动态的，这意味着可以在运行时添加或删除订阅。它们不需要应用程序提供订阅端点（编程式和声明式订阅都需要），因此易于在代码中配置。流式订阅也不要求为应用程序配置边车即可接收消息。 |
| [**编程式**]({{% ref "subscription-methods#编程式订阅" %}}) | 订阅在**应用程序代码**中定义。编程式方法实现静态订阅，并要求代码中提供一个端点。 |

下面的示例演示了 `checkout` 应用与 `orderprocessing` 应用之间通过 `orders` 主题进行的 pub/sub 消息传递。这些示例先以声明式方式使用同一个 Dapr pub/sub 组件，然后以编程式方式使用它。

### 声明式订阅

{{% alert title="注意" color="primary" %}}
声明式订阅默认会被“热重载”，即无需重启即可自动获取更新。如需退出该行为，请在 Dapr 应用程序配置中禁用 `HotReload` 功能：

```yaml
spec:
  features:
    - name: HotReload
      enabled: false
```
为防止消息被重复处理或未处理的消息丢失，在热重载事件期间，Dapr 与你的应用程序之间正在传输的消息不受影响。
{{% /alert %}}

你可以使用外部组件文件以声明式方式订阅主题。本示例使用名为 `subscription.yaml` 的 YAML 组件文件：

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
- 使用名为 `pubsub` 的 pub/sub 组件订阅名为 `orders` 的主题。
- 设置 `route` 字段，将所有主题消息发送到应用程序中的 `/orders` 端点。
- 设置 `scopes` 字段，使此订阅仅可由 ID 为 `orderprocessing` 的应用程序访问。

运行 Dapr 时，请将 YAML 组件文件路径设置为指向该组件，使 Dapr 能够找到它。

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

在应用程序代码中，订阅 Dapr pub/sub 组件中指定的主题。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
 //订阅一个主题
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

 //订阅一个主题
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

#订阅一个主题
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

// 监听声明式路由
app.post('/orders', (req, res) => {
  console.log(req.body);
  res.sendStatus(200);
});
```

{{% /tab %}}

{{% tab "Go" %}}

```go
//订阅一个主题
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

`/orders` 端点与订阅中的 `route` 相匹配，Dapr 会将所有主题消息发送到该端点。

### 流式订阅

流式订阅是在应用程序代码中定义、可以在运行时动态停止和启动的订阅。
消息由应用程序从 Dapr 中拉取。这意味着订阅主题不需要端点，甚至可以在完全未为边车配置任何应用的情况下订阅。
可以同时订阅任意数量的 pub/sub 组件和主题。
由于消息会被发送到给定的消息处理代码，因此不存在路由或批量订阅的概念。

下面的示例展示了通过流式方式订阅主题的不同方法。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

你可以使用 `DaprPublishSubscribeClient` 上的 `SubscribeAsync` 方法配置消息处理程序，用于从流中拉取消息。

```csharp
using System.Text;
using Dapr.Messaging;
using Dapr.Messaging.PublishSubscribe;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprMessaging()
    .AddDaprPubSub();

var app = builder.Build();

var messagingClient = app.Services.GetRequiredService<DaprPublishSubscribeClient>();

// 创建动态流式订阅，订阅超时为 30 秒，消息处理超时为 10 秒
var cancellationTokenSource = new CancellationTokenSource(TimeSpan.FromSeconds(30));
var subscription = await messagingClient.SubscribeAsync("pubsub", "myTopic",
    new DaprSubscriptionOptions(new MessageHandlingPolicy(TimeSpan.FromSeconds(10), TopicResponseAction.Retry)),
    HandleMessageAsync, cancellationTokenSource.Token);

await Task.Delay(TimeSpan.FromMinutes(1));

// 使用完订阅后，将其释放以干净地停止接收事件
await subscription.DisposeAsync();
return;

// 处理订阅返回的每条消息
Task<TopicResponseAction> HandleMessageAsync(TopicMessage message, CancellationToken cancellationToken = default)
{
    try
    {
        // 对消息进行处理
        Console.WriteLine(Encoding.UTF8.GetString(message.Data.Span));
        return Task.FromResult(TopicResponseAction.Success);
    }
    catch
    {
        return Task.FromResult(TopicResponseAction.Retry);
    }
}
```

[了解有关使用 .NET SDK 进行 pub/sub 订阅的更多信息。]({{% ref "dotnet-messaging-subscribe-howto" %}})

{{% /tab %}}


{{% tab "Python" %}}

你可以使用 `subscribe` 方法，它会返回一个 `Subscription` 对象，并允许你通过调用 `next_message` 方法从流中拉取消息。该方法在主线程中运行，等待消息时可能会阻塞主线程。

```python
import time

from dapr.clients import DaprClient
from dapr.clients.grpc.subscription import StreamInactiveError

counter = 0


def process_message(message):
    global counter
    counter += 1
    # 在此处理消息
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

                # 处理消息
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

你也可以使用 `subscribe_with_handler` 方法，它接受一个回调函数，为从流中接收到的每条消息执行该回调。该回调在单独的线程中运行，因此不会阻塞主线程。

```python
import time

from dapr.clients import DaprClient
from dapr.clients.grpc._response import TopicEventResponse

counter = 0


def process_message(message):
    # 在此处理消息
    global counter
    counter += 1
    print(f'Processing message: {message.data()} from {message.topic()}...')
    return TopicEventResponse('success')


def main():
    with (DaprClient() as client):
        # 这会启动一个新线程来监听消息，
        # 并在 `process_message` 函数中处理它们
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
	// 必须始终调用 Close。
	defer sub.Close()

	for {
		msg, err := sub.Receive()
		if err != nil {
			panic(err)
		}

		// 处理事件

		// 必须始终上报消息的处理结果，否则消息不会被视为已处理，
		// 并会被重新投递或转入死信队列。
		// msg.Retry()
		// msg.Drop()
		if err := msg.Success(); err != nil {
			panic(err)
		}
	}
}
```

或者

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

	// 必须始终调用 stop。
	defer stop()

	<-make(chan struct{})
}

func eventHandler(e *common.TopicEvent) common.SubscriptionResponseStatus {
	// 在此处理消息
    // common.SubscriptionResponseStatusRetry
    // common.SubscriptionResponseStatusDrop
			common.SubscriptionResponseStatusDrop, status)
	}

	return common.SubscriptionResponseStatusSuccess
}
```

{{% /tab %}}

{{< /tabpane >}}

## 演示

观看[此视频，了解流式订阅概览](https://youtu.be/57l-QDwgI-Y?t=841)：

{{< youtube id=57l-QDwgI-Y start=841 >}}

### 编程式订阅

动态编程式方法在代码中返回 `routes` JSON 结构，而声明式方法使用的是 YAML 中的 `route` 结构。

> **注意：** 编程式订阅仅在应用程序启动时读取一次。你无法_动态_添加新的编程式订阅，只能在编译时添加。

{{% alert title="禁用编程式订阅" color="primary" %}}
如果你的应用程序不使用编程式订阅，可以禁用对 `/dapr/subscribe` 的自动 HTTP 调用，以减少日志噪音。在 `dapr run` 中使用 `--disable-init-endpoints subscribe` 标志，或在 Kubernetes 中使用 `dapr.io/disable-init-endpoints: "subscribe"` 注解即可。[了解有关禁用初始化端点的更多信息。]({{% ref "arguments-annotations-overview#disable-init-endpoints" %}})
{{% /alert %}}

在下面的示例中，你将在应用程序代码中定义上方[声明式 YAML 订阅](#声明式订阅)中的各项值。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
[Topic("pubsub", "orders")]
[HttpPost("/orders")]
public async Task<ActionResult<Order>>Checkout(Order order, [FromServices] DaprClient daprClient)
{
    // 业务逻辑
    return order;
}
```

或者

```csharp
// Dapr 订阅（[Topic]）将 orders 主题路由到此路由
app.MapPost("/orders", [Topic("pubsub", "orders")] (Order order) => {
    Console.WriteLine("Subscriber received : " + order);
    return Results.Ok(order);
});
```

上面定义的两个处理程序还需要进行映射，以配置 `dapr/subscribe` 端点。这需要在应用程序启动代码中定义端点时完成。

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

// 处理 /dapr/subscribe
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

## 在本地检查订阅

无论选择哪种订阅类型，在本地开发期间都可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看每个应用已注册的订阅，包括 pub/sub 组件、主题和路由。这是快速确认声明式订阅文件已加载，或确认应用返回了预期编程式订阅的便捷方法。你还可以在仪表板中向订阅发送测试消息。

## 后续步骤

* 尝试[pub/sub 快速入门]({{% ref pubsub-quickstart %}})
* 参阅[操作指南：使用多个命名空间配置 pub/sub 组件]({{% ref pubsub-namespaces %}})
* 了解更多关于[声明式和编程式订阅方法]({{% ref subscription-methods %}})的信息。
* 了解[主题限制]({{% ref pubsub-scopes %}})
* 了解[消息 TTL]({{% ref pubsub-message-ttl %}})
* 了解更多关于[使用和不使用 CloudEvent 的 pub/sub]({{% ref pubsub-cloudevents %}})
* [pub/sub 组件]({{% ref supported-pubsub %}})列表
* 阅读[pub/sub API 参考]({{% ref pubsub_api %}})
