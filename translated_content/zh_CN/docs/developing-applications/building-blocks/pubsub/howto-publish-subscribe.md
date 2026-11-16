---
type: docs
title: "操作指南：发布消息并订阅主题"
linkTitle: "操作指南：发布和订阅主题"
weight: 2000
description: "了解如何通过一个服务向主题发送消息，并在另一个服务中订阅该主题"
---

在了解了 Dapr pub/sub 构建块提供的能力之后，接下来了解它如何在你的服务中工作。下面的代码示例大致描述了一个处理订单的应用程序，它包含两个服务，每个服务都配有 Dapr 边车：

- 一个订单处理服务，使用 Dapr 向 RabbitMQ 发布消息。
- 一个结账服务，使用 Dapr 订阅消息队列中的主题。


{{< diagram name="pubsub-howto-overview" width="70" >}}

Dapr 会自动将用户负载封装在符合 CloudEvents v1.0 规范的信封中，并使用 `Content-Type` 头部的值作为 `datacontenttype` 属性。[了解有关 CloudEvents 消息的更多信息。]({{% ref pubsub-cloudevents %}})

下面的示例演示了你的应用程序如何发布和订阅名为 `orders` 的主题。

{{% alert title="注意" color="primary" %}}
如果你还没有尝试过，请先体验[pub/sub 快速入门]({{% ref pubsub-quickstart %}})，快速了解如何使用 pub/sub。

{{% /alert %}}

## 设置 pub/sub 组件

第一步是设置 pub/sub 组件：

{{< tabpane text=true >}}

{{% tab "自托管（CLI）" %}}
当你运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `pubsub.yaml`，并在本地机器上运行一个 Redis 容器，其位置如下：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\pubsub.yaml`
- 在 Linux/MacOS 上，位于 `~/.dapr/components/pubsub.yaml`

借助 `pubsub.yaml` 组件，你无需更改应用程序代码即可轻松替换底层组件。本示例使用的是 RabbitMQ。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pub-sub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: host
    value: "amqp://localhost:5672"
  - name: durable
    value: "false"
  - name: deletedWhenUnused
    value: "false"
  - name: autoAck
    value: "false"
  - name: reconnectWait
    value: "0"
  - name: concurrency
    value: parallel
scopes:
  - orderprocessing
  - checkout
```

你可以创建一个包含该文件的组件目录（本例中为 `myComponents`），并在 `dapr run` CLI 命令中使用 `--resources-path` 标志，从而用另一个[pub/sub 组件]({{% ref setup-pubsub %}})覆盖此文件。

{{% /tab %}}

{{% tab "Kubernetes" %}}

要将其部署到 Kubernetes 集群中，请在下方的 YAML 中填写[pub/sub 组件]({{% ref setup-pubsub %}})的 `metadata` 连接详情，将其保存为 `pubsub.yaml`，然后运行 `kubectl apply -f pubsub.yaml`。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pub-sub
spec:
  type: pubsub.rabbitmq
  version: v1
  metadata:
  - name: connectionString
    value: "amqp://localhost:5672"
  - name: protocol
    value: amqp  
  - name: hostname
    value: localhost 
  - name: username
    value: username
  - name: password
    value: password 
  - name: durable
    value: "false"
  - name: deletedWhenUnused
    value: "false"
  - name: autoAck
    value: "false"
  - name: reconnectWait
    value: "0"
  - name: concurrency
    value: parallel
scopes:
  - orderprocessing
  - checkout
```

{{% /tab %}}

{{< /tabpane >}}

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

{{% tab "Go" %}}

```bash
dapr run --app-id myapp --resources-path ./myComponents -- go run app.go
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```bash
dapr run --app-id myapp --resources-path ./myComponents -- npm start
```
{{% /tab %}}

{{< /tabpane >}}

## 订阅主题

Dapr 提供了三种订阅主题的方法：

- **声明式**，订阅在外部文件中定义。
- **流式**，订阅在用户代码中定义。
- **编程式**，订阅在用户代码中定义。

