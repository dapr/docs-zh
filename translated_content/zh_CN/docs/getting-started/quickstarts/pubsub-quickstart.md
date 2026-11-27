---
type: docs
title: "Quickstart: Publish and Subscribe"
linkTitle: "发布和订阅"
weight: 72
description: "Dapr 发布和订阅 building block 入门"
---

让我们来了解一下 Dapr 的[发布和订阅（pub/sub）building block]({{% ref pubsub %}})。在本 Quickstart 中，你将运行一个发布者微服务和一个订阅者微服务，以演示 Dapr 如何实现 pub/sub 模式。

1. 使用发布者服务，开发者可以反复向某个 topic 发布消息。
1. [pub/sub component](https://docs.dapr.io/concepts/components-concept/#pubsub-brokers)会对这些消息进行排队或代理。下面的示例使用 Redis，你也可以使用 RabbitMQ、Kafka 等。
1. 该 topic 的订阅者从队列中拉取消息并进行处理。

<img src="/images/pubsub-quickstart/pubsub-diagram.png" width=800 style="padding-bottom:15px;">

你可以通过以下任一方式尝试此 pub/sub Quickstart：

- [使用 Multi-App Run 模板文件同时运行本示例中的所有应用程序]({{% ref "#run-using-multi-app-run" %}})，或
- [一次运行一个应用程序]({{% ref "#run-one-application-at-a-time" %}})

## 使用 Multi-App Run 运行

在继续 Quickstart 之前，请选择你偏好的语言对应的 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/python/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

在 Quickstarts 目录的根目录下，进入 pub/sub 目录：

```bash
cd pub_sub/python/sdk
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
uv sync --all-packages
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务，并各自附带其 Dapr sidecar：
- `order-processor` 订阅者
- `checkout` 发布者

```bash
uv run dapr run -f .
```


**预期输出**

```
== APP - checkout-sdk == Published data: Order { OrderId = 1 }
== APP - order-processor == Subscriber received : Order { OrderId = 1 }
== APP - checkout-sdk == Published data: Order { OrderId = 2 }
== APP - order-processor == Subscriber received : Order { OrderId = 2 }
== APP - checkout-sdk == Published data: Order { OrderId = 3 }
== APP - order-processor == Subscriber received : Order { OrderId = 3 }
== APP - checkout-sdk == Published data: Order { OrderId = 4 }
== APP - order-processor == Subscriber received : Order { OrderId = 4 }
== APP - checkout-sdk == Published data: Order { OrderId = 5 }
== APP - order-processor == Subscriber received : Order { OrderId = 5 }
== APP - checkout-sdk == Published data: Order { OrderId = 6 }
== APP - order-processor == Subscriber received : Order { OrderId = 6 }
== APP - checkout-sdk == Published data: Order { OrderId = 7 }
== APP - order-processor == Subscriber received : Order { OrderId = 7 }
== APP - checkout-sdk == Published data: Order { OrderId = 8 }
== APP - order-processor == Subscriber received : Order { OrderId = 8 }
== APP - checkout-sdk == Published data: Order { OrderId = 9 }
== APP - order-processor == Subscriber received : Order { OrderId = 9 }
== APP - checkout-sdk == Published data: Order { OrderId = 10 }
== APP - order-processor == Subscriber received : Order { OrderId = 10 }
Exited App successfully
```

### 发生了什么？

运行 Dapr 安装过程中的 `dapr init` 时，会在 `.dapr/components` 目录中生成以下 YAML 文件：
- [`dapr.yaml` Multi-App Run 模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` component 文件]({{% ref "#pubsubyaml-component-file" %}})

在本 Quickstart 中运行 `dapr run -f .`，会同时启动[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})运行 `dapr run -f .`，会启动项目中的所有应用。在本 Quickstart 中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: order-processor-sdk
    appDirPath: ./order-processor/
    appPort: 6002
    command: ["uv", "run", "python", "app.py"]
  - appID: checkout-sdk
    appDirPath: ./checkout/
    command: ["uv", "run", "python", "app.py"]
```

##### `pubsub.yaml` component 文件

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

在 component 的 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```py
# 注册 Dapr pub/sub 的订阅
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [{
        'pubsubname': 'orderpubsub',
        'topic': 'orders',
        'route': 'orders'
    }]
    print('Dapr pub/sub is subscribed to: ' + json.dumps(subscriptions))
    return jsonify(subscriptions)


# /dapr/subscribe 中的 Dapr 订阅会设置此路由
@app.route('/orders', methods=['POST'])
def orders_subscriber():
    event = from_http(request.headers, request.get_data())
    print('Subscriber received : ' + event.data['orderid'], flush=True)
    return json.dumps({'success': True}), 200, {
        'ContentType': 'application/json'}


