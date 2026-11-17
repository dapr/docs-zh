---
type: docs
title: "Quickstart：服务到组件的 resiliency"
linkTitle: "resiliency：服务到组件"
weight: 110
description: "通过 State Management API 快速上手 Dapr 的 resiliency 能力"
---

通过模拟系统故障来观察 Dapr 的 resiliency 能力。在本 Quickstart 中，你将：

- 运行一个微服务应用程序，该应用程序通过 Dapr 的 State Management API 持续持久化和检索状态。 
- 通过模拟系统故障来触发 resiliency 策略。 
- 故障解决后，微服务应用程序将恢复运行。 

<img src="/images/resiliency-quickstart-svc-component.png" width="1000" alt="显示应用于 Dapr API 的 resiliency 的图表">

在继续 Quickstart 之前，请选择你偏好的特定语言的 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例所使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 第 1 步：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/python/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

在终端窗口中，从 Quickstarts 目录的根目录导航到 `order-processor` 目录。

```bash
cd state_management/python/sdk/order-processor
```

安装依赖项

```bash
uv sync
```

### 第 2 步：运行应用程序

运行 `order-processor` 服务以及 Dapr sidecar。Dapr sidecar 随后会加载位于资源目录中的 resiliency 规范：


   ```yaml
   apiVersion: dapr.io/v1alpha1
   kind: Resiliency
   metadata:
     name: myresiliency
   scopes:
     - order-processor

   spec:
     policies:
       retries:
         retryForever:
           policy: constant
           duration: 5s
           maxRetries: -1

       circuitBreakers:
         simpleCB:
           maxRequests: 1
           timeout: 5s
           trip: consecutiveFailures >= 5

     targets:
       components:
         statestore:
           outbound:
             retry: retryForever
             circuitBreaker: simpleCB
   ```


```bash
dapr run --app-id order-processor --resources-path ../../../resources/ -- uv run python app.py
```

应用程序启动后，`order-processor` 服务会向 [`statestore.yaml` 组件中定义的]({{% ref "statemanagement-quickstart#statestoreyaml-component-file" %}}) `statestore` Redis 实例写入和读取 `orderId` 键值对。

```bash
== APP == Saving Order:  { orderId: '1' }
== APP == Getting Order:  { orderId: '1' }
== APP == Saving Order:  { orderId: '2' }
== APP == Getting Order:  { orderId: '2' }
== APP == Saving Order:  { orderId: '3' }
== APP == Getting Order:  { orderId: '3' }
== APP == Saving Order:  { orderId: '4' }
== APP == Getting Order:  { orderId: '4' }
```

### 第 3 步：引入故障

通过停止在开发机器上执行 `dapr init` 时初始化的 Redis 容器实例来模拟故障。实例停止后，`order-processor` 服务的写入和读取操作将开始失败。

由于 `resiliency.yaml` 规范将 `statestore` 定义为 component 目标，因此所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    components:
      statestore:
        outbound:
          retry: retryForever
          circuitBreaker: simpleCB
```

在新的终端窗口中，运行以下命令来停止 Redis：

```bash
docker stop dapr_redis
```

Redis 停止后，请求将开始失败，并应用名为 `retryForever` 的 retry policy。下面的输出显示了 `order-processor` 服务的日志：

```bash
INFO[0006] Error processing operation component[statestore] output. Retrying...
```

根据 `retryForever` 策略，对于每个失败的请求，将以 5 秒的间隔无限期地继续重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

一旦 5 次连续重试失败，断路器策略 `simpleCB` 就会被触发，断路器打开，停止所有请求：

```bash
INFO[0026] Circuit breaker "simpleCB-statestore" changed state from closed to open
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，允许一个请求通过，以验证故障是否已解决。如果请求继续失败，断路器将重新跳回打开状态。 

```bash
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from half-open to open 
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from half-open to closed  
```

只要 Redis 容器保持停止状态，这种半开/打开的行为就会持续下去。 

