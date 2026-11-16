---
type: docs
title: "快速入门：服务调用"
linkTitle: "服务调用"
weight: 71
description: "开始使用 Dapr 的服务调用构建块"
---

借助 [Dapr 的服务调用构建块](https://docs.dapr.io/developing-applications/building-blocks/service-invocation)，你的应用程序可以与其他应用程序进行可靠且安全的通信。

<img src="/images/serviceinvocation-quickstart/service-invocation-overview.png" width=800 alt="展示服务调用步骤的示意图" style="padding-bottom:25px;">

Dapr 提供了多种服务调用方法，你可以根据场景选择。在本快速入门中，你将让 checkout 服务通过 order-processor 服务中的 HTTP 代理调用一个方法，并通过以下任一方式运行：
- [使用 Multi-App Run 模板文件同时运行本示例中的所有应用程序]({{% ref "#使用-multi-app-run-运行" %}})，或
- [一次运行一个应用程序]({{% ref "#一次运行一个应用" %}})

在[服务调用概述文章]({{% ref service-invocation-overview %}})中，你可以进一步了解 Dapr 的服务调用方法。

## 使用 Multi-App Run 运行

在继续快速入门之前，请先选择你偏好的语言。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例所用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/python/http)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

在快速入门克隆目录的根目录下，进入快速入门目录。

```bash
cd service_invocation/python/http
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
uv sync --all-packages
```

### 步骤 3：运行 `order-processor` 和 `checkout` 服务

使用以下命令，同时运行下列服务及其各自的 Dapr 边车：
- `order-processor` 服务
- `checkout` 服务

```bash
uv run dapr run -f .
```

**预期输出**

```
== APP - order-processor == Order received : Order { orderId = 1 }
== APP - checkout == Order passed: Order { OrderId = 1 }
== APP - order-processor == Order received : Order { orderId = 2 }
== APP - checkout == Order passed: Order { OrderId = 2 }
== APP - order-processor == Order received : Order { orderId = 3 }
== APP - checkout == Order passed: Order { OrderId = 3 }
== APP - order-processor == Order received : Order { orderId = 4 }
== APP - checkout == Order passed: Order { OrderId = 4 }
== APP - order-processor == Order received : Order { orderId = 5 }
== APP - checkout == Order passed: Order { OrderId = 5 }
== APP - order-processor == Order received : Order { orderId = 6 }
== APP - checkout == Order passed: Order { OrderId = 6 }
== APP - order-processor == Order received : Order { orderId = 7 }
== APP - checkout == Order passed: Order { OrderId = 7 }
== APP - order-processor == Order received : Order { orderId = 8 }
== APP - checkout == Order passed: Order { OrderId = 8 }
== APP - order-processor == Order received : Order { orderId = 9 }
== APP - checkout == Order passed: Order { OrderId = 9 }
== APP - order-processor == Order received : Order { orderId = 10 }
== APP - checkout == Order passed: Order { OrderId = 10 }
== APP - order-processor == Order received : Order { orderId = 11 }
== APP - checkout == Order passed: Order { OrderId = 11 }
== APP - order-processor == Order received : Order { orderId = 12 }
== APP - checkout == Order passed: Order { OrderId = 12 }
== APP - order-processor == Order received : Order { orderId = 13 }
== APP - checkout == Order passed: Order { OrderId = 13 }
== APP - order-processor == Order received : Order { orderId = 14 }
== APP - checkout == Order passed: Order { OrderId = 14 }
== APP - order-processor == Order received : Order { orderId = 15 }
== APP - checkout == Order passed: Order { OrderId = 15 }
== APP - order-processor == Order received : Order { orderId = 16 }
== APP - checkout == Order passed: Order { OrderId = 16 }
== APP - order-processor == Order received : Order { orderId = 17 }
== APP - checkout == Order passed: Order { OrderId = 17 }
== APP - order-processor == Order received : Order { orderId = 18 }
== APP - checkout == Order passed: Order { OrderId = 18 }
== APP - order-processor == Order received : Order { orderId = 19 }
== APP - checkout == Order passed: Order { OrderId = 19 }
== APP - order-processor == Order received : Order { orderId = 20 }
== APP - checkout == Order passed: Order { OrderId = 20 }
Exited App successfully
```

### 发生了什么？

在本快速入门中运行 `dapr run -f .` 时，通过 `dapr.yaml` Multi-App Run 模板文件同时启动了[订阅者]({{% ref "#order-processor-服务" %}})和[发布者]({{% ref "#checkout-服务" %}})应用程序。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})并执行 `dapr run -f .`，即可启动项目中的所有应用程序。在本快速入门中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
apps:
  - appDirPath: ./order-processor/
    appID: order-processor
    appPort: 8001
    command: ["uv", "run", "python", "app.py"]
  - appID: checkout
    appDirPath: ./checkout/
    command: ["uv", "run", "python", "app.py"]
