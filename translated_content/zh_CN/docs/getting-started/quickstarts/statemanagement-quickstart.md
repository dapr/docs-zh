---
type: docs
title: "Quickstart：State Management"
linkTitle: "State Management"
weight: 74
description: "开始使用 Dapr State Management building block"
---

让我们来看看 Dapr 的[State Management building block]({{% ref state-management %}})。在本 Quickstart 中，你将使用 Redis state store 来保存、获取和删除状态，方式可以是以下任一种：
- [使用 Multi-App Run 模板文件同时运行所有应用]({{% ref "#使用-multi-app-run-运行" %}})，或
- [一次运行一个应用]({{% ref "#一次运行一个应用" %}})

<img src="/images/state-management-quickstart.png" width=1000 style="padding-bottom:15px;">

虽然此示例使用 Redis，但你可以将其替换为任何[支持的 state store]({{% ref supported-state-stores.md %}})。

## 使用 Multi-App Run 运行

在继续本 Quickstart 之前，请选择你偏好的特定语言 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/python/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `python/sdk` 目录。`dapr.yaml` 文件位于此目录中。

```bash
cd state_management/python/sdk
```

安装依赖项：

```bash
uv sync
```

使用 [Multi-App Run]({{% ref multi-app-dapr-run %}}) 运行 `order-processor` 服务及其 Dapr sidecar。

```bash
uv run dapr run -f .
```

`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```python
with DaprClient() as client:

    # 将状态保存到 state store 中
    client.save_state(DAPR_STORE_NAME, orderId, str(order))
    logging.info('Saving Order: %s', order)

    # 从 state store 中获取状态
    result = client.get_state(DAPR_STORE_NAME, orderId)
    logging.info('Result after get: ' + str(result.data))

    # 从 state store 中删除状态
    client.delete_state(store_name=DAPR_STORE_NAME, key=orderId)
    logging.info('Deleting Order: %s', order)
```

### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == INFO:root:Saving Order: {'orderId': '1'}
== APP == INFO:root:Result after get: b"{'orderId': '1'}"
== APP == INFO:root:Deleting Order: {'orderId': '1'}
== APP == INFO:root:Saving Order: {'orderId': '2'}
== APP == INFO:root:Result after get: b"{'orderId': '2'}"
== APP == INFO:root:Deleting Order: {'orderId': '2'}
== APP == INFO:root:Saving Order: {'orderId': '3'}
== APP == INFO:root:Result after get: b"{'orderId': '3'}"
== APP == INFO:root:Deleting Order: {'orderId': '3'}
== APP == INFO:root:Saving Order: {'orderId': '4'}
== APP == INFO:root:Result after get: b"{'orderId': '4'}"
== APP == INFO:root:Deleting Order: {'orderId': '4'}
```

##### `dapr.yaml` Multi-App Run 模板文件

运行 `dapr init` 时，Dapr 会创建一个名为 `dapr.yaml` 的默认[Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}})。运行 `dapr run -f` 会启动项目中的所有应用。在此示例中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../resources/
apps:
  - appID: order-processor
    appDirPath: ./order-processor/
    command: ["uv", "run", "python", "app.py"]
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 还会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/javascript/sdk/order-processor
```

安装依赖项：

```bash
npm install
```

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run -f .
```

`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```js
const client = new DaprClient()

// 将状态保存到 state store 中
await client.state.save(DAPR_STATE_STORE_NAME, order)
console.log("Saving Order: ", order)

// 从 state store 中获取状态
const savedOrder = await client.state.get(DAPR_STATE_STORE_NAME, order.orderId)
console.log("Getting Order: ", savedOrder)

// 从 state store 中删除状态
await client.state.delete(DAPR_STATE_STORE_NAME, order.orderId)
console.log("Deleting Order: ", order)
```
### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == > order-processor@1.0.0 start
== APP == > node index.js
== APP == Saving Order:  { orderId: 1 }
== APP == Saving Order:  { orderId: 2 }
== APP == Saving Order:  { orderId: 3 }
== APP == Saving Order:  { orderId: 4 }
== APP == Saving Order:  { orderId: 5 }
== APP == Getting Order:  { orderId: 1 }
== APP == Deleting Order:  { orderId: 1 }
== APP == Getting Order:  { orderId: 2 }
== APP == Deleting Order:  { orderId: 2 }
== APP == Getting Order:  { orderId: 3 }
== APP == Deleting Order:  { orderId: 3 }
== APP == Getting Order:  { orderId: 4 }
== APP == Deleting Order:  { orderId: 4 }
== APP == Getting Order:  { orderId: 5 }
== APP == Deleting Order:  { orderId: 5 }
```

