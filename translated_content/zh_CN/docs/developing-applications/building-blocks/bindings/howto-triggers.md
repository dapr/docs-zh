---
type: docs
title: "操作指南：使用 input bindings 触发应用程序"
linkTitle: "操作指南：Input bindings"
description: "使用 Dapr input bindings 触发事件驱动应用程序"
weight: 200
---

通过 input bindings，当外部资源发生事件时，您可以触发您的应用程序。外部资源可以是队列、消息流水线、云服务、文件系统等。请求中可以附带可选的负载和 metadata。

Input bindings 非常适合事件驱动处理、数据流水线，或通常用于响应事件并执行进一步处理。Dapr input bindings 允许您：

- 无需包含特定的 SDK 或库即可接收事件
- 无需更改代码即可替换 binding
- 专注于业务逻辑，而不是事件资源的实现

{{< diagram name="binding-input-kafka" width="55" >}}

本指南以 Kafka binding 为例。您可以从 [binding 组件列表]({{% ref setup-bindings %}}) 中找到您偏好的 binding 规范。在本指南中：

1. Dapr 代表您连接到外部资源，使用 binding 组件中的设置。例如，对于名为 `checkout` 的 Kafka binding，即它消费的 `topics` 以及它加入的 `consumerGroup`。
1. 当事件到达时，Dapr 会在您的应用程序上调用一个以 binding 名称命名的 `POST` 端点（即 `/checkout`），并将事件负载作为请求体传递。
1. `direction` 字段告诉 Dapr 该 binding 的运行方向。Input binding 会触发您的应用程序，因此将其设置为 `input`。
   - 一个组件可以同时支持两个方向；请[指定 binding 支持的 `direction`]({{% ref "bindings_api#binding-direction-optional" %}})，以便 Dapr 知道该使用哪个方向。

{{% alert title="Note" color="primary" %}}
 如果您还没有尝试过，请先[尝试 bindings 快速入门]({{% ref bindings-quickstart %}})，快速了解如何使用 Bindings API。

{{% /alert %}}

## 创建 binding

创建一个 `binding.yaml` 文件，并将其保存到应用程序目录下的 `components` 子文件夹中。

创建一个名为 `checkout` 的新 binding 组件。在 `metadata` 部分中，配置以下与 Kafka 相关的属性：

- 您将向其发布消息的 topic
- broker

创建 binding 组件时，请[指定 binding 支持的 `direction`]({{% ref "bindings_api#binding-direction-optional" %}})。

{{< tabpane text=true >}}

{{% tab "自托管（CLI）" %}}

在 `dapr run` 命令中使用 `--resources-path` 标志，指向您的自定义资源目录。

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

要部署到 Kubernetes 集群，请运行 `kubectl apply -f binding.yaml`。

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

## 监听传入事件（input binding）

配置您的应用程序以接收传入事件。如果您使用 HTTP，则需要：
- 监听一个 `POST` 端点，端点名称为 binding 名称，即 `binding.yaml` 文件中 `metadata.name` 指定的名称。
- 验证您的应用程序允许 Dapr 对此端点发出 `OPTIONS` 请求。此请求默认在 `3s` 后超时。如果您的应用程序在启动时响应较慢，请使用 `--app-binding-options-timeout` daprd 标志，或 Kubernetes 注解 `dapr.io/app-binding-options-timeout` 来增加超时时间。

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

以下示例演示如何使用最小 API（minimal API）方式配置相同的输入绑定：
```csharp
app.MapPost("checkout", ([FromBody] int orderId) =>
{
    Console.WriteLine($"Received Message: {orderId}");
    return $"CID{orderId}"
});
```

以下示例演示如何使用最小 API（minimal API）方式配置相同的输入绑定：
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
//依赖项
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;

//代码
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
#依赖项
import logging
from dapr.ext.grpc import App, BindingRequest

#代码
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
//依赖项
import (
	"encoding/json"
	"log"
	"net/http"
	"github.com/gorilla/mux"
)

//代码
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

{{% tab "JavaScript" %}}

```javascript
//依赖项 
import { DaprServer, CommunicationProtocolEnum } from '@dapr/dapr'; 

//代码
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

从您的 HTTP 处理程序返回 `200 OK` 响应，告知 Dapr 您已成功处理该事件。

### 拒绝事件

返回 `200 OK` 以外的任何响应，告知 Dapr 该事件未在您的应用程序中正确处理，并安排其重新传递（redelivery）。例如，返回 `500 Error`。

### 指定自定义路由

默认情况下，传入事件会被发送到与输入 binding 名称对应的 HTTP 端点。您可以在 `binding.yaml` 中设置以下 metadata 属性来覆盖此行为：

```yaml
name: mybinding
spec:
  type: binding.rabbitmq
  metadata:
  - name: route
    value: /onevent
```

### 事件传递保证

事件传递保证由 binding 实现控制。根据 binding 实现的不同，事件传递可以是恰好一次或至少一次。

## 参考

- [Bindings building block]({{% ref bindings %}})
- [Bindings API]({{% ref bindings_api %}})
- [Components 概念]({{% ref components-concept %}})
- [支持的 bindings]({{% ref supported-bindings %}})