```

##### `order-processor` 服务

`order-processor` 服务接收来自 `checkout` 服务的调用：

```py
@app.route('/orders', methods=['POST'])
def getOrder():
    data = request.json
    print('Order received : ' + json.dumps(data), flush=True)
    return json.dumps({'success': True}), 200, {
        'ContentType': 'application/json'}


app.run(port=8001)
```

#### `checkout` 服务

在 `checkout` 服务中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```python
headers = {'dapr-app-id': 'order-processor'}

result = requests.post(
    url='%s/orders' % (base_url),
    data=json.dumps(order),
    headers=headers
)
```

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新版本的 Node.js](https://nodejs.org/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/javascript/http)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在快速入门克隆目录的根目录下，进入快速入门目录。

```bash
cd service_invocation/javascript/http
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
cd ./order-processor
npm install
cd ../checkout
npm install
cd ..
```

### 步骤 3：运行 `order-processor` 和 `checkout` 服务

使用以下命令，同时运行下列服务及其各自的 Dapr 边车：
- `order-processor` 服务
- `checkout` 服务

```bash
dapr run -f .
```

**预期输出**

```
== APP - order-processor == Order received : Order { orderId = 1 }
== APP - checkout == Order passed: Order { OrderId = 1 }
== APP - order-processor == Order received : Order { orderId = 2 }
== APP - checkout == Order passed: Order { OrderId = 2 }
== APP - order-processor == Order received : Order { orderId = 3 }
== APP - checkout == Order passed: Order { OrderId = 3 }
== APP - order-processor == Order received : Order { orderId = 4 }
== APP - checkout == Order passed: Order { OrderId = 4 }
== APP - order-processor == Order received : Order { orderId = 5 }
== APP - checkout == Order passed: Order { OrderId = 5 }
== APP - order-processor == Order received : Order { orderId = 6 }
== APP - checkout == Order passed: Order { OrderId = 6 }
== APP - order-processor == Order received : Order { orderId = 7 }
== APP - checkout == Order passed: Order { OrderId = 7 }
== APP - order-processor == Order received : Order { orderId = 8 }
== APP - checkout == Order passed: Order { OrderId = 8 }
== APP - order-processor == Order received : Order { orderId = 9 }
== APP - checkout == Order passed: Order { OrderId = 9 }
== APP - order-processor == Order received : Order { orderId = 10 }
== APP - checkout == Order passed: Order { OrderId = 10 }
== APP - order-processor == Order received : Order { orderId = 11 }
== APP - checkout == Order passed: Order { OrderId = 11 }
== APP - order-processor == Order received : Order { orderId = 12 }
== APP - checkout == Order passed: Order { OrderId = 12 }
== APP - order-processor == Order received : Order { orderId = 13 }
== APP - checkout == Order passed: Order { OrderId = 13 }
== APP - order-processor == Order received : Order { orderId = 14 }
== APP - checkout == Order passed: Order { OrderId = 14 }
== APP - order-processor == Order received : Order { orderId = 15 }
== APP - checkout == Order passed: Order { OrderId = 15 }
== APP - order-processor == Order received : Order { orderId = 16 }
== APP - checkout == Order passed: Order { OrderId = 16 }
== APP - order-processor == Order received : Order { orderId = 17 }
== APP - checkout == Order passed: Order { OrderId = 17 }
== APP - order-processor == Order received : Order { orderId = 18 }
== APP - checkout == Order passed: Order { OrderId = 18 }
== APP - order-processor == Order received : Order { orderId = 19 }
== APP - checkout == Order passed: Order { OrderId = 19 }
== APP - order-processor == Order received : Order { orderId = 20 }
== APP - checkout == Order passed: Order { OrderId = 20 }
Exited App successfully
```

### 发生了什么？

在本快速入门中运行 `dapr run -f .` 时，通过 `dapr.yaml` Multi-App Run 模板文件同时启动了[订阅者]({{% ref "#order-processor-服务" %}})和[发布者]({{% ref "#checkout-服务" %}})应用程序。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})并执行 `dapr run -f .`，即可启动项目中的所有应用程序。在本快速入门中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
apps:
  - appDirPath: ./order-processor/
    appID: order-processor
    appPort: 5001
    command: ["npm", "start"]
  - appID: checkout
    appDirPath: ./checkout/
    command: ["npm", "start"]
```

##### `order-processor` 服务

`order-processor` 服务接收来自 `checkout` 服务的调用：

```javascript
app.post('/orders', (req, res) => {
    console.log("Order received:", req.body);
    res.sendStatus(200);
});
```

##### `checkout` 服务

