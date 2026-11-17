---
type: docs
title: "如何：使用 HTTP 调用服务"
linkTitle: "如何：使用 HTTP 调用"
description: "使用 service invocation 在服务之间进行调用"
weight: 20
---

本文演示如何部署各自拥有唯一应用 ID 的服务，以便其他服务通过 HTTP 上的 service invocation 来发现并调用它们的端点。

{{< diagram name="service-invocation-example" width="50" >}}

{{% alert title="注意" color="primary" %}}
 如果你还没有尝试过，请先体验[service invocation Quickstart]({{% ref serviceinvocation-quickstart %}})，快速了解如何使用 service invocation API。

{{% /alert %}}

## 为你的服务选择一个 ID

Dapr 允许你为应用分配一个全局唯一的 ID。无论应用有多少个实例，该 ID 都会封装应用的状态。

{{< tabpane text=true >}}

{{% tab "Python" %}}

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- python3 checkout/app.py

dapr run --app-id order-processor --app-port 8001  --app-protocol http --dapr-http-port 3501 -- python3 order-processor/app.py
```

如果你的应用使用 TLS，可以通过设置 `--app-protocol https`，告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --app-protocol https --dapr-http-port 3500 -- python3 checkout/app.py

dapr run --app-id order-processor --app-port 8001 --app-protocol https --dapr-http-port 3501 -- python3 order-processor/app.py
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- npm start

dapr run --app-id order-processor --app-port 5001  --app-protocol http --dapr-http-port 3501 -- npm start
```

如果你的应用使用 TLS，可以通过设置 `--app-protocol https`，告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --dapr-http-port 3500 --app-protocol https -- npm start

dapr run --app-id order-processor --app-port 5001 --dapr-http-port 3501 --app-protocol https -- npm start
```

{{% /tab %}}

{{% tab ".NET" %}}

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- dotnet run

dapr run --app-id order-processor --app-port 7001 --app-protocol http --dapr-http-port 3501 -- dotnet run
```

如果你的应用使用 TLS，可以通过设置 `--app-protocol https`，告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --dapr-http-port 3500 --app-protocol https -- dotnet run

dapr run --app-id order-processor --app-port 7001 --dapr-http-port 3501 --app-protocol https -- dotnet run
```

{{% /tab %}}

{{% tab "Java" %}}

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- java -jar target/CheckoutService-0.0.1-SNAPSHOT.jar

dapr run --app-id order-processor --app-port 9001 --app-protocol http --dapr-http-port 3501 -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

如果你的应用使用 TLS，可以通过设置 `--app-protocol https`，告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --dapr-http-port 3500 --app-protocol https -- java -jar target/CheckoutService-0.0.1-SNAPSHOT.jar

dapr run --app-id order-processor --app-port 9001 --dapr-http-port 3501 --app-protocol https -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

{{% /tab %}}

{{% tab "Go" %}}

```bash
dapr run --app-id checkout --dapr-http-port 3500 -- go run .

dapr run --app-id order-processor --app-port 6006 --app-protocol http --dapr-http-port 3501 -- go run .
```

如果你的应用使用 TLS，可以通过设置 `--app-protocol https`，告诉 Dapr 通过 TLS 连接调用你的应用：

```bash
dapr run --app-id checkout --dapr-http-port 3500 --app-protocol https -- go run .

dapr run --app-id order-processor --app-port 6006 --dapr-http-port 3501 --app-protocol https -- go run .
```

{{% /tab %}}

{{% tab "Kubernetes" %}}

### 部署到 Kubernetes 时设置 app-id

在 Kubernetes 中，请在 Pod 上设置 `dapr.io/app-id` 注解：

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

如果你的应用使用 TLS 连接，可以通过 `app-protocol: "https"` 注解告诉 Dapr 通过 TLS 调用你的应用（完整列表请参见[此处]({{% ref arguments-annotations-overview %}})）。请注意，Dapr 不会验证应用所呈现的 TLS 证书。

{{% /tab %}}

{{< /tabpane >}}

## 调用服务

要使用 Dapr 调用应用，你可以在任意 Dapr 实例上使用 `invoke` API。sidecar 编程模型鼓励每个应用与其自身的 Dapr 实例交互。Dapr sidecar 之间会相互发现并通信。

下面是利用 Dapr SDK 实现 service invocation 的代码示例。

{{< tabpane text=true >}}

{{% tab "Python" %}}

```python
#依赖项
import random
from time import sleep
import logging
import requests

