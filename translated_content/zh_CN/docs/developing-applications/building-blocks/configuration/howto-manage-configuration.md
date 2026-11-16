---
type: docs
title: "操作指南：从存储中管理配置"
linkTitle: "操作指南：从存储中管理配置"
weight: 2000
description: "了解如何获取应用程序配置并订阅变更"
---

本示例使用 Redis 配置存储组件来演示如何检索配置项。

{{< diagram name="configuration-example" width="55" >}}

{{% alert title="注意" color="primary" %}}
 如果你还没有尝试过，可以先体验一下[配置快速入门]({{% ref configuration-quickstart %}})，快速了解如何使用配置 API。

{{% /alert %}}

{{% alert title="禁用配置初始化端点" color="primary" %}}
如果你的应用程序不使用配置构建块，可以禁用初始化期间对 `/dapr/config` 端点的自动 HTTP 调用，以减少日志噪音。使用 `dapr run` 时加上 `--disable-init-endpoints config` 参数，或在 Kubernetes 中使用 `dapr.io/disable-init-endpoints: "config"` 注解。[了解更多关于禁用初始化端点的信息。]({{% ref "arguments-annotations-overview#disable-init-endpoints" %}})
{{% /alert %}}


## 在存储中创建配置项

在支持的配置存储中创建一个配置项。它可以是一个简单的键值项，键可以由你自行选择。如前所述，本示例使用 Redis 配置存储组件。

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

将以下组件文件保存到你机器上的[默认组件文件夹]({{% ref "install-dapr-selfhost#step-5-verify-components-directory-has-been-initialized" %}})中。你可以把它用作 Dapr 组件 YAML：

- 使用 `kubectl` 的 Kubernetes 环境。
- 使用 Dapr CLI 运行时。

{{% alert title="注意" color="primary" %}}
 由于 Redis 配置组件与 Redis `statestore.yaml` 组件的元数据相同，如果你已经有 Redis `statestore.yaml`，只需复制并修改 Redis 状态存储组件的类型即可。

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
    value: <PASSWORD>
```

## 检索配置项
### 获取配置项

以下示例展示如何使用 Dapr 配置 API 获取已保存的配置项。

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

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖项
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprClient;
import io.dapr.client.domain.ConfigurationItem;
import io.dapr.client.domain.GetConfigurationRequest;
import io.dapr.client.domain.SubscribeConfigurationRequest;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

//代码
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

{{% /tab %}}

{{% tab "Python" %}}

```python
#依赖项
from dapr.clients import DaprClient
#代码
with DaprClient() as d:
        CONFIG_STORE_NAME = 'configstore'
        keys = ['orderId1', 'orderId2']
        #等待 Dapr 启动
        d.wait(20)
        configuration = d.get_configuration(store_name=CONFIG_STORE_NAME, keys=[keys], config_metadata={})
        print(f"Got key={configuration.items[0].key} value={configuration.items[0].value} version={configuration.items[0].version}")
```

{{% /tab %}}

{{% tab "Go" %}}

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

{{% /tab %}}

{{% tab "JavaScript" %}}

这些示例面向 **`@dapr/dapr` 3.19.0 或更高版本**。安装方法与完整的可运行示例，请参阅 [JavaScript 配置指南]({{% ref js-configuration-howto.md %}})。

```js
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

// JavaScript SDK 的配置操作需要 gRPC。
const protocol = CommunicationProtocolEnum.GRPC;
const host = process.env.DAPR_HOST ?? "localhost";
const port = process.env.DAPR_GRPC_PORT ?? "50001";

const DAPR_CONFIGURATION_STORE = "configstore";
const CONFIGURATION_ITEMS = ["orderId1", "orderId2"];

