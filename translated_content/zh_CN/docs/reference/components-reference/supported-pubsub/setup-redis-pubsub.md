---
type: docs
title: "Redis Streams"
linkTitle: "Redis Streams"
description: "Redis Streams pubsub 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-redis-pubsub/"
---

## Component 格式

要设置 Redis Streams pub/sub，请创建一个类型为 `pubsub.redis` 的 component。请参阅 [pub/sub broker component 文件]({{% ref setup-pubsub.md %}})，了解 ConsumerID 是如何自动生成的。阅读[操作指南：发布和订阅]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})，了解如何创建和应用 pub/sub 配置。

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
  - name: insecureSkipTLSVerify
    value: "false"
```

{{% alert title="警告" color="warning" %}}
上述示例将 secrets 以纯字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})所述，为 secrets 使用 secret store。
{{% /alert %}}

## 规范 metadata 字段

| 字段 | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| redisHost | Y | redis 主机的连接字符串。如果 `"redisType"` 为 `"cluster"`，则可以是以逗号分隔的多个主机，也可以是单个主机。使用 Redis Sentinel（`"failover"` 为 `"true"`）时，也可以提供以逗号分隔的多个 sentinel 地址。 | `localhost:6379`, `redis-master.default.svc.cluster.local:6379`, `sentinel1:26379,sentinel2:26379,sentinel3:26379`
| redisPassword      | N        | Redis 主机的密码。无默认值。可以是 `secretKeyRef`，以使用 secret 引用  | `""`, `"KeFg23!"`
| redisUsername      | N        | Redis 主机的用户名。默认为空。请确保你的 redis 服务器版本为 6 或以上，并已正确创建 acl 规则。 | `""`, `"default"`
| consumerID         | N        | 消费者组 ID。  | 可以设置为字符串值（如上例中的 `"channel1"`），或字符串格式的值（如 `"{podName}"` 等）。[查看你可以在 component metadata 中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| useEntraID | N | 为 Azure Cache for Redis 实现 EntraID 支持。在启用此功能之前：<ul><li>`redisHost` 名称必须以 `"server:port"` 的形式指定</li><li>必须启用 TLS</li></ul> 要了解有关此设置的更多信息，请参阅[创建 Redis 实例 > Azure Cache for Redis]({{% ref "#setup-redis" %}}) | `"true"`, `"false"` |
| useOIDC | N | 使用 OpenID Connect，通过 `private_key_jwt` 客户端身份验证方法（RFC 7523）进行身份验证。从身份提供方获取的 OAuth2 访问令牌将用作 Redis `AUTH` 命令的密码，并会在过期前自动刷新。不得与 `redisPassword` 或 `useEntraID` 同时使用。该组件支持 [Redis state store 文档]({{% ref "setup-redis.md#oidc-private_key_jwt-authentication" %}}) 中记录的全部 `oidc*` metadata 字段。 | `"true"`, `"false"` |
| enableTLS          | N        | 如果 Redis 实例支持使用公共证书的 TLS，可以将其配置为启用或禁用。默认为 `"false"` | `"true"`, `"false"` |
| insecureSkipTLSVerify | N     | 当 `enableTLS` 为 `"true"` 时，跳过 TLS 证书验证。仅用于测试。默认为 `"false"` | `"true"`, `"false"` |
| clientCert        | N        | 客户端证书的内容，用于需要客户端证书的 Redis 实例。必须与 `clientKey` 一起使用，并且必须将 `enableTLS` 设置为 true。建议按照[此处]({{% ref component-secrets.md %}})所述，使用 secret store   | `"----BEGIN CERTIFICATE-----\nMIIC..."` |
| clientKey        | N        | 客户端私钥的内容，与 `clientCert` 结合使用以进行身份验证。建议按照[此处]({{% ref component-secrets.md %}})所述，使用 secret store | `"----BEGIN PRIVATE KEY-----\nMIIE..."` |
| redeliverInterval  | N        | 检查待处理消息以进行重新传递的时间间隔。可以是 Go 持续时间字符串（例如 "ms"、"s"、"m"），也可以是毫秒数值。默认为 `"15s"`。`"0"` 禁用重新传递。 | `"30s"`, `"30000"` |
| entryKeepAliveInterval | N    | sidecar 重置其所持有的待处理消息空闲时间的时间间隔，使已读取但尚未处理完成的消息在处理过程中不会被重新传递。默认为 `processingTimeout` 的一半。`"0"` 禁用保活机制，此时等待空闲工作进程的时间将计入 `processingTimeout`。 | `"30s"` |
| processingTimeout  | N        | 消息处于待处理状态的时长达到该值后，才会尝试重新传递该消息。可以是 Go 持续时间字符串（例如 "ms"、"s"、"m"），也可以是毫秒数值。默认为 `"60s"`。`"0"` 禁用重新传递。启用重新传递时，这也是应用处理程序的超时时间。从 1.18.5 起，它还会限制入站 resiliency 重试：超时后 Dapr 将停止重试；如果订阅配置了[死信主题]({{% ref pubsub-deadletter.md %}})，则会将消息发送到该死信主题。 | `"60s"`, `"600000"` |
| queueDepth         | N        | 用于处理的消息队列大小。默认为 `"100"`。 | `"1000"`
| concurrency        | N        | 同时处理消息的并发工作进程数。默认为 `"10"`。 | `"15"`
| redisType        | N        | Redis 的类型。有两个有效值：一个是 `"node"`，表示单节点模式；另一个是 `"cluster"`，表示 Redis 集群模式。默认为 `"node"`。 | `"cluster"`
| redisDB        | N        | 连接 Redis 后选择的数据库。如果 `"redisType"` 为 `"cluster"`，则忽略此选项。默认为 `"0"`。 | `"0"`
| redisMaxRetries        | N        | 放弃前重试命令的最大次数。默认不重试失败的命令。  | `"5"`
| redisMinRetryInterval        | N        | 每次重试之间，Redis 命令的最小退避时间。默认为 `"8ms"`；`"-1"` 禁用退避。 | `"8ms"`
| redisMaxRetryInterval        | N        | 每次重试之间，Redis 命令的最大退避时间。默认为 `"512ms"`；`"-1"` 禁用退避。 | `"5s"`
| dialTimeout        | N        | 建立新连接的拨号超时时间。默认为 `"5s"`。  | `"5s"`
| readTimeout        | N        | 套接字读取超时。如果设置为 `"0s"`，读取将阻塞。达到超时后，Redis 命令将失败并返回超时错误，而不是阻塞。默认为 `"0s"`，`"-1"` 表示无超时。 | `"3s"`
| writeTimeout        | N        | 套接字写入超时。达到超时后，Redis 命令将失败并返回超时错误，而不是阻塞。默认与 readTimeout 相同。 | `"3s"`
| poolSize        | N        | 套接字连接的最大数量。默认为 runtime.NumCPU 报告的每个 CPU 10 个连接。 | `"20"`
| poolTimeout        | N        | 所有连接都忙碌时，客户端等待连接的时长，超时后返回错误。默认为 readTimeout 加 1 秒。 | `"5s"`
| maxConnAge        | N        | 连接达到该存活时长后，客户端将淘汰（关闭）该连接。默认不关闭超龄连接。 | `"30m"`
| minIdleConns        | N        | 为避免创建新连接带来的性能下降，需保持打开的最小空闲连接数。默认为 `"0"`。 | `"2"`
| idleCheckFrequency        | N        | 空闲连接回收器进行空闲检查的频率。默认为 `"1m"`。`"-1"` 禁用空闲连接回收器。 | `"-1"`
| idleTimeout        | N        | 客户端关闭空闲连接之前的时长。应小于服务器的超时时间。默认为 `"5m"`。`"-1"` 禁用空闲超时检查。 | `"10m"`
| failover           | N         | 启用故障转移配置的属性。需要设置 sentinelMasterName。启用后，redisHost 应包含 sentinel 地址。默认为 `"false"` | `"true"`, `"false"`
| sentinelMasterName | N         | sentinel 主节点名称。请参阅 [Redis Sentinel 文档](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/) | `""`,  `"mymaster"`
| sentinelUsername   | N         | Redis Sentinel 的用户名。仅在 "failover" 为 true 且 Redis Sentinel 启用了身份验证时适用。 | `"username"`
| sentinelPassword   | N         | Redis Sentinel 的密码。仅在 "failover" 为 true 且 Redis Sentinel 启用了身份验证时适用。 | `"password"`
| maxLenApprox        | N        | 流中的最大条目数。达到指定长度后，旧条目会被自动淘汰，使流保持恒定大小。默认不限制。不能与 streamTTL 同时使用；同一时间只能启用一种流修剪策略。 | `"10000"`
| streamTTL        | N        | 流条目的 TTL 时长。早于该时长的条目将被淘汰。这是一个近似值，因为它是通过带 '~' 修饰符的 Redis 流 `MINID` 修剪实现的。实际保留的条目可能比 TTL 严格定义的数量略多，因为 Redis 为提高效率，可能会保留一些额外条目以优化修剪操作。不能与 maxLenApprox 同时使用；同一时间只能启用一种流修剪策略。 | `"30d"`

## 支持的服务器和版本

Dapr 的 Redis pub/sub 组件已针对以下 Redis 和 Valkey 版本进行测试：

| 服务器 | 版本 |
|--------|----------|
| Redis | 6.x, 7.x |
| [Valkey](https://valkey.io) | 8.x, 9.x |

## 创建 Redis 实例

Dapr 可以使用任何 Redis 实例：容器化部署的、在本地开发机上运行的，或托管的云服务。该组件已针对 Redis 6.x 和 7.x，以及 [Valkey](https://valkey.io) 8.x 和 9.x 进行过测试。

{{< tabpane text=true >}}

{{% tab "自托管" %}}
Dapr CLI 会自动为你创建并设置 Redis Streams 实例。
运行 `dapr init` 时，Redis 实例将通过 Docker 安装，并且 component 文件将创建在默认目录中（Mac/Linux 上为 `$HOME/.dapr/components` 目录，Windows 上为 `%USERPROFILE%\.dapr\components`）。
{{% /tab %}}

{{% tab "Kubernetes" %}}
你可以使用 [Helm](https://helm.sh/) 在 Kubernetes 集群中快速创建 Redis 实例。此方法需要先[安装 Helm](https://github.com/helm/helm#install)。

1. 将 Redis 安装到你的集群中。
    ```bash
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install redis bitnami/redis --set image.tag=6.2
    ```

2. 运行 `kubectl get pods`，查看集群中当前正在运行的 Redis 容器。
3. 在 redis.yaml 文件中，将 `redis-master:6379` 添加为 `redisHost`。例如：

    ```yaml
        metadata:
        - name: redisHost
          value: redis-master:6379
    ```

4. 接下来，获取 Redis 密码。具体操作因所用操作系统而略有不同：
    - **Windows**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" > encoded.b64`，这将创建一个包含编码后密码的文件。接着运行 `certutil -decode encoded.b64 password.txt`，将 Redis 密码写入名为 `password.txt` 的文本文件。复制密码，然后删除这两个文件。

    - **Linux/MacOS**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" | base64 --decode`，并复制输出的密码。

    将此密码添加为 redis.yaml 文件中的 `redisPassword` 值。例如：

    ```yaml
        - name: redisPassword
          value: "lhDOkwTlp0"
    ```