在[声明式、流式和编程式订阅文档]({{% ref subscription-methods %}})中了解更多信息。本示例演示的是**声明式**订阅。

创建一个名为 `subscription.yaml` 的文件，并粘贴以下内容：

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
scopes:
- orderprocessing
- checkout
```

上面的示例展示了对 `orders` 主题的事件订阅，使用的是 pub/sub 组件 `order-pub-sub`。

- `route` 字段告诉 Dapr 将所有主题消息发送到应用程序中的 `/checkout` 端点。
- `scopes` 字段为 ID 为 `orderprocessing` 和 `checkout` 的应用程序启用此订阅。

将 `subscription.yaml` 放在与 `pubsub.yaml` 组件相同的目录中。Dapr 启动时，会与组件一起加载订阅。

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

以下代码示例利用 Dapr SDK 订阅你在 `subscription.yaml` 中定义的主题。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Mvc;
using Dapr;
using Dapr.Client;

namespace CheckoutService.Controllers;

[ApiController]
public sealed class CheckoutServiceController : ControllerBase
{
    //从 "order-pub-sub" 组件订阅名为 "orders" 的主题
    [Topic("order-pub-sub", "orders")]
    [HttpPost("checkout")]
    public void GetCheckout([FromBody] int orderId)
    {
        Console.WriteLine("Subscriber received : " + orderId);
    }
}
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id checkout --app-port 6002 --dapr-http-port 3602 --dapr-grpc-port 60002 --app-protocol https dotnet run
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖
import io.dapr.Topic;
import io.dapr.client.domain.CloudEvent;
import org.springframework.web.bind.annotation.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;

//代码
@RestController
public class CheckoutServiceController {

    private static final Logger log = LoggerFactory.getLogger(CheckoutServiceController.class);
     //订阅一个主题
    @Topic(name = "orders", pubsubName = "order-pub-sub")
    @PostMapping(path = "/checkout")
    public Mono<Void> getCheckout(@RequestBody(required = false) CloudEvent<String> cloudEvent) {
        return Mono.fromRunnable(() -> {
            try {
                log.info("Subscriber received: " + cloudEvent.getData());
            } catch (Exception e) {
                throw new RuntimeException(e);
            }
        });
    }
}
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id checkout --app-port 6002 --dapr-http-port 3602 --dapr-grpc-port 60002 mvn spring-boot:run
```

{{% /tab %}}

{{% tab "Python" %}}

```python
#依赖
from cloudevents.sdk.event import v1
from dapr.ext.grpc import App
import logging
import json

#代码
app = App()
logging.basicConfig(level = logging.INFO)
#订阅一个主题
@app.subscribe(pubsub_name='order-pub-sub', topic='orders')
def mytopic(event: v1.Event) -> None:
    data = json.loads(event.Data())
    logging.info('Subscriber received: ' + str(data))

app.run(6002)
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id checkout --app-port 6002 --dapr-http-port 3602 --app-protocol grpc -- python3 CheckoutService.py
```

{{% /tab %}}

{{% tab "Go" %}}

```go
//依赖
import (
	"log"
	"net/http"
	"context"

	"github.com/dapr/go-sdk/service/common"
	daprd "github.com/dapr/go-sdk/service/http"
)

//代码
var sub = &common.Subscription{
	PubsubName: "order-pub-sub",
	Topic:      "orders",
	Route:      "/checkout",
}

func main() {
	s := daprd.NewService(":6002")
   //订阅一个主题
	if err := s.AddTopicEventHandler(sub, eventHandler); err != nil {
		log.Fatalf("error adding topic subscription: %v", err)
	}
	if err := s.Start(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("error listenning: %v", err)
	}
}

func eventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
	log.Printf("Subscriber received: %s", e.Data)
	return false, nil
}
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id checkout --app-port 6002 --dapr-http-port 3602 --dapr-grpc-port 60002 go run CheckoutService.go
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//依赖
import { DaprServer, CommunicationProtocolEnum } from '@dapr/dapr'; 

//代码
const daprHost = "127.0.0.1"; 
const serverHost = "127.0.0.1";
const serverPort = "6002"; 

start().catch((e) => {
    console.error(e);
    process.exit(1);
});

async function start(orderId) {
    const server = new DaprServer({
        serverHost,
        serverPort,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
        clientOptions: {
          daprHost,
          daprPort: process.env.DAPR_HTTP_PORT,
        },
    });
    //订阅一个主题
    await server.pubsub.subscribe("order-pub-sub", "orders", async (orderId) => {
        console.log(`Subscriber received: ${JSON.stringify(orderId)}`)
    });
    await server.start();
}
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id checkout --app-port 6002 --dapr-http-port 3602 --dapr-grpc-port 60002 npm start
```

