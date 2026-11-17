---
type: docs
title: "How-To: Save and get state"
linkTitle: "操作指南：保存和获取状态"
weight: 200
description: "使用键值对持久化状态"
---

State Management 是任何新应用、遗留应用、单体应用或微服务应用最常见的需求之一。处理和测试不同的数据库库，以及应对重试和故障，既困难又耗时。

在本指南中，你将学习使用键/值状态 API 的基础知识，让应用能够保存、获取和删除状态。

下面的代码示例_大致_描述了一个订单处理应用：订单处理服务带有一个 Dapr sidecar，并使用 Dapr 将状态保存到 Redis state store 中。

{{< diagram name="state-management-example" width="55" >}}

## 设置 state store

state store component 代表 Dapr 用于与数据库通信的资源。

在本指南中，我们将使用 Redis state store，但[支持列表]({{% ref supported-state-stores %}})中的任何 state store 都可以使用。

{{< tabpane text=true >}}

{{% tab "自托管（CLI）" %}}

在自托管模式下运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机运行一个 Redis state store，其位置为：

- Windows 上位于 `%UserProfile%\.dapr\components\statestore.yaml`
- Linux/macOS 上位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，无需修改应用代码即可轻松替换底层 component。

{{% /tab %}}

{{% tab "Kubernetes" %}}

要将其部署到 Kubernetes 集群中，请在下面的 YAML 中填写你的[state store component]({{% ref supported-state-stores %}})的 `metadata` 连接详细信息，保存为 `statestore.yaml`，然后运行 `kubectl apply -f statestore.yaml`。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

请参阅[如何在 Kubernetes 上设置不同的 state store]({{% ref "setup-state-store" %}})。

{{% /tab %}}

{{< /tabpane >}}

{{% alert title="重要" color="warning" %}}
请设置 `app-id`，因为状态键会以该值作为前缀。如果不设置 `app-id`，运行时会为你生成一个。下次运行命令时会生成新的 `app-id`，你将无法再访问之前保存的状态。
{{% /alert %}}

{{% alert title="提示" color="primary" %}}
在本地运行时，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 来验证本页示例的结果。该仪表板允许你浏览 state store 中的记录（包括 `app-id` 键前缀）、解码 base64 编码的值，并无需编写代码即可添加或删除记录。
{{% /alert %}}

## 保存和检索单个状态

以下示例演示了如何使用 Dapr State Management API 保存和检索单个键/值对。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp

using System.Text;
using System.Threading.Tasks;
using Dapr.Client;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

var random = new Random();
//从依赖注入注册中解析 DaprClient
using var client = app.Services.GetRequiredService<DaprClient>();

while(true) 
{
    await Task.Delay(TimeSpan.FromSeconds(5));
    var orderId = random.Next(1,1000);
    //使用 Dapr SDK 保存和获取状态
    await client.SaveStateAsync(DAPR_STORE_NAME, "order_1", orderId.ToString());
    await client.SaveStateAsync(DAPR_STORE_NAME, "order_2", orderId.ToString());
    var result = await client.GetStateAsync<string>(DAPR_STORE_NAME, "order_1");
    Console.WriteLine($"Result after get: {result}");
}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 dotnet run
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖项
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.State;
import io.dapr.client.domain.TransactionalStateOperation;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;
import java.util.Random;
import java.util.concurrent.TimeUnit;

//代码
@SpringBootApplication
public class OrderProcessingServiceApplication {

	private static final Logger log = LoggerFactory.getLogger(OrderProcessingServiceApplication.class);

	private static final String STATE_STORE_NAME = "statestore";

	public static void main(String[] args) throws InterruptedException{
		while(true) {
			TimeUnit.MILLISECONDS.sleep(5000);
			Random random = new Random();
			int orderId = random.nextInt(1000-1) + 1;
			DaprClient client = new DaprClientBuilder().build();
            //使用 Dapr SDK 保存和获取状态
			client.saveState(STATE_STORE_NAME, "order_1", Integer.toString(orderId)).block();
			client.saveState(STATE_STORE_NAME, "order_2", Integer.toString(orderId)).block();
			Mono<State<String>> result = client.getState(STATE_STORE_NAME, "order_1", String.class);
			log.info("Result after get" + result);
		}
	}

}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 mvn spring-boot:run
```

{{% /tab %}}

{{% tab "Python" %}}

```python
#依赖项
import random
from time import sleep    
import requests
import logging
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateItem
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