{{% /tab %}}

{{% tab "AWS" %}}
[AWS Redis](https://aws.amazon.com/redis/)
{{% /tab %}}

{{% tab "Azure" %}}
1. [使用 Microsoft 官方文档创建 Azure Cache for Redis 实例。](https://docs.microsoft.com/azure/azure-cache-for-redis/quickstart-create-redis)

1. 实例创建完成后，从 Azure 门户获取主机名（完全限定域名，FQDN）和访问密钥。
   - 对于主机名：
     - 进入资源的**概述**页面。
     - 复制**主机名**的值。
   - 对于访问密钥：
     - 进入**设置** > **访问密钥**。
     - 复制并保存你的密钥。

1. 将密钥和主机名添加到一个 Dapr 可以应用到集群的 `redis.yaml` 文件中。
   - 如果你正在运行示例，请将主机和密钥添加到提供的 `redis.yaml` 中。
   - 如果你是从零开始创建项目，请按照[Component 格式部分](#component-格式)中的说明创建 `redis.yaml` 文件。

1. 将 `redisHost` 键设置为 `[HOST NAME FROM PREVIOUS STEP]:6379`，并将 `redisPassword` 键设置为你之前保存的密钥。

   **注意：** 在生产级应用中，请按照 [secret 管理]({{% ref component-secrets.md %}}) 的说明安全地管理你的 secrets。

1. 启用 EntraID 支持：
   - 在你的 Azure Redis 服务器上启用 Entra ID 身份验证。这可能需要几分钟。
   - 将 `useEntraID` 设置为 `"true"`，以为 Azure Cache for Redis 实现 EntraID 支持。

1. 将 `enableTLS` 设置为 `"true"` 以支持 TLS。

> **注意：**`useEntraID` 假定你的 UserPrincipal（通过 AzureCLICredential）或 SystemAssigned 托管标识具有 RedisDataOwner 角色权限。如果使用的是用户分配标识，[你需要指定 `azureClientID` 属性]({{% ref "howto-mi.md#set-up-identities-in-your-component" %}})。

{{% /tab %}}

{{% tab "GCP" %}}
[GCP Cloud MemoryStore](https://cloud.google.com/memorystore/)
{{% /tab %}}

{{< /tabpane >}}


{{% alert title="注意" color="primary" %}}
Dapr CLI 会在自托管模式下，作为 `dapr init` 命令的一部分自动部署本地 Redis 实例。
{{% /alert %}}

## Redis Sentinel 配置

使用 Redis Sentinel 实现高可用时，将 `redisType` 设置为 `"node"`，通过 `failover: "true"` 启用故障转移模式，并提供 sentinel 主节点名称。可以在 `redisHost` 字段中以逗号分隔的列表形式指定多个 sentinel 地址，以实现冗余。

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

## Resiliency 与重新传递

Redis Streams pubsub 组件遵循 [Dapr resiliency 策略]({{% ref "resiliency-overview" %}})。在你的
应用处理程序返回（成功、重试或丢弃）后，组件会向 Redis 确认该消息。随后 Redis
将停止重新传递该消息。重试和死信行为由你的 resiliency 策略控制（例如 `maxRetries` 和重试持续时间）。

## 相关链接
- [Dapr component 的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})，了解如何配置 pub/sub 组件
- [Pub/Sub building block]({{% ref pubsub %}})
