---
type: docs
title: "快速入门：发布订阅"
linkTitle: "发布订阅"
weight: 72
description: "Dapr 发布订阅构建块入门"
---

让我们来了解一下 Dapr 的[发布订阅构建块]（{{% ref pubsub %}}）。在本快速入门中，您将运行一个发布者微服务和一个订阅者微服务，以演示 Dapr 如何实现发布订阅模式。

1. 使用发布者服务，开发者可以向主题重复发布消息。
1. [发布订阅组件]（https://docs.dapr.io/concepts/components-concept/#pubsub-brokers）对这些消息进行排队或代理。下面的示例使用 Redis，您也可以使用 RabbitMQ、Kafka 等。
1. 该主题的订阅者从队列中拉取消息并对其进行处理。

<img src="/images/pubsub-quickstart/pubsub-diagram.png" width=800 style="padding-bottom:15px;">

您可以通过以下方式尝试此发布订阅快速入门：

- [使用多应用运行模板文件同时运行此示例中的所有应用程序]({{% ref "#run-using-multi-app-run" %}})，或
- [一次运行一个应用程序]({{% ref "#run-one-application-at-a-time" %}})

## 使用多应用运行

在继续快速入门之前，请选择您偏好的语言特定的 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 步骤 1：先决条件

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.8+](https://www.python.org/downloads/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/python/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从快速入门目录的根目录导航到发布/订阅目录：

```bash
cd pub_sub/python/sdk
```

为 `order-processor` 和 `checkout` 应用程序安装依赖项：

```bash
cd ./checkout
pip3 install -r requirements.txt
cd ..
cd ./order-processor
pip3 install -r requirements.txt
cd ..
cd ./order-processor-fastapi
pip3 install -r requirements.txt
cd ..
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务及其各自的 Dapr 边车：
- `order-processor` 订阅者
- `checkout` 发布者

```bash
dapr run -f .
```
> **注意**：由于 Windows 中未定义 Python3.exe，您可能需要在运行 `dapr run -f .` 之前将 [`dapr.yaml`]（{{% ref "#dapryaml-multi-app-run-template-file" %}}）文件中的 `python3` 更改为 `python`


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

当您在 Dapr 安装期间运行 `dapr init` 时，在 `.dapr/components` 目录中生成了以下 YAML 文件：
- [`dapr.yaml` 多应用运行模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` 组件文件]({{% ref "#pubsubyaml-component-file" %}})

在此快速入门中运行 `dapr run -f .` 启动了[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用程序。

##### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行[多应用运行模板文件]（{{% ref multi-app-dapr-run %}}）会启动项目中的所有应用程序。在此快速入门中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../components/
apps:
  - appID: order-processor-sdk
    appDirPath: ./order-processor/
    appPort: 6001
    command: ["uvicorn", "app:app"]
  - appID: checkout-sdk
    appDirPath: ./checkout/
    command: ["python3", "app.py"]
```

##### `pubsub.yaml` 组件文件

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

在组件 YAML 文件中：

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，您订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得您的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

```py
# Register Dapr pub/sub subscriptions
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [{
        'pubsubname': 'orderpubsub',
        'topic': 'orders',
        'route': 'orders'
    }]
    print('Dapr pub/sub is subscribed to: ' + json.dumps(subscriptions))
    return jsonify(subscriptions)


# Dapr subscription in /dapr/subscribe sets up this route
@app.route('/orders', methods=['POST'])
def orders_subscriber():
    event = from_http(request.headers, request.get_data())
    print('Subscriber received : ' + event.data['orderid'], flush=True)
    return json.dumps({'success': True}), 200, {
        'ContentType': 'application/json'}


app.run(port=5001)
```

##### `checkout` 发布者

在 `checkout` 发布者中，您向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

```python
with DaprClient() as client:
    # Publish an event/message using Dapr PubSub
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

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从快速入门目录的根目录导航到发布/订阅目录：

```bash
cd pub_sub/javascript/sdk
```

为 `order-processor` 和 `checkout` 应用程序安装依赖项：

```bash
cd ./order-processor
npm install
cd ..
cd ./checkout
npm install
cd ..
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务及其各自的 Dapr 边车：
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

当您在 Dapr 安装期间运行 `dapr init` 时，在 `.dapr/components` 目录中生成了以下 YAML 文件：
- [`dapr.yaml` 多应用运行模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` 组件文件]({{% ref "#pubsubyaml-component-file" %}})