#代码
logging.basicConfig(level = logging.INFO)
DAPR_STORE_NAME = "statestore"
while True:
    sleep(random.randrange(50, 5000) / 1000)
    orderId = random.randint(1, 1000)
    with DaprClient() as client:
        #使用 Dapr SDK 保存和获取状态
        client.save_state(DAPR_STORE_NAME, "order_1", str(orderId)) 
        result = client.get_state(DAPR_STORE_NAME, "order_1")
        logging.info('Result after get: ' + result.data.decode('utf-8'))
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 -- python3 OrderProcessingService.py
```

{{% /tab %}}

{{% tab "Go" %}}

```go
// 依赖项
import (
	"context"
	"log"
	"math/rand"
	"strconv"
	"time"

	dapr "github.com/dapr/go-sdk/client"
)

// 代码
func main() {
	const STATE_STORE_NAME = "statestore"
	rand.Seed(time.Now().UnixMicro())
	for i := 0; i < 10; i++ {
		orderId := rand.Intn(1000-1) + 1
		client, err := dapr.NewClient()
		if err != nil {
			panic(err)
		}
		defer client.Close()
		ctx := context.Background()
		err = client.SaveState(ctx, STATE_STORE_NAME, "order_1", []byte(strconv.Itoa(orderId)), nil)
		if err != nil {
			panic(err)
		}
		result, err := client.GetState(ctx, STATE_STORE_NAME, "order_1", nil)
		if err != nil {
			panic(err)
		}
		log.Println("Result after get:", string(result.Value))
		time.Sleep(2 * time.Second)
	}
}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 go run OrderProcessingService.go
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//依赖项
import { DaprClient, HttpMethod, CommunicationProtocolEnum } from '@dapr/dapr'; 

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