##### `dapr.yaml` Multi-App Run 模板文件

运行 `dapr init` 时，Dapr 会创建一个名为 `dapr.yaml` 的默认 Multi-App Run 模板文件。运行 `dapr run -f` 会启动项目中的所有应用。在此示例中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../resources/
apps:
  - appID: order-processor
    appDirPath: ./order-processor/
    command: ["npm", "run", "start"]
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

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

**注意：** 在本版本中，.NET 6 是 Dapr .NET SDK 软件包最低支持的 .NET 版本。在 Dapr v1.16 及更高版本中，将仅支持 .NET 8 和 .NET 9。

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/csharp/sdk/order-processor
```

安装依赖项：

```bash
dotnet restore
dotnet build
```

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run -f .
```

`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```cs
var client = new DaprClientBuilder().Build();

// 将状态保存到 state store 中
await client.SaveStateAsync(DAPR_STORE_NAME, orderId.ToString(), order.ToString());
Console.WriteLine("Saving Order: " + order);

// 从 state store 中获取状态
var result = await client.GetStateAsync<string>(DAPR_STORE_NAME, orderId.ToString());
Console.WriteLine("Getting Order: " + result);

// 从 state store 中删除状态
await client.DeleteStateAsync(DAPR_STORE_NAME, orderId.ToString());
Console.WriteLine("Deleting Order: " + order);
```
### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == Saving Order: Order { orderId = 1 }
== APP == Getting Order: Order { orderId = 1 }
== APP == Deleting Order: Order { orderId = 1 }
== APP == Saving Order: Order { orderId = 2 }
== APP == Getting Order: Order { orderId = 2 }
== APP == Deleting Order: Order { orderId = 2 }
== APP == Saving Order: Order { orderId = 3 }
== APP == Getting Order: Order { orderId = 3 }
== APP == Deleting Order: Order { orderId = 3 }
== APP == Saving Order: Order { orderId = 4 }
== APP == Getting Order: Order { orderId = 4 }
== APP == Deleting Order: Order { orderId = 4 }
== APP == Saving Order: Order { orderId = 5 }
== APP == Getting Order: Order { orderId = 5 }
== APP == Deleting Order: Order { orderId = 5 }
```

##### `dapr.yaml` Multi-App Run 模板文件

运行 `dapr init` 时，Dapr 会创建一个名为 `dapr.yaml` 的默认 Multi-App Run 模板文件。运行 `dapr run -f` 会启动项目中的所有应用。在此示例中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../../resources/
apps:
  - appID: order-processor
    appDirPath: ./order-processor/
    command: ["dotnet", "run"]
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

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

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/java/sdk/order-processor
```

安装依赖项：

```bash
mvn clean install
```

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run -f .
```

