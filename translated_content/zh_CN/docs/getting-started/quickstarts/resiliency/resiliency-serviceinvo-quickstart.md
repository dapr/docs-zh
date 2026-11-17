---
type: docs
title: "Quickstart：服务到服务 resiliency 策略"
linkTitle: "resiliency 策略：服务到服务"
weight: 120
description: "通过 service invocation API 开始使用 Dapr 的 resiliency 策略功能"
---

通过模拟系统故障来观察 Dapr resiliency 策略功能。在本 Quickstart 中，你将：

- 运行两个微服务应用程序：`checkout` 和 `order-processor`。`checkout` 将持续向 `order-processor` 发起 Dapr service invocation 请求。
- 通过模拟系统故障来触发 resiliency 策略规范。
- 移除故障，使微服务应用程序能够恢复。

<img src="/images/resiliency-quickstart-svc-invoke.png" width="1000" alt="Diagram showing the resiliency applied to Dapr APIs">

在继续 Quickstart 之前，选择你偏好的特定语言的 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即示例所使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/python/http)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

### 步骤 2：运行 `order-processor` 服务

在终端窗口中，从 Quickstart 目录的根目录进入 `order-processor` 目录。

```bash
cd service_invocation/python/http/order-processor
```

安装依赖：

```bash
uv sync --all-packages
```

运行 `order-processor` 服务以及 Dapr sidecar。

```bash
dapr run --app-port 8001 --app-id order-processor --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3501 -- uv run python app.py
```

### 步骤 3：运行 `checkout` 服务应用程序 

在新的终端窗口中，从 Quickstart 目录的根目录进入 `checkout` 目录。

```bash
cd service_invocation/python/http/checkout
```

安装依赖：

```bash
uv sync --all-packages
```

运行 `checkout` 服务以及 Dapr sidecar。 

```bash
dapr run --app-id checkout --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3500 -- uv run python app.py
```

随后 Dapr sidecar 会加载位于 resources 目录中的 resiliency 策略规范：

   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Resiliency
   metadata:
     name: myresiliency
   scopes:
     - checkout
   
   spec:
     policies:
       retries:
         retryForever:
           policy: constant
           maxInterval: 5s
           maxRetries: -1 
   
       circuitBreakers:
         simpleCB:
           maxRequests: 1
           timeout: 5s 
           trip: consecutiveFailures >= 5
   
     targets:
       apps:
         order-processor:
           retry: retryForever
           circuitBreaker: simpleCB
   ```

### 步骤 4：查看 service invocation 输出
当两个服务和 sidecar 都在运行时，注意订单是如何通过 Dapr service invocation 从 `checkout` 服务传递到 `order-processor` 服务的。 

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 1}
== APP == Order passed: {"orderId": 2}
== APP == Order passed: {"orderId": 3}
== APP == Order passed: {"orderId": 4}
```

`order-processor` 服务输出：

```
== APP == Order received: {"orderId": 1}
== APP == Order received: {"orderId": 2}
== APP == Order received: {"orderId": 3}
== APP == Order received: {"orderId": 4}
```

### 步骤 5：引入故障
通过停止 `order-processor` 服务来模拟故障。实例停止后，来自 `checkout` 服务的 service invocation 操作将开始失败。

由于 `resiliency.yaml` 规范将 `order-processor` 服务定义为 resiliency 策略目标，所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    apps:
      order-processor:
        retry: retryForever
        circuitBreaker: simpleCB
```

在 `order-processor` 窗口中，停止服务：

{{< tabpane text=true >}}

 <!-- MacOS -->

{{% tab "MacOs" %}}

```script
CMD + C
```

{{% /tab %}}

 <!-- Windows -->

{{% tab "Windows" %}}

```script
CTRL + C
```

{{% /tab %}}

{{< /tabpane >}}

第一个请求失败后，将应用名为 `retryForever` 的重试策略：

```bash
INFO[0005] Error processing operation endpoint[order-processor, order-processor:orders]. Retrying...  
```

每个失败的请求都将以 5 秒为间隔无限期重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

连续 5 次重试失败后，断路器策略 `simpleCB` 将被触发，断路器打开，并停止所有请求：

```bash
INFO[0025] Circuit breaker "order-processor:orders" changed state from closed to open  
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，放行一个请求以验证故障是否已解决。如果该请求仍然失败，断路器将重新跳回打开状态。

```bash
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open   
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open     
```

只要 `order-processor` 服务保持停止，这种半开/打开的状态切换就会持续下去。 

### 步骤 6：移除故障

重新启动 `order-processor` 服务后，应用程序将无缝恢复，从上次中断的地方继续接收订单请求。

