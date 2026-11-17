---
type: docs
title: "Quickstart：输入与输出 binding"
linkTitle: "binding"
weight: 75
description: "开始使用 Dapr 的 binding building block"
---

让我们来看看 Dapr 的[binding building block]({{% ref bindings %}})。借助 binding，你可以：

- 由外部系统传入的事件触发你的应用程序。
- 与外部系统进行交互。

在本 Quickstart 中，你将使用输入 [Cron]({{% ref cron %}}) binding，安排一个每 10 秒运行一次的批处理脚本。该脚本处理一个 JSON 文件，并通过 [PostgreSQL]({{% ref postgresql %}}) Dapr binding 将数据输出到 SQL 数据库中。 

<img src="/images/bindings-quickstart/bindings-quickstart.png" width=800 style="padding-bottom:15px;">

在继续 Quickstart 之前，请先选择你偏好的特定语言 Dapr SDK。

{{< tabpane text=true >}}
 <!-- Python -->
{{% tab "Python" %}}

### 前置条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装 Python 3.11 或更高版本](https://www.python.org/downloads/)。
- [uv](https://docs.astral.sh/uv/getting-started/installation/)，即本示例所用的 Python 包管理器。
<!-- IGNORE_LINKS --> 
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/bindings/python/sdk)。

```bash
git clone --depth 1 https://github.com/dapr/quickstarts.git
```

### 步骤 2：在本地 Docker 容器中运行 PostgreSQL