在 `checkout` 服务中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```javascript
let axiosConfig = {
  headers: {
      "dapr-app-id": "order-processor"
  }
};
const res = await axios.post(`${DAPR_HOST}:${DAPR_HTTP_PORT}/orders`, order , axiosConfig);
console.log("Order passed: " + res.config.data);
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 已安装 [.NET 6](https://dotnet.microsoft.com/download/dotnet/6.0)、[.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0) 或 [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)

**注意：** 在本版本中，.NET 6 是 Dapr .NET SDK 包所支持的最低 .NET 版本。从 Dapr v1.16 及后续版本起，将仅支持 .NET 8 和 .NET 9。

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/csharp/http)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在快速入门克隆目录的根目录下，进入快速入门目录。

```bash
cd service_invocation/csharp/http
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

### 步骤 3：运行 `order-processor` 和 `checkout` 服务

使用以下命令，同时运行下列服务及其各自的 Dapr 边车：
- `order-processor` 服务
- `checkout` 服务

```bash
dapr run -f .
```

**预期输出**

```
== APP - order-processor == Order received : Order { orderId = 1 }
== APP - checkout == Order passed: Order { OrderId = 1 }
== APP - order-processor == Order received : Order { orderId = 2 }
== APP - checkout == Order passed: Order { OrderId = 2 }
== APP - order-processor == Order received : Order { orderId = 3 }
== APP - checkout == Order passed: Order { OrderId = 3 }
== APP - order-processor == Order received : Order { orderId = 4 }
== APP - checkout == Order passed: Order { OrderId = 4 }
== APP - order-processor == Order received : Order { orderId = 5 }
== APP - checkout == Order passed: Order { OrderId = 5 }
== APP - order-processor == Order received : Order { orderId = 6 }
== APP - checkout == Order passed: Order { OrderId = 6 }
== APP - order-processor == Order received : Order { orderId = 7 }
== APP - checkout == Order passed: Order { OrderId = 7 }
== APP - order-processor == Order received : Order { orderId = 8 }
== APP - checkout == Order passed: Order { OrderId = 8 }
== APP - order-processor == Order received : Order { orderId = 9 }
== APP - checkout == Order passed: Order { OrderId = 9 }
== APP - order-processor == Order received : Order { orderId = 10 }
== APP - checkout == Order passed: Order { OrderId = 10 }
== APP - order-processor == Order received : Order { orderId = 11 }
== APP - checkout == Order passed: Order { OrderId = 11 }
== APP - order-processor == Order received : Order { orderId = 12 }
== APP - checkout == Order passed: Order { OrderId = 12 }
== APP - order-processor == Order received : Order { orderId = 13 }
== APP - checkout == Order passed: Order { OrderId = 13 }
== APP - order-processor == Order received : Order { orderId = 14 }
== APP - checkout == Order passed: Order { OrderId = 14 }
== APP - order-processor == Order received : Order { orderId = 15 }
== APP - checkout == Order passed: Order { OrderId = 15 }
== APP - order-processor == Order received : Order { orderId = 16 }
== APP - checkout == Order passed: Order { OrderId = 16 }
== APP - order-processor == Order received : Order { orderId = 17 }
== APP - checkout == Order passed: Order { OrderId = 17 }
== APP - order-processor == Order received : Order { orderId = 18 }
== APP - checkout == Order passed: Order { OrderId = 18 }
== APP - order-processor == Order received : Order { orderId = 19 }
== APP - checkout == Order passed: Order { OrderId = 19 }
== APP - order-processor == Order received : Order { orderId = 20 }
== APP - checkout == Order passed: Order { OrderId = 20 }
Exited App successfully
```

### 发生了什么？

在本快速入门中运行 `dapr run -f .` 时，通过 `dapr.yaml` Multi-App Run 模板文件同时启动了[订阅者]({{% ref "#order-processor-服务" %}})和[发布者]({{% ref "#checkout-服务" %}})应用程序。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})并执行 `dapr run -f .`，即可启动项目中的所有应用程序。在本快速入门中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
apps:
  - appDirPath: ./order-processor/
    appID: order-processor
    appPort: 7001
    command: ["dotnet", "run"]
  - appID: checkout
    appDirPath: ./checkout/
    command: ["dotnet", "run"]
```

##### `order-processor` 服务

`order-processor` 服务接收来自 `checkout` 服务的调用：

```csharp
app.MapPost("/orders", (Order order) =>
{
    Console.WriteLine("Order received : " + order);
    return order.ToString();
});
```

##### `checkout` 服务

在 `checkout` 服务的 Program.cs 文件中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```csharp
var client = DaprClient.CreateInvokeHttpClient(appId: "order-processor");
var cts = new CancellationTokenSource();

var response = await client.PostAsJsonAsync("/orders", order, cts.Token);
Console.WriteLine("Order passed: " + order);
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/java/http)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在快速入门克隆目录的根目录下，进入快速入门目录。

```bash
cd service_invocation/java/http
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
cd ./order-processor
mvn clean install
cd ../checkout
mvn clean install
cd ..
```

### 步骤 3：运行 `order-processor` 和 `checkout` 服务