在 `order-processor` 服务的终端中，重新启动应用程序：

```bash
dapr run --app-port 8001 --app-id order-processor --app-protocol http --dapr-http-port 3501 -- uv run python app.py
```

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 5}
== APP == Order passed: {"orderId": 6}
== APP == Order passed: {"orderId": 7}
== APP == Order passed: {"orderId": 8}
== APP == Order passed: {"orderId": 9}
== APP == Order passed: {"orderId": 10}
```

`order-processor` 服务输出：

```
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

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新版 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/javascript/http)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：运行 `order-processor` 服务

在终端窗口中，从 Quickstart 目录的根目录
进入 `order-processor` 目录。

```bash
cd service_invocation/javascript/http/order-processor
```

安装依赖：

```bash
npm install
```

运行 `order-processor` 服务以及 Dapr sidecar。

```bash
dapr run --app-port 5001 --app-id order-processor --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3501 -- npm start
```

### 步骤 3：运行 `checkout` 服务应用程序 

在新的终端窗口中，从 Quickstart 目录的根目录，
进入 `checkout` 目录。

```bash
cd service_invocation/javascript/http/checkout
```

安装依赖：

```bash
npm install
```

运行 `checkout` 服务以及 Dapr sidecar。 

```bash
dapr run --app-id checkout --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3500 -- npm start
```

随后 Dapr sidecar 会加载位于 resources 目录中的 resiliency 策略规范：


   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Resiliency
   metadata:
     name: myresiliency
   scopes:
     - checkout
   
   spec:
     policies:
       retries:
         retryForever:
           policy: constant
           maxInterval: 5s
           maxRetries: -1 
   
       circuitBreakers:
         simpleCB:
           maxRequests: 1
           timeout: 5s 
           trip: consecutiveFailures >= 5
   
     targets:
       apps:
         order-processor:
           retry: retryForever
           circuitBreaker: simpleCB
   ```

### 步骤 4：查看 service invocation 输出
当两个服务和 sidecar 都在运行时，注意订单是如何通过 Dapr service invocation 从 `checkout` 服务传递到 `order-processor` 服务的。 

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 1}
== APP == Order passed: {"orderId": 2}
== APP == Order passed: {"orderId": 3}
== APP == Order passed: {"orderId": 4}
```

`order-processor` 服务输出：

```
== APP == Order received: {"orderId": 1}
== APP == Order received: {"orderId": 2}
== APP == Order received: {"orderId": 3}
== APP == Order received: {"orderId": 4}
```

### 步骤 5：引入故障
通过停止 `order-processor` 服务来模拟故障。实例停止后，来自 `checkout` 服务的 service invocation 操作将开始失败。

由于 `resiliency.yaml` 规范将 `order-processor` 服务定义为 resiliency 策略目标，所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    apps:
      order-processor:
        retry: retryForever
        circuitBreaker: simpleCB
```

在 `order-processor` 窗口中，停止服务：

{{< tabpane text=true >}}

 <!-- MacOS -->

{{% tab "MacOs" %}}

```script
CMD + C
```

{{% /tab %}}

 <!-- Windows -->

{{% tab "Windows" %}}

```script
CTRL + C
```

{{% /tab %}}

{{< /tabpane >}}


第一个请求失败后，将应用名为 `retryForever` 的重试策略：

```bash
INFO[0005] Error processing operation endpoint[order-processor, order-processor:orders]. Retrying...  
```

每个失败的请求都将以 5 秒为间隔无限期重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

连续 5 次重试失败后，断路器策略 `simpleCB` 将被触发，断路器打开，并停止所有请求：

```bash
INFO[0025] Circuit breaker "order-processor:orders" changed state from closed to open  
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，放行一个请求以验证故障是否已解决。如果该请求仍然失败，断路器将重新跳回打开状态。 

```bash
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open   
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open     
```

只要 Redis 容器保持停止，这种半开/打开的状态切换就会持续下去。 

### 步骤 6：移除故障

重新启动 `order-processor` 服务后，应用程序将无缝恢复，从上次中断的地方继续处理订单请求。 

在 `order-processor` 服务的终端中，重新启动应用程序：