{{% /tab %}}

{{< /tabpane >}}

## 发布消息

启动一个 app-id 为 `orderprocessing` 的 Dapr 实例：

```bash
dapr run --app-id orderprocessing --dapr-http-port 3601
```

然后向 `orders` 主题发布一条消息：

{{< tabpane text=true >}}

{{% tab "Dapr CLI" %}}

```bash
dapr publish --publish-app-id orderprocessing --pubsub order-pub-sub --topic orders --data '{"orderId": "100"}'
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -X POST http://localhost:3601/v1.0/publish/order-pub-sub/orders -H "Content-Type: application/json" -d '{"orderId": "100"}'
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body '{"orderId": "100"}' -Uri 'http://localhost:3601/v1.0/publish/order-pub-sub/orders'
```

{{% /tab %}}

{{< /tabpane >}}

以下代码示例利用 Dapr SDK 发布主题。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Dapr.Client;
using System.Threading;

const string PUBSUB_NAME = "order-pub-sub";
const string TOPIC_NAME = "orders";

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();

var app = builder.Build();
var random = new Random();

var client = app.Services.GetRequiredService<DaprClient>();

while(true) {
    await Task.Delay(TimeSpan.FromSeconds(5));
    var orderId = random.Next(1,1000);
    var source = new CancellationTokenSource();
    var cancellationToken = source.Token;
    
    //使用 Dapr SDK 发布主题
    await client.PublishEventAsync(PUBSUB_NAME, TOPIC_NAME, orderId, cancellationToken);
    Console.WriteLine("Published data: " + orderId);
}
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和发布者应用程序：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 --app-protocol https dotnet run
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.Metadata;
import static java.util.Collections.singletonMap;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Random;
import java.util.concurrent.TimeUnit;

//代码
@SpringBootApplication
public class OrderProcessingServiceApplication {

	private static final Logger log = LoggerFactory.getLogger(OrderProcessingServiceApplication.class);

	public static void main(String[] args) throws InterruptedException{
		String MESSAGE_TTL_IN_SECONDS = "1000";
		String TOPIC_NAME = "orders";
		String PUBSUB_NAME = "order-pub-sub";

		while(true) {
			TimeUnit.MILLISECONDS.sleep(5000);
			Random random = new Random();
			int orderId = random.nextInt(1000-1) + 1;
			DaprClient client = new DaprClientBuilder().build();
      //使用 Dapr SDK 发布主题
			client.publishEvent(
					PUBSUB_NAME,
					TOPIC_NAME,
					orderId,
					singletonMap(Metadata.TTL_IN_SECONDS, MESSAGE_TTL_IN_SECONDS)).block();
			log.info("Published data:" + orderId);
		}
	}
}
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和发布者应用程序：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 mvn spring-boot:run
```

{{% /tab %}}

{{% tab "Python" %}}

```python
#依赖
import random
from time import sleep    
import requests
import logging
import json
from dapr.clients import DaprClient

