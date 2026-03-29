---
type: docs
title: "操作指南：从存储中管理配置"
linkTitle: "操作指南：从存储中管理配置"
weight: 2000
description: "了解如何获取应用程序配置并订阅变更"
---

此示例使用 Redis 配置存储组件来演示如何检索配置项。

<img src="/images/building-block-configuration-example.png" width=1000 alt="显示获取示例服务配置的图表">

{{% alert title="注意" color="primary" %}}
 如果您还没有尝试过，可以先体验一下[配置快速入门]({{% ref configuration-quickstart %}}) ，快速了解如何使用配置 API。

{{% /alert %}}</p>

{{% alert title="禁用配置初始化端点" color="primary" %}}
如果您的应用程序不使用配置构建块，则可以在初始化期间禁用对 `/dapr/config` 端点的自动 HTTP 调用，以减少日志噪音。在使用 `dapr run` 时使用 `--disable-init-endpoints config` 标志，或在 Kubernetes 中使用 `dapr.io/disable-init-endpoints: "config"` 注解。[了解有关禁用初始化端点的更多信息。]({{% ref "arguments-annotations-overview#disable-init-endpoints" %}})
{{% /alert %}}


## 在存储中创建配置项

在支持的配置存储中创建一个配置项。这可以是一个简单的键值项，键可以由您自行选择。如前所述，此示例使用 Redis 配置存储组件。

### 使用 Docker 运行 Redis

```
docker run --name my-redis -p 6379:6379 -d redis:6
```

### 保存项

