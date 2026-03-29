---
type: docs
title: "Redis Streams"
linkTitle: "Redis Streams"
description: "Redis Streams 发布订阅组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-redis-pubsub/"
---

## 组件格式

要设置 Redis Streams 发布订阅，请创建一个类型为 `pubsub.redis` 的组件。请参阅[发布订阅代理组件文件]({{% ref setup-pubsub.md %}})以了解 ConsumerID 是如何自动生成的。阅读[操作指南：发布和订阅]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})了解如何创建和应用发布订阅配置。

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
    value: localhost:6379
  - name: redisPassword
    value: "KeFg23!"
  - name: consumerID
    value: "channel1"
  - name: useEntraID
    value: "true"
  - name: enableTLS
    value: "false"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| redisHost | Y | redis 主机的连接字符串。如果 `"redisType"` 为 `"cluster"`，则可以是多个以逗号分隔的主机或单个主机。使用 Redis Sentinel（`"failover"` 为 `"true"`）时，也可以提供多个 sentinel 地址，以逗号分隔。 | `localhost:6379`, `redis-master.default.svc.cluster.local:6379`, `sentinel1:26379,sentinel2:26379,sentinel3:26379`
| redisPassword      | N        | Redis 主机的密码。无默认值。可以是 `secretKeyRef` 以使用密钥引用  | `""`, `"KeFg23!"`
| redisUsername      | N        | Redis 主机的用户名。默认为空。请确保你的 redis 服务器版本为 6 或以上，并且已正确创建 acl 规则。 | `""`, `"default"`
| consumerID         | N        | 消费者组 ID。  | 可设置为字符串值（如上例中的 `"channel1"`）或字符串格式值（如 `"{podName}"` 等）。[查看您可以在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| useEntraID | N | 为 Azure Cache for Redis 实现 EntraID 支持。在启用此功能之前：<ul><li>`redisHost` 名称必须以 `"server:port"` 的形式指定</li><li>必须启用 TLS</li></ul> 在[创建 Redis 实例 > Azure Cache for Redis]({{% ref "#setup-redis" %}})下了解有关此设置的更多信息 | `"true"`, `"false"` |
| enableTLS          | N        | 如果 Redis 实例支持使用公共证书的 TLS，可以配置为启用或禁用。默认为 `"false"` | `"true"`, `"false"` |
| clientCert        | N        | 客户端证书的内容，用于需要客户端证书的 Redis 实例。必须与 `clientKey` 一起使用，并且 `enableTLS` 必须设置为 true。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储   | `"----BEGIN CERTIFICATE-----\nMIIC..."` |
| clientKey        | N        | 客户端私钥的内容，与 `clientCert` 一起用于身份验证。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储 | `"----BEGIN PRIVATE KEY-----\nMIIE..."` |
| redeliverInterval  | N        | 检查待重新传递消息的间隔时间。可以使用 Go 持续时间字符串（例如 "ms"、"s"、"m"）或毫秒数。默认为 `"60s"`。`"0"` 禁用重新传递。 | `"30s"`, `"5000"`
| processingTimeout  | N        | 消息在尝试重新传递之前必须待处理的时间量。可以使用 Go 持续时间字符串（例如 "ms"、"s"、"m"）或毫秒数。默认为 `"15s"`。`"0"` 禁用重新传递。 | `"60s"`, `"600000"`
| queueDepth         | N        | 用于处理的消息队列大小。默认为 `"100"`。 | `"1000"`
| concurrency        | N        | 处理消息的并发工作线程数。默认为 `"10"`。 | `"15"`
| redisType        | N        | redis 的类型。有两个有效值，一个是 `"node"` 用于单节点模式，另一个是 `"cluster"` 用于 redis 集群模式。默认为 `"node"`。 | `"cluster"`
| redisDB        | N        | 连接到 redis 后选择的数据库。如果 `"redisType"` 为 `"cluster"`，则忽略此选项。默认为 `"0"`。 | `"0"`
| redisMaxRetries        | N        | 放弃前重试命令的最大次数。默认为不重试失败的命令。  | `"5"`
| redisMinRetryInterval        | N        | 每次重试之间 redis 命令的最小退避时间。默认为 `"8ms"`；`"-1"` 禁用退避。 | `"8ms"`
| redisMaxRetryInterval        | N        | 每次重试之间 redis 命令的最大退避时间。默认为 `"512ms"`；`"-1"` 禁用退避。 | `"5s"`
| dialTimeout        | N        | 建立新连接的拨号超时时间。默认为 `"5s"`。  | `"5s"`
| readTimeout        | N        | socket 读取的超时时间，如果设置为 `"0s"`，读取将是阻塞的。如果达到超时，redis 命令将因超时而失败而不是阻塞。默认为 `"0s"`，`"-1"` 表示无超时。 | `"3s"`
| writeTimeout        | N        | socket 写入的超时时间。如果达到超时，redis 命令将因超时而失败而不是阻塞。默认为 readTimeout。 | `"3s"`
| poolSize        | N        | socket 连接的最大数量。默认为 runtime.NumCPU 报告的每个 CPU 10 个连接。 | `"20"`
| poolTimeout        | N        | 如果所有连接都忙，客户端等待连接的时间，然后返回错误。默认为 readTimeout + 1 秒。 | `"5s"`
| maxConnAge        | N        | 客户端关闭连接的连接时长。默认为不关闭旧连接。 | `"30m"`
| minIdleConns        | N        | 保持打开的最小空闲连接数，以避免与新关联的性能下降。默认为 `"0"`。 | `"2"`
| idleCheckFrequency        | N        | 空闲连接回收器进行空闲检查的频率。默认为 `"1m"`。`"-1"` 禁用空闲连接回收器。 | `"-1"`
| idleTimeout        | N        | 客户端关闭空闲连接的时间量。应小于服务器的超时时间。默认为 `"5m"`。`"-1"` 禁用空闲超时检查。 | `"10m"`
| failover           | N         | 启用故障转移配置的属性。需要设置 sentinelMasterName。启用后，redisHost 应包含 sentinel 地址。默认为 `"false"` | `"true"`, `"false"`
| sentinelMasterName | N         | sentinel 主节点名称。请参阅 [Redis Sentinel 文档](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/) | `""`,  `"mymaster"`
| sentinelUsername   | N         | Redis Sentinel 的用户名。仅当 "failover" 为 true 且 Redis Sentinel 已启用身份验证时适用 | `"username"`
| sentinelPassword   | N         | Redis Sentinel 的密码。仅当 "failover" 为 true 且 Redis Sentinel 已启用身份验证时适用 | `"password"`
| maxLenApprox        | N        | 流中的最大项目数。当达到指定长度时，旧条目将自动驱逐，以使流保持恒定大小。默认为无限制。 | `"10000"`
| streamTTL        | N        | 流条目的 TTL 持续时间。超过此持续时间的条目将被驱逐。这是一个近似值，因为它是通过使用 '~' 修饰符的 Redis 流 `MINID` 修剪来实现的。实际保留可能包含略多于 TTL 严格定义的条目，因为 Redis 优化了修剪操作以提高效率，可能会保留一些额外的条目。 | `"30d"`

## 创建 Redis 实例

Dapr 可以使用任何 Redis 实例——容器化的、在本地开发机器上运行的或托管的云服务，只要 Redis 的版本是 5.x 或 6.x。

{{< tabpane text=true >}}

{{% tab "自托管" %}}
Dapr CLI 将自动为您创建和设置 Redis Streams 实例。
当您运行 `dapr init` 时，Redis 实例将通过 Docker 安装，组件文件将在默认目录中创建。（`$HOME/.dapr/components` 目录 或 Windows 上的 `%USERPROFILE%\.dapr\components`）。
{{% /tab %}}

{{% tab "Kubernetes" %}}
您可以使用 [Helm](https://helm.sh/) 在我们的 Kubernetes 集群中快速创建 Redis 实例。此方法需要[安装 Helm](https://github.com/helm/helm#install)。

1. 将 Redis 安装到您的集群中。
    ```bash
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install redis bitnami/redis --set image.tag=6.2
    ```

2. 运行 `kubectl get pods` 以查看现在集群中运行的 Redis 容器。
3. 在 redis.yaml 文件中添加 `redis-master:6379` 作为 `redisHost`。例如：

    ```yaml
        metadata:
        - name: redisHost
          value: redis-master:6379
    ```

4. 接下来，我们将获取 Redis 密码，具体取决于我们使用的操作系统：
    - **Windows**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" > encoded.b64`，这将创建一个包含编码密码的文件。接下来，运行 `certutil -decode encoded.b64 password.txt`，这将把您的 redis 密码放入名为 `password.txt` 的文本文件中。复制密码并删除这两个文件。

    - **Linux/MacOS**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" | base64 --decode` 并复制输出的密码。

    将此密码作为 `redisPassword` 值添加到您的 redis.yaml 文件中。例如：

    ```yaml
        - name: redisPassword
          value: "lhDOkwTlp0"
    ```

{{% /tab %}}

{{% tab "AWS" %}}
[AWS Redis](https://aws.amazon.com/redis/)
{{% /tab %}}

{{% tab "Azure" %}}
1. [使用官方 Microsoft 文档创建 Azure Cache for Redis 实例。](https://docs.microsoft.com/azure/azure-cache-for-redis/quickstart-create-redis)

1. 实例创建后，从 Azure 门户获取主机名（FQDN）和您的访问密钥。
   - 对于主机名：
     - 导航到资源的**概览**页面。
     - 复制**主机名**值。
   - 对于您的访问密钥：
     - 导航到**设置** > **访问密钥**。
     - 复制并保存您的密钥。

1. 将您的密钥和主机名添加到 Dapr 可以应用到集群的 `redis.yaml` 文件中。
   - 如果您正在运行示例，请将主机和密钥添加到提供的 `redis.yaml` 中。
   - 如果您从头开始创建项目，请按照[组件格式部分](#component-format)中的说明创建 `redis.yaml` 文件。

1. 将 `redisHost` 键设置为 `[上一步的主机名]:6379`，将 `redisPassword` 键设置为您之前保存的密钥。

   **注意：**在生产级应用程序中，请遵循[密钥管理]({{% ref component-secrets.md %}})说明来安全地管理您的密钥。

1. 启用 EntraID 支持：
   - 在您的 Azure Redis 服务器上启用 Entra ID 身份验证。这可能需要几分钟。
   - 将 `useEntraID` 设置为 `"true"` 以实现 Azure Cache for Redis 的 EntraID 支持。

1. 将 `enableTLS` 设置为 `"true"` 以支持 TLS。

> **注意：**`useEntraID` 假定您的 UserPrincipal（通过 AzureCLICredential）或系统分配的托管标识具有 RedisDataOwner 角色权限。如果使用用户分配的标识，[您需要指定 `azureClientID` 属性]({{% ref "howto-mi.md#set-up-identities-in-your-component" %}})。

{{% /tab %}}

{{% tab "GCP" %}}
[GCP Cloud MemoryStore](https://cloud.google.com/memorystore/)
{{% /tab %}}

{{< /tabpane >}}


{{% alert title="注意" color="primary" %}}
Dapr CLI 在自托管模式下作为 `dapr init` 命令的一部分自动部署本地 redis 实例。
{{% /alert %}}

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

## 弹性和重新传递

Redis Streams 发布订阅组件遵循 [Dapr 弹性策略]({{% ref "resiliency-overview" %}})。在您的应用程序处理程序返回（成功、重试或丢弃）后，组件向 Redis 确认消息。Redis 然后停止重新传递该消息。重试和死信行为由您的弹性策略控制（例如 `maxRetries` 和重试持续时间）。

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读本[指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})以获取有关配置发布订阅组件的说明
- [发布订阅构建块]({{% ref pubsub %}})