#代码
logging.basicConfig(level = logging.INFO)
while True:
    sleep(random.randrange(50, 5000) / 1000)
    orderId = random.randint(1, 1000)
    PUBSUB_NAME = 'order-pub-sub'
    TOPIC_NAME = 'orders'
    with DaprClient() as client:
        #使用 Dapr SDK 发布主题
        result = client.publish_event(
            pubsub_name=PUBSUB_NAME,
            topic_name=TOPIC_NAME,
            data=json.dumps(orderId),
            data_content_type='application/json',
        )
    logging.info('Published data: ' + str(orderId))
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和发布者应用程序：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --app-protocol grpc python3 OrderProcessingService.py
```

{{% /tab %}}

{{% tab "Go" %}}

```go
//依赖
import (
	"context"
	"log"
	"math/rand"
	"time"
	"strconv"
	dapr "github.com/dapr/go-sdk/client"
)

//代码
var (
	PUBSUB_NAME = "order-pub-sub"
	TOPIC_NAME  = "orders"
)

func main() {
	for i := 0; i < 10; i++ {
		time.Sleep(5000)
		orderId := rand.Intn(1000-1) + 1
		client, err := dapr.NewClient()
		if err != nil {
			panic(err)
		}
		defer client.Close()
		ctx := context.Background()
    //使用 Dapr SDK 发布主题
		if err := client.PublishEvent(ctx, PUBSUB_NAME, TOPIC_NAME, []byte(strconv.Itoa(orderId))); 
		err != nil {
			panic(err)
		}

		log.Println("Published data: " + strconv.Itoa(orderId))
	}
}
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和发布者应用程序：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 go run OrderProcessingService.go
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//依赖
import { DaprServer, DaprClient, CommunicationProtocolEnum } from '@dapr/dapr'; 

const daprHost = "127.0.0.1"; 

var main = function() {
    for(var i=0;i<10;i++) {
        sleep(5000);
        var orderId = Math.floor(Math.random() * (1000 - 1) + 1);
        start(orderId).catch((e) => {
            console.error(e);
            process.exit(1);
        });
    }
}

async function start(orderId) {
    const PUBSUB_NAME = "order-pub-sub"
    const TOPIC_NAME  = "orders"
    const client = new DaprClient({
        daprHost,
        daprPort: process.env.DAPR_HTTP_PORT, 
        communicationProtocol: CommunicationProtocolEnum.HTTP
    });
    console.log("Published data:" + orderId)
    //使用 Dapr SDK 发布主题
    await client.pubsub.publish(PUBSUB_NAME, TOPIC_NAME, orderId);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();
```

导航到包含上述代码的目录，然后运行以下命令来启动 Dapr 边车和发布者应用程序：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 npm start
```

{{% /tab %}}

{{< /tabpane >}}

## 消息确认与重试

要告知 Dapr 消息已成功处理，请返回 `200 OK` 响应。如果 Dapr 收到的返回状态码不是 `200`，或者你的应用程序崩溃，Dapr 将按照至少一次（at-least-once）语义尝试重新投递该消息。

## 使用 Dapr Dev Dashboard 测试订阅

在本地开发时，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 在不运行发布者应用的情况下测试订阅者。该仪表板会显示正在运行的应用的订阅，并允许你向它们发送测试消息。结合仪表板提供的按应用流式查看日志的功能，这是检查应用如何处理消息以及返回哪些状态码的简便方法。

## 演示视频

观看[此演示视频](https://youtu.be/1dqe1k-FXJQ?si=s3gvWxRxeOsmXuE1)，了解更多关于使用 Dapr 进行 pub/sub 消息传递的信息。

{{< youtube id=1dqe1k-FXJQ >}}

## 后续步骤

- 尝试[pub/sub 教程](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub)。
- 了解[使用 CloudEvents 进行消息传递]({{% ref pubsub-cloudevents %}})，以及何时可能需要[不使用 CloudEvents 发送消息]({{% ref pubsub-raw %}})。
- 查看[pub/sub 组件]({{% ref setup-pubsub %}})列表。
- 阅读 [API 参考]({{% ref pubsub_api %}})。