app.run(port=5001)
```

##### `checkout` 发布者

在 `checkout` 发布者中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```python
with DaprClient() as client:
    # 使用 Dapr PubSub 发布事件/消息
    result = client.publish_event(
        pubsub_name='orderpubsub',
        topic_name='orders',
        data=json.dumps(order),
        data_content_type='application/json',
    )
```

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新版 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在 Quickstarts 目录的根目录下，进入 pub/sub 目录：

```bash
cd pub_sub/javascript/sdk
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
cd ./order-processor
npm install
cd ..
cd ./checkout
npm install
cd ..
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务，并各自附带其 Dapr sidecar：
- `order-processor` 订阅者
- `checkout` 发布者

```bash
dapr run -f .
```

**预期输出**

```
== APP - checkout-sdk == Published data: Order { OrderId = 1 }
== APP - order-processor == Subscriber received : Order { OrderId = 1 }
== APP - checkout-sdk == Published data: Order { OrderId = 2 }
== APP - order-processor == Subscriber received : Order { OrderId = 2 }
== APP - checkout-sdk == Published data: Order { OrderId = 3 }
== APP - order-processor == Subscriber received : Order { OrderId = 3 }
== APP - checkout-sdk == Published data: Order { OrderId = 4 }
== APP - order-processor == Subscriber received : Order { OrderId = 4 }
== APP - checkout-sdk == Published data: Order { OrderId = 5 }
== APP - order-processor == Subscriber received : Order { OrderId = 5 }
== APP - checkout-sdk == Published data: Order { OrderId = 6 }
== APP - order-processor == Subscriber received : Order { OrderId = 6 }
== APP - checkout-sdk == Published data: Order { OrderId = 7 }
== APP - order-processor == Subscriber received : Order { OrderId = 7 }
== APP - checkout-sdk == Published data: Order { OrderId = 8 }
== APP - order-processor == Subscriber received : Order { OrderId = 8 }
== APP - checkout-sdk == Published data: Order { OrderId = 9 }
== APP - order-processor == Subscriber received : Order { OrderId = 9 }
== APP - checkout-sdk == Published data: Order { OrderId = 10 }
== APP - order-processor == Subscriber received : Order { OrderId = 10 }
Exited App successfully
```

### 发生了什么？