```bash
dapr run --app-port 5001 --app-id order-processor --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3501 -- npm start
```

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 5}
== APP == Order passed: {"orderId": 6}
== APP == Order passed: {"orderId": 7}
== APP == Order passed: {"orderId": 8}
== APP == Order passed: {"orderId": 9}
== APP == Order passed: {"orderId": 10}
```

`order-processor` 服务输出：

```
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

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [.NET SDK 或 .NET 6 SDK](https://dotnet.microsoft.com/download)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/csharp/http)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：运行 `order-processor` 服务

在终端窗口中，从 Quickstart 目录的根目录，
进入 `order-processor` 目录。


```bash
cd service_invocation/csharp/http/order-processor
```

安装依赖：

```bash
dotnet restore
dotnet build
```

运行 `order-processor` 服务以及 Dapr sidecar。

```bash
dapr run --app-port 7001 --app-id order-processor --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3501 -- dotnet run
```

### 步骤 3：运行 `checkout` 服务应用程序 

在新的终端窗口中，从 Quickstart 目录的根目录，
进入 `checkout` 目录。

```bash
cd service_invocation/csharp/http/checkout
```

安装依赖：

```bash
dotnet restore
dotnet build
```

运行 `checkout` 服务以及 Dapr sidecar。 

```bash
dapr run --app-id checkout --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3500 -- dotnet run
```

随后 Dapr sidecar 会加载位于 resources 目录中的 resiliency 策略规范：

   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Resiliency
   metadata:
     name: myresiliency
   scopes:
     - checkout
   
   spec:
     policies:
       retries:
         retryForever:
           policy: constant
           maxInterval: 5s
           maxRetries: -1 
   
       circuitBreakers:
         simpleCB:
           maxRequests: 1
           timeout: 5s 
           trip: consecutiveFailures >= 5
   
     targets:
       apps:
         order-processor:
           retry: retryForever
           circuitBreaker: simpleCB
   ```

### 步骤 4：查看 service invocation 输出
当两个服务和 sidecar 都在运行时，注意订单是如何通过 Dapr service invocation 从 `checkout` 服务传递到 `order-processor` 服务的。 

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 1}
== APP == Order passed: {"orderId": 2}
== APP == Order passed: {"orderId": 3}
== APP == Order passed: {"orderId": 4}
```

`order-processor` 服务输出：

```
== APP == Order received: {"orderId": 1}
== APP == Order received: {"orderId": 2}
== APP == Order received: {"orderId": 3}
== APP == Order received: {"orderId": 4}
```

### 步骤 5：引入故障
通过停止 `order-processor` 服务来模拟故障。实例停止后，来自 `checkout` 服务的 service invocation 操作将开始失败。

由于 `resiliency.yaml` 规范将 `order-processor` 服务定义为 resiliency 策略目标，所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    apps:
      order-processor:
        retry: retryForever
        circuitBreaker: simpleCB
```

在 `order-processor` 窗口中，停止服务：

{{< tabpane text=true >}}

 <!-- MacOS -->

{{% tab "MacOs" %}}

```script
CMD + C
```

{{% /tab %}}

 <!-- Windows -->

{{% tab "Windows" %}}

```script
CTRL + C
```

{{% /tab %}}

{{< /tabpane >}}


第一个请求失败后，将应用名为 `retryForever` 的重试策略：

```bash
INFO[0005] Error processing operation endpoint[order-processor, order-processor:orders]. Retrying...  
```

每个失败的请求都将以 5 秒为间隔无限期重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

连续 5 次重试失败后，断路器策略 `simpleCB` 将被触发，断路器打开，并停止所有请求：

```bash
INFO[0025] Circuit breaker "order-processor:orders" changed state from closed to open  
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，放行一个请求以验证故障是否已解决。如果该请求仍然失败，断路器将重新跳回打开状态。 

```bash
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open   
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open     
```

只要 Redis 容器保持停止，这种半开/打开的状态切换就会持续下去。 

### 步骤 6：移除故障

重新启动 `order-processor` 服务后，应用程序将无缝恢复，从上次中断的地方继续处理订单请求。 

在 `order-processor` 服务的终端中，重新启动应用程序：

```bash
dapr run --app-port 7001 --app-id order-processor --app-protocol http --dapr-http-port 3501 -- dotnet run
```

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 5}
== APP == Order passed: {"orderId": 6}
== APP == Order passed: {"orderId": 7}
== APP == Order passed: {"orderId": 8}
== APP == Order passed: {"orderId": 9}
== APP == Order passed: {"orderId": 10}
```

`order-processor` 服务输出：

```
== APP == Order received: {"orderId": 5}
== APP == Order received: {"orderId": 6}
== APP == Order received: {"orderId": 7}
== APP == Order received: {"orderId": 8}
== APP == Order received: {"orderId": 9}
== APP == Order received: {"orderId": 10}
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17 或更高版本：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，3.x 版本。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/java/http)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：运行 `order-processor` 服务

在终端窗口中，从 Quickstart 目录的根目录，
进入 `order-processor` 目录。

```bash
cd service_invocation/java/http/order-processor
```

