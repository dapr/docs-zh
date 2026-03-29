```bash
docker exec dapr_redis redis-cli MSET orderId1 "101" orderId2 "102"
```

I'll retrieve the configuration values for the specified order IDs, demonstrating how to access the stored configuration items directly. This command provides a quick view of the specific configuration values for orderId1 and orderId2 in the Redis cache.

```bash
docker exec dapr_redis redis-cli MGET orderId1 orderId2
```

The expected output will display the current configuration values, which can be useful for verifying the data stored in the Redis configuration store.

### Optional: Updating Configuration Values

After unsubscribing the application, you can dynamically modify the configuration item values. Use the Redis CLI to update the order ID values efficiently:

```bash
docker exec dapr_redis redis-cli MSET orderId1 "103" orderId2 "104"
```

This command allows quick, atomic updates to multiple configuration items, demonstrating the flexibility of the Dapr configuration management approach.</think>---
type: docs
title: "快速入门：配置"
linkTitle: 配置
weight: 78
description: 开始使用 Dapr 的配置构建块
---

让我们来看看 Dapr 的[配置构建块]({{% ref configuration-api-overview %}})。配置项通常是动态的，与使用它的应用紧密耦合。配置项是包含配置数据的键/值对，例如：
- 应用 ID
- 分区键
- 数据库名称等

在本快速入门中，你将运行一个使用配置 API 的 `order-processor` 微服务。该服务：
1. 从配置存储中获取配置项。
1. 订阅配置更新。

<img src="/images/configuration-quickstart/configuration-quickstart-flow.png" width=1000 alt="展示配置 API 快速入门流程的示意图，其中使用了键/值对。">