使用以下命令，同时运行下列服务及其各自的 Dapr 边车：
- `order-processor` 服务
- `checkout` 服务

```bash
dapr run -f .
```

**预期输出**

```
== APP - order-processor == Order received : Order { orderId = 1 }
== APP - checkout == Order passed: Order { OrderId = 1 }
== APP - order-processor == Order received : Order { orderId = 2 }
== APP - checkout == Order passed: Order { OrderId = 2 }
== APP - order-processor == Order received : Order { orderId = 3 }
== APP - checkout == Order passed: Order { OrderId = 3 }
== APP - order-processor == Order received : Order { orderId = 4 }
== APP - checkout == Order passed: Order { OrderId = 4 }
== APP - order-processor == Order received : Order { orderId = 5 }
== APP - checkout == Order passed: Order { OrderId = 5 }
== APP - order-processor == Order received : Order { orderId = 6 }
== APP - checkout == Order passed: Order { OrderId = 6 }
== APP - order-processor == Order received : Order { orderId = 7 }
== APP - checkout == Order passed: Order { OrderId = 7 }
== APP - order-processor == Order received : Order { orderId = 8 }
== APP - checkout == Order passed: Order { OrderId = 8 }
== APP - order-processor == Order received : Order { orderId = 9 }
== APP - checkout == Order passed: Order { OrderId = 9 }
== APP - order-processor == Order received : Order { orderId = 10 }
== APP - checkout == Order passed: Order { OrderId = 10 }
== APP - order-processor == Order received : Order { orderId = 11 }
== APP - checkout == Order passed: Order { OrderId = 11 }
== APP - order-processor == Order received : Order { orderId = 12 }
== APP - checkout == Order passed: Order { OrderId = 12 }
== APP - order-processor == Order received : Order { orderId = 13 }
== APP - checkout == Order passed: Order { OrderId = 13 }
== APP - order-processor == Order received : Order { orderId = 14 }
== APP - checkout == Order passed: Order { OrderId = 14 }
== APP - order-processor == Order received : Order { orderId = 15 }
== APP - checkout == Order passed: Order { OrderId = 15 }
== APP - order-processor == Order received : Order { orderId = 16 }
== APP - checkout == Order passed: Order { OrderId = 16 }
== APP - order-processor == Order received : Order { orderId = 17 }
== APP - checkout == Order passed: Order { OrderId = 17 }
== APP - order-processor == Order received : Order { orderId = 18 }
== APP - checkout == Order passed: Order { OrderId = 18 }
== APP - order-processor == Order received : Order { orderId = 19 }
== APP - checkout == Order passed: Order { OrderId = 19 }
== APP - order-processor == Order received : Order { orderId = 20 }
== APP - checkout == Order passed: Order { OrderId = 20 }
Exited App successfully
```

### 发生了什么？

在本快速入门中运行 `dapr run -f .` 时，通过 `dapr.yaml` Multi-App Run 模板文件同时启动了[订阅者]({{% ref "#order-processor-服务" %}})和[发布者]({{% ref "#checkout-服务" %}})应用程序。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})并执行 `dapr run -f .`，即可启动项目中的所有应用程序。在本快速入门中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
apps:
  - appDirPath: ./order-processor/
    appID: order-processor
    appPort: 9001
    command: ["java", "-jar", "target/OrderProcessingService-0.0.1-SNAPSHOT.jar"]
  - appID: checkout
    appDirPath: ./checkout/
    command: ["java", "-jar", "target/CheckoutService-0.0.1-SNAPSHOT.jar"]
```

##### `order-processor` 服务

`order-processor` 服务接收来自 `checkout` 服务的调用：

```java
public String processOrders(@RequestBody Order body) {
        System.out.println("Order received: "+ body.getOrderId());
        return "CID" + body.getOrderId();
    }
```

##### `checkout` 服务

在 `checkout` 服务中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```java
.header("Content-Type", "application/json")
.header("dapr-app-id", "order-processor")

HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println("Order passed: "+ orderId)
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/go/http)。


```bash
git clone https://github.com/dapr/quickstarts.git
```

在快速入门克隆目录的根目录下，进入快速入门目录。

```bash
cd service_invocation/go/http
```

安装 `order-processor` 和 `checkout` 应用的依赖：

```bash
cd ./order-processor
go build .
cd ../checkout
go build .
cd ..
```

### 步骤 3：运行 `order-processor` 和 `checkout` 服务

使用以下命令，同时运行下列服务及其各自的 Dapr 边车：
- `order-processor` 服务
- `checkout` 服务

```bash
dapr run -f .
```

**预期输出**