安装依赖：

```bash
mvn clean install
```

运行 `order-processor` 服务以及 Dapr sidecar。

```bash
dapr run --app-id order-processor --resources-path ../../../resources/ --app-port 9001 --app-protocol http --dapr-http-port 3501 -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

### 步骤 3：运行 `checkout` 服务应用程序 

在新的终端窗口中，从 Quickstart 目录的根目录，
进入 `checkout` 目录。

```bash
cd service_invocation/java/http/checkout
```

安装依赖：

```bash
mvn clean install
```

运行 `checkout` 服务以及 Dapr sidecar。 

```bash
dapr run --app-id checkout --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3500 -- java -jar target/CheckoutService-0.0.1-SNAPSHOT.jar
```

随后 Dapr sidecar 会加载位于 resources 目录中的 resiliency 策略规范：


   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Resiliency
   metadata:
     name: myresiliency
   scopes:
     - checkout
   
   spec:
     policies:
       retries:
         retryForever:
           policy: constant
           maxInterval: 5s
           maxRetries: -1 
   
       circuitBreakers:
         simpleCB:
           maxRequests: 1
           timeout: 5s 
           trip: consecutiveFailures >= 5
   
     targets:
       apps:
         order-processor:
           retry: retryForever
           circuitBreaker: simpleCB
   ```

### 步骤 4：查看 service invocation 输出
当两个服务和 sidecar 都在运行时，注意订单是如何通过 Dapr service invocation 从 `checkout` 服务传递到 `order-processor` 服务的。 

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 1}
== APP == Order passed: {"orderId": 2}
== APP == Order passed: {"orderId": 3}
== APP == Order passed: {"orderId": 4}
```

`order-processor` 服务输出：

```
== APP == Order received: {"orderId": 1}
== APP == Order received: {"orderId": 2}
== APP == Order received: {"orderId": 3}
== APP == Order received: {"orderId": 4}
```

### 步骤 5：引入故障
通过停止 `order-processor` 服务来模拟故障。实例停止后，来自 `checkout` 服务的 service invocation 操作将开始失败。

由于 `resiliency.yaml` 规范将 `order-processor` 服务定义为 resiliency 策略目标，所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    apps:
      order-processor:
        retry: retryForever
        circuitBreaker: simpleCB
```

在 `order-processor` 窗口中，停止服务：

{{< tabpane text=true >}}

 <!-- MacOS -->

{{% tab "MacOs" %}}

```script
CMD + C
```

{{% /tab %}}

 <!-- Windows -->

{{% tab "Windows" %}}

```script
CTRL + C
```

{{% /tab %}}

{{< /tabpane >}}


第一个请求失败后，将应用名为 `retryForever` 的重试策略：

```bash
INFO[0005] Error processing operation endpoint[order-processor, order-processor:orders]. Retrying...  
```

每个失败的请求都将以 5 秒为间隔无限期重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

连续 5 次重试失败后，断路器策略 `simpleCB` 将被触发，断路器打开，并停止所有请求：

```bash
INFO[0025] Circuit breaker "order-processor:orders" changed state from closed to open  
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，放行一个请求以验证故障是否已解决。如果该请求仍然失败，断路器将重新跳回打开状态。 

```bash
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open   
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open     
```

只要 Redis 容器保持停止，这种半开/打开的状态切换就会持续下去。 

### 步骤 6：移除故障

重新启动 `order-processor` 服务后，应用程序将无缝恢复，从上次中断的地方继续处理订单请求。 

在 `order-processor` 服务的终端中，重新启动应用程序：

```bash
dapr run --app-id order-processor --resources-path ../../../resources/ --app-port 9001 --app-protocol http --dapr-http-port 3501 -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 5}
== APP == Order passed: {"orderId": 6}
== APP == Order passed: {"orderId": 7}
== APP == Order passed: {"orderId": 8}
== APP == Order passed: {"orderId": 9}
== APP == Order passed: {"orderId": 10}
```

`order-processor` 服务输出：

```
== APP == Order received: {"orderId": 5}
== APP == Order received: {"orderId": 6}
== APP == Order received: {"orderId": 7}
== APP == Order received: {"orderId": 8}
== APP == Order received: {"orderId": 9}
== APP == Order received: {"orderId": 10}
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/service_invocation/go/http)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：运行 `order-processor` 服务

在终端窗口中，从 Quickstart 目录的根目录，
进入 `order-processor` 目录。

```bash
cd service_invocation/go/http/order-processor
```

安装依赖：

```bash
go build .
```

运行 `order-processor` 服务以及 Dapr sidecar。

```bash
dapr run --app-port 6006 --app-id order-processor --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3501 -- go run .
```

