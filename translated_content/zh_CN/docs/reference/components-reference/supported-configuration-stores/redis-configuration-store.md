---
type: docs
title: "Redis"
linkTitle: "Redis"
description: Redis 配置存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-configuration-store/supported-configuration-stores/setup-redis/"
---

## 组件格式

要设置 Redis 配置存储，需创建一个类型为 `configuration.redis` 的组件。有关如何创建和应用配置存储配置，请参阅[此指南]({{% ref "howto-manage-configuration.md#configure-a-dapr-configuration-store" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: <address>:6379
  - name: redisPassword
    value: **************
  - name: useEntraID
    value: "true"
  - name: enableTLS
    value: <bool>
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体操作请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}


## 规格元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| redisHost | Y | Output |  Redis 主机的连接字符串。如果 `"redisType"` 为 `"cluster"`，则可以是多个用逗号分隔的主机，也可以是单个主机。当使用 Redis Sentinel（`"failover"` 为 `"true"`）时，也可以提供多个 sentinel 地址，用逗号分隔。 | `localhost:6379`, `redis-master.default.svc.cluster.local:6379`, `sentinel1:26379,sentinel2:26379,sentinel3:26379` |
| redisPassword | N | Output | Redis 密码 | `"password"` |
| redisUsername | N | Output | Redis 主机的用户名。默认为空。请确保你的 Redis 服务器版本为 6 或更高版本，并且已正确创建 acl 规则。 | `"username"` |
| enableTLS | N | Output |  如果 Redis 实例支持带有公共证书的 TLS，可以配置为启用或禁用 TLS。默认为 `"false"` | `"true"`, `"false"` |
| clientCert        | N | Output        | 客户端证书的内容，用于需要客户端证书的 Redis 实例。必须与 `clientKey` 一起使用，且 `enableTLS` 必须设置为 true。建议使用密钥存储，具体操作请参阅[此处]({{% ref component-secrets.md %}})  | `"----BEGIN CERTIFICATE-----\nMIIC..."` |
| clientKey        | N | Output        | 客户端私钥的内容，与 `clientCert` 配合用于身份验证。建议使用密钥存储，具体操作请参阅[此处]({{% ref component-secrets.md %}})  | `"----BEGIN PRIVATE KEY-----\nMIIE..."` |
| failover           | N | Output         | 启用故障转移配置的属性。需要设置 sentinelMasterName。启用后，redisHost 应包含 sentinel 地址。默认为 `"false"` | `"true"`, `"false"`
| sentinelMasterName | N | Output         | Sentinel 主节点名称。请参阅 [Redis Sentinel 文档](https://redis.io/docs/reference/sentinel-clients/) | `""`,  `"mymaster"`
| sentinelUsername   | N | Output         | Redis Sentinel 的用户名。仅当 "failover" 为 true 且 Redis Sentinel 启用了身份验证时适用 | `"username"`
| sentinelPassword   | N | Output         | Redis Sentinel 的密码。仅当 "failover" 为 true 且 Redis Sentinel 启用了身份验证时适用 | `"password"`
| redisType        | N | Output        | Redis 的类型。有两个有效值，一个是 `"node"`，表示单节点模式；另一个是 `"cluster"`，表示 Redis 集群模式。默认为 `"node"`。 | `"cluster"`
| redisDB        | N | Output        | 连接到 Redis 后选择的数据库。如果 `"redisType"` 为 `"cluster"`，则此选项将被忽略。默认为 `"0"`。 | `"0"`
| redisMaxRetries        | N | Output        | 放弃前重试命令的最大次数。默认为不重试失败的命令。  | `"5"`
| redisMinRetryInterval        | N | Output        | 每次重试之间 Redis 命令的最小退避时间。默认为 `"8ms"`；  `"-1"` 禁用退避。 | `"8ms"`
| redisMaxRetryInterval        | N | Output        | 每次重试之间 Redis 命令的最大退避时间。默认为 `"512ms"`；`"-1"` 禁用退避。 | `"5s"`
| dialTimeout        | N | Output        | 建立新连接的拨号超时时间。默认为 `"5s"`。  | `"5s"`
| readTimeout        | N | Output        | 套接字读取的超时时间。如果达到超时，Redis 命令将因超时而失败而不是阻塞。默认为 `"3s"`，`"-1"` 表示无超时。 | `"3s"`
| writeTimeout        | N | Output        | 套接字写入的超时时间。如果达到超时，Redis 命令将因超时而失败而不是阻塞。默认为 readTimeout。 | `"3s"`
| poolSize        | N | Output        | 套接字连接的最大数量。默认为 runtime.NumCPU 报告的每个 CPU 10 个连接。 | `"20"`
| poolTimeout        | N | Output        | 当所有连接都忙时，客户端等待连接的时间，超时后返回错误。默认为 readTimeout + 1 秒。 | `"5s"`
| maxConnAge        | N | Output        | 连接的年龄，达到此年龄后客户端将关闭（退役）该连接。默认为不关闭旧连接。 | `"30m"`
| minIdleConns        | N | Output        | 保持打开的最小空闲连接数，以避免创建新连接导致的性能下降。默认为 `"0"`。 | `"2"`
| idleCheckFrequency        | N | Output        | 空闲连接清理器执行空闲检查的频率。默认为 `"1m"`。`"-1"` 禁用空闲连接清理器。 | `"-1"`
| idleTimeout        | N | Output        | 客户端关闭空闲连接的时间长度。应小于服务器的超时时间。默认为 `"5m"`。`"-1"` 禁用空闲超时检查。 | `"10m"`

## 设置 Redis

Dapr 可以使用任何 Redis 实例：容器化的、在本地开发机器上运行的，或托管的云服务。

{{< tabpane text=true >}}

{{% tab "自托管" %}}
当你运行 `dapr init` 时，会自动创建一个 Redis 实例作为 Docker 容器
{{% /tab %}}

{{% tab "Kubernetes" %}}
你可以使用 [Helm](https://helm.sh/) 在我们的 Kubernetes 集群中快速创建 Redis 实例。此方法需要[安装 Helm](https://github.com/helm/helm#install)。

1. 将 Redis 安装到你的集群中。请注意，我们要显式设置一个镜像标签以获取大于 5 的版本，这是 Dapr 的发布订阅功能所要求的。如果你只打算将 Redis 用作状态存储（而不用于发布订阅），则不必设置镜像版本。
    ```bash
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install redis bitnami/redis --set image.tag=6.2
    ```

2. 运行 `kubectl get pods` 查看集群中现在运行的 Redis 容器。
3. 将 `redis-master:6379` 作为 `redisHost` 添加到你的 [redis.yaml](#component-format) 文件中。例如：
    ```yaml
        metadata:
        - name: redisHost
          value: redis-master:6379
    ```
4. 接下来，获取 Redis 密码，根据我们使用的操作系统，这略有不同：
    - **Windows**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" > encoded.b64`，这将创建一个包含编码密码的文件。接下来，运行 `certutil -decode encoded.b64 password.txt`，这将把你的 redis 密码放入名为 `password.txt` 的文本文件中。复制密码并删除这两个文件。

    - **Linux/MacOS**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" | base64 --decode` 并复制输出的密码。

    将此密码作为 `redisPassword` 值添加到你的 [redis.yaml](#component-format) 文件中。例如：
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

1. [使用官方 Microsoft 文档创建 Azure Cache for Redis 实例。](https://docs.microsoft.com/azure/azure-cache-for-redis/quickstart-create-redis)

1. 实例创建完成后，从 Azure 门户获取主机名（FQDN）和访问密钥。
   - 对于主机名：
     - 导航到资源的**概览**页面。
     - 复制**主机名**值。
   - 对于访问密钥：
     - 导航到**设置** > **访问密钥**。
     - 复制并保存你的密钥。

1. 将你的密钥和主机名添加到 Dapr 可应用于集群的 `redis.yaml` 文件中。
   - 如果你在运行示例，请将主机和密钥添加到提供的 `redis.yaml` 中。
   - 如果你从零开始创建项目，请按照[组件格式部分](#component-format)中的说明创建 `redis.yaml` 文件。
   
1. 将 `redisHost` 键设置为 `[上一步的主机名]:6379`，将 `redisPassword` 键设置为你之前保存的密钥。
   
   **注意：** 在生产级应用程序中，请遵循[密钥管理]({{% ref component-secrets.md %}})说明来安全地管理你的密钥。

1. 启用 EntraID 支持：
   - 在 Azure Redis 服务器上启用 Entra ID 身份验证。这可能需要几分钟时间。
   - 将 `useEntraID` 设置为 `"true"` 以实现 Azure Cache for Redis 的 EntraID 支持。

1. 将 `enableTLS` 设置为 `"true"` 以支持 TLS。

> **注意：** `useEntraID` 假定你的 UserPrincipal（通过 AzureCLICredential）或 SystemAssigned 托管标识具有 RedisDataOwner 角色权限。如果使用用户分配的标识，[你需要指定 `azureClientID` 属性]({{% ref "howto-mi.md#set-up-identities-in-your-component" %}})。

{{% /tab %}}

{{% tab "GCP" %}}
[GCP Cloud MemoryStore](https://cloud.google.com/memorystore/)
{{% /tab %}}

{{< /tabpane >}}

## Redis Sentinel 配置

当使用 Redis Sentinel 实现高可用时，将 `redisType` 设置为 `"node"`，使用 `failover: "true"` 启用故障转移模式，并提供 sentinel 主节点名称。可以在 `redisHost` 字段中指定多个 sentinel 地址，用逗号分隔，以实现冗余。

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
- 阅读[如何：从存储管理配置]({{% ref "howto-manage-configuration" %}})，了解如何将 Redis 用作配置存储的说明。
- [配置构建块]({{% ref configuration-api-overview %}})