async function main() {
  const client = new DaprClient({
    daprHost: host,
    daprPort: port,
    communicationProtocol: protocol,
  });
  // 从配置存储中获取配置项
  try {
    const config = await client.configuration.get(DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS);
    Object.keys(config.items).forEach((key) => {
      console.log("Configuration for " + key + ":", JSON.stringify(config.items[key]));
    });
  } finally {
    await client.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

{{% /tab %}}

{{% tab "HTTP API (BASH)" %}}

启动 Dapr 边车：

```bash
dapr run --app-id orderprocessing --dapr-http-port 3601
```

在另一个终端中，获取之前保存的配置项：

```bash
curl http://localhost:3601/v1.0/configuration/configstore?key=orderId1
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}

启动 Dapr 边车：

```bash
dapr run --app-id orderprocessing --dapr-http-port 3601
```

在另一个终端中，获取之前保存的配置项：

```powershell
Invoke-RestMethod -Uri 'http://localhost:3601/v1.0/configuration/configstore?key=orderId1'
```

{{% /tab %}}

{{< /tabpane >}}


### 订阅配置项更新

下面的代码示例使用 SDK，通过 `configstore` 存储组件订阅键 `[orderId1, orderId2]`。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

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

// 订阅配置变更
var subscribe = await client.SubscribeConfiguration(DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS);

// 输出配置变更
await foreach (var items in subscribe.Source)
{
  // 应用首次订阅配置变更时，只会返回订阅 ID
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

进入包含上述代码的目录，然后运行以下命令，同时启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- dotnet run
```

{{% /tab %}}

{{% tab "ASP.NET" %}}

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

// 与大多数情况不同，这里使用工厂方法来构建 `DaprClient`，因为我们无法依赖 `IConfiguration`
// 或其他已注入的服务来配置它，此时 DI 容器尚未构建完成。
var client = new DaprClientBuilder().Build();

// 在实际应用中，你还需要添加以下这一行，将 `DaprClient` 注册到 DI 容器中，以便将其注入其他服务。
// 在本示例中没有必要这样做，因为我们并未在任何地方注入它。  
// builder.Services.AddDaprClient();

// 获取初始值，并持续监听其变化
builder.Configuration.AddDaprConfigurationStore("configstore", new List<string>() { "orderId1","orderId2" }, client, TimeSpan.FromSeconds(20));
builder.Configuration.AddStreamingDaprConfigurationStore("configstore", new List<string>() { "orderId1","orderId2" }, client, TimeSpan.FromSeconds(20));

await builder.Build().RunAsync();
Console.WriteLine("Closing application.");
```

进入包含上述代码的目录，然后运行以下命令，同时启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- dotnet run
```

{{% /tab %}}

{{% tab "Java" %}}

```java
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprClient;
import io.dapr.client.domain.ConfigurationItem;
import io.dapr.client.domain.GetConfigurationRequest;
import io.dapr.client.domain.SubscribeConfigurationRequest;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

//代码
private static final String CONFIG_STORE_NAME = "configstore";
private static String subscriptionId = null;

public static void main(String[] args) throws Exception {
    try (DaprClient client = (new DaprClientBuilder()).build()) {
      // 订阅配置变更
      List<String> keys = new ArrayList<>();
      keys.add("orderId1");
      keys.add("orderId2");
      Flux<SubscribeConfigurationResponse> subscription = client.subscribeConfiguration(DAPR_CONFIGURATON_STORE,keys);

      // 读取 20 秒内的配置变更
      subscription.subscribe((response) -> {
          // 第一条响应包含订阅 ID
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

进入包含上述代码的目录，然后运行以下命令，同时启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- -- mvn spring-boot:run

{{% /tab %}}

{{% tab "Python" %}}

```python
#依赖项
from dapr.clients import DaprClient
#代码

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

进入包含上述代码的目录，然后运行以下命令，同时启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- python3 OrderProcessingService.py
```

{{% /tab %}}

{{% tab "Go" %}}

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

进入包含上述代码的目录，然后运行以下命令，同时启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing -- go run main.go
```

{{% /tab %}}

{{% tab "JavaScript" %}}

JavaScript SDK 通过客户端的 gRPC 流接收更新，不需要应用程序的回调路由。订阅就绪状态与错误处理的限制，请参阅[客户端使用指南]({{% ref js-configuration-client-usage.md %}})。

```js
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

// JavaScript SDK 的配置操作需要 gRPC。
const protocol = CommunicationProtocolEnum.GRPC;
const host = process.env.DAPR_HOST ?? "localhost";
const port = process.env.DAPR_GRPC_PORT ?? "50001";

const DAPR_CONFIGURATION_STORE = "configstore";
const CONFIGURATION_ITEMS = ["orderId1", "orderId2"];

async function main() {
  const client = new DaprClient({
    daprHost: host,
    daprPort: port,
    communicationProtocol: protocol,
  });
  // 订阅配置更新
  try {
    const stream = await client.configuration.subscribeWithKeys(
      DAPR_CONFIGURATION_STORE,
      CONFIGURATION_ITEMS,
      async (config) => {
        console.log("Configuration update", JSON.stringify(config.items));
      }
    );
    try {
      await new Promise((resolve) => setTimeout(resolve, 20000));
    } finally {
      await stream.stop();
    }
  } finally {
    await client.stop();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

将代码保存为 `index.mjs`，然后运行以下命令，同时启动 Dapr 边车和订阅者应用程序：

```bash
dapr run --app-id orderprocessing --dapr-grpc-port 50001 -- node index.mjs
```

{{% /tab %}}

{{< /tabpane >}}


### 取消订阅配置项更新

订阅配置项后，你会收到所有已订阅键的更新。若要停止接收更新，需要显式调用取消订阅 API。

以下代码示例展示如何使用取消订阅 API 取消订阅配置更新。

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
{{% /tab %}}

{{% tab "Java" %}}
```java
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.DaprClient;
import io.dapr.client.domain.ConfigurationItem;
import io.dapr.client.domain.GetConfigurationRequest;
import io.dapr.client.domain.SubscribeConfigurationRequest;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

//代码
private static final String CONFIG_STORE_NAME = "configstore";
private static String subscriptionId = null;

public static void main(String[] args) throws Exception {
    try (DaprClient client = (new DaprClientBuilder()).build()) {
      // 取消订阅配置变更
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
{{% /tab %}}

{{% tab "Python" %}}
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
{{% /tab %}}

{{% tab "Go" %}}
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
{{% /tab %}}

{{% tab "JavaScript" %}}
```js
import { CommunicationProtocolEnum, DaprClient } from "@dapr/dapr";

// JavaScript SDK 的配置操作需要 gRPC。
const protocol = CommunicationProtocolEnum.GRPC;
const host = process.env.DAPR_HOST ?? "localhost";
const port = process.env.DAPR_GRPC_PORT ?? "50001";

const DAPR_CONFIGURATION_STORE = "configstore";
const CONFIGURATION_ITEMS = ["orderId1", "orderId2"];

async function main() {
  const client = new DaprClient({
    daprHost: host,
    daprPort: port,
    communicationProtocol: protocol,
  });

  try {
    const stream = await client.configuration.subscribeWithKeys(
      DAPR_CONFIGURATION_STORE,
      CONFIGURATION_ITEMS,
      async (config) => {
        console.log("Configuration update", JSON.stringify(config.items));
      }
    );
    try {
      await new Promise((resolve) => setTimeout(resolve, 20000));
    } finally {
      await stream.stop();
    }
  } finally {
    await client.stop();
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
```

句柄的 `stop()` 会取消本地流；如果已经收到运行时的订阅 ID，还会尝试使用该 ID 取消订阅。清理是尽力而为的操作，请参阅[订阅清理的限制]({{% ref "js-configuration-client-usage.md#stop-a-subscription" %}})。

{{% /tab %}}

{{% tab "HTTP API (BASH)" %}}
```bash
curl 'http://localhost:<DAPR_HTTP_PORT>/v1.0/configuration/configstore/<subscription-id>/unsubscribe'
```
{{% /tab %}}

{{% tab "HTTP API (PowerShell)" %}}
```powershell
Invoke-RestMethod -Uri 'http://localhost:<DAPR_HTTP_PORT>/v1.0/configuration/configstore/<subscription-id>/unsubscribe'
```
{{% /tab %}}

{{< /tabpane >}}

## 后续步骤

* 阅读[配置 API 概述]({{% ref configuration-api-overview %}})