```
== APP - order-processor == Order received : Order { orderId = 1 }
== APP - checkout == Order passed: Order { OrderId = 1 }
== APP - order-processor == Order received : Order { orderId = 2 }
== APP - checkout == Order passed: Order { OrderId = 2 }
== APP - order-processor == Order received : Order { orderId = 3 }
== APP - checkout == Order passed: Order { OrderId = 3 }
== APP - order-processor == Order received : Order { orderId = 4 }
== APP - checkout == Order passed: Order { OrderId = 4 }
== APP - order-processor == Order received : Order { orderId = 5 }
== APP - checkout == Order passed: Order { OrderId = 5 }
== APP - order-processor == Order received : Order { orderId = 6 }
== APP - checkout == Order passed: Order { OrderId = 6 }
== APP - order-processor == Order received : Order { orderId = 7 }
== APP - checkout == Order passed: Order { OrderId = 7 }
== APP - order-processor == Order received : Order { orderId = 8 }
== APP - checkout == Order passed: Order { OrderId = 8 }
== APP - order-processor == Order received : Order { orderId = 9 }
== APP - checkout == Order passed: Order { OrderId = 9 }
== APP - order-processor == Order received : Order { orderId = 10 }
== APP - checkout == Order passed: Order { OrderId = 10 }
== APP - order-processor == Order received : Order { orderId = 11 }
== APP - checkout == Order passed: Order { OrderId = 11 }
== APP - order-processor == Order received : Order { orderId = 12 }
== APP - checkout == Order passed: Order { OrderId = 12 }
== APP - order-processor == Order received : Order { orderId = 13 }
== APP - checkout == Order passed: Order { OrderId = 13 }
== APP - order-processor == Order received : Order { orderId = 14 }
== APP - checkout == Order passed: Order { OrderId = 14 }
== APP - order-processor == Order received : Order { orderId = 15 }
== APP - checkout == Order passed: Order { OrderId = 15 }
== APP - order-processor == Order received : Order { orderId = 16 }
== APP - checkout == Order passed: Order { OrderId = 16 }
== APP - order-processor == Order received : Order { orderId = 17 }
== APP - checkout == Order passed: Order { OrderId = 17 }
== APP - order-processor == Order received : Order { orderId = 18 }
== APP - checkout == Order passed: Order { OrderId = 18 }
== APP - order-processor == Order received : Order { orderId = 19 }
== APP - checkout == Order passed: Order { OrderId = 19 }
== APP - order-processor == Order received : Order { orderId = 20 }
== APP - checkout == Order passed: Order { OrderId = 20 }
Exited App successfully
```

### 发生了什么？

在本快速入门中运行 `dapr run -f .` 时，通过 `dapr.yaml` Multi-App Run 模板文件同时启动了[订阅者]({{% ref "#order-processor-服务" %}})和[发布者]({{% ref "#checkout-服务" %}})应用程序。

##### `dapr.yaml` Multi-App Run 模板文件

使用 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})并执行 `dapr run -f .`，即可启动项目中的所有应用程序。在本快速入门中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
apps:
  - appDirPath: ./order-processor/
    appID: order-processor
    appPort: 6006
    command: ["go", "run", "."]
  - appID: checkout
    appDirPath: ./checkout/
    command: ["go", "run", "."]
```

##### `order-processor` 服务

在 `order-processor` 服务中，每个订单都通过 HTTP POST 请求接收，并由 `getOrder` 函数处理。

```go
func getOrder(w http.ResponseWriter, r *http.Request) {
	data, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Order received : %s", string(data))
}
```

##### `checkout` 服务

在 `checkout` 服务中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```go
req.Header.Add("dapr-app-id", "order-processor")

response, err := client.Do(req)
```

{{% /tab %}}

{{< /tabpane >}}

## 一次运行一个应用

在继续快速入门之前，请先选择你偏好的语言。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例所用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

### 步骤 3：运行 `order-processor` 服务

在一个终端窗口中，从快速入门克隆目录的根目录进入 `order-processor` 目录。

```bash
cd service_invocation/python/http/order-processor
```

安装依赖并构建应用程序：

```bash
uv sync --all-packages
```

使用 Dapr 边车运行 `order-processor` 服务。

```bash
dapr run --app-port 8001 --app-id order-processor --app-protocol http --dapr-http-port 3501 -- uv run python app.py
```


```py
@app.route('/orders', methods=['POST'])
def getOrder():
    data = request.json
    print('Order received : ' + json.dumps(data), flush=True)
    return json.dumps({'success': True}), 200, {
        'ContentType': 'application/json'}


app.run(port=8001)
```

### 步骤 4：运行 `checkout` 服务

在一个新的终端窗口中，从快速入门克隆目录的根目录进入 `checkout` 目录。

```bash
cd service_invocation/python/http/checkout
```

安装依赖并构建应用程序：

```bash
uv sync --all-packages
```

使用 Dapr 边车运行 `checkout` 服务。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- uv run python app.py
```


在 `checkout` 服务中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```python
headers = {'dapr-app-id': 'order-processor'}

result = requests.post(
    url='%s/orders' % (base_url),
    data=json.dumps(order),
    headers=headers
)
```