### 第 3 步：移除故障

当你在机器上重新启动 Redis 容器后，应用程序将无缝恢复，从中断的地方继续运行。

```bash
docker start dapr_redis
```

```bash
INFO[0036] Recovered processing operation component[statestore] output.  
== APP == Saving Order:  { orderId: '5' }
== APP == Getting Order:  { orderId: '5' }
== APP == Saving Order:  { orderId: '6' }
== APP == Getting Order:  { orderId: '6' }
== APP == Saving Order:  { orderId: '7' }
== APP == Getting Order:  { orderId: '7' }
== APP == Saving Order:  { orderId: '8' }
== APP == Getting Order:  { orderId: '8' }
== APP == Saving Order:  { orderId: '9' }
== APP == Getting Order:  { orderId: '9' }
```

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新版本的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 第 1 步：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在终端窗口中，从 Quickstarts 目录的根目录导航到 `order-processor` 目录。

```bash
cd state_management/javascript/sdk/order-processor
```

安装依赖项

```bash
npm install
```

### 第 2 步：运行应用程序 

运行 `order-processor` 服务以及 Dapr sidecar。Dapr sidecar 随后会加载位于资源目录中的 resiliency 规范：


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

```bash
dapr run --app-id order-processor --resources-path ../../../resources/ -- npm start
```

应用程序启动后，`order-processor` 服务会向 [`statestore.yaml` 组件中定义的]({{% ref "statemanagement-quickstart#statestoreyaml-component-file" %}}) `statestore` Redis 实例写入和读取 `orderId` 键值对。

```bash
== APP == Saving Order:  { orderId: '1' }
== APP == Getting Order:  { orderId: '1' }
== APP == Saving Order:  { orderId: '2' }
== APP == Getting Order:  { orderId: '2' }
== APP == Saving Order:  { orderId: '3' }
== APP == Getting Order:  { orderId: '3' }
== APP == Saving Order:  { orderId: '4' }
== APP == Getting Order:  { orderId: '4' }
```

### 第 3 步：引入故障

通过停止在开发机器上执行 `dapr init` 时初始化的 Redis 容器实例来模拟故障。实例停止后，`order-processor` 服务的写入和读取操作将开始失败。

由于 `resiliency.yaml` 规范将 `statestore` 定义为 component 目标，因此所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    components:
      statestore:
        outbound:
          retry: retryForever
          circuitBreaker: simpleCB
```

在新的终端窗口中，运行以下命令来停止 Redis：

```bash
docker stop dapr_redis
```

Redis 停止后，请求将开始失败，并应用名为 `retryForever` 的 retry policy。下面的输出显示了 `order-processor` 服务的日志：

```bash
INFO[0006] Error processing operation component[statestore] output. Retrying...
```

根据 `retryForever` 策略，对于每个失败的请求，将以 5 秒的间隔无限期地继续重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

一旦 5 次连续重试失败，断路器策略 `simpleCB` 就会被触发，断路器打开，停止所有请求：

```bash
INFO[0026] Circuit breaker "simpleCB-statestore" changed state from closed to open
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，允许一个请求通过，以验证故障是否已解决。如果请求继续失败，断路器将重新跳回打开状态。 

```bash
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from half-open to open 
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from half-open to closed  
```

只要 Redis 容器保持停止状态，这种半开/打开的行为就会持续下去。 

### 第 3 步：移除故障

当你在机器上重新启动 Redis 容器后，应用程序将无缝恢复，从中断的地方继续运行。

```bash
docker start dapr_redis
```