在你的计算机上，以本地 Docker 容器的方式运行 [PostgreSQL 实例](https://www.postgresql.org/)。Quickstart 示例中包含一个 Docker Compose 文件，可用于在本地自定义、构建、运行并初始化带有默认 `orders` 表的 `postgres` 容器。

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令来设置容器：

```bash
docker compose up
```

验证容器是否正在本地运行。

```bash
docker ps
```

输出应包含：

```bash
CONTAINER ID   IMAGE      COMMAND                  CREATED         STATUS         PORTS                    NAMES
55305d1d378b   postgres   "docker-entrypoint.s…"   3 seconds ago   Up 2 seconds   0.0.0.0:5432->5432/tcp   postgres
```

### 步骤 3：安排 Cron job 并写入数据库

在新的终端窗口中，进入 SDK 目录。

```bash
cd bindings/python/sdk/batch
```

安装依赖：

```bash
uv sync
```

使用 Dapr sidecar 运行 `batch-sdk` 服务。

```bash
dapr run --app-id batch-sdk --app-port 50051 --resources-path ../../../components -- uv run python app.py
```


`process_batch` 函数中的代码每 10 秒执行一次（在 `components` 目录中的 [`binding-cron.yaml`]({{% ref "#componentsbinding-cronyaml-component-文件" %}}) 中定义）。binding 触发器会在你的应用程序中查找由 Dapr sidecar 通过 HTTP POST 调用的路由。

```python
# 由 Dapr input binding 触发
@app.route('/' + cron_binding_name, methods=['POST'])
def process_batch():
```

`batch-sdk` 服务使用 [`binding-postgresql.yaml`]({{% ref "#componentbinding-postgresyaml-component-file" %}}) component 中定义的 PostgreSQL output binding，将 `OrderId`、`Customer` 和 `Price` 记录插入 `orders` 表中。 

```python
with DaprClient() as d:
    sqlCmd = ('insert into orders (orderid, customer, price) values ' +
              '(%s, \'%s\', %s)' % (order_line['orderid'],
                                    order_line['customer'],
                                    order_line['price']))
    payload = {'sql': sqlCmd}

    print(sqlCmd, flush=True)

    try:
        # 通过 HTTP Post 使用 Dapr output binding 插入订单
        resp = d.invoke_binding(binding_name=sql_binding, operation='exec',
                                binding_metadata=payload, data='')
        return resp
    except Exception as e:
        print(e, flush=True)
        raise SystemExit(e)
```

### 步骤 4：查看 job 的输出

注意，如上所述，代码会将 `OrderId`、`Customer` 和 `Price` 作为负载调用 output binding。

你的 output binding 中 `print` 语句的输出如下：

```
== APP == Processing batch..
== APP == insert into orders (orderid, customer, price) values (1, 'John Smith', 100.32)
== APP == insert into orders (orderid, customer, price) values (2, 'Jane Bond', 15.4)
== APP == insert into orders (orderid, customer, price) values (3, 'Tony James', 35.56)
== APP == Finished processing batch
```

在新的终端中，验证相同的数据已插入数据库。进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令启动交互式 *psql* CLI：

```bash
docker exec -i -t postgres psql --username postgres  -p 5432 -h localhost --no-password
```

在 `admin=#` 提示符下，切换到 `orders` 表：

```bash
\c orders;
```

在 `orders=#` 提示符下，查询所有行：

```bash
select * from orders;
```

输出应如下所示：

```
 orderid |  customer  | price
---------+------------+--------
       1 | John Smith | 100.32
       2 | Jane Bond  |   15.4
       3 | Tony James |  35.56
```

#### `components\binding-cron.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 Cron [binding building block]({{% ref bindings %}})
- 每 10 秒调用一次 binding 端点（`batch`）

本 Quickstart 包含的 Cron `binding-cron.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron
  namespace: quickstarts
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 10s" # 有效的 cron 调度表达式
  - name: direction
    value: "input" # Cron binding 的方向
```

**注意：** `binding-cron.yaml` 的 `metadata` 部分包含一个 [Cron 表达式]({{% ref cron %}})，用于指定 binding 的调用频率。

#### `component\binding-postgresql.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 PostgreSQL [binding building block]({{% ref postgresql %}})
- 使用 `binding-postgresql.yaml` 文件中指定的设置连接到 PostgreSQL

借助 `binding-postgresql.yaml` component，你无需修改代码即可轻松替换后端数据库[binding]({{% ref supported-bindings %}})。

本 Quickstart 包含的 PostgreSQL `binding-postgresql.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqldb
  namespace: quickstarts
spec:
  type: bindings.postgresql
  version: v1
  metadata:
  - name: url # 必填
    value: "user=postgres password=docker host=localhost port=5432 dbname=orders pool_min_conns=1 pool_max_conns=10"
  - name: direction
    value: "output" # PostgreSQL binding 的方向
```

在 YAML 文件中：

- `spec/type` 指定此 binding 使用 PostgreSQL。
- `spec/metadata` 定义 component 所使用的 PostgreSQL 实例的连接信息。

{{% /tab %}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

### 前置条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [已安装最新版本的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/bindings/javascript/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：在本地 Docker 容器中运行 PostgreSQL

在你的计算机上，以本地 Docker 容器的方式运行 [PostgreSQL 实例](https://www.postgresql.org/)。Quickstart 示例中包含一个 Docker Compose 文件，可用于在本地自定义、构建、运行并初始化带有默认 `orders` 表的 `postgres` 容器。

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令来设置容器：

```bash
docker compose up
```

验证容器是否正在本地运行。

```bash
docker ps
```

输出应包含：

```bash
CONTAINER ID   IMAGE      COMMAND                  CREATED         STATUS         PORTS                    NAMES
55305d1d378b   postgres   "docker-entrypoint.s…"   3 seconds ago   Up 2 seconds   0.0.0.0:5432->5432/tcp   postgres
```

### 步骤 3：安排 Cron job 并写入数据库

在新的终端窗口中，进入 SDK 目录。

```bash
cd bindings/javascript/sdk/batch
```

安装依赖：

```bash
npm install
```

使用 Dapr sidecar 运行 `batch-sdk` 服务。

```bash
dapr run --app-id batch-sdk --app-port 5002 --dapr-http-port 3500 --resources-path ../../../components -- node index.js 
```

`process_batch` 函数中的代码每 10 秒执行一次（在 `components` 目录中的 [`binding-cron.yaml`]({{% ref "#componentsbinding-cronyaml-component-文件" %}}) 中定义）。binding 触发器会在你的应用程序中查找由 Dapr sidecar 通过 HTTP POST 调用的路由。

```javascript
async function start() {
    await server.binding.receive(cronBindingName,processBatch);
    await server.start();
}
```

`batch-sdk` 服务使用 [`binding-postgresql.yaml`]({{% ref "##componentsbinding-postgresyaml-component-file" %}}) component 中定义的 PostgreSQL output binding，将 `OrderId`、`Customer` 和 `Price` 记录插入 `orders` 表中。 

```javascript
async function processBatch(){
    const loc = '../../orders.json';
    fs.readFile(loc, 'utf8', (err, data) => {
        const orders = JSON.parse(data).orders;
        orders.forEach(order => {
            let sqlCmd = `insert into orders (orderid, customer, price) values (${order.orderid}, '${order.customer}', ${order.price});`;
            let payload = `{  "sql": "${sqlCmd}" } `;
            console.log(payload);
            client.binding.send(postgresBindingName, "exec", "", JSON.parse(payload));
        });
        console.log('Finished processing batch');
      });
    return 0;
}
```

### 步骤 4：查看 job 的输出

注意，如上所述，代码会将 `OrderId`、`Customer` 和 `Price` 作为负载调用 output binding。

你的 output binding 中 `print` 语句的输出如下：

```
== APP == Processing batch..
== APP == insert into orders (orderid, customer, price) values(1, 'John Smith', 100.32)
== APP == insert into orders (orderid, customer, price) values(2, 'Jane Bond', 15.4)
== APP == insert into orders (orderid, customer, price) values(3, 'Tony James', 35.56)
```

在新的终端中，验证相同的数据已插入数据库。进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令启动交互式 Postgres CLI：

```bash
docker exec -i -t postgres psql --username postgres  -p 5432 -h localhost --no-password
```

在 `admin=#` 提示符下，切换到 `orders` 表：

```bash
\c orders;
```

在 `orders=#` 提示符下，查询所有行：

```bash
select * from orders;
```

输出应如下所示：

```
 orderid |  customer  | price
---------+------------+--------
       1 | John Smith | 100.32
       2 | Jane Bond  |   15.4
       3 | Tony James |  35.56
```

#### `components\binding-cron.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 Cron [binding building block]({{% ref bindings %}})
- 每 10 秒调用一次 binding 端点（`batch`）

本 Quickstart 包含的 Cron `binding-cron.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron
  namespace: quickstarts
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 10s" # 有效的 cron 调度表达式
  - name: direction
    value: "input" # Cron binding 的方向
```

**注意：** `binding-cron.yaml` 的 `metadata` 部分包含一个 [Cron 表达式]({{% ref cron %}})，用于指定 binding 的调用频率。

#### `component\binding-postgresql.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 PostgreSQL [binding building block]({{% ref postgresql %}})
- 使用 `binding-postgresql.yaml` 文件中指定的设置连接到 PostgreSQL

借助 `binding-postgresql.yaml` component，你无需修改代码即可轻松替换后端数据库[binding]({{% ref supported-bindings %}})。

本 Quickstart 包含的 PostgreSQL `binding-postgresql.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqldb
  namespace: quickstarts
spec:
  type: bindings.postgresql
  version: v1
  metadata:
  - name: url # 必填
    value: "user=postgres password=docker host=localhost port=5432 dbname=orders pool_min_conns=1 pool_max_conns=10"
  - name: direction
    value: "output" # PostgreSQL binding 的方向
```

在 YAML 文件中：

- `spec/type` 指定此 binding 使用 PostgreSQL。
- `spec/metadata` 定义 component 所使用的 PostgreSQL 实例的连接信息。

{{% /tab %}}

 <!-- .NET -->
{{% tab ".NET" %}}

### 前置条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 已安装 [.NET 6](https://dotnet.microsoft.com/download/dotnet/6.0)、[.NET 8](https://dotnet.microsoft.com/download/dotnet/8.0) 或 [.NET 9](https://dotnet.microsoft.com/download/dotnet/9.0)

**注意：** 在本版本中，.NET 6 是 Dapr .NET SDK 包所支持的最低 .NET 版本。从 Dapr v1.16 及后续版本起，将仅支持 .NET 8 和 .NET 9。

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/bindings/csharp/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：在本地 Docker 容器中运行 PostgreSQL

在你的计算机上，以本地 Docker 容器的方式运行 [PostgreSQL 实例](https://www.postgresql.org/)。Quickstart 示例中包含一个 Docker Compose 文件，可用于在本地自定义、构建、运行并初始化带有默认 `orders` 表的 `postgres` 容器。

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令来设置容器：

```bash
docker compose up
```

验证容器是否正在本地运行。

```bash
docker ps
```

输出应包含：

```bash
CONTAINER ID   IMAGE      COMMAND                  CREATED         STATUS         PORTS                    NAMES
55305d1d378b   postgres   "docker-entrypoint.s…"   3 seconds ago   Up 2 seconds   0.0.0.0:5432->5432/tcp   postgres
```

### 步骤 3：安排 Cron job 并写入数据库

在新的终端窗口中，进入 SDK 目录。

```bash
cd bindings/csharp/sdk/batch
```

安装依赖：

```bash
dotnet restore
dotnet build batch.csproj
```

使用 Dapr sidecar 运行 `batch-sdk` 服务。

```bash
dapr run --app-id batch-sdk --app-port 7002 --resources-path ../../../components -- dotnet run
```

`process_batch` 函数中的代码每 10 秒执行一次（在 `components` 目录中的 [`binding-cron.yaml`]({{% ref "#componentsbinding-cronyaml-component-文件" %}}) 中定义）。binding 触发器会在你的应用程序中查找由 Dapr sidecar 通过 HTTP POST 调用的路由。

```csharp
app.MapPost("/" + cronBindingName, async () => {
// ...
});
```

`batch-sdk` 服务使用 [`binding-postgresql.yaml`]({{% ref "#componentbinding-postgresyaml-component-file" %}}) component 中定义的 PostgreSQL output binding，将 `OrderId`、`Customer` 和 `Price` 记录插入 `orders` 表中。 

```csharp
// ...
string jsonFile = File.ReadAllText("../../../orders.json");
var ordersArray = JsonSerializer.Deserialize<Orders>(jsonFile);
using var client = new DaprClientBuilder().Build();
foreach(Order ord in ordersArray?.orders ?? new Order[] {}){
    var sqlText = $"insert into orders (orderid, customer, price) values ({ord.OrderId}, '{ord.Customer}', {ord.Price});";
    var command = new Dictionary<string,string>(){
        {"sql",
        sqlText}
    };
// ...
}

// 通过 Dapr Client SDK 使用 Dapr output binding 插入订单
await client.InvokeBindingAsync(bindingName: sqlBindingName, operation: "exec", data: "", metadata: command);
```

### 步骤 4：查看 job 的输出

注意，如上所述，代码会将 `OrderId`、`Customer` 和 `Price` 作为负载调用 output binding。

你的 output binding 中 `print` 语句的输出如下：

```
== APP == Processing batch..
== APP == insert into orders (orderid, customer, price) values (1, 'John Smith', 100.32);
== APP == insert into orders (orderid, customer, price) values (2, 'Jane Bond', 15.4);
== APP == insert into orders (orderid, customer, price) values (3, 'Tony James', 35.56);
== APP == Finished processing batch
```

在新的终端中，验证相同的数据已插入数据库。进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令启动交互式 Postgres CLI：

```bash
docker exec -i -t postgres psql --username postgres  -p 5432 -h localhost --no-password
```

在 `admin=#` 提示符下，切换到 `orders` 表：

```bash
\c orders;
```

在 `orders=#` 提示符下，查询所有行：

```bash
select * from orders;
```

输出应如下所示：

```
 orderid |  customer  | price
---------+------------+--------
       1 | John Smith | 100.32
       2 | Jane Bond  |   15.4
       3 | Tony James |  35.56
```

#### `components\binding-cron.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 Cron [binding building block]({{% ref bindings %}})
- 每 10 秒调用一次 binding 端点（`batch`）

本 Quickstart 包含的 Cron `binding-cron.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron
  namespace: quickstarts
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 10s" # 有效的 cron 调度表达式
  - name: direction
    value: "input" # Cron binding 的方向
```

**注意：** `binding-cron.yaml` 的 `metadata` 部分包含一个 [Cron 表达式]({{% ref cron %}})，用于指定 binding 的调用频率。

#### `component\binding-postgresql.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 PostgreSQL [binding building block]({{% ref postgresql %}})
- 使用 `binding-postgresql.yaml` 文件中指定的设置连接到 PostgreSQL

借助 `binding-postgresql.yaml` component，你无需修改代码即可轻松替换后端数据库[binding]({{% ref supported-bindings %}})。

本 Quickstart 包含的 PostgreSQL `binding-postgresql.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqldb
  namespace: quickstarts
spec:
  type: bindings.postgresql
  version: v1
  metadata:
  - name: url # 必填
    value: "user=postgres password=docker host=localhost port=5432 dbname=orders pool_min_conns=1 pool_max_conns=10"
  - name: direction
    value: "output" # PostgreSQL binding 的方向
```

在 YAML 文件中：

- `spec/type` 指定此 binding 使用 PostgreSQL。
- `spec/metadata` 定义 component 所使用的 PostgreSQL 实例的连接信息。

{{% /tab %}}

 <!-- Java -->
{{% tab "Java" %}}

### 前置条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 17（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/bindings/java/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：在本地 Docker 容器中运行 PostgreSQL

在你的计算机上，以本地 Docker 容器的方式运行 [PostgreSQL 实例](https://www.postgresql.org/)。Quickstart 示例中包含一个 Docker Compose 文件，可用于在本地自定义、构建、运行并初始化带有默认 `orders` 表的 `postgres` 容器。

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令来设置容器：

```bash
docker compose up
```

验证容器是否正在本地运行。

```bash
docker ps
```

输出应包含：

```bash
CONTAINER ID   IMAGE      COMMAND                  CREATED         STATUS         PORTS                    NAMES
55305d1d378b   postgres   "docker-entrypoint.s…"   3 seconds ago   Up 2 seconds   0.0.0.0:5432->5432/tcp   postgres
```

### 步骤 3：安排 Cron job 并写入数据库

在新的终端窗口中，进入 SDK 目录。

```bash
cd bindings/java/sdk/batch
```

安装依赖：

```bash
mvn clean install
```

使用 Dapr sidecar 运行 `batch-sdk` 服务。

```bash
dapr run --app-id batch-sdk --app-port 8080 --resources-path ../../../components -- java -jar target/BatchProcessingService-0.0.1-SNAPSHOT.jar
```

`process_batch` 函数中的代码每 10 秒执行一次（在 `components` 目录中的 [`binding-cron.yaml`]({{% ref "#componentsbinding-cronyaml-component-文件" %}}) 中定义）。binding 触发器会在你的应用程序中查找由 Dapr sidecar 通过 HTTP POST 调用的路由。

```java
@PostMapping(path = cronBindingPath, consumes = MediaType.ALL_VALUE)
public ResponseEntity<String> processBatch() throws IOException, Exception
```

`batch-sdk` 服务使用 [`binding-postgresql.yaml`]({{% ref "#componentbinding-postgresyaml-component-file" %}}) component 中定义的 PostgreSQL output binding，将 `OrderId`、`Customer` 和 `Price` 记录插入 `orders` 表中。 

```java
try (DaprClient client = new DaprClientBuilder().build()) {

    for (Order order : ordList.orders) {
        String sqlText = String.format(
            "insert into orders (orderid, customer, price) " +
            "values (%s, '%s', %s);", 
            order.orderid, order.customer, order.price);
        logger.info(sqlText);
    
        Map<String, String> metadata = new HashMap<String, String>();
        metadata.put("sql", sqlText);
 
        // 使用 Dapr SDK 调用 SQL output binding
        client.invokeBinding(sqlBindingName, "exec", null, metadata).block();
    } 

    logger.info("Finished processing batch");

    return ResponseEntity.ok("Finished processing batch");
}
```

### 步骤 4：查看 job 的输出

注意，如上所述，代码会将 `OrderId`、`Customer` 和 `Price` 作为负载调用 output binding。

你的 output binding 中 `print` 语句的输出如下：

```
== APP == 2022-06-22 16:39:17.012  INFO 35772 --- [nio-8080-exec-4] c.s.c.BatchProcessingServiceController   : Processing batch..
== APP == 2022-06-22 16:39:17.268  INFO 35772 --- [nio-8080-exec-4] c.s.c.BatchProcessingServiceController   : insert into orders (orderid, customer, price) values (1, 'John Smith', 100.32);
== APP == 2022-06-22 16:39:17.838  INFO 35772 --- [nio-8080-exec-4] c.s.c.BatchProcessingServiceController   : insert into orders (orderid, customer, price) values (2, 'Jane Bond', 15.4);
== APP == 2022-06-22 16:39:17.844  INFO 35772 --- [nio-8080-exec-4] c.s.c.BatchProcessingServiceController   : insert into orders (orderid, customer, price) values (3, 'Tony James', 35.56);
== APP == 2022-06-22 16:39:17.848  INFO 35772 --- [nio-8080-exec-4] c.s.c.BatchProcessingServiceController   : Finished processing batch
```

在新的终端中，验证相同的数据已插入数据库。进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令启动交互式 Postgres CLI：

```bash
docker exec -i -t postgres psql --username postgres  -p 5432 -h localhost --no-password
```

在 `admin=#` 提示符下，切换到 `orders` 表：

```bash
\c orders;
```

在 `orders=#` 提示符下，查询所有行：

```bash
select * from orders;
```

输出应如下所示：

```
 orderid |  customer  | price
---------+------------+--------
       1 | John Smith | 100.32
       2 | Jane Bond  |   15.4
       3 | Tony James |  35.56
```

#### `components\binding-cron.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 Cron [binding building block]({{% ref bindings %}})
- 每 10 秒调用一次 binding 端点（`batch`）

本 Quickstart 包含的 Cron `binding-cron.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron
  namespace: quickstarts
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 10s" # 有效的 cron 调度表达式
  - name: direction
    value: "input" # Cron binding 的方向
```

**注意：** `binding-cron.yaml` 的 `metadata` 部分包含一个 [Cron 表达式]({{% ref cron %}})，用于指定 binding 的调用频率。

#### `component\binding-postgresql.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 PostgreSQL [binding building block]({{% ref postgresql %}})
- 使用 `binding-postgresql.yaml` 文件中指定的设置连接到 PostgreSQL

借助 `binding-postgresql.yaml` component，你无需修改代码即可轻松替换后端数据库[binding]({{% ref supported-bindings %}})。

本 Quickstart 包含的 PostgreSQL `binding-postgresql.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqldb
  namespace: quickstarts
spec:
  type: bindings.postgresql
  version: v1
  metadata:
  - name: url # 必填
    value: "user=postgres password=docker host=localhost port=5432 dbname=orders pool_min_conns=1 pool_max_conns=10"
  - name: direction
    value: "output" # PostgreSQL binding 的方向
```

在 YAML 文件中：

- `spec/type` 指定此 binding 使用 PostgreSQL。
- `spec/metadata` 定义 component 所使用的 PostgreSQL 实例的连接信息。

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

### 前置条件

本示例需要以下内容：

- [Dapr CLI 与已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/bindings/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

### 步骤 2：在本地 Docker 容器中运行 PostgreSQL

在你的计算机上，以本地 Docker 容器的方式运行 [PostgreSQL 实例](https://www.postgresql.org/)。Quickstart 示例中包含一个 Docker Compose 文件，可用于在本地自定义、构建、运行并初始化带有默认 `orders` 表的 `postgres` 容器。

在终端窗口中，从 Quickstarts 克隆目录的根目录进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令来设置容器：

```bash
docker compose up
```

验证容器是否正在本地运行。

```bash
docker ps
```

输出应包含：

```bash
CONTAINER ID   IMAGE      COMMAND                  CREATED         STATUS         PORTS                    NAMES
55305d1d378b   postgres   "docker-entrypoint.s…"   3 seconds ago   Up 2 seconds   0.0.0.0:5432->5432/tcp   postgres
```

### 步骤 3：安排 Cron job 并写入数据库

在新的终端窗口中，进入 SDK 目录。

```bash
cd bindings/go/sdk/batch
```

安装依赖：

```bash
go build .
```

使用 Dapr sidecar 运行 `batch-sdk` 服务。

```bash
dapr run --app-id batch-sdk --app-port 6002 --dapr-http-port 3502 --dapr-grpc-port 60002 --resources-path ../../../components -- go run .
```

`process_batch` 函数中的代码每 10 秒执行一次（在 `components` 目录中的 [`binding-cron.yaml`]({{% ref "#componentsbinding-cronyaml-component-文件" %}}) 中定义）。binding 触发器会在你的应用程序中查找由 Dapr sidecar 通过 HTTP POST 调用的路由。

```go
// 由 Dapr input binding 触发
r.HandleFunc("/"+cronBindingName, processBatch).Methods("POST")
```

`batch-sdk` 服务使用 [`binding-postgresql.yaml`]({{% ref "#componentbinding-postgresyaml-component-file" %}}) component 中定义的 PostgreSQL output binding，将 `OrderId`、`Customer` 和 `Price` 记录插入 `orders` 表中。

```go
func sqlOutput(order Order) (err error) {

	client, err := dapr.NewClient()
	if err != nil {
		return err
	}

	ctx := context.Background()

	sqlCmd := fmt.Sprintf("insert into orders (orderid, customer, price) values (%d, '%s', %s);", order.OrderId, order.Customer, strconv.FormatFloat(order.Price, 'f', 2, 64))
	fmt.Println(sqlCmd)

	// 通过 Dapr SDK 使用 Dapr output binding 插入订单
	in := &dapr.InvokeBindingRequest{
		Name:      sqlBindingName,
		Operation: "exec",
		Data:      []byte(""),
		Metadata:  map[string]string{"sql": sqlCmd},
	}
	err = client.InvokeOutputBinding(ctx, in)
	if err != nil {
		return err
	}

	return nil
}
```

### 步骤 4：查看 job 的输出

注意，如上所述，代码会将 `OrderId`、`Customer` 和 `Price` 作为负载调用 output binding。

你的 output binding 中 `print` 语句的输出如下：

```
== APP == Processing batch..
== APP == insert into orders (orderid, customer, price) values(1, 'John Smith', 100.32)
== APP == insert into orders (orderid, customer, price) values(2, 'Jane Bond', 15.4)
== APP == insert into orders (orderid, customer, price) values(3, 'Tony James', 35.56)
```

在新的终端中，验证相同的数据已插入数据库。进入 `bindings/db` 目录。

```bash
cd bindings/db
```

运行以下命令启动交互式 Postgres CLI：

```bash
docker exec -i -t postgres psql --username postgres  -p 5432 -h localhost --no-password
```

在 `admin=#` 提示符下，切换到 `orders` 表：

```bash
\c orders;
```

在 `orders=#` 提示符下，查询所有行：

```bash
select * from orders;
```

输出应如下所示：

```
 orderid |  customer  | price
---------+------------+--------
       1 | John Smith | 100.32
       2 | Jane Bond  |   15.4
       3 | Tony James |  35.56
```

#### `components\binding-cron.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 Cron [binding building block]({{% ref bindings %}})
- 每 10 秒调用一次 binding 端点（`batch`）

本 Quickstart 包含的 Cron `binding-cron.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cron
  namespace: quickstarts
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 10s" # 有效的 cron 调度表达式
  - name: direction
    value: "input" # Cron binding 的方向
```

**注意：** `binding-cron.yaml` 的 `metadata` 部分包含一个 [Cron 表达式]({{% ref cron %}})，用于指定 binding 的调用频率。

#### `component\binding-postgresql.yaml` component 文件

当你执行 `dapr run` 命令并指定 component 路径时，Dapr sidecar 会：

- 启动 PostgreSQL [binding building block]({{% ref postgresql %}})
- 使用 `binding-postgresql.yaml` 文件中指定的设置连接到 PostgreSQL

借助 `binding-postgresql.yaml` component，你无需修改代码即可轻松替换后端数据库[binding]({{% ref supported-bindings %}})。

本 Quickstart 包含的 PostgreSQL `binding-postgresql.yaml` 文件内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: sqldb
  namespace: quickstarts
spec:
  type: bindings.postgresql
  version: v1
  metadata:
  - name: url # 必填
    value: "user=postgres password=docker host=localhost port=5432 dbname=orders pool_min_conns=1 pool_max_conns=10"
  - name: direction
    value: "output" # PostgreSQL binding 的方向
```

在 YAML 文件中：

- `spec/type` 指定此 binding 使用 PostgreSQL。
- `spec/metadata` 定义 component 所使用的 PostgreSQL 实例的连接信息。

{{% /tab %}}

{{< /tabpane >}}

## 告诉我们你的想法！

我们在持续改进 Quickstart 示例，非常重视你的反馈。这个 Quickstart 对你有帮助吗？你对改进有什么建议？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的看法。

## 后续步骤

- 使用 HTTP 而非 SDK 来使用 Dapr binding。
  - [Python](https://github.com/dapr/quickstarts/tree/master/bindings/python/http)
  - [JavaScript](https://github.com/dapr/quickstarts/tree/master/bindings/javascript/http)
  - [.NET](https://github.com/dapr/quickstarts/tree/master/bindings/csharp/http)
  - [Java](https://github.com/dapr/quickstarts/tree/master/bindings/java/http)
  - [Go](https://github.com/dapr/quickstarts/tree/master/bindings/go/http)
- 进一步了解[binding building block]({{% ref bindings %}})

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