async function start(orderId) {
    const client = new DaprClient({
        daprHost,
        daprPort: process.env.DAPR_HTTP_PORT,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
    });
    const STATE_STORE_NAME = "statestore";
    //使用 Dapr SDK 保存和获取状态
    await client.state.save(STATE_STORE_NAME, [
        {
            key: "order_1",
            value: orderId.toString()
        },
        {
            key: "order_2",
            value: orderId.toString()
        }
    ]);
    var result = await client.state.get(STATE_STORE_NAME, "order_1");
    console.log("Result after get: " + result);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 npm start
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

启动 Dapr sidecar：

```bash
dapr run --app-id orderprocessing --dapr-http-port 3601
```

在另一个终端中，将一个键/值对保存到你的 state store 中：

```bash
curl -X POST -H "Content-Type: application/json" -d '[{ "key": "order_1", "value": "250"}]' http://localhost:3601/v1.0/state/statestore
```

现在获取你刚保存的状态：

```bash
curl http://localhost:3601/v1.0/state/statestore/order_1
```

重启 sidecar，然后再次尝试获取状态，以观察状态是独立于应用持久存在的。

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

启动 Dapr sidecar：

```bash
dapr --app-id orderprocessing --dapr-http-port 3601 run
```

在另一个终端中，将一个键/值对保存到你的 state store 中：

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body '[{"key": "order_1", "value": "250"}]' -Uri 'http://localhost:3601/v1.0/state/statestore'
```

现在获取你刚保存的状态：

```powershell
Invoke-RestMethod -Uri 'http://localhost:3601/v1.0/state/statestore/order_1'
```

重启 sidecar，然后再次尝试获取状态，以观察状态是独立于应用持久存在的。

{{% /tab %}}

{{< /tabpane >}}

## 删除状态

以下代码示例利用 Dapr SDK 删除状态。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
using Dapr.Client;
using System.Threading.Tasks;

const string DAPR_STORE_NAME = "statestore";

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

//从依赖注入注册中解析 DaprClient
using var client = app.Services.GetRequiredService<DaprClient>();

//使用 DaprClient 删除状态
await client.DeleteStateAsync(DAPR_STORE_NAME, "order_1", cancellationToken: cancellationToken);
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 dotnet run
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖项
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import org.springframework.boot.autoconfigure.SpringBootApplication;

//代码
@SpringBootApplication
public class OrderProcessingServiceApplication {
	public static void main(String[] args) throws InterruptedException{
        String STATE_STORE_NAME = "statestore";

        //使用 Dapr SDK 删除状态
        DaprClient client = new DaprClientBuilder().build();
        String storedEtag = client.getState(STATE_STORE_NAME, "order_1", String.class).block().getEtag();
        client.deleteState(STATE_STORE_NAME, "order_1", storedEtag, null).block();
	}
}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 mvn spring-boot:run
```

{{% /tab %}}

{{% tab "Python" %}}

```python
#依赖项
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

#代码
logging.basicConfig(level = logging.INFO)
DAPR_STORE_NAME = "statestore"

#使用 Dapr SDK 删除状态
with DaprClient() as client:
    client.delete_state(store_name=DAPR_STORE_NAME, key="order_1")
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 -- python3 OrderProcessingService.py
```

{{% /tab %}}

{{% tab "Go" %}}

```go
//依赖项
import (
	"context"
	dapr "github.com/dapr/go-sdk/client"

)

//代码
func main() {
    STATE_STORE_NAME := "statestore"
    //使用 Dapr SDK 删除状态
    client, err := dapr.NewClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()
    ctx := context.Background()

    if err := client.DeleteState(ctx, STATE_STORE_NAME, "order_1"); err != nil {
        panic(err)
    }
}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 go run OrderProcessingService.go
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//依赖项
import { DaprClient, HttpMethod, CommunicationProtocolEnum } from '@dapr/dapr'; 

//代码
const daprHost = "127.0.0.1"; 
var main = function() {
    const STATE_STORE_NAME = "statestore";
    //使用 Dapr SDK 保存和获取状态
    const client = new DaprClient({
        daprHost,
        daprPort: process.env.DAPR_HTTP_PORT,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
    });
    
    await client.state.delete(STATE_STORE_NAME, "order_1"); 
}

main();
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 npm start
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

在仍在运行的同一个 Dapr 实例中，运行：

```bash
curl -X DELETE 'http://localhost:3601/v1.0/state/statestore/order_1'
```

再次尝试获取状态，注意此时不会返回任何值。

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

在仍在运行的同一个 Dapr 实例中，运行：

```powershell
Invoke-RestMethod -Method Delete -Uri 'http://localhost:3601/v1.0/state/statestore/order_1'
```

再次尝试获取状态，注意此时不会返回任何值。

{{% /tab %}}

{{< /tabpane >}}

## 保存和检索多个状态

以下代码示例利用 Dapr SDK 保存和检索多个状态。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
using Dapr.Client;
using System.Threading.Tasks;

const string DAPR_STORE_NAME = "statestore";

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

//从依赖注入注册中解析 DaprClient
using var client = app.Services.GetRequiredService<DaprClient>();

IReadOnlyList<BulkStateItem> multipleStateResult = await client.GetBulkStateAsync(DAPR_STORE_NAME, new List<string> { "order_1", "order_2" }, parallelism: 1);
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 dotnet run
```

上面的示例会返回一个 `BulkStateItem`，其中包含你保存到状态中的值的序列化格式。如果你希望由 SDK 为每个批量响应项反序列化该值，则可以改用以下代码：

```csharp
using Dapr.Client;
using System.Threading.Tasks;

const string DAPR_STORE_NAME = "statestore";

var builder = WebApplication.CreateBuilder(args);
builder.Serivces.AddDaprClient();
var app = builder.Build();

//从依赖注入注册中解析 DaprClient
using var client = app.Services.GetRequiredService<DaprClient>();

IReadOnlyList<BulkStateItem<Widget>> mulitpleStateResult = await client.GetBulkStateAsync<Widget>(DAPR_STORE_NAME, new List<string> { "widget_1", "widget_2" }, parallelism: 1);

record Widget(string Size, string Color);
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖项
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.State;
import java.util.Arrays;

//代码
@SpringBootApplication
public class OrderProcessingServiceApplication {

	private static final Logger log = LoggerFactory.getLogger(OrderProcessingServiceApplication.class);

	public static void main(String[] args) throws InterruptedException{
        String STATE_STORE_NAME = "statestore";
        //使用 Dapr SDK 检索多个状态
        DaprClient client = new DaprClientBuilder().build();
        Mono<List<State<String>>> resultBulk = client.getBulkState(STATE_STORE_NAME,
        Arrays.asList("order_1", "order_2"), String.class);
	}
}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 mvn spring-boot:run
```

{{% /tab %}}

{{% tab "Python" %}}

```python
#依赖项
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateItem

#代码
logging.basicConfig(level = logging.INFO)
DAPR_STORE_NAME = "statestore"
orderId = 100
#使用 Dapr SDK 保存和检索多个状态
with DaprClient() as client:
    client.save_bulk_state(store_name=DAPR_STORE_NAME, states=[StateItem(key="order_2", value=str(orderId))])
    result = client.get_bulk_state(store_name=DAPR_STORE_NAME, keys=["order_1", "order_2"], states_metadata={"metakey": "metavalue"}).items
    logging.info('Result after get bulk: ' + str(result)) 
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 -- python3 OrderProcessingService.py
```

{{% /tab %}}

{{% tab "Go" %}}

```go
// 依赖项
import (
	"context"
	"log"
	"math/rand"
	"strconv"
	"time"

	dapr "github.com/dapr/go-sdk/client"
)

// 代码
func main() {
	const STATE_STORE_NAME = "statestore"
	rand.Seed(time.Now().UnixMicro())
	for i := 0; i < 10; i++ {
		orderId := rand.Intn(1000-1) + 1
		client, err := dapr.NewClient()
		if err != nil {
			panic(err)
		}
		defer client.Close()
		ctx := context.Background()
		err = client.SaveState(ctx, STATE_STORE_NAME, "order_1", []byte(strconv.Itoa(orderId)), nil)
		if err != nil {
			panic(err)
		}
		keys := []string{"key1", "key2", "key3"}
        items, err := client.GetBulkState(ctx, STATE_STORE_NAME, keys, nil, 100)
		if err != nil {
			panic(err)
		}
		for _, item := range items {
			log.Println("Item from GetBulkState:", string(item.Value))
		}
	}
} 
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 go run OrderProcessingService.go
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//依赖项
import { DaprClient, HttpMethod, CommunicationProtocolEnum } from '@dapr/dapr'; 

//代码
const daprHost = "127.0.0.1"; 
var main = function() {
    const STATE_STORE_NAME = "statestore";
    var orderId = 100;
    //使用 Dapr SDK 保存和检索多个状态
    const client = new DaprClient({
        daprHost,
        daprPort: process.env.DAPR_HTTP_PORT,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
    });

    await client.state.save(STATE_STORE_NAME, [
        {
            key: "order_1",
            value: orderId.toString()
        },
        {
            key: "order_2",
            value: orderId.toString()
        }
    ]);
    result = await client.state.getBulk(STATE_STORE_NAME, ["order_1", "order_2"]);
}

main();
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 npm start
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

在同一个仍在运行的 Dapr 实例中，将两个键/值对保存到你的 state store 中：

```bash
curl -X POST -H "Content-Type: application/json" -d '[{ "key": "order_1", "value": "250"}, { "key": "order_2", "value": "550"}]' http://localhost:3601/v1.0/state/statestore
```

现在获取你刚保存的状态：

```bash
curl -X POST -H "Content-Type: application/json" -d '{"keys":["order_1", "order_2"]}' http://localhost:3601/v1.0/state/statestore/bulk
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

在同一个仍在运行的 Dapr 实例中，将两个键/值对保存到你的 state store 中：

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body '[{ "key": "order_1", "value": "250"}, { "key": "order_2", "value": "550"}]' -Uri 'http://localhost:3601/v1.0/state/statestore'
```

现在获取你刚保存的状态：

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body '{"keys":["order_1", "order_2"]}' -Uri 'http://localhost:3601/v1.0/state/statestore/bulk'
```

{{% /tab %}}

{{< /tabpane >}}

## 执行 state transaction

{{% alert title="Note" color="primary" %}}
state transaction 需要支持多项事务的 state store。完整列表请参阅[支持的 state store 页面]({{% ref supported-state-stores %}})。
{{% /alert %}}

以下代码示例利用 Dapr SDK 执行 state transaction。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
using Dapr.Client;
using System.Threading.Tasks;

const string DAPR_STORE_NAME = "statestore";

var builder = WebApplication.CreateBuilder(args);
builder.Serivces.AddDaprClient();
var app = builder.Build();

//从依赖注入注册中解析 DaprClient
using var client = app.Services.GetRequiredService<DaprClient>();

var random = new Random();

while (true)
{
   await Task.Delay(TimeSpan.FromSeconds(5));
   var orderId = random.Next(1, 1000);
   var requests = new List<StateTransactionRequest> 
   {
        new StateTransactionRequest("order_3", JsonSerializer.SerializeToUtf8Bytes(orderId.ToString()), StateOperationType.Upsert),
        new StateTransactionRequest("order_2", null, StateOperationType.Delete)
   };
   var cancellationTokenSource = new CancellationTokenSource();
   var cancellationToken = cancellationTokenSource.Token;
   
   //使用 DaprClient 执行 state transaction
   await client.ExecuteStateTransactionAsync(DAPR_STORE_NAME, requests, cancellationToken: cancellationToken);
   Console.WriteLine($"Order requested: {orderId}");
   Console.WriteLine($"Result: {result}");
}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 dotnet run
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖项
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.State;
import io.dapr.client.domain.TransactionalStateOperation;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import reactor.core.publisher.Mono;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.concurrent.TimeUnit;

//代码
@SpringBootApplication
public class OrderProcessingServiceApplication {

	private static final Logger log = LoggerFactory.getLogger(OrderProcessingServiceApplication.class);

	private static final String STATE_STORE_NAME = "statestore";

	public static void main(String[] args) throws InterruptedException{
		while(true) {
			TimeUnit.MILLISECONDS.sleep(5000);
			Random random = new Random();
			int orderId = random.nextInt(1000-1) + 1;
			DaprClient client = new DaprClientBuilder().build();
			List<TransactionalStateOperation<?>> operationList = new ArrayList<>();
			operationList.add(new TransactionalStateOperation<>(TransactionalStateOperation.OperationType.UPSERT,
					new State<>("order_3", Integer.toString(orderId), "")));
			operationList.add(new TransactionalStateOperation<>(TransactionalStateOperation.OperationType.DELETE,
					new State<>("order_2")));
            //使用 Dapr SDK 执行 state transaction
			client.executeStateTransaction(STATE_STORE_NAME, operationList).block();
			log.info("Order requested: " + orderId);
		}
	}

}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 mvn spring-boot:run
```

{{% /tab %}}

{{% tab "Python" %}}
```python
#依赖项
import random
from time import sleep    
import requests
import logging
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateItem
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

#代码
logging.basicConfig(level = logging.INFO)    
DAPR_STORE_NAME = "statestore"
while True:
    sleep(random.randrange(50, 5000) / 1000)
    orderId = random.randint(1, 1000)
    with DaprClient() as client:
        #使用 Dapr SDK 执行 state transaction
        client.execute_state_transaction(store_name=DAPR_STORE_NAME, operations=[
            TransactionalStateOperation(
                operation_type=TransactionOperationType.upsert,
                key="order_3",
                data=str(orderId)),
            TransactionalStateOperation(key="order_3", data=str(orderId)),
            TransactionalStateOperation(
                operation_type=TransactionOperationType.delete,
                key="order_2",
                data=str(orderId)),
            TransactionalStateOperation(key="order_2", data=str(orderId))
        ])

    client.delete_state(store_name=DAPR_STORE_NAME, key="order_1")
    logging.basicConfig(level = logging.INFO)
    logging.info('Order requested: ' + str(orderId))
    logging.info('Result: ' + str(result))
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 -- python3 OrderProcessingService.py
```

{{% /tab %}}

{{% tab "Go" %}}

```go
// 依赖项
package main

import (
	"context"
	"log"
	"math/rand"
	"strconv"
	"time"

	dapr "github.com/dapr/go-sdk/client"
)

// 代码
func main() {
	const STATE_STORE_NAME = "statestore"
	rand.Seed(time.Now().UnixMicro())
	for i := 0; i < 10; i++ {
		orderId := rand.Intn(1000-1) + 1
		client, err := dapr.NewClient()
		if err != nil {
			panic(err)
		}
		defer client.Close()
		ctx := context.Background()
		err = client.SaveState(ctx, STATE_STORE_NAME, "order_1", []byte(strconv.Itoa(orderId)), nil)
		if err != nil {
			panic(err)
		}
		result, err := client.GetState(ctx, STATE_STORE_NAME, "order_1", nil)
		if err != nil {
			panic(err)
		}

        ops := make([]*dapr.StateOperation, 0)
        data1 := "data1"
        data2 := "data2"

        op1 := &dapr.StateOperation{
            Type: dapr.StateOperationTypeUpsert,
            Item: &dapr.SetStateItem{
                Key:   "key1",
                Value: []byte(data1),
            },
        }
        op2 := &dapr.StateOperation{
            Type: dapr.StateOperationTypeDelete,
            Item: &dapr.SetStateItem{
                Key:   "key2",
                Value: []byte(data2),
            },
        }
        ops = append(ops, op1, op2)
        meta := map[string]string{}
        err = client.ExecuteStateTransaction(ctx, STATE_STORE_NAME, meta, ops)

		log.Println("Result after get:", string(result.Value))
		time.Sleep(2 * time.Second)
	}
}
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 go run OrderProcessingService.go
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//依赖项
import { DaprClient, HttpMethod, CommunicationProtocolEnum } from '@dapr/dapr'; 

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

async function start(orderId) {
    const client = new DaprClient({
        daprHost,
        daprPort: process.env.DAPR_HTTP_PORT,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
    });

    const STATE_STORE_NAME = "statestore";
    //使用 Dapr SDK 保存和检索多个状态
    await client.state.transaction(STATE_STORE_NAME, [
        {
        operation: "upsert",
        request: {
            key: "order_3",
            value: orderId.toString()
        }
        },
        {
        operation: "delete",
        request: {
            key: "order_2"
        }
        }
    ]);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

main();
```

要为上面的示例应用启动 Dapr sidecar，请运行类似以下的命令：

```bash
dapr run --app-id orderprocessing --app-port 6001 --dapr-http-port 3601 --dapr-grpc-port 60001 npm start
```

{{% /tab %}}

{{% tab "HTTP API (Bash)" %}}

在同一个仍在运行的 Dapr 实例中，执行两次 state transaction：

```bash
curl -X POST -H "Content-Type: application/json" -d '{"operations": [{"operation":"upsert", "request": {"key": "order_1", "value": "250"}}, {"operation":"delete", "request": {"key": "order_2"}}]}' http://localhost:3601/v1.0/state/statestore/transaction
```

现在查看你的 state transaction 结果：

```bash
curl -X POST -H "Content-Type: application/json" -d '{"keys":["order_1", "order_2"]}' http://localhost:3601/v1.0/state/statestore/bulk
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

在同一个仍在运行的 Dapr 实例中，将两个键/值对保存到你的 state store 中：

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body '{"operations": [{"operation":"upsert", "request": {"key": "order_1", "value": "250"}}, {"operation":"delete", "request": {"key": "order_2"}}]}' -Uri 'http://localhost:3601/v1.0/state/statestore/transaction'
```

现在查看你的 state transaction 结果：

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -Body '{"keys":["order_1", "order_2"]}' -Uri 'http://localhost:3601/v1.0/state/statestore/bulk'
```

{{% /tab %}}

{{< /tabpane >}}

## 后续步骤

- 阅读完整的[状态 API 参考]({{% ref state_api %}})
- 试用其中一个 [Dapr SDK]({{% ref sdks %}})
- 构建一个[有状态服务]({{% ref howto-stateful-service %}})