```bash
INFO[0036] Recovered processing operation component[statestore] output.  
== APP == Saving Order:  { orderId: '5' }
== APP == Getting Order:  { orderId: '5' }
== APP == Saving Order:  { orderId: '6' }
== APP == Getting Order:  { orderId: '6' }
== APP == Saving Order:  { orderId: '7' }
== APP == Getting Order:  { orderId: '7' }
== APP == Saving Order:  { orderId: '8' }
== APP == Getting Order:  { orderId: '8' }
== APP == Saving Order:  { orderId: '9' }
== APP == Getting Order:  { orderId: '9' }
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 .NET SDK 或 .NET 6 SDK](https://dotnet.microsoft.com/download)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 第 1 步：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在终端窗口中，从 Quickstarts 目录的根目录导航到 `order-processor` 目录。

```bash
cd state_management/csharp/sdk/order-processor
```

安装依赖项

```bash
dotnet restore
dotnet build
```

### 第 2 步：运行应用程序

运行 `order-processor` 服务以及 Dapr sidecar。Dapr sidecar 随后会加载位于资源目录中的 resiliency 规范：

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

```bash
dapr run --app-id order-processor --resources-path ../../../resources/ -- dotnet run
```

应用程序启动后，`order-processor` 服务会向 [`statestore.yaml` 组件中定义的]({{% ref "statemanagement-quickstart#statestoreyaml-component-file" %}}) `statestore` Redis 实例写入和读取 `orderId` 键值对。

```bash
== APP == Saving Order:  { orderId: '1' }
== APP == Getting Order:  { orderId: '1' }
== APP == Saving Order:  { orderId: '2' }
== APP == Getting Order:  { orderId: '2' }
== APP == Saving Order:  { orderId: '3' }
== APP == Getting Order:  { orderId: '3' }
== APP == Saving Order:  { orderId: '4' }
== APP == Getting Order:  { orderId: '4' }
```

### 第 3 步：引入故障

通过停止在开发机器上执行 `dapr init` 时初始化的 Redis 容器实例来模拟故障。实例停止后，`order-processor` 服务的写入和读取操作将开始失败。

由于 `resiliency.yaml` 规范将 `statestore` 定义为 component 目标，因此所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    components:
      statestore:
        outbound:
          retry: retryForever
          circuitBreaker: simpleCB
```

在新的终端窗口中，运行以下命令来停止 Redis：

```bash
docker stop dapr_redis
```

Redis 停止后，请求将开始失败，并应用名为 `retryForever` 的 retry policy。下面的输出显示了 `order-processor` 服务的日志：

```bash
INFO[0006] Error processing operation component[statestore] output. Retrying...
```

根据 `retryForever` 策略，对于每个失败的请求，将以 5 秒的间隔无限期地继续重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

一旦 5 次连续重试失败，断路器策略 `simpleCB` 就会被触发，断路器打开，停止所有请求：

```bash
INFO[0026] Circuit breaker "simpleCB-statestore" changed state from closed to open
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，允许一个请求通过，以验证故障是否已解决。如果请求继续失败，断路器将重新跳回打开状态。 

```bash
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from half-open to open 
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from half-open to closed  
```

只要 Redis 容器保持停止状态，这种半开/打开的行为就会持续下去。 

### 第 3 步：移除故障

当你在机器上重新启动 Redis 容器后，应用程序将无缝恢复，从中断的地方继续运行。

```bash
docker start dapr_redis
```

```bash
INFO[0036] Recovered processing operation component[statestore] output.  
== APP == Saving Order:  { orderId: '5' }
== APP == Getting Order:  { orderId: '5' }
== APP == Saving Order:  { orderId: '6' }
== APP == Getting Order:  { orderId: '6' }
== APP == Saving Order:  { orderId: '7' }
== APP == Getting Order:  { orderId: '7' }
== APP == Saving Order:  { orderId: '8' }
== APP == Getting Order:  { orderId: '8' }
== APP == Saving Order:  { orderId: '9' }
== APP == Getting Order:  { orderId: '9' }
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 第 1 步：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在终端窗口中，从 Quickstarts 目录的根目录导航到 `order-processor` 目录。

```bash
cd state_management/java/sdk/order-processor
```

安装依赖项

