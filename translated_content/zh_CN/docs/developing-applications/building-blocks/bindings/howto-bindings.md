---
type: docs
title: "操作指南：使用输出绑定与外部资源交互"
linkTitle: "操作指南：输出绑定"
description: "通过输出绑定调用外部系统"
weight: 300
---


使用输出绑定，您可以调用外部资源。调用请求中可以发送可选的有效负载和元数据。

<img src="/images/howto-bindings/kafka-output-binding.png" width=1000 alt="Diagram showing bindings of example service">

本指南以 Kafka 绑定为例。您可以从[绑定组件列表]({{% ref setup-bindings %}})中找到您需要的绑定规范。在本指南中：

1. 示例通过调用 `/binding` 端点，并传递 `checkout`（要调用的绑定名称）来执行操作。
1. 有效负载放入必需的 `data` 字段中，可以是任何可序列化为 JSON 的值。
1. `operation` 字段告诉绑定需要执行什么操作。例如，[Kafka 绑定支持 `create` 操作]({{% ref "kafka#binding-support" %}})。
   - 您可以查看[每个输出绑定支持的操作（特定于各组件）]({{% ref supported-bindings %}})。

{{% alert title="注意" color="primary" %}}
 如果您还没有尝试过，可以先体验[绑定快速入门]({{% ref bindings-quickstart %}})，快速了解如何使用绑定 API。

{{% /alert %}}

## 创建绑定

创建一个 `binding.yaml` 文件，并将其保存到应用程序目录中的 `components` 子文件夹中。

创建一个名为 `checkout` 的新绑定组件。在 `metadata` 部分中，配置以下与 Kafka 相关的属性：

- 您要向其发布消息的主题
- 代理

创建绑定组件时，[指定绑定的受支持的 `direction`]({{% ref "bindings_api#binding-direction-optional" %}})。

{{< tabpane text=true >}}

{{% tab "自托管 (CLI)" %}}

使用 `dapr run` 命令时，通过 `--resources-path` 标志指向您的自定义资源目录。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: checkout
spec:
  type: bindings.kafka
  version: v1
  metadata:
  # Kafka broker 连接设置
  - name: brokers
    value: localhost:9092
  # 消费者配置：主题和消费者组
  - name: topics
    value: sample
  - name: consumerGroup
    value: group1
  # 发布者配置：主题
  - name: publishTopic
    value: sample
  - name: authRequired
    value: false
  - name: direction
    value: output
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

要将以下 `binding.yaml` 文件部署到 Kubernetes 集群中，请运行 `kubectl apply -f binding.yaml`。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: checkout
spec:
  type: bindings.kafka
  version: v1
  metadata:
  # Kafka broker 连接设置
  - name: brokers
    value: localhost:9092
  # 消费者配置：主题和消费者组
  - name: topics
    value: sample
  - name: consumerGroup
    value: group1
  # 发布者配置：主题
  - name: publishTopic
    value: sample
  - name: authRequired
    value: false
  - name: direction
    value: output
```

{{% /tab %}}

{{< /tabpane >}}

## 发送事件（输出绑定）

下面的代码示例利用 Dapr SDK 来调用运行中的 Dapr 实例上的输出绑定端点。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

以下是在 .NET 6+ 中使用顶级语句的控制台应用程序示例：

```csharp
using System.Text;
using System.Threading.Tasks;
using Dapr.Client;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

const string BINDING_NAME = "checkout";
const string BINDING_OPERATION = "create";

var random = new Random();
using var daprClient = app.Services.GetRequiredService<DaprClient>();

while (true)
{
    await Task.Delay(TimeSpan.FromSeconds(5));
    var orderId = random.Next(1, 1000);
    await client.InvokeBindingAsync(BINDING_NAME, BINDING_OPERATION, orderId);
    Console.WriteLine($"Sending message: {orderId}"); 
}
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//dependencies
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.HttpExtension;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Random;
import java.util.concurrent.TimeUnit;