### 步骤 3：运行 `checkout` 服务应用程序 

在新的终端窗口中，从 Quickstart 目录的根目录，
进入 `checkout` 目录。

```bash
cd service_invocation/go/http/checkout
```

安装依赖：

```bash
go build .
```

运行 `checkout` 服务以及 Dapr sidecar。 

```bash
dapr run --app-id checkout --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3500 -- go run .
```

随后 Dapr sidecar 会加载位于 resources 目录中的 resiliency 策略规范：


   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Resiliency
   metadata:
     name: myresiliency
   scopes:
     - checkout
   
   spec:
     policies:
       retries:
         retryForever:
           policy: constant
           maxInterval: 5s
           maxRetries: -1 
   
       circuitBreakers:
         simpleCB:
           maxRequests: 1
           timeout: 5s 
           trip: consecutiveFailures >= 5
   
     targets:
       apps:
         order-processor:
           retry: retryForever
           circuitBreaker: simpleCB
   ```

### 步骤 4：查看 service invocation 输出
当两个服务和 sidecar 都在运行时，注意订单是如何通过 Dapr service invocation 从 `checkout` 服务传递到 `order-processor` 服务的。 

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 1}
== APP == Order passed: {"orderId": 2}
== APP == Order passed: {"orderId": 3}
== APP == Order passed: {"orderId": 4}
```

`order-processor` 服务输出：

```
== APP == Order received: {"orderId": 1}
== APP == Order received: {"orderId": 2}
== APP == Order received: {"orderId": 3}
== APP == Order received: {"orderId": 4}
```

### 步骤 5：引入故障
通过停止 `order-processor` 服务来模拟故障。实例停止后，来自 `checkout` 服务的 service invocation 操作将开始失败。

由于 `resiliency.yaml` 规范将 `order-processor` 服务定义为 resiliency 策略目标，所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    apps:
      order-processor:
        retry: retryForever
        circuitBreaker: simpleCB
```

在 `order-processor` 窗口中，停止服务：

{{< tabpane text=true >}}

 <!-- MacOS -->

{{% tab "MacOs" %}}

```script
CMD + C
```

{{% /tab %}}

 <!-- Windows -->

{{% tab "Windows" %}}

```script
CTRL + C
```

{{% /tab %}}

{{< /tabpane >}}


第一个请求失败后，将应用名为 `retryForever` 的重试策略：

```bash
INFO[0005] Error processing operation endpoint[order-processor, order-processor:orders]. Retrying...  
```

每个失败的请求都将以 5 秒为间隔无限期重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

连续 5 次重试失败后，断路器策略 `simpleCB` 将被触发，断路器打开，并停止所有请求：

```bash
INFO[0025] Circuit breaker "order-processor:orders" changed state from closed to open  
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，放行一个请求以验证故障是否已解决。如果该请求仍然失败，断路器将重新跳回打开状态。 

```bash
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open   
INFO[0030] Circuit breaker "order-processor:orders" changed state from open to half-open  
INFO[0030] Circuit breaker "order-processor:orders" changed state from half-open to open     
```

只要 Redis 容器保持停止，这种半开/打开的状态切换就会持续下去。 

### 步骤 6：移除故障

重新启动 `order-processor` 服务后，应用程序将无缝恢复，从上次中断的地方继续处理订单请求。 

在 `order-processor` 服务的终端中，重新启动应用程序：

```bash
dapr run --app-port 6006 --app-id order-processor --resources-path ../../../resources/ --app-protocol http --dapr-http-port 3501 -- go run .
```

`checkout` 服务输出：

```
== APP == Order passed: {"orderId": 5}
== APP == Order passed: {"orderId": 6}
== APP == Order passed: {"orderId": 7}
== APP == Order passed: {"orderId": 8}
== APP == Order passed: {"orderId": 9}
== APP == Order passed: {"orderId": 10}
```

`order-processor` 服务输出：

```
== APP == Order received: {"orderId": 5}
== APP == Order received: {"orderId": 6}
== APP == Order received: {"orderId": 7}
== APP == Order received: {"orderId": 8}
== APP == Order received: {"orderId": 9}
== APP == Order received: {"orderId": 10}
```

{{% /tab %}}

{{< /tabpane >}}

## 告诉我们你的想法！
我们正在持续改进 Quickstart 示例，并重视你的反馈。你觉得这份 Quickstart 有帮助吗？你对改进有什么建议吗？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的想法。

## 后续步骤
访问[此链接](https://docs.dapr.io/operations/resiliency/resiliency-overview/)，了解更多关于 Dapr resiliency 策略功能的信息。

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