```bash
mvn clean install
```

### 第 2 步：运行应用程序

运行 `order-processor` 服务以及 Dapr sidecar。Dapr sidecar 随后会加载位于资源目录中的 resiliency 规范：

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

```bash
dapr run --app-id order-processor --resources-path ../../../resources/ -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

应用程序启动后，`order-processor` 服务会向 [`statestore.yaml` 组件中定义的]({{% ref "statemanagement-quickstart#statestoreyaml-component-file" %}}) `statestore` Redis 实例写入和读取 `orderId` 键值对。

```bash
== APP == Saving Order:  { orderId: '1' }
== APP == Getting Order:  { orderId: '1' }
== APP == Saving Order:  { orderId: '2' }
== APP == Getting Order:  { orderId: '2' }
== APP == Saving Order:  { orderId: '3' }
== APP == Getting Order:  { orderId: '3' }
== APP == Saving Order:  { orderId: '4' }
== APP == Getting Order:  { orderId: '4' }
```

### 第 3 步：引入故障

通过停止在开发机器上执行 `dapr init` 时初始化的 Redis 容器实例来模拟故障。实例停止后，`order-processor` 服务的写入和读取操作将开始失败。

由于 `resiliency.yaml` 规范将 `statestore` 定义为 component 目标，因此所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    components:
      statestore:
        outbound:
          retry: retryForever
          circuitBreaker: simpleCB
```

在新的终端窗口中，运行以下命令来停止 Redis：

```bash
docker stop dapr_redis
```

Redis 停止后，请求将开始失败，并应用名为 `retryForever` 的 retry policy。下面的输出显示了 `order-processor` 服务的日志：

```bash
INFO[0006] Error processing operation component[statestore] output. Retrying...
```

根据 `retryForever` 策略，对于每个失败的请求，将以 5 秒的间隔无限期地继续重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

一旦 5 次连续重试失败，断路器策略 `simpleCB` 就会被触发，断路器打开，停止所有请求：

```bash
INFO[0026] Circuit breaker "simpleCB-statestore" changed state from closed to open
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，允许一个请求通过，以验证故障是否已解决。如果请求继续失败，断路器将重新跳回打开状态。 

```bash
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from half-open to open 
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from half-open to closed  
```

只要 Redis 容器保持停止状态，这种半开/打开的行为就会持续下去。 

### 第 3 步：移除故障

当你在机器上重新启动 Redis 容器后，应用程序将无缝恢复，从中断的地方继续运行。

```bash
docker start dapr_redis
```

```bash
INFO[0036] Recovered processing operation component[statestore] output.  
== APP == Saving Order:  { orderId: '5' }
== APP == Getting Order:  { orderId: '5' }
== APP == Saving Order:  { orderId: '6' }
== APP == Getting Order:  { orderId: '6' }
== APP == Saving Order:  { orderId: '7' }
== APP == Getting Order:  { orderId: '7' }
== APP == Saving Order:  { orderId: '8' }
== APP == Getting Order:  { orderId: '8' }
== APP == Saving Order:  { orderId: '9' }
== APP == Getting Order:  { orderId: '9' }
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

### 第 1 步：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

在终端窗口中，从 Quickstarts 目录的根目录导航到 `order-processor` 目录。

```bash
cd state_management/go/sdk/order-processor
```

安装依赖项

```bash
go build .
```

### 第 2 步：运行应用程序

运行 `order-processor` 服务以及 Dapr sidecar。Dapr sidecar 随后会加载位于资源目录中的 resiliency 规范：

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

```bash
dapr run --app-id order-processor --resources-path ../../../resources -- go run .
```

应用程序启动后，`order-processor` 服务会向 [`statestore.yaml` 组件中定义的]({{% ref "statemanagement-quickstart#statestoreyaml-component-file" %}}) `statestore` Redis 实例写入和读取 `orderId` 键值对。