`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```java
try (DaprClient client = new DaprClientBuilder().build()) {
  for (int i = 1; i <= 10; i++) {
    int orderId = i;
    Order order = new Order();
    order.setOrderId(orderId);

    // 将状态保存到 state store 中
    client.saveState(DAPR_STATE_STORE, String.valueOf(orderId), order).block();
    LOGGER.info("Saving Order: " + order.getOrderId());

    // 从 state store 中获取状态
    State<Order> response = client.getState(DAPR_STATE_STORE, String.valueOf(orderId), Order.class).block();
    LOGGER.info("Getting Order: " + response.getValue().getOrderId());

    // 从 state store 中删除状态
    client.deleteState(DAPR_STATE_STORE, String.valueOf(orderId)).block();
    LOGGER.info("Deleting Order: " + orderId);
    TimeUnit.MILLISECONDS.sleep(1000);
  }
```
### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == INFO:root:Saving Order: {'orderId': '1'}
== APP == INFO:root:Result after get: b"{'orderId': '1'}"
== APP == INFO:root:Deleting Order: {'orderId': '1'}
== APP == INFO:root:Saving Order: {'orderId': '2'}
== APP == INFO:root:Result after get: b"{'orderId': '2'}"
== APP == INFO:root:Deleting Order: {'orderId': '2'}
== APP == INFO:root:Saving Order: {'orderId': '3'}
== APP == INFO:root:Result after get: b"{'orderId': '3'}"
== APP == INFO:root:Deleting Order: {'orderId': '3'}
== APP == INFO:root:Saving Order: {'orderId': '4'}
== APP == INFO:root:Result after get: b"{'orderId': '4'}"
== APP == INFO:root:Deleting Order: {'orderId': '4'}
```

##### `dapr.yaml` Multi-App Run 模板文件

运行 `dapr init` 时，Dapr 会创建一个名为 `dapr.yaml` 的默认 Multi-App Run 模板文件。运行 `dapr run -f` 会启动项目中的所有应用。在此示例中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../resources/
apps:
  - appID: order-processor
    appDirPath: ./order-processor/
    command: ["java", "-jar", "target/OrderProcessingService-0.0.1-SNAPSHOT.jar"]
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

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

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/go/sdk/order-processor
```

安装依赖项：

```bash
go build .
```

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run -f .
```

`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```go
  client, err := dapr.NewClient()

  // 将状态保存到 state store 中
  _ = client.SaveState(ctx, STATE_STORE_NAME, strconv.Itoa(orderId), []byte(order))
  log.Print("Saving Order: " + string(order))

  // 从 state store 中获取状态
  result, _ := client.GetState(ctx, STATE_STORE_NAME, strconv.Itoa(orderId))
  fmt.Println("Getting Order: " + string(result.Value))

  // 从 state store 中删除状态
  _ = client.DeleteState(ctx, STATE_STORE_NAME, strconv.Itoa(orderId))
  log.Print("Deleting Order: " + string(order))
```

### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == dapr client initializing for: 127.0.0.1:53689
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":1}
== APP == Getting Order: {"orderId":1}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":1}
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":2}
== APP == Getting Order: {"orderId":2}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":2}
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":3}
== APP == Getting Order: {"orderId":3}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":3}
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":4}
== APP == Getting Order: {"orderId":4}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":4}
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":5}
== APP == Getting Order: {"orderId":5}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":5}
```

##### `dapr.yaml` Multi-App Run 模板文件

运行 `dapr init` 时，Dapr 会创建一个名为 `dapr.yaml` 的默认 Multi-App Run 模板文件。运行 `dapr run -f` 会启动项目中的所有应用。在此示例中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
common:
  resourcesPath: ../../resources/
apps:
  - appID: order-processor
    appDirPath: ./order-processor/
    command: ["go", "run", "."]
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

{{% /tab %}}

{{< /tabpane >}}

## 一次运行一个应用

在继续本 Quickstart 之前，请选择你偏好的特定语言 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例使用的 Python 包管理器。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/python/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/python/sdk/order-processor
```

安装依赖项：

```bash
uv sync
```

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run --app-id order-processor --resources-path ../../../resources/ -- uv run python app.py
```


`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```python
with DaprClient() as client:

    # 将状态保存到 state store 中
    client.save_state(DAPR_STORE_NAME, orderId, str(order))
    logging.info('Saving Order: %s', order)

    # 从 state store 中获取状态
    result = client.get_state(DAPR_STORE_NAME, orderId)
    logging.info('Result after get: ' + str(result.data))

    # 从 state store 中删除状态
    client.delete_state(store_name=DAPR_STORE_NAME, key=orderId)
    logging.info('Deleting Order: %s', order)
```

### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == INFO:root:Saving Order: {'orderId': '1'}
== APP == INFO:root:Result after get: b"{'orderId': '1'}"
== APP == INFO:root:Deleting Order: {'orderId': '1'}
== APP == INFO:root:Saving Order: {'orderId': '2'}
== APP == INFO:root:Result after get: b"{'orderId': '2'}"
== APP == INFO:root:Deleting Order: {'orderId': '2'}
== APP == INFO:root:Saving Order: {'orderId': '3'}
== APP == INFO:root:Result after get: b"{'orderId': '3'}"
== APP == INFO:root:Deleting Order: {'orderId': '3'}
== APP == INFO:root:Saving Order: {'orderId': '4'}
== APP == INFO:root:Result after get: b"{'orderId': '4'}"
== APP == INFO:root:Deleting Order: {'orderId': '4'}
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

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

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/javascript/sdk/order-processor
```

安装依赖项，其中包括 JavaScript SDK 中的 `@dapr/dapr` 包：

```bash
npm install
```

确认服务目录中包含以下文件：

- `package.json`
- `package-lock.json`

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run --app-id order-processor --resources-path ../../../resources/ -- npm run start
```
`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```js
const client = new DaprClient()

// 将状态保存到 state store 中
await client.state.save(DAPR_STATE_STORE_NAME, order)
console.log("Saving Order: ", order)

// 从 state store 中获取状态
const savedOrder = await client.state.get(DAPR_STATE_STORE_NAME, order.orderId)
console.log("Getting Order: ", savedOrder)

// 从 state store 中删除状态
await client.state.delete(DAPR_STATE_STORE_NAME, order.orderId)
console.log("Deleting Order: ", order)
```
### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == > order-processor@1.0.0 start
== APP == > node index.js
== APP == Saving Order:  { orderId: 1 }
== APP == Saving Order:  { orderId: 2 }
== APP == Saving Order:  { orderId: 3 }
== APP == Saving Order:  { orderId: 4 }
== APP == Saving Order:  { orderId: 5 }
== APP == Getting Order:  { orderId: 1 }
== APP == Deleting Order:  { orderId: 1 }
== APP == Getting Order:  { orderId: 2 }
== APP == Deleting Order:  { orderId: 2 }
== APP == Getting Order:  { orderId: 3 }
== APP == Deleting Order:  { orderId: 3 }
== APP == Getting Order:  { orderId: 4 }
== APP == Deleting Order:  { orderId: 4 }
== APP == Getting Order:  { orderId: 5 }
== APP == Deleting Order:  { orderId: 5 }
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- 已安装 [.NET SDK 或 .NET 6 SDK](https://dotnet.microsoft.com/download)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/csharp/sdk/order-processor
```

还原 NuGet 包：

```bash
dotnet restore
dotnet build
```

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run --app-id order-processor --resources-path ../../../resources/ -- dotnet run
```

`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```cs
var client = new DaprClientBuilder().Build();

// 将状态保存到 state store 中
await client.SaveStateAsync(DAPR_STORE_NAME, orderId.ToString(), order.ToString());
Console.WriteLine("Saving Order: " + order);

// 从 state store 中获取状态
var result = await client.GetStateAsync<string>(DAPR_STORE_NAME, orderId.ToString());
Console.WriteLine("Getting Order: " + result);

// 从 state store 中删除状态
await client.DeleteStateAsync(DAPR_STORE_NAME, orderId.ToString());
Console.WriteLine("Deleting Order: " + order);
```
### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == Saving Order: Order { orderId = 1 }
== APP == Getting Order: Order { orderId = 1 }
== APP == Deleting Order: Order { orderId = 1 }
== APP == Saving Order: Order { orderId = 2 }
== APP == Getting Order: Order { orderId = 2 }
== APP == Deleting Order: Order { orderId = 2 }
== APP == Saving Order: Order { orderId = 3 }
== APP == Getting Order: Order { orderId = 3 }
== APP == Deleting Order: Order { orderId = 3 }
== APP == Saving Order: Order { orderId = 4 }
== APP == Getting Order: Order { orderId = 4 }
== APP == Deleting Order: Order { orderId = 4 }
== APP == Saving Order: Order { orderId = 5 }
== APP == Getting Order: Order { orderId = 5 }
== APP == Deleting Order: Order { orderId = 5 }
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

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

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/java/sdk/order-processor
```

安装依赖项：

```bash
mvn clean install
```

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run --app-id order-processor --resources-path ../../../resources -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```java
try (DaprClient client = new DaprClientBuilder().build()) {
  for (int i = 1; i <= 10; i++) {
    int orderId = i;
    Order order = new Order();
    order.setOrderId(orderId);

    // 将状态保存到 state store 中
    client.saveState(DAPR_STATE_STORE, String.valueOf(orderId), order).block();
    LOGGER.info("Saving Order: " + order.getOrderId());

    // 从 state store 中获取状态
    State<Order> response = client.getState(DAPR_STATE_STORE, String.valueOf(orderId), Order.class).block();
    LOGGER.info("Getting Order: " + response.getValue().getOrderId());

    // 从 state store 中删除状态
    client.deleteState(DAPR_STATE_STORE, String.valueOf(orderId)).block();
    LOGGER.info("Deleting Order: " + orderId);
    TimeUnit.MILLISECONDS.sleep(1000);
  }
```
### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == INFO:root:Saving Order: {'orderId': '1'}
== APP == INFO:root:Result after get: b"{'orderId': '1'}"
== APP == INFO:root:Deleting Order: {'orderId': '1'}
== APP == INFO:root:Saving Order: {'orderId': '2'}
== APP == INFO:root:Result after get: b"{'orderId': '2'}"
== APP == INFO:root:Deleting Order: {'orderId': '2'}
== APP == INFO:root:Saving Order: {'orderId': '3'}
== APP == INFO:root:Result after get: b"{'orderId': '3'}"
== APP == INFO:root:Deleting Order: {'orderId': '3'}
== APP == INFO:root:Saving Order: {'orderId': '4'}
== APP == INFO:root:Result after get: b"{'orderId': '4'}"
== APP == INFO:root:Deleting Order: {'orderId': '4'}
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

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

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/state_management/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：操作服务状态

在终端窗口中，进入 `order-processor` 目录。

```bash
cd state_management/go/sdk/order-processor
```

安装依赖项并构建应用：

```bash
go build .
```

使用 Dapr sidecar 运行 `order-processor` 服务。

```bash
dapr run --app-id order-processor --resources-path ../../../resources -- go run .
```

`order-processor` 服务会向[在 `statestore.yaml` component 中定义的]({{% ref "#statestoreyaml-component-文件" %}}) `statestore` 实例写入、读取并删除一个 `orderId` 键值对。服务一启动就会执行一个循环。

```go
  client, err := dapr.NewClient()

  // 将状态保存到 state store 中
  _ = client.SaveState(ctx, STATE_STORE_NAME, strconv.Itoa(orderId), []byte(order))
  log.Print("Saving Order: " + string(order))

  // 从 state store 中获取状态
  result, _ := client.GetState(ctx, STATE_STORE_NAME, strconv.Itoa(orderId))
  fmt.Println("Getting Order: " + string(result.Value))

  // 从 state store 中删除状态
  _ = client.DeleteState(ctx, STATE_STORE_NAME, strconv.Itoa(orderId))
  log.Print("Deleting Order: " + string(order))
```

### 步骤 3：查看 order-processor 输出

注意，如上面的代码所示，代码将应用状态保存到 Dapr state store 中，读取后再将其删除。

Order-processor 输出：
```
== APP == dapr client initializing for: 127.0.0.1:53689
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":1}
== APP == Getting Order: {"orderId":1}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":1}
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":2}
== APP == Getting Order: {"orderId":2}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":2}
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":3}
== APP == Getting Order: {"orderId":3}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":3}
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":4}
== APP == Getting Order: {"orderId":4}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":4}
== APP == 2022/04/01 09:16:03 Saving Order: {"orderId":5}
== APP == Getting Order: {"orderId":5}
== APP == 2022/04/01 09:16:03 Deleting Order: {"orderId":5}
```

##### `statestore.yaml` component 文件

运行 `dapr init` 时，Dapr 会创建一个默认的 Redis `statestore.yaml`，并在本机上运行一个 Redis 容器，其位置为：

- 在 Windows 上，位于 `%UserProfile%\.dapr\components\statestore.yaml`
- 在 Linux/macOS 上，位于 `~/.dapr/components/statestore.yaml`

借助 `statestore.yaml` component，你无需修改代码即可轻松替换[state store](/reference/components-reference/supported-state-stores/)。

本 Quickstart 随附的 Redis `statestore.yaml` 文件内容如下：

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
  - name: actorStateStore
    value: "true"
```

在该 YAML 文件中：

- `metadata/name` 是你的应用与该 component 通信时使用的名称（在代码示例中称为 `DAPR_STORE_NAME`）。
- `spec/metadata` 定义了该 component 所使用的 Redis 实例的连接信息。

{{% /tab %}}

{{< /tabpane >}}

## 使用 Dapr Dev Dashboard 检查 state store

在 Quickstart 运行期间，你可以使用 [Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 查看 `order-processor` 应用及其 `statestore` component。你可以浏览该应用保存在 state store 中的订单记录、解码其值，并添加或删除记录，以观察应用的行为。

## 告诉我们你的想法！
我们一直在努力改进 Quickstart 示例，并重视你的反馈。你觉得本 Quickstart 有帮助吗？你对改进有什么建议吗？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的想法。

## 后续步骤

- 使用 HTTP 而非 SDK 来使用 Dapr State Management。
  - [Python](https://github.com/dapr/quickstarts/tree/master/state_management/python/http)
  - [JavaScript](https://github.com/dapr/quickstarts/tree/master/state_management/javascript/http)
  - [.NET](https://github.com/dapr/quickstarts/tree/master/state_management/csharp/http)
  - [Java](https://github.com/dapr/quickstarts/tree/master/state_management/java/http)
  - [Go](https://github.com/dapr/quickstarts/tree/master/state_management/go/http)
- 进一步了解[State Management building block]({{% ref state-management %}})

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