### 步骤 5：使用 Multi-App Run

你可以使用 [Multi-App Run 模板]({{% ref multi-app-dapr-run %}})运行本快速入门中的 Dapr 应用程序。无需为 `order-processor` 和 `checkout` 应用分别执行两条 `dapr run` 命令，只需运行以下命令：

```sh
dapr run -f .
```

要停止所有应用程序，请运行：

```sh
dapr stop -f .
```

### 步骤 6：查看服务调用的输出

Dapr 可以在任意 Dapr 实例上调用应用程序。在代码中，边车编程模型鼓励每个应用程序与其自身的 Dapr 实例通信。随后，各个 Dapr 实例会相互发现并通信。

`checkout` 服务的输出：

```
== APP == Order passed: {"orderId": 1}
== APP == Order passed: {"orderId": 2}
== APP == Order passed: {"orderId": 3}
== APP == Order passed: {"orderId": 4}
== APP == Order passed: {"orderId": 5}
== APP == Order passed: {"orderId": 6}
== APP == Order passed: {"orderId": 7}
== APP == Order passed: {"orderId": 8}
== APP == Order passed: {"orderId": 9}
== APP == Order passed: {"orderId": 10}
```

`order-processor` 服务的输出：

```
== APP == Order received: {"orderId": 1}
== APP == Order received: {"orderId": 2}
== APP == Order received: {"orderId": 3}
== APP == Order received: {"orderId": 4}
== APP == Order received: {"orderId": 5}
== APP == Order received: {"orderId": 6}
== APP == Order received: {"orderId": 7}
== APP == Order received: {"orderId": 8}
== APP == Order received: {"orderId": 9}
== APP == Order received: {"orderId": 10}
```

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新版本的 Node.js](https://nodejs.org/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：运行 `order-processor` 服务

在一个终端窗口中，从快速入门克隆目录的根目录进入 `order-processor` 目录。

```bash
cd service_invocation/javascript/http/order-processor
```

安装依赖：

```bash
npm install
```

使用 Dapr 边车运行 `order-processor` 服务。

```bash
dapr run --app-port 5001 --app-id order-processor --app-protocol http --dapr-http-port 3501 -- npm start
```

```javascript
app.post('/orders', (req, res) => {
    console.log("Order received:", req.body);
    res.sendStatus(200);
});
```

### 步骤 4：运行 `checkout` 服务

在一个新的终端窗口中，从快速入门克隆目录的根目录进入 `checkout` 目录。

```bash
cd service_invocation/javascript/http/checkout
```

安装依赖：

```bash
npm install
```

使用 Dapr 边车运行 `checkout` 服务。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- npm start
```

在 `checkout` 服务中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```javascript
let axiosConfig = {
  headers: {
      "dapr-app-id": "order-processor"
  }
};
const res = await axios.post(`${DAPR_HOST}:${DAPR_HTTP_PORT}/orders`, order , axiosConfig);
console.log("Order passed: " + res.config.data);
```

### 步骤 5：使用 Multi-App Run

你可以使用 [Multi-App Run 模板]({{% ref multi-app-dapr-run %}})运行本快速入门中的 Dapr 应用程序。无需为 `order-processor` 和 `checkout` 应用分别执行两条 `dapr run` 命令，只需运行以下命令：

```sh
dapr run -f .
```

要停止所有应用程序，请运行：

```sh
dapr stop -f .
```

### 步骤 6：查看服务调用的输出

Dapr 可以在任意 Dapr 实例上调用应用程序。在代码中，边车编程模型鼓励每个应用程序与其自身的 Dapr 实例通信。随后，各个 Dapr 实例会相互发现并通信。

`checkout` 服务的输出：

```
== APP == Order passed: {"orderId": 1}
== APP == Order passed: {"orderId": 2}
== APP == Order passed: {"orderId": 3}
== APP == Order passed: {"orderId": 4}
== APP == Order passed: {"orderId": 5}
== APP == Order passed: {"orderId": 6}
== APP == Order passed: {"orderId": 7}
== APP == Order passed: {"orderId": 8}
== APP == Order passed: {"orderId": 9}
== APP == Order passed: {"orderId": 10}
```

`order-processor` 服务的输出：

```
== APP == Order received: {"orderId": 1}
== APP == Order received: {"orderId": 2}
== APP == Order received: {"orderId": 3}
== APP == Order received: {"orderId": 4}
== APP == Order received: {"orderId": 5}
== APP == Order received: {"orderId": 6}
== APP == Order received: {"orderId": 7}
== APP == Order received: {"orderId": 8}
== APP == Order received: {"orderId": 9}
== APP == Order received: {"orderId": 10}
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [.NET SDK 或 .NET 7 SDK](https://dotnet.microsoft.com/download)（需已安装）。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：运行 `order-processor` 服务

在一个终端窗口中，从快速入门克隆目录的根目录进入 `order-processor` 目录。

```bash
cd service_invocation/csharp/http/order-processor
```

安装依赖：

```bash
dotnet restore
dotnet build
```

使用 Dapr 边车运行 `order-processor` 服务。

```bash
dapr run --app-port 7001 --app-id order-processor --app-protocol http --dapr-http-port 3501 -- dotnet run
```

以下是 order-processor 的 `Program.cs` 文件中的关键代码块。

```csharp
app.MapPost("/orders", (Order order) =>
{
    Console.WriteLine("Order received : " + order);
    return order.ToString();
});
```

### 步骤 4：运行 `checkout` 服务

在一个新的终端窗口中，从快速入门克隆目录的根目录进入 `checkout` 目录。

```bash
cd service_invocation/csharp/http/checkout
```

安装依赖：

```bash
dotnet restore
dotnet build
```

使用 Dapr 边车运行 `checkout` 服务。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- dotnet run
```

在 `checkout` 服务的 Program.cs 文件中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```csharp
var client = DaprClient.CreateInvokeHttpClient(appId: "order-processor");
var cts = new CancellationTokenSource();

var response = await client.PostAsJsonAsync("/orders", order, cts.Token);
Console.WriteLine("Order passed: " + order);
```

### 步骤 5：使用 Multi-App Run

你可以使用 [Multi-App Run 模板]({{% ref multi-app-dapr-run %}})运行本快速入门中的 Dapr 应用程序。无需为 `order-processor` 和 `checkout` 应用分别执行两条 `dapr run` 命令，只需运行以下命令：

```sh
dapr run -f .
```

要停止所有应用程序，请运行：

```sh
dapr stop -f .
```

### 步骤 6：查看服务调用的输出

Dapr 可以在任意 Dapr 实例上调用应用程序。在代码中，边车编程模型鼓励每个应用程序与其自身的 Dapr 实例通信。随后，各个 Dapr 实例会相互发现并通信。

`checkout` 服务的输出：

```
== APP == Order passed: Order { OrderId: 1 }
== APP == Order passed: Order { OrderId: 2 }
== APP == Order passed: Order { OrderId: 3 }
== APP == Order passed: Order { OrderId: 4 }
== APP == Order passed: Order { OrderId: 5 }
== APP == Order passed: Order { OrderId: 6 }
== APP == Order passed: Order { OrderId: 7 }
== APP == Order passed: Order { OrderId: 8 }
== APP == Order passed: Order { OrderId: 9 }
== APP == Order passed: Order { OrderId: 10 }
```

`order-processor` 服务的输出：

```
== APP == Order received: Order { OrderId: 1 }
== APP == Order received: Order { OrderId: 2 }
== APP == Order received: Order { OrderId: 3 }
== APP == Order received: Order { OrderId: 4 }
== APP == Order received: Order { OrderId: 5 }
== APP == Order received: Order { OrderId: 6 }
== APP == Order received: Order { OrderId: 7 }
== APP == Order received: Order { OrderId: 8 }
== APP == Order received: Order { OrderId: 9 }
== APP == Order received: Order { OrderId: 10 }
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：运行 `order-processor` 服务

在一个终端窗口中，从快速入门克隆目录的根目录进入 `order-processor` 目录。

```bash
cd service_invocation/java/http/order-processor
```

安装依赖：

```bash
mvn clean install
```

使用 Dapr 边车运行 `order-processor` 服务。

```bash
dapr run --app-id order-processor --app-port 9001 --app-protocol http --dapr-http-port 3501 -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

```java
public String processOrders(@RequestBody Order body) {
        System.out.println("Order received: "+ body.getOrderId());
        return "CID" + body.getOrderId();
    }
```

### 步骤 4：运行 `checkout` 服务

在一个新的终端窗口中，从快速入门克隆目录的根目录进入 `checkout` 目录。

```bash
cd service_invocation/java/http/checkout
```

安装依赖：

```bash
mvn clean install
```

使用 Dapr 边车运行 `checkout` 服务。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- java -jar target/CheckoutService-0.0.1-SNAPSHOT.jar
```

在 `checkout` 服务中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```java
.header("Content-Type", "application/json")
.header("dapr-app-id", "order-processor")

HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println("Order passed: "+ orderId)
```

### 步骤 5：使用 Multi-App Run

你可以使用 [Multi-App Run 模板]({{% ref multi-app-dapr-run %}})运行本快速入门中的 Dapr 应用程序。无需为 `order-processor` 和 `checkout` 应用分别执行两条 `dapr run` 命令，只需运行以下命令：

```sh
dapr run -f .
```

要停止所有应用程序，请运行：

```sh
dapr stop -f .
```

### 步骤 6：查看服务调用的输出

Dapr 可以在任意 Dapr 实例上调用应用程序。在代码中，边车编程模型鼓励每个应用程序与其自身的 Dapr 实例通信。随后，各个 Dapr 实例会相互发现并通信。

`checkout` 服务的输出：

```
== APP == Order passed: 1
== APP == Order passed: 2
== APP == Order passed: 3
== APP == Order passed: 4
== APP == Order passed: 5
== APP == Order passed: 6
== APP == Order passed: 7
== APP == Order passed: 8
== APP == Order passed: 9
== APP == Order passed: 10
```

`order-processor` 服务的输出：

```
== APP == Order received: 1
== APP == Order received: 2
== APP == Order received: 3
== APP == Order received: 4
== APP == Order received: 5
== APP == Order received: 6
== APP == Order received: 7
== APP == Order received: 8
== APP == Order received: 9
== APP == Order received: 10
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 步骤 1：前提条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation)。


```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 3：运行 `order-processor` 服务

在一个终端窗口中，从快速入门克隆目录的根目录进入 `order-processor` 目录。

```bash
cd service_invocation/go/http/order-processor
```

安装依赖：

```bash
go build .
```

使用 Dapr 边车运行 `order-processor` 服务。

```bash
dapr run --app-port 6006 --app-id order-processor --app-protocol http --dapr-http-port 3501 -- go run .
```

每个订单都通过 HTTP POST 请求接收，并由 `getOrder` 函数处理。

```go
func getOrder(w http.ResponseWriter, r *http.Request) {
	data, err := ioutil.ReadAll(r.Body)
	if err != nil {
		log.Fatal(err)
	}
	log.Printf("Order received : %s", string(data))
}
```

### 步骤 4：运行 `checkout` 服务

在一个新的终端窗口中，从快速入门克隆目录的根目录进入 `checkout` 目录。

```bash
cd service_invocation/go/http/checkout
```

安装依赖：

```bash
go build .
```

使用 Dapr 边车运行 `checkout` 服务。

```bash
dapr run --app-id checkout --app-protocol http --dapr-http-port 3500 -- go run .
```

在 `checkout` 服务中，你会发现无需改写应用代码即可使用 Dapr 的服务调用。只需添加 `dapr-app-id` 请求头（它指定了目标服务的 ID），即可启用服务调用。

```go
req.Header.Add("dapr-app-id", "order-processor")

response, err := client.Do(req)
```

### 步骤 5：使用 Multi-App Run

你可以使用 [Multi-App Run 模板]({{% ref multi-app-dapr-run %}})运行本快速入门中的 Dapr 应用程序。无需为 `order-processor` 和 `checkout` 应用分别执行两条 `dapr run` 命令，只需运行以下命令：

```sh
dapr run -f .
```

要停止所有应用程序，请运行：

```sh
dapr stop -f .
```

### 步骤 6：查看服务调用的输出

Dapr 可以在任意 Dapr 实例上调用应用程序。在代码中，边车编程模型鼓励每个应用程序与其自身的 Dapr 实例通信。随后，各个 Dapr 实例会相互发现并通信。

`checkout` 服务的输出：

```
== APP == Order passed:  {"orderId":1}
== APP == Order passed:  {"orderId":2}
== APP == Order passed:  {"orderId":3}
== APP == Order passed:  {"orderId":4}
== APP == Order passed:  {"orderId":5}
== APP == Order passed:  {"orderId":6}
== APP == Order passed:  {"orderId":7}
== APP == Order passed:  {"orderId":8}
== APP == Order passed:  {"orderId":9}
== APP == Order passed:  {"orderId":10}
```

`order-processor` 服务的输出：

```
== APP == Order received :  {"orderId":1}
== APP == Order received :  {"orderId":2}
== APP == Order received :  {"orderId":3}
== APP == Order received :  {"orderId":4}
== APP == Order received :  {"orderId":5}
== APP == Order received :  {"orderId":6}
== APP == Order received :  {"orderId":7}
== APP == Order received :  {"orderId":8}
== APP == Order received :  {"orderId":9}
== APP == Order received :  {"orderId":10}
```


{{% /tab %}}

{{< /tabpane >}}

## 使用 Dapr Dev Dashboard 检查应用

快速入门运行期间，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看 `checkout` 和 `order-processor` 应用的健康状况、端口和进程 ID，确认两者均已注册到 Dapr。该仪表板还会实时显示每个应用及其边车的日志，方便你同时跟踪调用双方的请求。

## 告诉我们你的想法！
我们在持续改进快速入门示例，非常重视你的反馈。这个快速入门对你有帮助吗？你对改进有什么建议？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的看法。

## 后续步骤

- 进一步了解[服务调用构建块]({{% ref service-invocation-overview %}})
- 进一步了解如何通过以下方式调用 Dapr 的服务调用：
    - [HTTP]({{% ref howto-invoke-discover-services %}})，或
    - [gRPC]({{% ref howto-invoke-services-grpc %}})

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