```bash
== APP == Saving Order:  { orderId: '1' }
== APP == Getting Order:  { orderId: '1' }
== APP == Saving Order:  { orderId: '2' }
== APP == Getting Order:  { orderId: '2' }
== APP == Saving Order:  { orderId: '3' }
== APP == Getting Order:  { orderId: '3' }
== APP == Saving Order:  { orderId: '4' }
== APP == Getting Order:  { orderId: '4' }
```

### 第 3 步：引入故障

通过停止在开发机器上执行 `dapr init` 时初始化的 Redis 容器实例来模拟故障。实例停止后，`order-processor` 服务的写入和读取操作将开始失败。

由于 `resiliency.yaml` 规范将 `statestore` 定义为 component 目标，因此所有失败的请求都将应用重试和断路器策略：

```yaml
  targets:
    components:
      statestore:
        outbound:
          retry: retryForever
          circuitBreaker: simpleCB
```

在新的终端窗口中，运行以下命令来停止 Redis：

```bash
docker stop dapr_redis
```

Redis 停止后，请求将开始失败，并应用名为 `retryForever` 的 retry policy。下面的输出显示了 `order-processor` 服务的日志：

```bash
INFO[0006] Error processing operation component[statestore] output. Retrying...
```

根据 `retryForever` 策略，对于每个失败的请求，将以 5 秒的间隔无限期地继续重试。 

```yaml
retryForever:
  policy: constant
  maxInterval: 5s
  maxRetries: -1 
```

一旦 5 次连续重试失败，断路器策略 `simpleCB` 就会被触发，断路器打开，停止所有请求：

```bash
INFO[0026] Circuit breaker "simpleCB-statestore" changed state from closed to open
```

```yaml
circuitBreakers:
  simpleCB:
  maxRequests: 1
  timeout: 5s 
  trip: consecutiveFailures >= 5
```

5 秒过后，断路器将切换到半开状态，允许一个请求通过，以验证故障是否已解决。如果请求继续失败，断路器将重新跳回打开状态。 

```bash
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0031] Circuit breaker "simpleCB-statestore" changed state from half-open to open 
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from open to half-open  
INFO[0036] Circuit breaker "simpleCB-statestore" changed state from half-open to closed  
```

只要 Redis 容器保持停止状态，这种半开/打开的行为就会持续下去。 

### 第 3 步：移除故障

当你在机器上重新启动 Redis 容器后，应用程序将无缝恢复，从中断的地方继续运行。

```bash
docker start dapr_redis
```

```bash
INFO[0036] Recovered processing operation component[statestore] output.  
== APP == Saving Order:  { orderId: '5' }
== APP == Getting Order:  { orderId: '5' }
== APP == Saving Order:  { orderId: '6' }
== APP == Getting Order:  { orderId: '6' }
== APP == Saving Order:  { orderId: '7' }
== APP == Getting Order:  { orderId: '7' }
== APP == Saving Order:  { orderId: '8' }
== APP == Getting Order:  { orderId: '8' }
== APP == Saving Order:  { orderId: '9' }
== APP == Getting Order:  { orderId: '9' }
```

{{% /tab %}}

{{< /tabpane >}}

## 使用 Dapr Dev Dashboard 构建你自己的 resiliency 策略

[Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 内置了 resiliency builder。无需手动编写 `resiliency.yaml` 文件，你可以使用界面中的向导来定义超时、重试和断路器，并将它们应用到你的应用、component 和 Actor。你可以尝试重新创建本 Quickstart 中的 `myresiliency` 策略，或者尝试不同的重试和断路器设置，然后重新运行故障场景。

## 告诉我们你的想法！
我们会持续改进 Quickstart 示例，并重视你的反馈。你觉得这个 Quickstart 有帮助吗？你对改进有什么建议？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的想法。

## 后续步骤

进一步了解 [resiliency 功能]({{% ref resiliency-overview %}})及其如何与 Dapr 的 building block API 协同工作。

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