在此快速入门中运行 `dapr run -f .` 启动了[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用程序。

##### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行[多应用运行模板文件]（{{% ref multi-app-dapr-run %}}）会启动项目中的所有应用程序。在此快速入门中，`dapr.yaml` 文件包含以下内容：

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

##### `pubsub.yaml` 组件文件

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

在组件 YAML 文件中：

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，您订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得您的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

```js
server.pubsub.subscribe("orderpubsub", "orders", (data) => console.log("Subscriber received: " + JSON.stringify(data)));
```

##### `checkout` 发布者

在 `checkout` 发布者服务中，您向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

```js
const client = new DaprClient();

await client.pubsub.publish(PUBSUB_NAME, PUBSUB_TOPIC, order);
console.log("Published data: " + JSON.stringify(order));
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 步骤 1：先决条件

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- [已安装 .NET 6](https://dotnet.microsoft.com/download/dotnet/6.0)、[.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0) 或 [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)

**注意：**.NET 6 是此版本中 Dapr .NET SDK 包支持的最低 .NET 版本。Dapr v1.16 及更高版本将仅支持 .NET 8 和 .NET 9。

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从快速入门目录的根目录导航到发布/订阅目录：

```bash
cd pub_sub/csharp/sdk
```

为 `order-processor` 和 `checkout` 应用程序安装依赖项：

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

使用以下命令，同时运行以下服务及其各自的 Dapr 边车：
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

当您在 Dapr 安装期间运行 `dapr init` 时，在 `.dapr/components` 目录中生成了以下 YAML 文件：
- [`dapr.yaml` 多应用运行模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` 组件文件]({{% ref "#pubsubyaml-component-file" %}})

