---
type: docs
title: "快速入门：机密管理"
linkTitle: "机密管理"
weight: 77
description: "开始使用 Dapr 的机密管理构建块"
---

Dapr 提供了一个专门的机密 API，允许开发者从机密存储中检索机密。在本快速入门中，你将：

1. 运行带有机密存储组件的微服务。
1. 在应用程序代码中使用 Dapr 机密 API 检索机密。

<img src="/images/secretsmanagement-quickstart/secrets-mgmt-quickstart.png" width=1000 alt="显示示例服务机密管理的图表。">


在继续快速入门之前，请选择你喜欢的语言特定的 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 前提条件

对于本示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.7+](https://www.python.org/downloads/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/secrets_management/python/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：检索机密

在终端窗口中，导航到 `order-processor` 目录。

```bash
cd secrets_management/python/sdk/order-processor
```

安装依赖项：

```bash
pip3 install -r requirements.txt
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ -- python3 app.py
```

> **注意**：由于 Windows 中未定义 Python3.exe，你可能需要使用 `python app.py` 而不是 `python3 app.py`。


#### 幕后工作

**`order-processor` 服务**

请注意下面的 `order-processor` 服务如何指向：

- 在 `local-secret-store.yaml` 组件中定义的 `DAPR_SECRET_STORE`。
- 在 `secrets.json` 中定义的机密。

```python
# app.py
DAPR_SECRET_STORE = 'localsecretstore'
SECRET_NAME = 'secret'
with DaprClient() as client:
    secret = client.get_secret(store_name=DAPR_SECRET_STORE, key=SECRET_NAME)
    logging.info('Fetched Secret: %s', secret.secret)
```

**`local-secret-store.yaml` 组件**

`DAPR_SECRET_STORE` 在 `local-secret-store.yaml` 组件文件中定义，位于 [secrets_management/components](https://github.com/dapr/quickstarts/tree/master/secrets_management/components/local-secret-store.yaml)：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
  namespace: default
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: secrets.json
  - name: nestedSeparator
    value: ":"
```

在 YAML 文件中：

- `metadata/name` 是你的应用程序引用组件的方式（在代码示例中称为 `DAPR_SECRET_STORE`）。
- `spec/metadata` 定义组件使用的机密的连接。

**`secrets.json` 文件**

`SECRET_NAME` 在 `secrets.json` 文件中定义，位于 [secrets_management/python/sdk/order-processor](https://github.com/dapr/quickstarts/tree/master/secrets_management/python/sdk/order-processor/secrets.json)：

```json
{
    "secret": "YourPasskeyHere"
}
```

### 步骤 3：查看 order-processor 输出

如上面的应用程序代码所指定，`order-processor` 服务通过 Dapr 机密存储检索机密并在控制台中显示它。

Order-processor 输出：

```
== APP == INFO:root:Fetched Secret: {'secret': 'YourPasskeyHere'}
```

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 前提条件

对于本示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](hhttps://github.com/dapr/quickstarts/tree/master/secrets_management/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：检索机密

在终端窗口中，导航到 `order-processor` 目录。

```bash
cd secrets_management/javascript/sdk/order-processor
```

安装依赖项：

```bash
npm install
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ -- npm start
```

#### 幕后工作

**`order-processor` 服务**

请注意下面的 `order-processor` 服务如何指向：

- 在 `local-secret-store.yaml` 组件中定义的 `DAPR_SECRET_STORE`。
- 在 `secrets.json` 中定义的机密。

```javascript
// index.js
const DAPR_SECRET_STORE = "localsecretstore";
const SECRET_NAME = "secret";

async function main() {
    // ...
    const secret = await client.secret.get(DAPR_SECRET_STORE, SECRET_NAME);
    console.log("Fetched Secret: " + JSON.stringify(secret));
}
```

**`local-secret-store.yaml` 组件**

`DAPR_SECRET_STORE` 在 `local-secret-store.yaml` 组件文件中定义，位于 [secrets_management/components](https://github.com/dapr/quickstarts/tree/master/secrets_management/components/local-secret-store.yaml)：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
  namespace: default
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: secrets.json
  - name: nestedSeparator
    value: ":"
```

在 YAML 文件中：

- `metadata/name` 是你的应用程序引用组件的方式（在代码示例中称为 `DAPR_SECRET_STORE`）。
- `spec/metadata` 定义组件使用的机密的连接。

**`secrets.json` 文件**

`SECRET_NAME` 在 `secrets.json` 文件中定义，位于 [secrets_management/javascript/sdk/order-processor](https://github.com/dapr/quickstarts/tree/master/secrets_management/javascript/sdk/order-processor/secrets.json)：

```json
{
    "secret": "YourPasskeyHere"
}
```

### 步骤 3：查看 order-processor 输出

如上面的应用程序代码所指定，`order-processor` 服务通过 Dapr 机密存储检索机密并在控制台中显示它。

Order-processor 输出：

```
== APP ==
== APP == > order-processor@1.0.0 start
== APP == > node index.js
== APP ==
== APP == Fetched Secret: {"secret":"YourPasskeyHere"}
```

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 前提条件

对于本示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 已安装 [.NET 6](https://dotnet.microsoft.com/download/dotnet/6.0)、[.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0) 或 [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)

**注意**：.NET 6 是本版本中 Dapr .NET SDK 包支持的最低 .NET 版本。在 Dapr v1.16 及更高版本中将仅支持 .NET 8 和 .NET 9。

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/secrets_management/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：检索机密

在终端窗口中，导航到 `order-processor` 目录。

```bash
cd secrets_management/csharp/sdk/order-processor
```

安装依赖项：

```bash
dotnet restore
dotnet build
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ -- dotnet run
```

#### 幕后工作

**`order-processor` 服务**

请注意下面的 `order-processor` 服务如何指向：

- 在 `local-secret-store.yaml` 组件中定义的 `DAPR_SECRET_STORE`。
- 在 `secrets.json` 中定义的机密。

```csharp
// Program.cs
const string DAPR_SECRET_STORE = "localsecretstore";
const string SECRET_NAME = "secret";
var client = new DaprClientBuilder().Build();

var secret = await client.GetSecretAsync(DAPR_SECRET_STORE, SECRET_NAME);
var secretValue = string.Join(", ", secret);
Console.WriteLine($"Fetched Secret: {secretValue}");
```

**`local-secret-store.yaml` 组件**

`DAPR_SECRET_STORE` 在 `local-secret-store.yaml` 组件文件中定义，位于 [secrets_management/components](https://github.com/dapr/quickstarts/tree/master/secrets_management/components/local-secret-store.yaml)：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
  namespace: default
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: secrets.json
  - name: nestedSeparator
    value: ":"
```

在 YAML 文件中：

- `metadata/name` 是你的应用程序引用组件的方式（在代码示例中称为 `DAPR_SECRET_NAME`）。
- `spec/metadata` 定义组件使用的机密的连接。

**`secrets.json` 文件**

`SECRET_NAME` 在 `secrets.json` 文件中定义，位于 [secrets_management/csharp/sdk/order-processor](https://github.com/dapr/quickstarts/tree/master/secrets_management/csharp/sdk/order-processor/secrets.json)：

```json
{
    "secret": "YourPasskeyHere"
}
```

### 步骤 3：查看 order-processor 输出

如上面的应用程序代码所指定，`order-processor` 服务通过 Dapr 机密存储检索机密并在控制台中显示它。

Order-processor 输出：

```
== APP == Fetched Secret: [secret, YourPasskeyHere]
```

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 前提条件

对于本示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/secrets_management/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：检索机密

在终端窗口中，导航到 `order-processor` 目录。

```bash
cd secrets_management/java/sdk/order-processor
```

安装依赖项：

```bash
mvn clean install
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ -- java -jar target/OrderProcessingService-0.0.1-SNAPSHOT.jar
```

#### 幕后工作

**`order-processor` 服务**

请注意下面的 `order-processor` 服务如何指向：

- 在 `local-secret-store.yaml` 组件中定义的 `DAPR_SECRET_STORE`。
- 在 `secrets.json` 中定义的机密。

```java
// OrderProcessingServiceApplication.java
private static final String SECRET_STORE_NAME = "localsecretstore";
// ...
    Map<String, String> secret = client.getSecret(SECRET_STORE_NAME, "secret").block();
    System.out.println("Fetched Secret: " + secret);
```

**`local-secret-store.yaml` 组件**

`DAPR_SECRET_STORE` 在 `local-secret-store.yaml` 组件文件中定义，位于 [secrets_management/components](https://github.com/dapr/quickstarts/tree/master/secrets_management/components/local-secret-store.yaml)：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
  namespace: default
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: secrets.json
  - name: nestedSeparator
    value: ":"
```

在 YAML 文件中：

- `metadata/name` 是你的应用程序引用组件的方式（在代码示例中称为 `DAPR_SECRET_NAME`）。
- `spec/metadata` 定义组件使用的机密的连接。

**`secrets.json` 文件**

`SECRET_NAME` 在 `secrets.json` 文件中定义，位于 [secrets_management/java/sdk/order-processor](https://github.com/dapr/quickstarts/tree/master/secrets_management/java/sdk/order-processor/secrets.json)：

```json
{
    "secret": "YourPasskeyHere"
}
```

### 步骤 3：查看 order-processor 输出

如上面的应用程序代码所指定，`order-processor` 服务通过 Dapr 机密存储检索机密并在控制台中显示它。

Order-processor 输出：

```
== APP == Fetched Secret: {secret=YourPasskeyHere}
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 前提条件

对于本示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/secrets_management/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：检索机密

在终端窗口中，导航到 `order-processor` 目录。

```bash
cd secrets_management/go/sdk/order-processor
```

安装依赖项：

```bash
go build .
```

运行 `order-processor` 服务以及 Dapr 边车。

```bash
dapr run --app-id order-processor --resources-path ../../../components/ -- go run .
```

#### 幕后工作

**`order-processor` 服务**

请注意下面的 `order-processor` 服务如何指向：

- 在 `local-secret-store.yaml` 组件中定义的 `DAPR_SECRET_STORE`。
- 在 `secrets.json` 中定义的机密。

```go
const DAPR_SECRET_STORE = "localsecretstore"
const SECRET_NAME = "secret"
// ...
secret, err := client.GetSecret(ctx, DAPR_SECRET_STORE, SECRET_NAME, nil)
if secret != nil {
    fmt.Println("Fetched Secret: ", secret[SECRET_NAME])
}
```

**`local-secret-store.yaml` 组件**

`DAPR_SECRET_STORE` 在 `local-secret-store.yaml` 组件文件中定义，位于 [secrets_management/components](https://github.com/dapr/quickstarts/tree/master/secrets_management/components/local-secret-store.yaml)：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
  namespace: default
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: secrets.json
  - name: nestedSeparator
    value: ":"
```

在 YAML 文件中：

- `metadata/name` 是你的应用程序引用组件的方式（在代码示例中称为 `DAPR_SECRET_NAME`）。
- `spec/metadata` 定义组件使用的机密的连接。

**`secrets.json` 文件**

`SECRET_NAME` 在 `secrets.json` 文件中定义，位于 [secrets_management/go/sdk/order-processor](https://github.com/dapr/quickstarts/tree/master/secrets_management/go/sdk/order-processor/secrets.json)：

```json
{
    "secret": "YourPasskeyHere"
}
```

### 步骤 3：查看 order-processor 输出

如上面的应用程序代码所指定，`order-processor` 服务通过 Dapr 机密存储检索机密并在控制台中显示它。

Order-processor 输出：

```
== APP == Fetched Secret:  YourPasskeyHere
```

{{% /tab %}}

{{< /tabpane >}}

## 告诉我们你的想法！

我们正在不断努力改进我们的快速入门示例，并重视你的反馈。你觉得这个快速入门有帮助吗？你有改进建议吗？

加入我们的 [discord 频道](https://discord.com/channels/778680217417809931/953427615916638238) 进行讨论。

## 后续步骤

- 使用 HTTP 而不是 SDK 来使用 Dapr 机密管理。
  - [Python](https://github.com/dapr/quickstarts/tree/master/secrets_management/python/http)
  - [JavaScript](https://github.com/dapr/quickstarts/tree/master/secrets_management/javascript/http)
  - [.NET](https://github.com/dapr/quickstarts/tree/master/secrets_management/csharp/http)
  - [Java](https://github.com/dapr/quickstarts/tree/master/secrets_management/java/http)
  - [Go](https://github.com/dapr/quickstarts/tree/master/secrets_management/go/http)
- 了解有关[机密管理构建块]({{% ref secrets-overview %}}) 的更多信息

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