#代码
logging.basicConfig(level = logging.INFO) 
while True:
    sleep(random.randrange(50, 5000) / 1000)
    orderId = random.randint(1, 1000)
        #调用服务
        result = requests.post(
           url='%s/orders' % (base_url),
           data=json.dumps(order),
           headers=headers
        )    
    logging.basicConfig(level = logging.INFO)
    logging.info('Order requested: ' + str(orderId))
    logging.info('Result: ' + str(result))
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//依赖项
import axios from "axios";

//代码
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

    //调用服务
    const result = await axios.post('order-processor' , "orders/" + orderId , axiosConfig);
    console.log("Order requested: " + orderId);
    console.log("Result: " + result.config.data);


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
//依赖项
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using System.Threading;

//代码
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

               //使用 Dapr SDK 调用方法
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

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖项
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

//代码
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

            // 创建一个 Map 来表示请求体
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("orderId", orderId);
            // 根据需要向 requestBody Map 添加其他字段

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

{{% /tab %}}

{{% tab "Go" %}}

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

		// 通过 header 添加目标应用 ID
		req.Header.Add("dapr-app-id", "order-processor")

		// 调用服务
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

{{% /tab %}}

{{< /tabpane >}}

### 其他 URL 格式

要调用 'GET' 端点：

```bash
curl http://localhost:3602/v1.0/invoke/checkout/method/checkout/100
```

为尽量避免更改 URL 路径，Dapr 提供以下方式来调用 service invocation API：

1. 将 URL 中的地址改为 `localhost:<dapr-http-port>`。
2. 添加 `dapr-app-id` 标头以指定目标服务的 ID，或者通过 HTTP Basic Auth 传递该 ID：`http://dapr-app-id:<service-id>@localhost:3602/path`。

例如，以下命令：

```bash
curl http://localhost:3602/v1.0/invoke/checkout/method/checkout/100
```

等同于：

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

你也可以在 URL 末尾附加查询字符串或片段，Dapr 会原样传递。这意味着，如果你需要在 service invocation 中传递既不属于负载也不属于路径的额外参数，可以在 URL 末尾追加 `?`，后接以 `=` 连接、以 `&` 分隔的键值对。例如：

```bash
curl 'http://dapr-app-id:checkout@localhost:3602/checkout/100?basket=1234&key=abc' -X POST
```

### Namespaces

在[支持 namespace 的平台]({{% ref "service_invocation_api#namespace-supported-platforms" %}})上运行时，需要在应用 ID 中包含目标应用的 namespace。例如，按照 `<app>.<namespace>` 格式，使用 `checkout.production`。

以此为例，带 namespace 调用服务的写法如下：

```bash
curl http://localhost:3602/v1.0/invoke/checkout.production/method/checkout/100 -X POST
```

有关 namespace 的更多信息，请参阅[跨 namespace API 规范]({{% ref "service_invocation_api#cross-namespace-invocation" %}})。

## 查看追踪和日志

上面的示例展示了如何直接调用本地或 Kubernetes 中运行的其他服务。Dapr：

- 输出指标、追踪和日志信息，
- 允许你可视化服务之间的调用图并记录错误，以及
- 可选地记录负载正文。

有关追踪和日志的更多信息，请参阅[observability]({{% ref observability-concept %}})文章。

## 相关链接

- [service invocation 概述]({{% ref service-invocation-overview %}})
- [service invocation API 规范]({{% ref service_invocation_api %}})