运行 Dapr 安装过程中的 `dapr init` 时，会在 `.dapr/components` 目录中生成以下 YAML 文件：
- [`dapr.yaml` Multi-App Run 模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` component 文件]({{% ref "#pubsubyaml-component-file" %}})

在本 Quickstart 中运行 `dapr run -f .`，会同时启动[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})运行 `dapr run -f .`，会启动项目中的所有应用。在本 Quickstart 中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: order-processor
    appDirPath: ./order-processor/
    appPort: 5002
    command: ["npm", "run", "start"]
  - appID: checkout-sdk
    appDirPath: ./checkout/
    command: ["npm", "run", "start"]
```

##### `pubsub.yaml` component 文件

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

在 component 的 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```js
server.pubsub.subscribe("orderpubsub", "orders", (data) => console.log("Subscriber received: " + JSON.stringify(data)));
```

##### `checkout` 发布者

在 `checkout` 发布者服务中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```js
const client = new DaprClient();

await client.pubsub.publish(PUBSUB_NAME, PUBSUB_TOPIC, order);
console.log("Published data: " + JSON.stringify(order));
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- [.NET 6](https://dotnet.microsoft.com/download/dotnet/6.0)、[.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0) 或 [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0) 已安装

**注意：** 在本版本中，.NET 6 是 Dapr .NET SDK 包支持的最低 .NET 版本。在 Dapr v1.16 及更高版本中，将仅支持 .NET 8 和 .NET 9。

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在 Quickstarts 目录的根目录下，进入 pub/sub 目录：

```bash
cd pub_sub/csharp/sdk
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
cd ./order-processor
dotnet restore
dotnet build
cd ../checkout
dotnet restore
dotnet build
cd ..
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务，并各自附带其 Dapr sidecar：
- `order-processor` 订阅者
- `checkout` 发布者

```bash
dapr run -f .
```

**预期输出**

```
== APP - checkout-sdk == Published data: Order { OrderId = 1 }
== APP - order-processor == Subscriber received : Order { OrderId = 1 }
== APP - checkout-sdk == Published data: Order { OrderId = 2 }
== APP - order-processor == Subscriber received : Order { OrderId = 2 }
== APP - checkout-sdk == Published data: Order { OrderId = 3 }
== APP - order-processor == Subscriber received : Order { OrderId = 3 }
== APP - checkout-sdk == Published data: Order { OrderId = 4 }
== APP - order-processor == Subscriber received : Order { OrderId = 4 }
== APP - checkout-sdk == Published data: Order { OrderId = 5 }
== APP - order-processor == Subscriber received : Order { OrderId = 5 }
== APP - checkout-sdk == Published data: Order { OrderId = 6 }
== APP - order-processor == Subscriber received : Order { OrderId = 6 }
== APP - checkout-sdk == Published data: Order { OrderId = 7 }
== APP - order-processor == Subscriber received : Order { OrderId = 7 }
== APP - checkout-sdk == Published data: Order { OrderId = 8 }
== APP - order-processor == Subscriber received : Order { OrderId = 8 }
== APP - checkout-sdk == Published data: Order { OrderId = 9 }
== APP - order-processor == Subscriber received : Order { OrderId = 9 }
== APP - checkout-sdk == Published data: Order { OrderId = 10 }
== APP - order-processor == Subscriber received : Order { OrderId = 10 }
Exited App successfully
```

### 发生了什么？

运行 Dapr 安装过程中的 `dapr init` 时，会在 `.dapr/components` 目录中生成以下 YAML 文件：
- [`dapr.yaml` Multi-App Run 模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` component 文件]({{% ref "#pubsubyaml-component-file" %}})

在本 Quickstart 中运行 `dapr run -f .`，会同时启动[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})运行 `dapr run -f .`，会启动项目中的所有应用。在本 Quickstart 中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: order-processor
    appDirPath: ./order-processor/
    appPort: 7006
    command: ["dotnet", "run"]
  - appID: checkout-sdk
    appDirPath: ./checkout/
    command: ["dotnet", "run"]
```

##### `pubsub.yaml` component 文件

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

在 component 的 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```cs
// Dapr 订阅 [Topic] 会将 orders topic 路由到此路由
app.MapPost("/orders", [Topic("orderpubsub", "orders")] (Order order) => {
    Console.WriteLine("Subscriber received : " + order);
    return Results.Ok(order);
});

public record Order([property: JsonPropertyName("orderId")] int OrderId);
```

##### `checkout` 发布者

在 `checkout` 发布者中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```cs
using var client = new DaprClientBuilder().Build();
await client.PublishEventAsync("orderpubsub", "orders", order);
Console.WriteLine("Published data: " + order);
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，3.x 版本。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在 Quickstarts 目录的根目录下，进入 pub/sub 目录：

```bash
cd pub_sub/java/sdk
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
cd ./order-processor
mvn clean install
cd ..
cd ./checkout
mvn clean install
cd ..
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务，并各自附带其 Dapr sidecar：
- `order-processor` 订阅者
- `checkout` 发布者

```bash
dapr run -f .
```

**预期输出**

```
== APP - checkout-sdk == Published data: Order { OrderId = 1 }
== APP - order-processor == Subscriber received : Order { OrderId = 1 }
== APP - checkout-sdk == Published data: Order { OrderId = 2 }
== APP - order-processor == Subscriber received : Order { OrderId = 2 }
== APP - checkout-sdk == Published data: Order { OrderId = 3 }
== APP - order-processor == Subscriber received : Order { OrderId = 3 }
== APP - checkout-sdk == Published data: Order { OrderId = 4 }
== APP - order-processor == Subscriber received : Order { OrderId = 4 }
== APP - checkout-sdk == Published data: Order { OrderId = 5 }
== APP - order-processor == Subscriber received : Order { OrderId = 5 }
== APP - checkout-sdk == Published data: Order { OrderId = 6 }
== APP - order-processor == Subscriber received : Order { OrderId = 6 }
== APP - checkout-sdk == Published data: Order { OrderId = 7 }
== APP - order-processor == Subscriber received : Order { OrderId = 7 }
== APP - checkout-sdk == Published data: Order { OrderId = 8 }
== APP - order-processor == Subscriber received : Order { OrderId = 8 }
== APP - checkout-sdk == Published data: Order { OrderId = 9 }
== APP - order-processor == Subscriber received : Order { OrderId = 9 }
== APP - checkout-sdk == Published data: Order { OrderId = 10 }
== APP - order-processor == Subscriber received : Order { OrderId = 10 }
Exited App successfully
```

### 发生了什么？

运行 Dapr 安装过程中的 `dapr init` 时，会在 `.dapr/components` 目录中生成以下 YAML 文件：
- [`dapr.yaml` Multi-App Run 模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` component 文件]({{% ref "#pubsubyaml-component-file" %}})

在本 Quickstart 中运行 `dapr run -f .`，会同时启动[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})运行 `dapr run -f .`，会启动项目中的所有应用。在本 Quickstart 中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: order-processor-sdk
    appDirPath: ./order-processor/target/
    appPort: 8080
    command: ["java", "-jar", "OrderProcessingService-0.0.1-SNAPSHOT.jar"]
  - appID: checkout-sdk
    appDirPath: ./checkout/target/
    command: ["java", "-jar", "CheckoutService-0.0.1-SNAPSHOT.jar"]
```

##### `pubsub.yaml` component 文件

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

在 component 的 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```java
@Topic(name = "orders", pubsubName = "orderpubsub")
@PostMapping(path = "/orders", consumes = MediaType.ALL_VALUE)
public Mono<ResponseEntity> getCheckout(@RequestBody(required = false) CloudEvent<Order> cloudEvent) {
    return Mono.fromSupplier(() -> {
        try {
            logger.info("Subscriber received: " + cloudEvent.getData().getOrderId());
            return ResponseEntity.ok("SUCCESS");
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    });
}
```

##### `checkout` 发布者

在 `checkout` 发布者中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```java
DaprClient client = new DaprClientBuilder().build();
client.publishEvent(
		PUBSUB_NAME,
		TOPIC_NAME,
		order).block();
logger.info("Published data: " + order.getOrderId());
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在 Quickstarts 目录的根目录下，进入 pub/sub 目录：

```bash
cd pub_sub/go/sdk
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
cd ./order-processor
go build .
cd ../checkout
go build .
cd ..
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务，并各自附带其 Dapr sidecar：
- `order-processor` 订阅者
- `checkout` 发布者

```bash
dapr run -f .
```

**预期输出**

```
== APP - checkout-sdk == Published data: Order { OrderId = 1 }
== APP - order-processor == Subscriber received : Order { OrderId = 1 }
== APP - checkout-sdk == Published data: Order { OrderId = 2 }
== APP - order-processor == Subscriber received : Order { OrderId = 2 }
== APP - checkout-sdk == Published data: Order { OrderId = 3 }
== APP - order-processor == Subscriber received : Order { OrderId = 3 }
== APP - checkout-sdk == Published data: Order { OrderId = 4 }
== APP - order-processor == Subscriber received : Order { OrderId = 4 }
== APP - checkout-sdk == Published data: Order { OrderId = 5 }
== APP - order-processor == Subscriber received : Order { OrderId = 5 }
== APP - checkout-sdk == Published data: Order { OrderId = 6 }
== APP - order-processor == Subscriber received : Order { OrderId = 6 }
== APP - checkout-sdk == Published data: Order { OrderId = 7 }
== APP - order-processor == Subscriber received : Order { OrderId = 7 }
== APP - checkout-sdk == Published data: Order { OrderId = 8 }
== APP - order-processor == Subscriber received : Order { OrderId = 8 }
== APP - checkout-sdk == Published data: Order { OrderId = 9 }
== APP - order-processor == Subscriber received : Order { OrderId = 9 }
== APP - checkout-sdk == Published data: Order { OrderId = 10 }
== APP - order-processor == Subscriber received : Order { OrderId = 10 }
Exited App successfully
```

### 发生了什么？

运行 Dapr 安装过程中的 `dapr init` 时，会在 `.dapr/components` 目录中生成以下 YAML 文件：
- [`dapr.yaml` Multi-App Run 模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` component 文件]({{% ref "#pubsubyaml-component-file" %}})

在本 Quickstart 中运行 `dapr run -f .`，会同时启动[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})运行 `dapr run -f .`，会启动项目中的所有应用。在本 Quickstart 中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: order-processor
    appDirPath: ./order-processor/
    appPort: 6005
    command: ["go", "run", "."]
  - appID: checkout-sdk
    appDirPath: ./checkout/
    command: ["go", "run", "."]
```

##### `pubsub.yaml` component 文件

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

在 component 的 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```go
func eventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
	fmt.Println("Subscriber received: ", e.Data)
	return false, nil
}
```

##### `checkout` 发布者

在 `checkout` 发布者中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```go
client, err := dapr.NewClient()

if err := client.PublishEvent(ctx, PUBSUB_NAME, PUBSUB_TOPIC, []byte(order)); err != nil {
    panic(err)
}

fmt.Println("Published data: ", order)
```

{{% /tab %}}

{{< /tabpane >}}

## 一次运行一个应用程序

在继续 Quickstart 之前，请选择你偏好的语言对应的 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/python/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅 topics

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `order-processor` 目录。

```bash
cd pub_sub/python/sdk/order-processor
```

安装依赖：

```bash
uv sync --all-packages
```

运行 `order-processor` 订阅者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ --app-port 6002 -- uv run python app.py
```


在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```py
# 注册 Dapr pub/sub 的订阅
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [{
        'pubsubname': 'orderpubsub',
        'topic': 'orders',
        'route': 'orders'
    }]
    print('Dapr pub/sub is subscribed to: ' + json.dumps(subscriptions))
    return jsonify(subscriptions)


# /dapr/subscribe 中的 Dapr 订阅会设置此路由
@app.route('/orders', methods=['POST'])
def orders_subscriber():
    event = from_http(request.headers, request.get_data())
    print('Subscriber received : ' + event.data['orderid'], flush=True)
    return json.dumps({'success': True}), 200, {
        'ContentType': 'application/json'}


app.run(port=5001)
```

### 步骤 4：发布 topic

在新的终端窗口中，进入 `checkout` 目录。

```bash
cd pub_sub/python/sdk/checkout
```

安装依赖：

```bash
uv sync --all-packages
```

运行 `checkout` 发布者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-id checkout --resources-path ../../../components/ -- uv run python app.py
```


在 `checkout` 发布者中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```python
with DaprClient() as client:
    # 使用 Dapr PubSub 发布事件/消息
    result = client.publish_event(
        pubsub_name='orderpubsub',
        topic_name='orders',
        data=json.dumps(order),
        data_content_type='application/json',
    )
```

### 步骤 5：查看 pub/sub 输出

发布者将订单发送到 Dapr sidecar，订阅者则接收这些订单。

发布者输出：

```
== APP == INFO:root:Published data: {"orderId": 1}
== APP == INFO:root:Published data: {"orderId": 2}
== APP == INFO:root:Published data: {"orderId": 3}
== APP == INFO:root:Published data: {"orderId": 4}
== APP == INFO:root:Published data: {"orderId": 5}
== APP == INFO:root:Published data: {"orderId": 6}
== APP == INFO:root:Published data: {"orderId": 7}
== APP == INFO:root:Published data: {"orderId": 8}
== APP == INFO:root:Published data: {"orderId": 9}
== APP == INFO:root:Published data: {"orderId": 10}
```

订阅者输出：

```
== APP == INFO:root:Subscriber received: {"orderId": 1}
== APP == INFO:root:Subscriber received: {"orderId": 2}
== APP == INFO:root:Subscriber received: {"orderId": 3}
== APP == INFO:root:Subscriber received: {"orderId": 4}
== APP == INFO:root:Subscriber received: {"orderId": 5}
== APP == INFO:root:Subscriber received: {"orderId": 6}
== APP == INFO:root:Subscriber received: {"orderId": 7}
== APP == INFO:root:Subscriber received: {"orderId": 8}
== APP == INFO:root:Subscriber received: {"orderId": 9}
== APP == INFO:root:Subscriber received: {"orderId": 10}
```

##### `pubsub.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建默认的 Redis `pubsub.yaml`，并在本地机器上运行一个 Redis 容器。其位置如下：

- Windows 系统下位于 `%UserProfile%\.dapr\components\pubsub.yaml`
- Linux/macOS 系统下位于 `~/.dapr/components/pubsub.yaml`

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

在 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新版 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅 topics

在新的终端窗口中，从 Quickstarts 克隆目录的根目录进入 `order-processor` 目录。

```bash
cd pub_sub/javascript/sdk/order-processor
```

安装依赖，其中包括 JavaScript SDK 中的 `@dapr/dapr` 包：

```bash
npm install
```

确认服务目录中包含以下文件：

- `package.json`
- `package-lock.json`

运行 `order-processor` 订阅者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-port 5002 --app-id order-processing --app-protocol http --dapr-http-port 3501 --resources-path ../../../components -- npm run start
```

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```js
server.pubsub.subscribe("orderpubsub", "orders", (data) => console.log("Subscriber received: " + JSON.stringify(data)));
```

### 步骤 4：发布 topic

在新的终端窗口中，从 Quickstarts 克隆目录的根目录进入 `checkout` 目录。

```bash
cd pub_sub/javascript/sdk/checkout
```

安装依赖，其中包括 JavaScript SDK 中的 `@dapr/dapr` 包：

```bash
npm install
```

确认服务目录中包含以下文件：

- `package.json`
- `package-lock.json`

运行 `checkout` 发布者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 --resources-path ../../../components -- npm run start
```

在 `checkout` 发布者服务中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```js
const client = new DaprClient();

await client.pubsub.publish(PUBSUB_NAME, PUBSUB_TOPIC, order);
console.log("Published data: " + JSON.stringify(order));
```

### 步骤 5：查看 pub/sub 输出

如上方代码所示，发布者会将一个随机数推送到 Dapr sidecar，订阅者则接收该数字。

发布者输出：

```cli
== APP == Published data: {"orderId":1}
== APP == Published data: {"orderId":2}
== APP == Published data: {"orderId":3}
== APP == Published data: {"orderId":4}
== APP == Published data: {"orderId":5}
== APP == Published data: {"orderId":6}
== APP == Published data: {"orderId":7}
== APP == Published data: {"orderId":8}
== APP == Published data: {"orderId":9}
== APP == Published data: {"orderId":10}

```

订阅者输出：

```cli
== APP == Subscriber received: {"orderId":1}
== APP == Subscriber received: {"orderId":2}
== APP == Subscriber received: {"orderId":3}
== APP == Subscriber received: {"orderId":4}
== APP == Subscriber received: {"orderId":5}
== APP == Subscriber received: {"orderId":6}
== APP == Subscriber received: {"orderId":7}
== APP == Subscriber received: {"orderId":8}
== APP == Subscriber received: {"orderId":9}
== APP == Subscriber received: {"orderId":10}

```

##### `pubsub.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建默认的 Redis `pubsub.yaml`，并在本地机器上运行一个 Redis 容器。其位置如下：

- Windows 系统下位于 `%UserProfile%\.dapr\components\pubsub.yaml`
- Linux/macOS 系统下位于 `~/.dapr/components/pubsub.yaml`

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

在 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 .NET SDK 或 .NET 6 SDK](https://dotnet.microsoft.com/download)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅 topics

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `order-processor` 目录。

```bash
cd pub_sub/csharp/sdk/order-processor
```

还原 NuGet 包：

```bash
dotnet restore
dotnet build
```

运行 `order-processor` 订阅者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-id order-processor --resources-path ../../../components --app-port 7006 -- dotnet run
```

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```cs
// Dapr 订阅 [Topic] 会将 orders topic 路由到此路由
app.MapPost("/orders", [Topic("orderpubsub", "orders")] (Order order) => {
    Console.WriteLine("Subscriber received : " + order);
    return Results.Ok(order);
});

public record Order([property: JsonPropertyName("orderId")] int OrderId);
```

### 步骤 4：发布 topic

在新的终端窗口中，从 Quickstarts 克隆目录的根目录进入 `checkout` 目录。

```bash
cd pub_sub/csharp/sdk/checkout
```

还原 NuGet 包：

```bash
dotnet restore
dotnet build
```

运行 `checkout` 发布者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-id checkout --resources-path ../../../components -- dotnet run
```

在 `checkout` 发布者中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```cs
using var client = new DaprClientBuilder().Build();
await client.PublishEventAsync("orderpubsub", "orders", order);
Console.WriteLine("Published data: " + order);
```

### 步骤 5：查看 pub/sub 输出

如上方代码所示，发布者会将一个随机数推送到 Dapr sidecar，订阅者则接收该数字。

发布者输出：

```dotnetcli
== APP == Published data: Order { OrderId = 1 }
== APP == Published data: Order { OrderId = 2 }
== APP == Published data: Order { OrderId = 3 }
== APP == Published data: Order { OrderId = 4 }
== APP == Published data: Order { OrderId = 5 }
== APP == Published data: Order { OrderId = 6 }
== APP == Published data: Order { OrderId = 7 }
== APP == Published data: Order { OrderId = 8 }
== APP == Published data: Order { OrderId = 9 }
== APP == Published data: Order { OrderId = 10 }
```

订阅者输出：

```dotnetcli
== APP == Subscriber received: Order { OrderId = 1 }
== APP == Subscriber received: Order { OrderId = 2 }
== APP == Subscriber received: Order { OrderId = 3 }
== APP == Subscriber received: Order { OrderId = 4 }
== APP == Subscriber received: Order { OrderId = 5 }
== APP == Subscriber received: Order { OrderId = 6 }
== APP == Subscriber received: Order { OrderId = 7 }
== APP == Subscriber received: Order { OrderId = 8 }
== APP == Subscriber received: Order { OrderId = 9 }
== APP == Subscriber received: Order { OrderId = 10 }
```

##### `pubsub.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建默认的 Redis `pubsub.yaml`，并在本地机器上运行一个 Redis 容器。其位置如下：

- Windows 系统下位于 `%UserProfile%\.dapr\components\pubsub.yaml`
- Linux/macOS 系统下位于 `~/.dapr/components/pubsub.yaml`

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
```

在 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，3.x 版本。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅 topics

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `order-processor` 目录。

```bash
cd pub_sub/java/sdk/order-processor
```

安装依赖：

```bash
mvn clean install
```

运行 `order-processor` 订阅者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-port 8080 --app-id order-processor --resources-path ../../../components -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```java
@Topic(name = "orders", pubsubName = "orderpubsub")
@PostMapping(path = "/orders", consumes = MediaType.ALL_VALUE)
public Mono<ResponseEntity> getCheckout(@RequestBody(required = false) CloudEvent<Order> cloudEvent) {
    return Mono.fromSupplier(() -> {
        try {
            logger.info("Subscriber received: " + cloudEvent.getData().getOrderId());
            return ResponseEntity.ok("SUCCESS");
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    });
}
```

### 步骤 4：发布 topic

在新的终端窗口中，从 Quickstarts 克隆目录的根目录进入 `checkout` 目录。

```bash
cd pub_sub/java/sdk/checkout
```

安装依赖：

```bash
mvn clean install
```

运行 `checkout` 发布者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-id checkout --resources-path ../../../components -- java -jar target/CheckoutService-0.0.1-SNAPSHOT.jar
```

在 `checkout` 发布者中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```java
DaprClient client = new DaprClientBuilder().build();
client.publishEvent(
		PUBSUB_NAME,
		TOPIC_NAME,
		order).block();
logger.info("Published data: " + order.getOrderId());
```

### 步骤 5：查看 pub/sub 输出

如上方代码所示，发布者会将一个随机数推送到 Dapr sidecar，订阅者则接收该数字。

发布者输出：

```
== APP == 7194 [main] INFO com.service.CheckoutServiceApplication - Published data: 1
== APP == 12213 [main] INFO com.service.CheckoutServiceApplication - Published data: 2
== APP == 17233 [main] INFO com.service.CheckoutServiceApplication - Published data: 3
== APP == 22252 [main] INFO com.service.CheckoutServiceApplication - Published data: 4
== APP == 27276 [main] INFO com.service.CheckoutServiceApplication - Published data: 5
== APP == 32320 [main] INFO com.service.CheckoutServiceApplication - Published data: 6
== APP == 37340 [main] INFO com.service.CheckoutServiceApplication - Published data: 7
== APP == 42356 [main] INFO com.service.CheckoutServiceApplication - Published data: 8
== APP == 47386 [main] INFO com.service.CheckoutServiceApplication - Published data: 9
== APP == 52410 [main] INFO com.service.CheckoutServiceApplication - Published data: 10
```

订阅者输出：

```
== APP == 2022-03-07 13:31:19.551  INFO 43512 --- [nio-8080-exec-5] c.s.c.OrderProcessingServiceController   : Subscriber received: 1
== APP == 2022-03-07 13:31:19.552  INFO 43512 --- [nio-8080-exec-9] c.s.c.OrderProcessingServiceController   : Subscriber received: 2
== APP == 2022-03-07 13:31:19.551  INFO 43512 --- [nio-8080-exec-6] c.s.c.OrderProcessingServiceController   : Subscriber received: 3
== APP == 2022-03-07 13:31:19.552  INFO 43512 --- [nio-8080-exec-2] c.s.c.OrderProcessingServiceController   : Subscriber received: 4
== APP == 2022-03-07 13:31:19.553  INFO 43512 --- [nio-8080-exec-2] c.s.c.OrderProcessingServiceController   : Subscriber received: 5
== APP == 2022-03-07 13:31:19.553  INFO 43512 --- [nio-8080-exec-9] c.s.c.OrderProcessingServiceController   : Subscriber received: 6
== APP == 2022-03-07 13:31:22.849  INFO 43512 --- [nio-8080-exec-3] c.s.c.OrderProcessingServiceController   : Subscriber received: 7
== APP == 2022-03-07 13:31:27.866  INFO 43512 --- [nio-8080-exec-6] c.s.c.OrderProcessingServiceController   : Subscriber received: 8
== APP == 2022-03-07 13:31:32.895  INFO 43512 --- [nio-8080-exec-6] c.s.c.OrderProcessingServiceController   : Subscriber received: 9
== APP == 2022-03-07 13:31:37.919  INFO 43512 --- [nio-8080-exec-2] c.s.c.OrderProcessingServiceController   : Subscriber received: 10
```

##### `pubsub.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建默认的 Redis `pubsub.yaml`，并在本地机器上运行一个 Redis 容器。其位置如下：

- Windows 系统下位于 `%UserProfile%\.dapr\components\pubsub.yaml`
- Linux/macOS 系统下位于 `~/.dapr/components/pubsub.yaml`

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
scopes:
  - orderprocessing
  - checkout
```

在 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 步骤 1：先决条件

本示例需要：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅 topics

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `order-processor` 目录。

```bash
cd pub_sub/go/sdk/order-processor
```

安装依赖并构建应用：

```bash
go build .
```

运行 `order-processor` 订阅者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-port 6005 --app-id order-processor-sdk --app-protocol http --dapr-http-port 3501 --resources-path ../../../components -- go run .
```

在 `order-processor` 订阅者中，你订阅了名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic。这使你的应用代码能够通过 Dapr sidecar 与 Redis component 实例通信。

```go
func eventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
	fmt.Println("Subscriber received: ", e.Data)
	return false, nil
}
```

### 步骤 4：发布 topic

在新的终端窗口中，从 Quickstarts 克隆目录的根目录进入 `checkout` 目录。

```bash
cd pub_sub/go/sdk/checkout
```

安装依赖并构建应用：

```bash
go build .
```

运行 `checkout` 发布者服务，并同时启动一个 Dapr sidecar。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 --resources-path ../../../components -- go run .
```

在 `checkout` 发布者中，你会向名为 `orderpubsub` 的 Redis 实例（[在 `pubsub.yaml` component 中定义]({{% ref "#pubsubyaml-component-file" %}})）的 `orders` topic 发布 orderId 消息。服务一启动，便会循环发布消息：

```go
client, err := dapr.NewClient()

if err := client.PublishEvent(ctx, PUBSUB_NAME, PUBSUB_TOPIC, []byte(order)); err != nil {
    panic(err)
}

fmt.Println("Published data: ", order)
```

### 步骤 5：查看 pub/sub 输出

如上方代码所示，发布者会将带编号的消息推送到 Dapr sidecar，订阅者则接收这些消息。

发布者输出：

```
== APP == dapr client initializing for: 127.0.0.1:63293
== APP == Published data:  {"orderId":1}
== APP == Published data:  {"orderId":2}
== APP == Published data:  {"orderId":3}
== APP == Published data:  {"orderId":4}
== APP == Published data:  {"orderId":5}
== APP == Published data:  {"orderId":6}
== APP == Published data:  {"orderId":7}
== APP == Published data:  {"orderId":8}
== APP == Published data:  {"orderId":9}
== APP == Published data:  {"orderId":10}
```

订阅者输出：

```
== APP == Subscriber received:  {"orderId":1}
== APP == Subscriber received:  {"orderId":2}
== APP == Subscriber received:  {"orderId":3}
== APP == Subscriber received:  {"orderId":4}
== APP == Subscriber received:  {"orderId":5}
== APP == Subscriber received:  {"orderId":6}
== APP == Subscriber received:  {"orderId":7}
== APP == Subscriber received:  {"orderId":8}
== APP == Subscriber received:  {"orderId":9}
== APP == Subscriber received:  {"orderId":10}
```

注意：消息的接收顺序可能会有所不同。

##### `pubsub.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建默认的 Redis `pubsub.yaml`，并在本地机器上运行一个 Redis 容器。其位置如下：

- Windows 系统下位于 `%UserProfile%\.dapr\components\pubsub.yaml`
- Linux/macOS 系统下位于 `~/.dapr/components/pubsub.yaml`

借助 `pubsub.yaml` component，你无需修改应用代码，即可轻松替换底层 component。

本 Quickstart 附带的 Redis `pubsub.yaml` 文件包含以下内容：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: orderpubsub
spec:
  type: pubsub.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: ""
scopes:
  - orderprocessing
  - checkout
```

在 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称。
- `spec/metadata` 定义与 component 实例的连接信息。
- `scopes` 指定哪些应用可以使用该 component。

{{% /tab %}}

{{< /tabpane >}}

## 通过 Dapr Dev Dashboard 查看订阅

Quickstart 运行期间，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看 `checkout` 和 `order-processor` 应用、`orderpubsub` component，以及 `order-processor` 应用对 `orders` topic 的订阅。你还可以在仪表板中向该订阅发布测试消息，这在不运行发布者的情况下测试订阅者时很有用。

## 告诉我们你的看法！
我们一直在持续改进 Quickstart 示例，并重视你的反馈。你觉得这个 Quickstart 有帮助吗？你对改进有什么建议吗？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的想法。

## 后续步骤

- 使用 HTTP 而非 SDK 设置 pub/sub。
  - [Python](https://github.com/dapr/quickstarts/tree/master/pub_sub/python/http)
  - [JavaScript](https://github.com/dapr/quickstarts/tree/master/pub_sub/javascript/http)
  - [.NET](https://github.com/dapr/quickstarts/tree/master/pub_sub/csharp/http)
  - [Java](https://github.com/dapr/quickstarts/tree/master/pub_sub/java/http)
  - [Go](https://github.com/dapr/quickstarts/tree/master/pub_sub/go/http)
- 了解更多关于作为 Dapr building block 的[pub/sub]({{% ref pubsub-overview %}})的信息

{{< dapr-university-track track="dapr-pubsub" position="end" >}}

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