使用 [Redis CLI](https://redis.com/blog/get-redis-cli-without-installing-redis-server/) 连接到 Redis 实例：

```
redis-cli -p 6379
```

保存一个配置项：

```
MSET orderId1 "101||1" orderId2 "102||1"
```

## 配置 Dapr 配置存储

将以下组件文件保存到您机器上的[默认组件文件夹]({{% ref "install-dapr-selfhost#step-5-verify-components-directory-has-been-initialized" %}})中。您可以使用此文件作为 Dapr 组件 YAML：

- 对于使用 `kubectl` 的 Kubernetes 环境。
- 使用 Dapr CLI 运行时的场景。

{{% alert title="注意" color="primary" %}}
 由于 Redis 配置组件的元数据与 Redis `statestore.yaml` 组件相同，如果您已经有 Redis `statestore.yaml`，可以简单地复制/更改 Redis 状态存储组件类型。

{{% /alert %}}

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: configstore
spec:
  type: configuration.redis
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: <REDIS_PASSWORD>
```

## 检索配置项
### 获取配置项

以下示例展示如何使用 Dapr Configuration API 获取已保存的配置项。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapr.Client;

const string CONFIG_STORE_NAME = "configstore";

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

using var client = app.Services.GetRequiredServices<DaprClient>();

var configuration = await client.GetConfiguration(CONFIG_STORE_NAME, [ "orderId1", "orderId2" ]);
Console.WriteLine($"Got key=\n{configuration[0].Key} -> {configuration[0].Value}\n{configuration[1].Key} -> {configuration[1].Value}");
```

{{% /tab %}}</p>

{{% tab "Java" %}}</p>

```java
//dependencies
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprClient;
import io.dapr.client.domain.ConfigurationItem;
import io.dapr.client.domain.GetConfigurationRequest;
import io.dapr.client.domain.SubscribeConfigurationRequest;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

//code
private static final String CONFIG_STORE_NAME = "configstore";

public static void main(String[] args) throws Exception {
    try (DaprClient client = (new DaprClientBuilder()).build()) {
      List<String> keys = new ArrayList<>();
      keys.add("orderId1");
      keys.add("orderId2");
      GetConfigurationRequest req = new GetConfigurationRequest(CONFIG_STORE_NAME, keys);
      try {
        Mono<List<ConfigurationItem>> items = client.getConfiguration(req);
        items.block().forEach(ConfigurationClient::print);
      } catch (Exception ex) {
        System.out.println(ex.getMessage());
      }
    }
}
```

{{% /tab集团有限公司

Python"

```python
#dependencies
from dapr.clients import DaprClient
#code
with DaprClient() as d:
        CONFIG_STORE_NAME = 'configstore'
        keys = ['orderId1', 'orderId2']
        #Startup time for dapr
        d.wait(20)
        configuration = d.get_configuration(store_name=CONFIG_STORE_NAME, keys=[keys], config_metadata={})
        print(f"Got key={configuration.items[0].key} value={configuration.items[0].value} version={configuration.items[0].version}")
```

{{% /tab集团有限公司

Go"

```go
package main

import (
	"context"
  "fmt"

	dapr "github.com/dapr/go-sdk/client"
)

func main() {
	ctx := context.Background()
	client, err := dapr.NewClient()
	if err != nil {
		panic(err)
	}
	items, err := client.GetConfigurationItems(ctx, "configstore", ["orderId1","orderId2"])
	if err != nil {
		panic(err)
	}
  for key, item := range items {
    fmt.Printf("get config: key = %s value = %s version = %s",key,(*item).Value, (*item).Version)
  }
}
```

{{% /tab集团有限公司

JavaScript"

```js
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

// JS SDK does not support Configuration API over HTTP protocol yet
const protocol = CommunicationProtocolEnum.GRPC;
const host = process.env.DAPR_HOST ?? "localhost";
const port = process.env.DAPR_GRPC_PORT ?? 3500;

const DAPR_CONFIGURATION_STORE = "configstore";
const CONFIGURATION_ITEMS = ["orderId1", "orderId2"];

async function main() {
  const client = new DaprClient(host, port, protocol);
  // Get config items from the config store
  try {
    const config = await client.configuration.get(DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS);
    Object.keys(config.items).forEach((key) => {
      console.log("Configuration for " + key + ":", JSON.stringify(config.items[key]));
    });
  } catch (error) {
    console.log("Could not get config item, err:" + error);
    process.exit(1);
  }
}

main().catch((e) => console.error(e));
```

{{% /tab集团有限公司

HTTP API (BASH)"

Launch a dapr sidecar:

```bash
dapr run --app-id orderprocessing --dapr-http-port 3601
```

在另一个终端中，获取之前保存的配置项：

```bash
curl http://localhost:3601/v1.0/configuration/configstore?key=orderId1
```

{{% /tab集团有限公司

HTTP API (PowerShell)"

启动 Dapr 边车：

```bash
dapr run --app-id orderprocessing --dapr-http-port 3601
```

在另一个终端中，获取之前保存的配置项：

```powershell
Invoke-RestMethod -Uri 'http://localhost:3601/v1.0/configuration/configstore?key=orderId1'
```

{{% /tab集团有限公司

{{< /tabpane >}}


### 订阅配置项更新

以下是使用 SDK 订阅使用 `configstore` 存储组件的键 `[orderId1, orderId2]` 的代码示例。

{{< tabpane text=true >}}

{{% tab ".NET" %}}</p>

```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapr.Client;
using System.Text.Json;

const string DAPR_CONFIGURATION_STORE = "configstore";
var CONFIGURATION_ITEMS = new List<string> { "orderId1", "orderId2" };

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

var client = app.Services.GetRequiredService<DaprClient>();

// Subscribe for configuration changes
var subscribe = await client.SubscribeConfiguration(DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS);

// Print configuration changes
await foreach (var items in subscribe.Source)
{
  // First invocation when app subscribes to config changes only returns subscription id
  if (items.Keys.Count == 0)
  {
    Console.WriteLine("App subscribed to config changes with subscription id: " + subscribe.Id);
    subscriptionId = subscribe.Id;
    continue;
  }
  var cfg = JsonSerializer.Serialize(items);
  Console.WriteLine("Configuration update " + cfg);
}
```

导航到包含上述代码的目录，然后运行以下命令启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- dotnet run
```

{{% /tab集团有限公司

ASP.NET"

```csharp
using System;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;
using Dapr.Client;
using Dapr.Extensions.Configuration;
using System.Collections.Generic;
using System.Threading;

Console.WriteLine("Starting application.");
var builder = WebApplication.CreateBuilder(args);

// Unlike most other situations, we build a `DaprClient` here using its factory because we cannot rely on `IConfiguration`
// or other injected services to configure it because we haven't yet built the DI container.
var client = new DaprClientBuilder().Build();

// In a real-world application, you'd also add the following line to register the `DaprClient` with the DI container so
// it can be injected into other services. In this demonstration, it's not necessary as we're not injecting it anywhere.  
// builder.Services.AddDaprClient();

// Get the initial value and continue to watch it for changes 
builder.Configuration.AddDaprConfigurationStore("configstore", new List<string>() { "orderId1","orderId2" }, client, TimeSpan.FromSeconds(20));
builder.Configuration.AddStreamingDaprConfigurationStore("configstore", new List<string>() { "orderId1","orderId2" }, client, TimeSpan.FromSeconds(20));

await builder.Build().RunAsync();
Console.WriteLine("Closing application.");
```

导航到包含上述代码的目录，然后运行以下命令启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- dotnet run
```

{{% /tab集团有限公司

Java"

```java
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprClient;
import io.dapr.client.domain.ConfigurationItem;
import io.dapr.client.domain.GetConfigurationRequest;
import io.dapr.client.domain.SubscribeConfigurationRequest;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

//code
private static final String CONFIG_STORE_NAME = "configstore";
private static String subscriptionId = null;

public static void main(String[] args) throws Exception {
    try (DaprClient client = (new DaprClientBuilder()).build()) {
      // Subscribe for config changes
      List<String> keys = new ArrayList<>();
      keys.add("orderId1");
      keys.add("orderId2");
      Flux<SubscribeConfigurationResponse> subscription = client.subscribeConfiguration(DAPR_CONFIGURATON_STORE,keys);

      // Read config changes for 20 seconds
      subscription.subscribe((response) -> {
          // First ever response contains the subscription id
          if (response.getItems() == null || response.getItems().isEmpty()) {
              subscriptionId = response.getSubscriptionId();
              System.out.println("App subscribed to config changes with subscription id: " + subscriptionId);
          } else {
              response.getItems().forEach((k, v) -> {
                  System.out.println("Configuration update for " + k + ": {'value':'" + v.getValue() + "'}");
              });
          }
      });
      Thread.sleep(20000);
    }
}
```

导航到包含上述代码的目录，然后运行以下命令启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- -- mvn spring-boot:run

{{% /tab集团有限公司

Python"

```python
#dependencies
from dapr.clients import DaprClient
#code

def handler(id: str, resp: ConfigurationResponse):
    for key in resp.items:
        print(f"Subscribed item received key={key} value={resp.items[key].value} "
              f"version={resp.items[key].version} "
              f"metadata={resp.items[key].metadata}", flush=True)

def executeConfiguration():
    with DaprClient() as d:
        storeName = 'configurationstore'
        keys = ['orderId1', 'orderId2']
        id = d.subscribe_configuration(store_name=storeName, keys=keys,
                          handler=handler, config_metadata={})
        print("Subscription ID is", id, flush=True)
        sleep(20)

executeConfiguration()
```

导航到包含上述代码的目录，然后运行以下命令启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- python3 OrderProcessingService.py
```

{{% /tab集团有限公司

Go"

```go
package main

import (
	"context"
  "fmt"
  "time"

	dapr "github.com/dapr/go-sdk/client"
)

func main() {
	ctx := context.Background()
	client, err := dapr.NewClient()
	if err != nil {
		panic(err)
	}
  subscribeID, err := client.SubscribeConfigurationItems(ctx, "configstore", []string{"orderId1", "orderId2"}, func(id string, items map[string]*dapr.ConfigurationItem) {
  for k, v := range items {
    fmt.Printf("get updated config key = %s, value = %s version = %s \n", k, v.Value, v.Version)
  }
  })
	if err != nil {
		panic(err)
	}
	time.Sleep(20*time.Second)
}
```

导航到包含上述代码的目录，然后运行以下命令启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- go run main.go
```

{{% /tab集团有限公司

JavaScript"

```js
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

// JS SDK does not support Configuration API over HTTP protocol yet
const protocol = CommunicationProtocolEnum.GRPC;
const host = process.env.DAPR_HOST ?? "localhost";
const port = process.env.DAPR_GRPC_PORT ?? 3500;

const DAPR_CONFIGURATION_STORE = "configstore";
const CONFIGURATION_ITEMS = ["orderId1", "orderId2"];

async function main() {
  const client = new DaprClient(host, port, protocol);
  // Subscribe to config updates
  try {
    const stream = await client.configuration.subscribeWithKeys(
      DAPR_CONFIGURATION_STORE,
      CONFIGURATION_ITEMS,
      (config) => {
        console.log("Configuration update", JSON.stringify(config.items));
      }
    );
    // Unsubscribe to config updates and exit app after 20 seconds
    setTimeout(() => {
      stream.stop();
      console.log("App unsubscribed to config changes");
      process.exit(0);
    }, 20000);
  } catch (error) {
    console.log("Error subscribing to config updates, err:" + error);
    process.exit(1);
  }
}
main().catch((e) => console.error(e));
```

导航到包含上述代码的目录，然后运行以下命令启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing --app-protocol grpc --dapr-grpc-port 3500 -- node index.js
```

{{% /tab集团有限公司

{{< /tabpane >}}


### 取消订阅配置项更新

订阅监视配置项后，您将收到所有订阅键的更新。要停止接收更新，您需要显式调用取消订阅 API。

以下是展示如何使用取消订阅 API 取消订阅配置更新的代码示例。

{{< tabpane text=true >}}

{{% tab ".NET" %}}


```csharp
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Dapr.Client;

var builder = WebApplication.CreateBuilder();
builder.Services.AddDaprClient();
var app = builder.Build();

const string DAPR_CONFIGURATION_STORE = "configstore";
const string SubscriptionId = "abc123"; //Replace with the subscription identifier to unsubscribe from
var client = app.Services.GetRequiredService<DaprClient>();

await client.UnsubscribeConfiguration(DAPR_CONFIGURATION_STORE, SubscriptionId);
Console.WriteLine("App unsubscribed from config changes");
```
{{% /tab集团有限公司

Java"
```java
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprClient;
import io.dapr.client.domain.ConfigurationItem;
import io.dapr.client.domain.GetConfigurationRequest;
import io.dapr.client.domain.SubscribeConfigurationRequest;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

//code
private static final String CONFIG_STORE_NAME = "configstore";
private static String subscriptionId = null;

public static void main(String[] args) throws Exception {
    try (DaprClient client = (new DaprClientBuilder()).build()) {
      // Unsubscribe from config changes
      UnsubscribeConfigurationResponse unsubscribe = client
              .unsubscribeConfiguration(subscriptionId, DAPR_CONFIGURATON_STORE).block();
      if (unsubscribe.getIsUnsubscribed()) {
          System.out.println("App unsubscribed to config changes");
      } else {
          System.out.println("Error unsubscribing to config updates, err:" + unsubscribe.getMessage());
      }
    } catch (Exception e) {
        System.out.println("Error unsubscribing to config updates," + e.getMessage());
        System.exit(1);
    }
}
```
{{% /tab集团有限公司

Python"
```python
import asyncio
import time
import logging
from dapr.clients import DaprClient
subscriptionID = ""

with DaprClient() as d:
  isSuccess = d.unsubscribe_configuration(store_name='configstore', id=subscriptionID)
  print(f"Unsubscribed successfully? {isSuccess}", flush=True)
```
{{% /tab集团有限公司

Go"
```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	dapr "github.com/dapr/go-sdk/client"
)

var DAPR_CONFIGURATION_STORE = "configstore"
var subscriptionID = ""

func main() {
	client, err := dapr.NewClient()
	if err != nil {
		log.Panic(err)
	}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
  if err := client.UnsubscribeConfigurationItems(ctx, DAPR_CONFIGURATION_STORE , subscriptionID); err != nil {
    panic(err)
  }
}
```
{{% /tab集团有限公司

JavaScript"
```js
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

// JS SDK does not support Configuration API over HTTP protocol yet
const protocol = CommunicationProtocolEnum.GRPC;
const host = process.env.DAPR_HOST ?? "localhost";
const port = process.env.DAPR_GRPC_PORT ?? 3500;

const DAPR_CONFIGURATION_STORE = "configstore";
const CONFIGURATION_ITEMS = ["orderId1", "orderId2"];

async function main() {
  const client = new DaprClient(host, port, protocol);

  try {
    const stream = await client.configuration.subscribeWithKeys(
      DAPR_CONFIGURATION_STORE,
      CONFIGURATION_ITEMS,
      (config) => {
        console.log("Configuration update", JSON.stringify(config.items));
      }
    );
    setTimeout(() => {
      // Unsubscribe to config updates
      stream.stop();
      console.log("App unsubscribed to config changes");
      process.exit(0);
    }, 20000);
  } catch (error) {
    console.log("Error subscribing to config updates, err:" + error);
    process.exit(1);
  }
}

main().catch((e) => console.error(e));
```
{{% /tab集团有限公司

HTTP API (BASH)"
```bash
curl 'http://localhost:<DAPR_HTTP_PORT>/v1.0/configuration/configstore/<subscription-id>/unsubscribe'
```
{{% /tab集团有限公司

HTTP API (PowerShell)"
```powershell
Invoke-RestMethod -Uri 'http://localhost:<DAPR_HTTP_PORT>/v1.0/configuration/configstore/<subscription-id>/unsubscribe'
```
{{% /tab集团有限公司

{{< /tabpane >}}

## 下一步

* 阅读[配置 API 概述]({{% ref configuration-api-overview %}})
