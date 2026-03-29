---
type: docs
title: "Redis"
linkTitle: "Redis"
description: Redis 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-redis/"
---

## 组件格式

要设置 Redis 状态存储，请创建一个类型为 `state.redis` 的组件。请参阅[本指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

{{% alert title="限制" color="warning" %}}
在使用 Redis 和事务 API 之前，请确保您熟悉[Redis 关于事务的限制](https://redis.io/docs/interact/transactions/#what-about-rollbacks)。
{{% /alert %}}

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: <HOST>
  - name: redisPassword # 可选
    value: <PASSWORD>
  - name: useEntraID
    value: <bool> # 可选，允许值：true, false
  - name: enableTLS
    value: <bool> # 可选，允许值：true, false
  - name: clientCert
    value: # 可选
  - name: clientKey
    value: # 可选    
  - name: maxRetries
    value: # 可选
  - name: maxRetryBackoff
    value: # 可选
  - name: failover
    value: <bool> # 可选，允许值：true, false
  - name: sentinelMasterName
    value: <string> # 可选
  - name: sentinelUsername
    value: # 可选
  - name: sentinelPassword
    value: # 可选
  - name: redeliverInterval
    value: # 可选
  - name: processingTimeout
    value: # 可选
  - name: redisType
    value: # 可选
  - name: redisDB
    value: # 可选
  - name: redisMaxRetries
    value: # 可选
  - name: redisMinRetryInterval
    value: # 可选
  - name: redisMaxRetryInterval
    value: # 可选
  - name: dialTimeout
    value: # 可选
  - name: readTimeout
    value: # 可选
  - name: writeTimeout
    value: # 可选
  - name: poolSize
    value: # 可选
  - name: poolTimeout
    value: # 可选
  - name: maxConnAge
    value: # 可选
  - name: minIdleConns
    value: # 可选
  - name: idleCheckFrequency
    value: # 可选
  - name: idleTimeout
    value: # 可选
  - name: ttlInSeconds
    value: <int> # 可选
  - name: queryIndexes
    value: <string> # 可选
  # 如果希望将 Redis 用作 actor 的状态存储，请取消注释此行（可选）
  #- name: actorStateStore
  #  value: "true"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}


如果您希望将 Redis 用作 actor 存储，请在 yaml 中追加以下内容。

```yaml
  - name: actorStateStore
    value: "true"
```

## 规范元数据字段

| 字段              | 必填 | 说明 | 示例 |
|--------------------|:--------:|---------|---------|
| redisHost          | Y        | Redis 主机的连接字符串。如果 `"redisType"` 为 `"cluster"`，可以是多个以逗号分隔的主机或单个主机。使用 Redis Sentinel（`"failover"` 为 `"true"`）时，也可以提供多个以逗号分隔的 sentinel 地址。 | `localhost:6379`、`redis-master.default.svc.cluster.local:6379`、`sentinel1:26379,sentinel2:26379,sentinel3:26379`
| redisPassword      | N        | Redis 主机的密码。无默认值。可以使用 `secretKeyRef` 来使用密钥引用  | `""`、`"KeFg23!"`
| redisUsername      | N        | Redis 主机的用户名。默认为空。请确保您的 Redis 服务器版本为 6 或以上，并已正确创建 ACL 规则。 | `""`、`"default"`
| useEntraID | N | 为 Azure Cache for Redis 实现 EntraID 支持。启用此功能之前：<ul><li>必须以 `"server:port"` 的格式指定 `redisHost` 名称</li><li>必须启用 TLS</li></ul> 在[创建 Redis 实例 > Azure Cache for Redis]({{% ref "#setup-redis" %}})下了解有关此设置的更多信息 | `"true"`、`"false"`
| enableTLS          | N         | 如果 Redis 实例支持使用公共证书的 TLS，可以配置为启用或禁用。默认为 `"false"` | `"true"`、`"false"`
| clientCert         | N         | 客户端证书的内容，用于需要客户端证书的 Redis 实例。必须与 `clientKey` 一起使用，且 `enableTLS` 必须设置为 true。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储   | `"----BEGIN CERTIFICATE-----\nMIIC..."`
| clientKey          | N         | 客户端私钥的内容，与 `clientCert` 结合使用进行身份验证。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储 | `"----BEGIN PRIVATE KEY-----\nMIIE..."`
| maxRetries         | N         | 放弃前的最大重试次数。默认为 `3` | `5`、`10`
| maxRetryBackoff    | N         | 每次重试之间的最大退避时间。默认为 `2` 秒；`"-1"` 禁用退避。 | `3000000000`
| failover           | N         | 启用故障转移配置的属性。需要设置 sentinelMasterName。启用时，redisHost 应包含 sentinel 地址。默认为 `"false"` | `"true"`、`"false"`
| sentinelMasterName | N         | Sentinel 主节点名称。请参阅 [Redis Sentinel 文档](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/) | `""`、`"mymaster"`
| sentinelUsername   | N         | Redis Sentinel 的用户名。仅当 "failover" 为 true 且 Redis Sentinel 已启用身份验证时适用 | `"username"`
| sentinelPassword   | N         | Redis Sentinel 的密码。仅当 "failover" 为 true 且 Redis Sentinel 已启用身份验证时适用 | `"password"`
| redeliverInterval  | N        | 检查待重新投递消息的间隔时间。默认为 `"60s"`。`"0"` 禁用重新投递。 | `"30s"`
| processingTimeout  | N        | 消息在尝试重新投递之前必须保持待处理状态的时间量。默认为 `"15s"`。`"0"` 禁用重新投递。 | `"30s"`
| redisType          | N        | Redis 的类型。有两个有效值，一个是 `"node"` 用于单节点模式，另一个是 `"cluster"` 用于 Redis 集群模式。默认为 `"node"`。 | `"cluster"`
| redisDB            | N        | 连接到 Redis 后选择的数据库。如果 `"redisType"` 为 `"cluster"`，则忽略此选项。默认为 `"0"`。 | `"0"`
| redisMaxRetries    | N        | `maxRetries` 的别名。如果两个值都已设置，则忽略 `maxRetries`。 | `"5"`
| redisMinRetryInterval        | N        | 每次重试之间 Redis 命令的最小退避时间。默认为 `"8ms"`；`"-1"` 禁用退避。 | `"8ms"`
| redisMaxRetryInterval        | N        | `maxRetryBackoff` 的别名。如果两个值都已设置，则忽略 `maxRetryBackoff`。  | `"5s"`
| dialTimeout        | N        | 建立新连接的拨号超时时间。默认为 `"5s"`。  | `"5s"`
| readTimeout        | N        | 套接字读取的超时时间。如果达到此时间，Redis 命令将以超时失败而不是阻塞。默认为 `"3s"`，`"-1"` 表示无超时。 | `"3s"`
| writeTimeout       | N        | 套接字写入的超时时间。如果达到此时间，Redis 命令将以超时失败而不是阻塞。默认为 readTimeout。 | `"3s"`
| poolSize           | N        | 套接字连接的最大数量。默认为每个 CPU 10 个连接，由 runtime.NumCPU 报告。 | `"20"`
| poolTimeout        | N        | 如果所有连接都忙，客户端等待连接的时间，然后返回错误。默认为 readTimeout + 1 秒。 | `"5s"`
| maxConnAge         | N        | 客户端退役（关闭）连接的连接时长。默认为不关闭旧连接。 | `"30m"`
| minIdleConns       | N        | 保持打开的最小空闲连接数，以避免与创建新连接相关的性能下降。默认为 `"0"`。 | `"2"`
| idleCheckFrequency        | N        | 空闲连接清理器执行的空闲检查频率。默认为 `"1m"`。`"-1"` 禁用空闲连接清理器。 | `"-1"`
| idleTimeout        | N        | 客户端关闭空闲连接之后的时间量。应小于服务器的超时时间。默认为 `"5m"`。`"-1"` 禁用空闲超时检查。 | `"10m"`
| ttlInSeconds       | N         | 允许指定以秒为单位的默认生存时间（TTL），该时间将应用于每个状态存储请求，除非通过[请求元数据]({{% ref "state-store-ttl.md" %}})显式定义 TTL。 | `600`
| queryIndexes       | N         | 用于查询 JSON 对象的索引模式 | 参见[查询 JSON 对象](#querying-json-objects)
| actorStateStore    | N        | 将此状态存储用于 actor。默认为 `"false"` | `"true"`、`"false"`

## 设置 Redis

Dapr 可以使用任何 Redis 实例：容器化的、在本地开发机器上运行的或托管的云服务。

{{< tabpane text=true >}}

{{% tab "自托管" %}}
当您运行 `dapr init` 时，会自动创建一个 Redis 实例作为 Docker 容器
{{% /tab %}}

{{% tab "Kubernetes" %}}
您可以使用 [Helm](https://helm.sh/) 在 Kubernetes 集群中快速创建 Redis 实例。此方法需要[安装 Helm](https://github.com/helm/helm#install)。

1. 将 Redis 安装到您的集群中。请注意，我们显式设置了镜像标签以获取大于 5 的版本，这是 Dapr 的发布订阅功能所需的。如果您仅打算将 Redis 用作状态存储（而不是用于发布订阅），则不必设置镜像版本。
    ```bash
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install redis bitnami/redis
    ```

2. 运行 `kubectl get pods` 以查看 Redis 容器现在正在集群中运行。
3. 将 `redis-master:6379` 作为 `redisHost` 添加到您的 [redis.yaml](#configuration) 文件中。例如：
    ```yaml
        metadata:
        - name: redisHost
          value: redis-master:6379
    ```
4. 接下来，获取 Redis 密码，根据我们使用的操作系统，这略有不同：
    - **Windows**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" > encoded.b64`，这将创建一个包含编码密码的文件。接下来，运行 `certutil -decode encoded.b64 password.txt`，这将把您的 redis 密码放入名为 `password.txt` 的文本文件中。复制密码并删除这两个文件。

    - **Linux/MacOS**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" | base64 --decode` 并复制输出的密码。

    将此密码作为 `redisPassword` 值添加到您的 [redis.yaml](#configuration) 文件中。例如：
    ```yaml
        metadata:
        - name: redisPassword
          value: lhDOkwTlp0
    ```
{{% /tab %}}

{{% tab "AWS" %}}
[AWS Redis](https://aws.amazon.com/redis/)
{{% /tab %}}

{{% tab "Azure" %}}
1. [使用 Microsoft 官方文档创建 Azure Cache for Redis 实例。](https://docs.microsoft.com/azure/azure-cache-for-redis/quickstart-create-redis)

1. 创建实例后，从 Azure 门户获取主机名（FQDN）和访问密钥。 
   - 对于主机名： 
     - 导航到资源的**概览**页面。
     - 复制**主机名**值。
   - 对于访问密钥： 
     - 导航到**设置** > **访问密钥**。 
     - 复制并保存您的密钥。

1. 将您的密钥和主机名添加到 Dapr 可以应用到集群的 `redis.yaml` 文件中。 
   - 如果您正在运行示例，请将主机和密钥添加到提供的 `redis.yaml` 中。 
   - 如果您是从头开始创建项目，请按照[组件格式部分](#component-format)中的说明创建 `redis.yaml` 文件。 
   
1. 将 `redisHost` 键设置为 `[上一步的主机名]:6379`，将 `redisPassword` 键设置为之前保存的密钥。 
   
   **注意：** 在生产级应用程序中，请遵循[密钥管理]({{% ref component-secrets.md %}})说明来安全地管理您的密钥。

1. 启用 EntraID 支持：
   - 在 Azure Redis 服务器上启用 Entra ID 身份验证。这可能需要几分钟。
   - 将 `useEntraID` 设置为 `"true"` 以为 Azure Cache for Redis 实现 EntraID 支持。

1. 将 `enableTLS` 设置为 `"true"` 以支持 TLS。

> **注意：**`useEntraID` 假定您的 UserPrincipal（通过 AzureCLICredential）或系统分配的托管身份具有 RedisDataOwner 角色权限。如果使用用户分配的托管身份，[您需要指定 `azureClientID` 属性]({{% ref "howto-mi.md#set-up-identities-in-your-component" %}})。

{{% /tab %}}

{{% tab "GCP" %}}
[GCP Cloud MemoryStore](https://cloud.google.com/memorystore/)
{{% /tab %}}

{{< /tabpane >}}

## 查询 JSON 对象（可选）

除了支持以键值对的形式存储和查询状态数据外，Redis 状态存储还可选支持 JSON 对象查询，以满足更复杂的查询或过滤需求。要启用此功能，需要执行以下步骤：

1. Redis 存储必须支持 Redis 模块，特别是 Redisearch 和 RedisJson。如果您正在部署和运行 Redis，则在部署 Redis 服务时加载 [redisearch](https://oss.redis.com/redisearch/) 和 [redisjson](https://oss.redis.com/redisjson/) 模块。

2. 在组件配置的元数据中指定 `queryIndexes` 条目。`queryIndexes` 的值是以下格式的 JSON 数组：
```json
[
  {
    "name": "<索引名称>",
    "indexes": [
      {
        "key": "<文档内选定元素的 JSONPath 类似语法>",
        "type": "<值类型（支持的类型：TEXT、NUMERIC）>",
      },
      ...
    ]
  },
  ...
]
```

3. 调用状态管理 API 时，将以下元数据添加到 API 调用中：
- [保存状态]({{% ref "state_api.md#save-state" %}})、[获取状态]({{% ref "state_api.md#get-state" %}})、[删除状态]({{% ref "state_api.md#delete-state" %}})：
  - 向 HTTP API 请求添加 `metadata.contentType=application/json` URL 查询参数
  - 向 gRPC API 请求的元数据中添加 `"contentType": "application/json"` 键值对
- [查询状态]({{% ref "state_api.md#query-state" %}})：
  - 向 HTTP API 请求添加 `metadata.contentType=application/json&metadata.queryIndexName=<索引名称>` URL 查询参数
  - 向 gRPC API 请求的元数据中添加 `"contentType" : "application/json"` 和 `"queryIndexName" : "<索引名称>"` 键值对

考虑一个示例，您存储如下文档：
```json
{
  "key": "1",
  "value": {
    "person": {
      "org": "Dev Ops",
      "id": 1036
    },
    "city": "Seattle",
    "state": "WA"
  }
}
```

包含相应索引模式的组件配置文件如下所示：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  initTimeout: 1m
  metadata:
  - name: redisHost
    value: "localhost:6379"
  - name: redisPassword
    value: ""
  - name: queryIndexes
    value: |
      [
        {
          "name": "orgIndx",
          "indexes": [
            {
              "key": "person.org",
              "type": "TEXT"
            },
            {
              "key": "person.id",
              "type": "NUMERIC"
            },
            {
              "key": "state",
              "type": "TEXT"
            },
            {
              "key": "city",
              "type": "TEXT"
            }
          ]
        }
      ]
```

因此，您现在可以存储、检索和查询这些文档。

考虑["操作方法：查询状态"]({{% ref "howto-state-query-api.md#example-data-and-query" %}})指南中的示例。让我们使用 Redis 来运行它。


{{< tabpane text=true >}}

{{% tab "自托管" %}}
如果您使用的是 Dapr 的自托管部署，当您运行 `dapr init` 时，会自动创建一个没有 JSON 模块的 Redis 实例作为 Docker 容器。

或者，您可以通过运行以下命令创建 Redis 实例：
 ```bash
 docker run -p 6379:6379 --name redis --rm redis
 ```
 在 dapr init 时创建的或通过上述命令创建的 Redis 容器不能单独与状态存储查询 API 一起使用。您可以在与已安装的 Redis 使用的端口不同的端口上运行 redislabs/rejson docker 镜像，以使用查询 API。

> 注意：`redislabs/rejson` 仅支持 amd64 架构。

使用以下命令创建与查询 API 兼容的 redis 实例。

```bash
docker run -p 9445:9445 --name rejson --rm redislabs/rejson:2.0.6
```
{{% /tab %}}

{{% tab "Kubernetes" %}}
按照 [Redis 在 Kubernetes 中部署](#setup-redis)的说明操作，但有一个额外的细节。

安装 Redis Helm 软件包时，提供一个指定容器镜像并启用所需模块的配置文件：
```bash
helm install redis bitnami/redis --set image.tag=6.2 -f values.yaml
```

其中 `values.yaml` 如下所示：
```yaml
image:
  repository: redislabs/rejson
  tag: 2.0.6

master:
  extraFlags:
   - --loadmodule
   - /usr/lib/redis/modules/rejson.so
   - --loadmodule
   - /usr/lib/redis/modules/redisearch.so
```

{{% /tab %}}

{{% tab "Azure" %}}
{{% alert title="注意" color="warning" %}}
Azure Redis 托管服务不支持 RedisJson 模块，不能与查询一起使用。
{{% /alert %}}

{{% /tab %}}

{{% tab "AWS" %}}
按照 [Redis 在 AWS 中部署](#setup-redis)的说明操作。
{{% alert title="注意" color="primary" %}}
对于查询支持，您需要启用 RediSearch 和 RedisJson。
{{% /alert %}}
{{% /tab %}}

{{% tab "GCP" %}}
{{% alert title="注意" color="warning" %}}
Memory Store 不支持模块，不能与查询一起使用。
{{% /alert %}}
{{% /tab %}}

{{% tab "Redis Enterprise Cloud" %}}
[Redis Enterprise Cloud](https://docs.redis.com/latest/rc/)
{{% /tab %}}

{{% tab "Alibaba Cloud" %}}
<!-- IGNORE_LINKS -->
[Alibaba Cloud](https://www.alibabacloud.com/product/apsaradb-for-redis)
<!-- END_IGNORE -->
{{% /tab %}}

{{< /tabpane >}}

接下来是启动 Dapr 应用程序。请参阅此[组件配置文件](../../../../developing-applications/building-blocks/state-management/query-api-examples/components/redis/redis.yml)，其中包含查询索引模式。确保修改 `redisHost` 以反映 `redislabs/rejson` 使用的本地转发端口。
```bash
dapr run --app-id demo --dapr-http-port 3500 --resources-path query-api-examples/components/redis
```

现在使用员工数据集填充状态存储，以便您稍后查询它。
```bash
curl -X POST -H "Content-Type: application/json" -d @query-api-examples/dataset.json \
  http://localhost:3500/v1.0/state/querystatestore?metadata.contentType=application/json
```

为了确保数据已正确存储，您可以检索特定对象
```bash
curl http://localhost:3500/v1.0/state/querystatestore/1?metadata.contentType=application/json
```

结果将是：
```json
{
  "city": "Seattle",
  "state": "WA",
  "person": {
    "org": "Dev Ops",
    "id": 1036
  }
}
```

现在，让我们查找加利福尼亚州的所有员工，并按其员工 ID 降序排序。

这是[查询](../../../../developing-applications/building-blocks/state-management/query-api-examples/query1.json)：
```json
{
    "filter": {
        "EQ": { "state": "CA" }
    },
    "sort": [
        {
            "key": "person.id",
            "order": "DESC"
        }
    ]
}
```

使用以下命令执行查询：
```bash
curl -s -X POST -H "Content-Type: application/json" -d @query-api-examples/query1.json \
  'http://localhost:3500/v1.0-alpha1/state/querystatestore/query?metadata.contentType=application/json&metadata.queryIndexName=orgIndx'
```

结果将是：
```json
{
  "results": [
    {
      "key": "3",
      "data": {
        "person": {
          "org": "Finance",
          "id": 1071
        },
        "city": "Sacramento",
        "state": "CA"
      },
      "etag": "1"
    },
    {
      "key": "7",
      "data": {
        "person": {
          "org": "Dev Ops",
          "id": 1015
        },
        "city": "San Francisco",
        "state": "CA"
      },
      "etag": "1"
    },
    {
      "key": "5",
      "data": {
        "person": {
          "org": "Hardware",
          "id": 1007
        },
        "city": "Los Angeles",
        "state": "CA"
      },
      "etag": "1"
    },
    {
      "key": "9",
      "data": {
        "person": {
          "org": "Finance",
          "id": 1002
        },
        "city": "San Diego",
        "state": "CA"
      },
      "etag": "1"
    }
  ]
}
```

查询语法和文档可在[此处]({{% ref howto-state-query-api.md %}})找到

## Redis Sentinel 配置

使用 Redis Sentinel 实现高可用性时，将 `redisType` 设置为 `"node"`，使用 `failover: "true"` 启用故障转移模式，并提供 sentinel 主节点名称。可以在 `redisHost` 字段中指定多个以逗号分隔的 sentinel 地址以实现冗余。

    ```yaml
    apiVersion: dapr.io/v1alpha1
    kind: Component
    metadata:
      name: redis-pubsub
    spec:
      type: pubsub.redis
      version: v1
      metadata:
      - name: redisHost
        value: "sentinel1:26379,sentinel2:26379,sentinel3:26379"
      - name: redisType
        value: "node"
      - name: failover
        value: "true"
      - name: sentinelMasterName
        value: "mymaster"
    ```

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
