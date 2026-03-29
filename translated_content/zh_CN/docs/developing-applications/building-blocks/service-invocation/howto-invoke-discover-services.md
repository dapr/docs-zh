---
type: docs
title: "如何：使用 HTTP 调用服务"
linkTitle: "如何：使用 HTTP 调用"
description: "使用服务调用在服务之间进行调用"
weight: 20
---

本文演示了如何部署服务，每个服务都有一个唯一的 application ID，其他服务可以使用 HTTP 上的服务调用来发现它们并调用其端点。

<img src="/images/building-block-service-invocation-example.png" width=1000 height=500 alt="显示服务调用示例的图表">

{{% alert title="注意" color="primary" %}}
 如果你还没有尝试过，[请先体验服务调用快速入门]({{% ref serviceinvocation-quickstart %}})来快速了解如何使用服务调用 API。

{{% /alert％}}

## 为你的服务选择一个 ID

Dapr 允许你为你的应用分配一个全局唯一的 ID。这个 ID 封装了你的应用的状态，无论它可能有多少个实例。

{{< tabpane text=true >}}

{{% tab "Python"％%}

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- python3 checkout/app.py

dapr run --app-id order-processor --app-port 8001  --app-protocol http --dapr-http-port 3501 -- python3 order-processor/app.py
```

如果你的应用使用 TLS，你可以通过设置 `--app-protocol https` 来告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --app-protocol https --dapr-http-port 3500 -- python3 checkout/app.py

dapr run --app-id order-processor --app-port 8001 --app-protocol https --dapr-http-port 3501 -- python3 order-processor/app.py
```

{{% /tab％>

{{% tab "JavaScript"％%}

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- npm start

dapr run --app-id order-processor --app-port 5001  --app-protocol http --dapr-http-port 3501 -- npm start
```

如果你的应用使用 TLS，你可以通过设置 `--app-protocol https` 来告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --dapr-http-port 3500 --app-protocol https -- npm start

dapr run --app-id order-processor --app-port 5001 --dapr-http-port 3501 --app-protocol https -- npm start
```

{{% /tab％>

{{% tab ".NET"％%}

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- dotnet run

dapr run --app-id order-processor --app-port 7001 --app-protocol http --dapr-http-port 3501 -- dotnet run
```

如果你的应用使用 TLS，你可以通过设置 `--app-protocol https` 来告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --dapr-http-port 3500 --app-protocol https -- dotnet run

dapr run --app-id order-processor --app-port 7001 --dapr-http-port 3501 --app-protocol https -- dotnet run
```

{{% /tab％>

{{% tab "Java"％%}

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- java -jar target/CheckoutService-0.0.1-SNAPSHOT.jar

dapr run --app-id order-processor --app-port 9001 --app-protocol http --dapr-http-port 3501 -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

如果你的应用使用 TLS，你可以通过设置 `--app-protocol https` 来告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --dapr-http-port 3500 --app-protocol https -- java -jar target/CheckoutService-0.0.1-SNAPSHOT.jar

dapr run --app-id order-processor --app-port 9001 --dapr-http-port 3501 --app-protocol https -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

{{% /tab％>

{{% tab "Go"％%}

```bash
dapr run --app-id checkout --dapr-http-port 3500 -- go run .

dapr run --app-id order-processor --app-port 6006 --app-protocol http --dapr-http-port 3501 -- go run .
```

如果你的应用使用 TLS，你可以通过设置 `--app-protocol https` 来告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --dapr-http-port 3500 --app-protocol https -- go run .

dapr run --app-id order-processor --app-port 6006 --dapr-http-port 3501 --app-protocol https -- go run .
```

{{% /tab％>

{{% tab "Kubernetes"％%}

### 部署到 Kubernetes 时设置 app-id

在 Kubernetes 中，在你的 pod 上设置 `dapr.io/app-id` 注解：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: <language>-app
  namespace: default
  labels:
    app: <language>-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: <language>-app
  template:
    metadata:
      labels:
        app: <language>-app
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-processor"
        dapr.io/app-port: "6001"
...
```

如果你的应用使用 TLS 连接，你可以使用 `app-protocol: "https"` 注解（完整列表在[这里]({{% ref arguments-annotations-overview %}})）来告诉 Dapr 通过 TLS 调用你的应用。请注意，Dapr 不会验证应用提供的 TLS 证书。

{{% /tab％>

{{< /tabpane >}}

## 调用服务

要使用 Dapr 调用应用程序，你可以在任何 Dapr 实例上使用 `invoke` API。边车编程模型鼓励每个应用程序与自己的 Dapr 实例交互。Dapr 边车之间相互发现和通信。

以下是利用 Dapr SDK 进行服务调用的代码示例。

{{< tabpane text=true >}}

{{% tab "Python"％%}

```python
#dependencies
import random
from time import sleep
import logging
import requests

#code
logging.basicConfig(level = logging.INFO) 
while True:
    sleep(random.randrange(50, 5000) / 1000)
    orderId = random.randint(1, 1000)
        #Invoke a service
        result = requests.post(
           url='%s/orders' % (base_url),
           data=json.dumps(order),
           headers=headers
        )    
    logging.basicConfig(level = logging.INFO)
    logging.info('Order requested: ' + str(orderId))
    logging.info('Result: ' + str(result))
```

{{% /tab％>

{{% tab "JavaScript"％%}

```javascript
//dependencies
import axios from "axios";

//code
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

    //Invoke a service
    const result = await axios.post('order-processor' , "orders/" + orderId , axiosConfig);
    console.log("Order requested: " + orderId);
    console.log("Result: " + result.config.data);


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();
```

{{% /tab％>

{{% tab ".NET"％%}

```csharp
//dependencies
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.Threading;

//code
namespace EventService
{
  class Program
   {
       static async Task Main(string[] args)
       {
          while(true) {
               await Task.Delay(5000)
               var random = new Random();
               var orderId = random.Next(1,1000);

               //Using Dapr SDK to invoke a method
               var order = new Order(orderId.ToString());

               var httpClient = DaprClient.CreateInvokeHttpClient();
               var response = await httpClient.PostAsJsonAsync("http://order-processor/orders", order);               
               var result = await response.Content.ReadAsStringAsync();
               
               Console.WriteLine("Order requested: " + orderId);
               Console.WriteLine("Result: " + result);
   	    }
       }
   }
}
```

{{% /tab％>

{{% tab "Java"％%}

```java
//dependencies
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.TimeUnit;

//code
@SpringBootApplication
public class CheckoutServiceApplication {
    private static final HttpClient httpClient = HttpClient.newBuilder()
            .version(HttpClient.Version.HTTP_2)
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    public static void main(String[] args) throws InterruptedException, IOException {
        while (true) {
            TimeUnit.MILLISECONDS.sleep(5000);
            Random random = new Random();
            int orderId = random.nextInt(1000 - 1) + 1;

            // Create a Map to represent the request body
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("orderId", orderId);
            // Add other fields to the requestBody Map as needed

            HttpRequest request = HttpRequest.newBuilder()
                    .POST(HttpRequest.BodyPublishers.ofString(new JSONObject(requestBody).toString()))
                    .uri(URI.create(dapr_url))
                    .header("Content-Type", "application/json")
                    .header("dapr-app-id", "order-processor")
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            System.out.println("Order passed: " + orderId);
            TimeUnit.MILLISECONDS.sleep(1000);

            log.info("Order requested: " + orderId);
            log.info("Result: " + response.body());
        }
    }
}
```

{{% /tab％>

{{% tab "Go"％%}

```go
package main

import (
	"fmt"
	"io"
	"log"
	"math/rand"
	"net/http"
	"os"
	"time"
)

func main() {
	daprHttpPort := os.Getenv("DAPR_HTTP_PORT")
	if daprHttpPort == "" {
		daprHttpPort = "3500"
	}

	client := &http.Client{
		Timeout: 15 * time.Second,
	}

	for i := 0; i < 10; i++ {
		time.Sleep(5000)
		orderId := rand.Intn(1000-1) + 1

		url := fmt.Sprintf("http://localhost:%s/checkout/%v", daprHttpPort, orderId)
		req, err := http.NewRequest(http.MethodGet, url, nil)
		if err != nil {
			panic(err)
		}

		// Adding target app id as part of the header
		req.Header.Add("dapr-app-id", "order-processor")

		// Invoking a service
		resp, err := client.Do(req)
		if err != nil {
			log.Fatal(err.Error())
		}

		b, err := io.ReadAll(resp.Body)
		if err != nil {
			panic(err)
		}

		fmt.Println(string(b))
	}
}
```

{{% /tab％>

{{< /tabpane >}}

### 其他 URL 格式

要调用 'GET' 端点：

```bash
curl http://localhost:3602/v1.0/invoke/checkout/method/checkout/100
```

为了尽可能避免更改 URL 路径，Dapr 提供了以下方式调用服务调用 API：

1. 将 URL 中的地址改为 `localhost:<dapr-http-port>`。
2. 添加一个 `dapr-app-id` 头来指定目标服务的 ID，或者通过 HTTP Basic Auth 传递 ID：`http://dapr-app-id:<service-id>@localhost:3602/path`。

例如，以下命令：

```bash
curl http://localhost:3602/v1.0/invoke/checkout/method/checkout/100
```

等价于：

```bash
curl -H 'dapr-app-id: checkout' 'http://localhost:3602/checkout/100' -X POST
```

或者：

```bash
curl 'http://dapr-app-id:checkout@localhost:3602/checkout/100' -X POST
```

使用 CLI：

```bash
dapr invoke --app-id checkout --method checkout/100
```

#### 在 URL 中包含查询字符串

你也可以在 URL 末尾附加查询字符串或片段，Dapr 会原样传递。这意味着如果你需要在服务调用中传递一些不属于负载或路径的额外参数，可以通过在 URL 末尾附加 `?` 来实现，后跟用 `=` 分隔的键值对，用 `&` 分隔。例如：

```bash
curl 'http://dapr-app-id:checkout@localhost:3602/checkout/100?basket=1234&key=abc' -X POST
```

### 命名空间

在[支持命名空间的平台]({{% ref "service_invocation_api#namespace-supported-platforms" %}})上运行时，你需要在 app ID 中包含目标应用的命名空间。例如，遵循 `<app>.<namespace>` 格式，使用 `checkout.production`。

使用此示例，带命名空间调用服务如下：

```bash
curl http://localhost:3602/v1.0/invoke/checkout.production/method/checkout/100 -X POST
```

有关命名空间的更多信息，请参见[跨命名空间 API 规范]({{% ref "service_invocation_api#cross-namespace-invocation" %}})。

## 查看追踪和日志

上面的示例向你展示了如何直接调用在本地或 Kubernetes 中运行的不同服务。Dapr：

- 输出指标、追踪和日志信息，
- 允许你可视化服务之间的调用图并记录错误，以及
- 可选地，记录负载正文。

有关追踪和日志的更多信息，请参见[可观测性]({{% ref observability-concept %}})文章。

## 相关链接

- [服务调用概述]({{% ref service-invocation-overview %}})
- [服务调用 API 规范]({{% ref service_invocation_api %}})