在此快速入门中运行 `dapr run -f .` 启动了[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用程序。

##### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行[多应用运行模板文件]（{{% ref multi-app-dapr-run %}}）会启动项目中的所有应用程序。在此快速入门中，`dapr.yaml` 文件包含以下内容：

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

##### `pubsub.yaml` 组件文件

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

在组件 YAML 文件中：

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，您订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得您的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

```cs
// Dapr subscription in [Topic] routes orders topic to this route
app.MapPost("/orders", [Topic("orderpubsub", "orders")] (Order order) => {
    Console.WriteLine("Subscriber received : " + order);
    return Results.Ok(order);
});

public record Order([property: JsonPropertyName("orderId")] int OrderId);
```

##### `checkout` 发布者

在 `checkout` 发布者中，您向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

```cs
using var client = new DaprClientBuilder().Build();
await client.PublishEventAsync("orderpubsub", "orders", order);
Console.WriteLine("Published data: " + order);
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 步骤 1：先决条件

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从快速入门目录的根目录导航到发布/订阅目录：

```bash
cd pub_sub/java/sdk
```

为 `order-processor` 和 `checkout` 应用程序安装依赖项：

```bash
cd ./order-processor
mvn clean install
cd ..
cd ./checkout
mvn clean install
cd ..
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务及其各自的 Dapr 边车：
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

当您在 Dapr 安装期间运行 `dapr init` 时，在 `.dapr/components` 目录中生成了以下 YAML 文件：
- [`dapr.yaml` 多应用运行模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` 组件文件]({{% ref "#pubsubyaml-component-file" %}})

在此快速入门中运行 `dapr run -f .` 启动了[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用程序。

##### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行[多应用运行模板文件]（{{% ref multi-app-dapr-run %}}）会启动项目中的所有应用程序。在此快速入门中，`dapr.yaml` 文件包含以下内容：

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

##### `pubsub.yaml` 组件文件

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

在组件 YAML 文件中：

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，您订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得您的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

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

在 `checkout` 发布者中，您向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

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

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从快速入门目录的根目录导航到发布/订阅目录：

```bash
cd pub_sub/go/sdk
```

为 `order-processor` 和 `checkout` 应用程序安装依赖项：

```bash
cd ./order-processor
go build .
cd ../checkout
go build .
cd ..
```

### 步骤 3：运行发布者和订阅者

使用以下命令，同时运行以下服务及其各自的 Dapr 边车：
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

当您在 Dapr 安装期间运行 `dapr init` 时，在 `.dapr/components` 目录中生成了以下 YAML 文件：
- [`dapr.yaml` 多应用运行模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}})
- [`pubsub.yaml` 组件文件]({{% ref "#pubsubyaml-component-file" %}})

在此快速入门中运行 `dapr run -f .` 启动了[订阅者]({{% ref "#order-processor-subscriber" %}})和[发布者]({{% ref "#checkout-publisher" %}})应用程序。

##### `dapr.yaml` 多应用运行模板文件

使用 `dapr run -f .` 运行[多应用运行模板文件]（{{% ref multi-app-dapr-run %}}）会启动项目中的所有应用程序。在此快速入门中，`dapr.yaml` 文件包含以下内容：

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

##### `pubsub.yaml` 组件文件

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

在组件 YAML 文件中：

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

##### `order-processor` 订阅者

在 `order-processor` 订阅者中，您订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得您的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

```go
func eventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
	fmt.Println("Subscriber received: ", e.Data)
	return false, nil
}
```

##### `checkout` 发布者

在 `checkout` 发布者中，您向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

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

在继续快速入门之前，请选择您偏好的语言特定的 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 步骤 1：先决条件

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.7+](https://www.python.org/downloads/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/python/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅主题

在终端窗口中，从快速入门克隆目录的根目录导航到 `order-processor` 目录。

```bash
cd pub_sub/python/sdk/order-processor
```

安装依赖项：

```bash
pip3 install -r requirements.txt
```

运行 `order-processor` 订阅者服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ --app-port 6002 -- python3 app.py
```

> **注意**：由于 Windows 中未定义 Python3.exe，您可能需要使用 `python app.py` 而不是 `python3 app.py`。

在 `order-processor` 订阅者中，我们订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得我们的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

```py
# Register Dapr pub/sub subscriptions
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    subscriptions = [{
        'pubsubname': 'orderpubsub',
        'topic': 'orders',
        'route': 'orders'
    }]
    print('Dapr pub/sub is subscribed to: ' + json.dumps(subscriptions))
    return jsonify(subscriptions)


# Dapr subscription in /dapr/subscribe sets up this route
@app.route('/orders', methods=['POST'])
def orders_subscriber():
    event = from_http(request.headers, request.get_data())
    print('Subscriber received : ' + event.data['orderid'], flush=True)
    return json.dumps({'success': True}), 200, {
        'ContentType': 'application/json'}


app.run(port=5001)
```

### 步骤 4：发布主题

在新的终端窗口中，导航到 `checkout` 目录。

```bash
cd pub_sub/python/sdk/checkout
```

安装依赖项：

```bash
pip3 install -r requirements.txt
```

运行 `checkout` 发布者服务以及 Dapr 边车。

```bash
dapr run --app-id checkout --resources-path ../../../components/ -- python3 app.py
```

> **注意**：由于 Windows 中未定义 Python3.exe，您可能需要使用 `python app.py` 而不是 `python3 app.py`。

在 `checkout` 发布者中，我们向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

```python
with DaprClient() as client:
    # Publish an event/message using Dapr PubSub
    result = client.publish_event(
        pubsub_name='orderpubsub',
        topic_name='orders',
        data=json.dumps(order),
        data_content_type='application/json',
    )
```

### 步骤 5：查看发布订阅输出

发布者向 Dapr 边车发送订单，而订阅者接收它们。

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

##### `pubsub.yaml` 组件文件

当您运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `pubsub.yaml` 并在您的本地计算机上运行 Redis 容器，位于：

- 在 Windows 上，在 `%UserProfile%\.dapr\components\pubsub.yaml` 下
- 在 Linux/MacOS 上，在 `~/.dapr/components/pubsub.yaml` 下

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 步骤 1：先决条件

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅主题

在终端窗口中，从快速入门克隆目录的根目录导航到 `order-processor` 目录。

```bash
cd pub_sub/javascript/sdk/order-processor
```

安装依赖项，这将包括来自 JavaScript SDK 的 `@dapr/dapr` 包：

```bash
npm install
```

验证服务目录中包含以下文件：

- `package.json`
- `package-lock.json`

运行 `order-processor` 订阅者服务以及 Dapr 边车。

```bash
dapr run --app-port 5002 --app-id order-processing --app-protocol http --dapr-http-port 3501 --resources-path ../../../components -- npm run start
```

在 `order-processor` 订阅者中，我们订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得我们的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

```js
server.pubsub.subscribe("orderpubsub", "orders", (data) => console.log("Subscriber received: " + JSON.stringify(data)));
```

### 步骤 4：发布主题

在新的终端窗口中，从快速入门克隆目录的根目录导航到 `checkout` 目录。

```bash
cd pub_sub/javascript/sdk/checkout
```

安装依赖项，这将包括来自 JavaScript SDK 的 `@dapr/dapr` 包：

```bash
npm install
```

验证服务目录中包含以下文件：

- `package.json`
- `package-lock.json`

运行 `checkout` 发布者服务以及 Dapr 边车。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 --resources-path ../../../components -- npm run start
```

在 `checkout` 发布者服务中，我们向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

```js
const client = new DaprClient();

await client.pubsub.publish(PUBSUB_NAME, PUBSUB_TOPIC, order);
console.log("Published data: " + JSON.stringify(order));
```

### 步骤 5：查看发布订阅输出

请注意，如上面的代码中所指定，发布者向 Dapr 边车推送一个随机数，而订阅者接收它。

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

##### `pubsub.yaml` 组件文件

当您运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `pubsub.yaml` 并在您的本地计算机上运行 Redis 容器，位于：

- 在 Windows 上，在 `%UserProfile%\.dapr\components\pubsub.yaml` 下
- 在 Linux/MacOS 上，在 `~/.dapr/components/pubsub.yaml` 下

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 步骤 1：先决条件

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 .NET SDK 或 .NET 6 SDK](https://dotnet.microsoft.com/download)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅主题

在终端窗口中，从快速入门克隆目录的根目录导航到 `order-processor` 目录。

```bash
cd pub_sub/csharp/sdk/order-processor
```

恢复 NuGet 包：

```bash
dotnet restore
dotnet build
```

运行 `order-processor` 订阅者服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components --app-port 7006 -- dotnet run
```

在 `order-processor` 订阅者中，我们订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得我们的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

```cs
// Dapr subscription in [Topic] routes orders topic to this route
app.MapPost("/orders", [Topic("orderpubsub", "orders")] (Order order) => {
    Console.WriteLine("Subscriber received : " + order);
    return Results.Ok(order);
});

public record Order([property: JsonPropertyName("orderId")] int OrderId);
```

### 步骤 4：发布主题

在新的终端窗口中，从快速入门克隆目录的根目录导航到 `checkout` 目录。

```bash
cd pub_sub/csharp/sdk/checkout
```

恢复 NuGet 包：

```bash
dotnet restore
dotnet build
```

运行 `checkout` 发布者服务以及 Dapr 边车。

```bash
dapr run --app-id checkout --resources-path ../../../components -- dotnet run
```

在 `checkout` 发布者中，我们向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

```cs
using var client = new DaprClientBuilder().Build();
await client.PublishEventAsync("orderpubsub", "orders", order);
Console.WriteLine("Published data: " + order);
```

### 步骤 5：查看发布订阅输出

请注意，如上面的代码中所指定，发布者向 Dapr 边车推送一个随机数，而订阅者接收它。

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

##### `pubsub.yaml` 组件文件

当您运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `pubsub.yaml` 并在您的本地计算机上运行 Redis 容器，位于：

- 在 Windows 上，在 `%UserProfile%\.dapr\components\pubsub.yaml` 下
- 在 Linux/MacOS 上，在 `~/.dapr/components/pubsub.yaml` 下

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 步骤 1：先决条件

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅主题

在终端窗口中，从快速入门克隆目录的根目录导航到 `order-processor` 目录。

```bash
cd pub_sub/java/sdk/order-processor
```

安装依赖项：

```bash
mvn clean install
```

运行 `order-processor` 订阅者服务以及 Dapr 边车。

```bash
dapr run --app-port 8080 --app-id order-processor --resources-path ../../../components -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

在 `order-processor` 订阅者中，我们订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得我们的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

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

### 步骤 4：发布主题

在新的终端窗口中，从快速入门克隆目录的根目录导航到 `checkout` 目录。

```bash
cd pub_sub/java/sdk/checkout
```

安装依赖项：

```bash
mvn clean install
```

运行 `checkout` 发布者服务以及 Dapr 边车。

```bash
dapr run --app-id checkout --resources-path ../../../components -- java -jar target/CheckoutService-0.0.1-SNAPSHOT.jar
```

在 `checkout` 发布者中，我们向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

```java
DaprClient client = new DaprClientBuilder().build();
client.publishEvent(
		PUBSUB_NAME,
		TOPIC_NAME,
		order).block();
logger.info("Published data: " + order.getOrderId());
```

### 步骤 5：查看发布订阅输出

请注意，如上面的代码中所指定，发布者向 Dapr 边车推送一个随机数，而订阅者接收它。

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

##### `pubsub.yaml` 组件文件

当您运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `pubsub.yaml` 并在您的本地计算机上运行 Redis 容器，位于：

- 在 Windows 上，在 `%UserProfile%\.dapr\components\pubsub.yaml` 下
- 在 Linux/MacOS 上，在 `~/.dapr/components/pubsub.yaml` 下

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 步骤 1：先决条件

对于此示例，您需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [快速入门存储库中提供的示例](https://github.com/dapr/quickstarts/tree/master/pub_sub/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：订阅主题

在终端窗口中，从快速入门克隆目录的根目录导航到 `order-processor` 目录。

```bash
cd pub_sub/go/sdk/order-processor
```

安装依赖项并构建应用程序：

```bash
go build .
```

运行 `order-processor` 订阅者服务以及 Dapr 边车。

```bash
dapr run --app-port 6005 --app-id order-processor-sdk --app-protocol http --dapr-http-port 3501 --resources-path ../../../components -- go run .
```

在 `order-processor` 订阅者中，我们订阅名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`。这使得我们的应用程序代码可以通过 Dapr 边车与 Redis 组件实例通信。

```go
func eventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
	fmt.Println("Subscriber received: ", e.Data)
	return false, nil
}
```

### 步骤 4：发布主题

在新的终端窗口中，从快速入门克隆目录的根目录导航到 `checkout` 目录。

```bash
cd pub_sub/go/sdk/checkout
```

安装依赖项并构建应用程序：

```bash
go build .
```

运行 `checkout` 发布者服务以及 Dapr 边车。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 --resources-path ../../../components -- go run .
```

在 `checkout` 发布者中，我们向名为 `orderpubsub` 的 Redis 实例 [（在 `pubsub.yaml` 组件中定义）]({{% ref "#pubsubyaml-component-file" %}})和主题 `orders`发布 orderId 消息。服务启动后，它会循环发布：

```go
client, err := dapr.NewClient()

if err := client.PublishEvent(ctx, PUBSUB_NAME, PUBSUB_TOPIC, []byte(order)); err != nil {
    panic(err)
}

fmt.Println("Published data: ", order)
```

### 步骤 5：查看发布订阅输出

请注意，如上面的代码中所指定，发布者向 Dapr 边车推送一个编号的消息，而订阅者接收它。

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

注意：接收它们的顺序可能会有所不同。

##### `pubsub.yaml` 组件文件

当您运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `pubsub.yaml` 并在您的本地计算机上运行 Redis 容器，位于：

- 在 Windows 上，在 `%UserProfile%\.dapr\components\pubsub.yaml` 下
- 在 Linux/MacOS 上，在 `~/.dapr/components/pubsub.yaml` 下

使用 `pubsub.yaml` 组件，您可以在不更改应用程序代码的情况下轻松更换底层组件。

为此快速入门包含的 Redis `pubsub.yaml` 文件包含以下内容：

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

- `metadata/name` 是您的应用程序与组件通信的方式。
- `spec/metadata` 定义与组件实例的连接。
- `scopes` 指定哪些应用程序可以使用该组件。

{{% /tab %}}

{{< /tabpane >}}

## 告诉我们您的想法！
我们正在不断努力改进我们的快速入门示例，重视您的反馈。您觉得这个快速入门有帮助吗？您有改进建议吗？

加入我们的 [discord 频道](https://discord.com/channels/778680217417809931/953427615916638238) 进行讨论。

## 后续步骤

- 使用 HTTP 而不是 SDK 来设置发布订阅。
  - [Python](https://github.com/dapr/quickstarts/tree/master/pub_sub/python/http)
  - [JavaScript](https://github.com/dapr/quickstarts/tree/master/pub_sub/javascript/http)
  - [.NET](https://github.com/dapr/quickstarts/tree/master/pub_sub/csharp/http)
  - [Java](https://github.com/dapr/quickstarts/tree/master/pub_sub/java/http)
  - [Go](https://github.com/dapr/quickstarts/tree/master/pub_sub/go/http)
- 了解有关[作为 Dapr 构建块的发布订阅]（{{% ref pubsub-overview %}}）的更多信息

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
