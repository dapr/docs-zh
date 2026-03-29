---
type: docs
title: "操作指南：使用输入绑定触发应用程序"
linkTitle: "操作指南：输入绑定"
description: "使用 Dapr 输入绑定来触发事件驱动应用程序"
weight: 200
---

使用输入绑定，当外部资源发生事件时，可以触发您的应用程序。外部资源可以是队列、消息管道、云服务、文件系统等。请求可以随附可选的 payload 和 metadata。

输入绑定非常适合事件驱动处理、数据管道，或通常用于响应事件并执行进一步处理。Dapr 输入绑定允许您：

- 接收事件而无需包含特定的 SDK 或库
- 更换绑定而无需更改代码
- 专注于业务逻辑而非事件资源实现

<img src="/images/howto-triggers/kafka-input-binding.png" width=1000 alt="Diagram showing bindings of example service">

本指南以 Kafka 绑定为例。您可以从[绑定组件列表]({{% ref setup-bindings %}})中找到您首选的绑定规范。在本指南中：

1. 示例使用 `checkout`（要调用的绑定名称）调用 `/binding` 端点。
1. payload 放入必填的 `data` 字段中，可以是任何 JSON 可序列化的值。
1. `operation` 字段告知绑定需要采取什么操作。例如，[Kafka 绑定支持 `create` 操作]({{% ref "kafka#binding-support" %}})。
   - 您可以检查[每个输出绑定支持哪些操作（特定于每个组件）]({{% ref supported-bindings %}})。

{{% alert title="注意" color="primary" %}}
 如果您还没有尝试过，请先[尝试绑定快速入门]({{% ref bindings-quickstart %}})，快速了解如何使用绑定 API。

{{% /alert %}}

## 创建绑定

创建一个 `binding.yaml` 文件并保存到应用程序目录中的 `components` 子文件夹。

创建一个名为 `checkout` 的新绑定组件。在 `metadata` 部分，配置以下与 Kafka 相关的属性：

- 您将向其发布消息的 topic
- broker

创建绑定组件时，[指定绑定支持的 `direction`]({{% ref "bindings_api#binding-direction-optional" %}})。

{{< tabpane text=true >}}

{{% tab "自托管 (CLI)" %}}

在 `dapr run` 命令中使用 `--resources-path` 标志指向您的自定义资源目录。

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
  # consumer 配置：topic 和 consumer group
  - name: topics
    value: sample
  - name: consumerGroup
    value: group1
  # publisher 配置：topic
  - name: publishTopic
    value: sample
  - name: authRequired
    value: false
  - name: direction
    value: input
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

要部署到 Kubernetes 集群，运行 `kubectl apply -f binding.yaml`。

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
  # consumer 配置：topic 和 consumer group
  - name: topics
    value: sample
  - name: consumerGroup
    value: group1
  # publisher 配置：topic
  - name: publishTopic
    value: sample
  - name: authRequired
    value: false
  - name: direction
    value: input
```

{{% /tab %}}

{{< /tabpane >}}

## 监听传入事件（输入绑定）

配置您的应用程序以接收传入事件。如果您使用 HTTP，则需要：
- 监听一个 `POST` 端点，端点名称为绑定名称，即 `binding.yaml` 文件中 `metadata.name` 指定的名称。
- 验证您的应用程序允许 Dapr 对此端点进行 `OPTIONS` 请求。

以下是利用 Dapr SDK 演示输入绑定的代码示例。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

以下示例演示如何使用 ASP.NET Core 控制器配置输入绑定。

```csharp
using System.Collections.Generic;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Mvc;

namespace CheckoutService.controller;

[ApiController]
public sealed class CheckoutServiceController : ControllerBase
{
    [HttpPost("/checkout")]
    public ActionResult<string> getCheckout([FromBody] int orderId)
    {
        Console.WriteLine($"Received Message: {orderId}");
        return $"CID{orderId}";
    }
}
```

以下示例演示如何使用 minimal API 方式配置相同的输入绑定：
```csharp
app.MapPost("checkout", ([FromBody] int orderId) =>
{
    Console.WriteLine($"Received Message: {orderId}");
    return $"CID{orderId}"
});
```

以下示例演示如何使用 minimal API 方式配置相同的输入绑定：
```csharp
app.MapPost("checkout", ([FromBody] int orderId) =>
{
    Console.WriteLine($"Received Message: {orderId}");
    return $"CID{orderId}"
});
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//dependencies
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;

//code
@RestController
@RequestMapping("/")
public class CheckoutServiceController {
    private static final Logger log = LoggerFactory.getLogger(CheckoutServiceController.class);
        @PostMapping(path = "/checkout")
        public Mono<String> getCheckout(@RequestBody(required = false) byte[] body) {
            return Mono.fromRunnable(() ->
                    log.info("Received Message: " + new String(body)));
        }
}

```

{{% /tab %}}

{{% tab "Python" %}}

```python
#dependencies
import logging
from dapr.ext.grpc import App, BindingRequest

#code
app = App()

@app.binding('checkout')
def getCheckout(request: BindingRequest):
    logging.basicConfig(level = logging.INFO)
    logging.info('Received Message : ' + request.text())

app.run(6002)

```

{{% /tab %}}

{{% tab "Go" %}}

```go
//dependencies
import (
	"encoding/json"
	"log"
	"net/http"
	"github.com/gorilla/mux"
)

//code
func getCheckout(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	var orderId int
	err := json.NewDecoder(r.Body).Decode(&orderId)
	log.Println("Received Message: ", orderId)
	if err != nil {
		log.Printf("error parsing checkout input binding payload: %s", err)
		w.WriteHeader(http.StatusOK)
		return
	}
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/checkout", getCheckout).Methods("POST", "OPTIONS")
	http.ListenAndServe(":6002", r)
}

```

{{% /tab %}}

{{% tab "JavaScript%}}" %}}

```javascript
//dependencies 
import { DaprServer, CommunicationProtocolEnum } from '@dapr/dapr'; 

//code
const daprHost = "127.0.0.1"; 
const serverHost = "127.0.0.1";
const serverPort = "6002"; 
const daprPort = "3602"; 

start().catch((e) => {
    console.error(e);
    process.exit(1);
});

async function start() {
    const server = new DaprServer({
        serverHost,
        serverPort,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
        clientOptions: {
            daprHost,
            daprPort, 
        }
    });
    await server.binding.receive('checkout', async (orderId) => console.log(`Received Message: ${JSON.stringify(orderId)}`));
    await server.start();
}

```

{{% /tab %}}

{{< /tabpane >}}

### 确认事件

从您的 HTTP 处理程序返回 `200 OK` 响应，告知 Dapr 您已成功处理事件。

### 拒绝事件

返回 `200 OK` 以外的任何响应，告知 Dapr 事件在您的应用程序中未正确处理，并计划重新传递该事件。例如，返回 `500 Error`。

### 指定自定义路由

默认情况下，传入事件将发送到与输入绑定名称对应的 HTTP 端点。您可以通过在 `binding.yaml` 中设置以下 metadata 属性来覆盖此设置：

```yaml
name: mybinding
spec:
  type: binding.rabbitmq
  metadata:
  - name: route
    value: /onevent
```

### 事件传递保证

事件传递保证由绑定实现控制。根据绑定实现的不同，事件传递可以是恰好一次或至少一次。

## 参考

- [Bindings 构建块]({{% ref bindings %}})
- [Bindings API]({{% ref bindings_api %}})
- [组件概念]({{% ref components-concept %}})
- [支持的绑定]({{% ref supported-bindings %}})