在继续快速入门之前，请选择你喜欢的语言特定的 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.7+](https://www.python.org/downloads/)。
<!-- IGNORE_LINKS --> 
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/configuration/python/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

克隆完成后，打开一个新终端并运行以下命令，为配置项 `orderId1` 和 `orderId2` 设置值。

```bash
docker exec dapr_redis redis-cli MSET orderId1 "101" orderId2 "102"
```

### 步骤 2：运行 `order-processor` 服务

在 Quickstarts 克隆目录的根目录下，导航到 `order-processor` 目录。

```bash
cd configuration/python/sdk/order-processor
```

安装依赖项：

```bash
pip3 install -r requirements.txt
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ --app-port 6001 -- python3 app.py
```

> **注意**：由于 Windows 上未定义 Python3.exe，你可能需要使用 `python app.py` 而不是 `python3 app.py`。

预期输出：

```
== APP == Configuration for orderId1 : value: "101"
== APP ==
== APP == Configuration for orderId2 : value: "102"
== APP ==
== APP == App unsubscribed from config changes
```

### （可选）步骤 3：更新配置项值

应用取消订阅后，尝试更新配置项值。使用以下命令更改 `orderId1` 和 `orderId2` 的值：

```bash
docker exec dapr_redis redis-cli MSET orderId1 "103" orderId2 "104"
```

再次运行 `order-processor` 服务：

```bash
dapr run --app-id order-processor --resources-path ../../../components/ --app-port 6001 -- python3 app.py
```

> **注意**：由于 Windows 上未定义 Python3.exe，你可能需要使用 `python app.py` 而不是 `python3 app.py`。

应用将返回更新后的配置值：

```
== APP == Configuration for orderId1 : value: "103"
== APP ==
== APP == Configuration for orderId2 : value: "104"
== APP ==
```

### `order-processor` 服务

`order-processor` 服务包含以下代码：
- 从配置存储中获取配置项
- 订阅配置更新（你之前在 CLI 中所做的）
- 取消订阅配置更新并在不活动 20 秒后退出应用

获取配置项：

```python
# Get config items from the config store
for config_item in CONFIGURATION_ITEMS:
    config = client.get_configuration(store_name=DAPR_CONFIGURATION_STORE, keys=[config_item], config_metadata={})
    print(f"Configuration for {config_item} : {config.items[config_item]}", flush=True)
```

订阅配置更新： 

```python
# Subscribe for configuration changes
configuration = await client.subscribe_configuration(DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS)
```

取消订阅配置更新并退出应用：

```python
# Unsubscribe from configuration updates
unsubscribed = True
for config_item in CONFIGURATION_ITEMS:
    unsub_item = client.unsubscribe_configuration(DAPR_CONFIGURATION_STORE, config_item)
    #...
if unsubscribed == True:
    print("App unsubscribed from config changes", flush=True)
```


{{% /tab %}}


<!-- JavaScript -->
{{% tab "JavaScript" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/configuration/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

克隆完成后，打开一个新终端并运行以下命令，为配置项 `orderId1` 和 `orderId2` 设置值。

```bash
docker exec dapr_redis redis-cli MSET orderId1 "101" orderId2 "102"
```

### 步骤 2：运行 `order-processor` 服务

在 Quickstarts 克隆目录的根目录下，导航到 `order-processor` 目录。

```bash
cd configuration/javascript/sdk/order-processor
```

安装依赖项：

```bash
npm install
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ --app-protocol grpc --dapr-grpc-port 3500 -- node index.js
```

预期输出：

```
== APP == Configuration for orderId1: {"key":"orderId1","value":"101","version":"","metadata":{}}
== APP == Configuration for orderId2: {"key":"orderId2","value":"102","version":"","metadata":{}}
== APP == App unsubscribed to config changes
```

### （可选）步骤 3：更新配置项值

应用取消订阅后，尝试更新配置项值。使用以下命令更改 `orderId1` 和 `orderId2` 的值：

```bash
docker exec dapr_redis redis-cli MSET orderId1 "103" orderId2 "104"
```

再次运行 `order-processor` 服务：

```bash
dapr run --app-id order-processor --resources-path ../../../components/ --app-protocol grpc --dapr-grpc-port 3500 -- node index.js
```

应用将返回更新后的配置值：

```
== APP == Configuration for orderId1: {"key":"orderId1","value":"103","version":"","metadata":{}}
== APP == Configuration for orderId2: {"key":"orderId2","value":"104","version":"","metadata":{}}
```

### `order-processor` 服务

`order-processor` 服务包含以下代码：
- 从配置存储中获取配置项
- 订阅配置更新（你之前在 CLI 中所做的）
- 取消订阅配置更新并在不活动 20 秒后退出应用

获取配置项：

```javascript
// Get config items from the config store
//...
  const config = await client.configuration.get(DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS);
  Object.keys(config.items).forEach((key) => {
    console.log("Configuration for " + key + ":", JSON.stringify(config.items[key]));
  });
```

订阅配置更新： 

```javascript
// Subscribe to config updates
try {
  const stream = await client.configuration.subscribeWithKeys(
    DAPR_CONFIGURATION_STORE,
    CONFIGURATION_ITEMS,
    (config) => {
      console.log("Configuration update", JSON.stringify(config.items));
    }
  );
```

取消订阅配置更新并退出应用：

```javascript
// Unsubscribe to config updates and exit app after 20 seconds
setTimeout(() => {
  stream.stop();
  console.log("App unsubscribed to config changes");
  process.exit(0);
},
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 已安装 [.NET 6](https://dotnet.microsoft.com/download/dotnet/6.0)、[.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0) 或 [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)

**注意：** .NET 6 是本版本中 Dapr .NET SDK 包支持的最低 .NET 版本。在 Dapr v1.16 及更高版本中仅支持 .NET 8 和 .NET 9。

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/configuration/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

克隆完成后，打开一个新终端并运行以下命令，为配置项 `orderId1` 和 `orderId2` 设置值。

```bash
docker exec dapr_redis redis-cli MSET orderId1 "101" orderId2 "102"
```

### 步骤 2：运行 `order-processor` 服务

在 Quickstarts 克隆目录的根目录下，导航到 `order-processor` 目录。

```bash
cd configuration/csharp/sdk/order-processor
```

恢复 NuGet 包：

```bash
dotnet restore
dotnet build
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor-http --resources-path ../../../components/ --app-port 7001 -- dotnet run --project .
```

预期输出：

```
== APP == Configuration for orderId1: {"Value":"101","Version":"","Metadata":{}}
== APP == Configuration for orderId2: {"Value":"102","Version":"","Metadata":{}}
== APP == App unsubscribed from config changes
```

### （可选）步骤 3：更新配置项值

应用取消订阅后，尝试更新配置项值。使用以下命令更改 `orderId1` 和 `orderId2` 的值：

```bash
docker exec dapr_redis redis-cli MSET orderId1 "103" orderId2 "104"
```

再次运行 `order-processor` 服务：

```bash
dapr run --app-id order-processor-http --resources-path ../../../components/ --app-port 7001 -- dotnet run --project .
```

应用将返回更新后的配置值：

```
== APP == Configuration for orderId1: {"Value":"103","Version":"","Metadata":{}}
== APP == Configuration for orderId2: {"Value":"104","Version":"","Metadata":{}}
```

### `order-processor` 服务

`order-processor` 服务包含以下代码：
- 从配置存储中获取配置项
- 订阅配置更新（你之前在 CLI 中所做的）
- 取消订阅配置更新并在不活动 20 秒后退出应用

获取配置项：

```csharp
// Get config from configuration store
GetConfigurationResponse config = await client.GetConfiguration(DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS);
foreach (var item in config.Items)
{
  var cfg = System.Text.Json.JsonSerializer.Serialize(item.Value);
  Console.WriteLine("Configuration for " + item.Key + ": " + cfg);
}
```

订阅配置更新： 

```csharp
// Subscribe to config updates
SubscribeConfigurationResponse subscribe = await client.SubscribeConfiguration(DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS);
```

取消订阅配置更新并退出应用：

```csharp
// Unsubscribe to config updates and exit the app
try
{
  client.UnsubscribeConfiguration(DAPR_CONFIGURATION_STORE, subscriptionId);
  Console.WriteLine("App unsubscribed from config changes");
  Environment.Exit(0);
}
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/technetwork/java/javase/downloads/index.html#JDK11)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html) 版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/configuration/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

克隆完成后，打开一个新终端并运行以下命令，为配置项 `orderId1` 和 `orderId2` 设置值。

```bash
docker exec dapr_redis redis-cli MSET orderId1 "101" orderId2 "102"
```

### 步骤 2：运行 `order-processor` 服务

在 Quickstarts 克隆目录的根目录下，导航到 `order-processor` 目录。

```bash
cd configuration/java/sdk/order-processor
```

安装依赖项：

```bash
mvn clean install
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

预期输出：

```
== APP == Configuration for orderId1: {'value':'101'}
== APP == Configuration for orderId2: {'value':'102'}
== APP == App unsubscribed to config changes
```

### （可选）步骤 3：更新配置项值

应用取消订阅后，尝试更新配置项值。使用以下命令更改 `orderId1` 和 `orderId2` 的值：

```bash
docker exec dapr_redis redis-cli MSET orderId1 "103" orderId2 "104"
```

再次运行 `order-processor` 服务：

```bash
dapr run --app-id order-processor --resources-path ../../../components -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

应用将返回更新后的配置值：

```
== APP == Configuration for orderId1: {'value':'103'}
== APP == Configuration for orderId2: {'value':'104'}
```

### `order-processor` 服务

`order-processor` 服务包含以下代码：
- 从配置存储中获取配置项
- 订阅配置更新（你之前在 CLI 中所做的）
- 取消订阅配置更新并在不活动 20 秒后退出应用

获取配置项：

```java
// Get config items from the config store
try (DaprPreviewClient client = (new DaprClientBuilder()).buildPreviewClient()) {
    for (String configurationItem : CONFIGURATION_ITEMS) {
        ConfigurationItem item = client.getConfiguration(DAPR_CONFIGURATON_STORE, configurationItem).block();
        System.out.println("Configuration for " + configurationItem + ": {'value':'" + item.getValue() + "'}");
    }
```

订阅配置更新： 

```java
// Subscribe for config changes
Flux<SubscribeConfigurationResponse> subscription = client.subscribeConfiguration(DAPR_CONFIGURATON_STORE,
        CONFIGURATION_ITEMS.toArray(String[]::new));
```

取消订阅配置更新并退出应用：

```java
// Unsubscribe from config changes
UnsubscribeConfigurationResponse unsubscribe = client
        .unsubscribeConfiguration(subscriptionId, DAPR_CONFIGURATON_STORE).block();
if (unsubscribe.getIsUnsubscribed()) {
    System.out.println("App unsubscribed to config changes");
}
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/configuration/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

克隆完成后，打开一个新终端并运行以下命令，为配置项 `orderId1` 和 `orderId2` 设置值。

```bash
docker exec dapr_redis redis-cli MSET orderId1 "101" orderId2 "102"
```

### 步骤 2：运行 `order-processor` 服务

在 Quickstarts 克隆目录的根目录下，导航到 `order-processor` 目录。

```bash
cd configuration/go/sdk/order-processor
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --app-port 6001 --resources-path ../../../components -- go run .
```

预期输出：

```
== APP == Configuration for orderId1: {"Value":"101","Version":"","Metadata":null}
== APP == Configuration for orderId2: {"Value":"102","Version":"","Metadata":null}
== APP == dapr configuration subscribe finished.
== APP == App unsubscribed to config changes
```

### （可选）步骤 3：更新配置项值

应用取消订阅后，尝试更新配置项值。使用以下命令更改 `orderId1` 和 `orderId2` 的值：

```bash
docker exec dapr_redis redis-cli MSET orderId1 "103" orderId2 "104"
```

再次运行 `order-processor` 服务：

```bash
dapr run --app-id order-processor --app-port 6001 --resources-path ../../../components -- go run .
```

应用将返回更新后的配置值：

```
== APP == Configuration for orderId1: {"Value":"103","Version":"","Metadata":null}
== APP == Configuration for orderId2: {"Value":"104","Version":"","Metadata":null}
```

### `order-processor` 服务

`order-processor` 服务包含以下代码：
- 从配置存储中获取配置项
- 订阅配置更新（你之前在 CLI 中所做的）
- 取消订阅配置更新并在不活动 20 秒后退出应用

获取配置项：

```go
// Get config items from config store
for _, item := range CONFIGURATION_ITEMS {
	config, err := client.GetConfigurationItem(ctx, DAPR_CONFIGURATION_STORE, item)
	//...
	c, _ := json.Marshal(config)
	fmt.Println("Configuration for " + item + ": " + string(c))
}
```

订阅配置更新： 

```go
// Subscribe for config changes
err = client.SubscribeConfigurationItems(ctx, DAPR_CONFIGURATION_STORE, CONFIGURATION_ITEMS, func(id string, config map[string]*dapr.ConfigurationItem) {
	// First invocation when app subscribes to config changes only returns subscription id
	if len(config) == 0 {
		fmt.Println("App subscribed to config changes with subscription id: " + id)
		subscriptionId = id
		return
	}
})
```

取消订阅配置更新并退出应用：

```go
// Unsubscribe to config updates and exit app after 20 seconds
select {
case <-ctx.Done():
	err = client.UnsubscribeConfigurationItems(context.Background(), DAPR_CONFIGURATION_STORE, subscriptionId)
    //...
	{
		fmt.Println("App unsubscribed to config changes")
	}
```

{{% /tab %}}

{{< /tabpane >}}

## 演示

观看此视频[演示配置 API 快速入门](https://youtu.be/EcE6IGuX9L8?t=94)：

{{< youtube id=EcE6IGuX9L8 start=94 >}}

## 告诉我们你的想法！

我们正在不断努力改进我们的快速入门示例，并重视你的反馈。你觉得这个快速入门有帮助吗？你有改进建议吗？

加入我们的 [discord 频道](https://discord.com/channels/778680217417809931/953427615916638238) 参与讨论。

## 后续步骤

- 使用 HTTP 而非 SDK 来使用 Dapr 配置。
  - [Python](https://github.com/dapr/quickstarts/tree/master/configuration/python/http)
  - [JavaScript](https://github.com/dapr/quickstarts/tree/master/configuration/javascript/http)
  - [.NET](https://github.com/dapr/quickstarts/tree/master/configuration/csharp/http)
  - [Java](https://github.com/dapr/quickstarts/tree/master/configuration/java/http)
  - [Go](https://github.com/dapr/quickstarts/tree/master/configuration/go/http)
- 了解更多关于[配置构建块]({{% ref configuration-api-overview %}})

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