//code
@SpringBootApplication
public class OrderProcessingServiceApplication {

	private static final Logger log = LoggerFactory.getLogger(OrderProcessingServiceApplication.class);

	public static void main(String[] args) throws InterruptedException{
		String BINDING_NAME = "checkout";
		String BINDING_OPERATION = "create";
		while(true) {
			TimeUnit.MILLISECONDS.sleep(5000);
			Random random = new Random();
			int orderId = random.nextInt(1000-1) + 1;
			DaprClient client = new DaprClientBuilder().build();
          //使用 Dapr SDK 调用输出绑定
			client.invokeBinding(BINDING_NAME, BINDING_OPERATION, orderId).block();
			log.info("Sending message: " + orderId);
		}
	}
}

```

{{% /tab %}}

{{% tab "Python" %}}

```python
#dependencies
import random
from time import sleep    
import requests
import logging
import json
from dapr.clients import DaprClient

#code
logging.basicConfig(level = logging.INFO)
BINDING_NAME = 'checkout'
BINDING_OPERATION = 'create' 
while True:
    sleep(random.randrange(50, 5000) / 1000)
    orderId = random.randint(1, 1000)
    with DaprClient() as client:
        #使用 Dapr SDK 调用输出绑定
        resp = client.invoke_binding(BINDING_NAME, BINDING_OPERATION, json.dumps(orderId))
    logging.basicConfig(level = logging.INFO)
    logging.info('Sending message: ' + str(orderId))
    
```

{{% /tab %}}

{{% tab "Go" %}}

```go
//dependencies
import (
	"context"
	"log"
	"math/rand"
	"time"
	"strconv"
	dapr "github.com/dapr/go-sdk/client"

)

//code
func main() {
	BINDING_NAME := "checkout";
	BINDING_OPERATION := "create";
	for i := 0; i < 10; i++ {
		time.Sleep(5000)
		orderId := rand.Intn(1000-1) + 1
		client, err := dapr.NewClient()
		if err != nil {
			panic(err)
		}
		defer client.Close()
		ctx := context.Background()
        //使用 Dapr SDK 调用输出绑定
		in := &dapr.InvokeBindingRequest{ Name: BINDING_NAME, Operation: BINDING_OPERATION , Data: []byte(strconv.Itoa(orderId))}
		err = client.InvokeOutputBinding(ctx, in)
		log.Println("Sending message: " + strconv.Itoa(orderId))
	}
}
    
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//dependencies
import { DaprClient, CommunicationProtocolEnum } from "@dapr/dapr";

//code
const daprHost = "127.0.0.1";

(async function () {
    for (var i = 0; i < 10; i++) {
        await sleep(2000);
        const orderId = Math.floor(Math.random() * (1000 - 1) + 1);
        try {
            await sendOrder(orderId)
        } catch (err) {
            console.error(e);
            process.exit(1);
        }
    }
})();

async function sendOrder(orderId) {
    const BINDING_NAME = "checkout";
    const BINDING_OPERATION = "create";
    const client = new DaprClient({
        daprHost,
        daprPort: process.env.DAPR_HTTP_PORT,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
    });
    //使用 Dapr SDK 调用输出绑定
    const result = await client.binding.send(BINDING_NAME, BINDING_OPERATION, orderId);
    console.log("Sending message: " + orderId);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
```

{{% /tab %}}

{{< /tabpane >}}

您也可以使用 HTTP 来调用输出绑定端点：

```bash
curl -X POST -H 'Content-Type: application/json' http://localhost:3601/v1.0/bindings/checkout -d '{ "data": 100, "operation": "create" }'
```

观看此[视频](https://www.youtube.com/watch?v=ysklxm81MTs&feature=youtu.be&t=1960)了解如何使用双向输出绑定。

{{< youtube id=ysklxm81MTs start=1960 >}}

## 参考

- [绑定 API]({{% ref bindings_api %}})
- [绑定组件]({{% ref bindings %}})
- [绑定详细规范]({{% ref supported-bindings %}})
