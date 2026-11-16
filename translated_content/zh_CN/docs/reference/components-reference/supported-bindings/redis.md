---
type: docs
title: "Redis 绑定规范"
linkTitle: "Redis"
description: "Redis 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/redis/"
---

## 组件格式

要设置 Redis 绑定，请创建一个类型为 `bindings.redis` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.redis
  version: v1
  metadata:
  - name: redisHost
    value: "<address>:6379"
  - name: redisPassword
    value: "**************"
  - name: useEntraID
    value: "true"
  - name: enableTLS
    value: "<bool>"
  - name: insecureSkipTLSVerify
    value: "<bool>"
```

{{% alert title="警告" color="warning" %}}
上面的示例将机密以明文字符串的形式使用。建议按[此处]({{% ref component-secrets.md %}})所述，将机密保存在机密存储中。
{{% /alert %}}

## 规范元数据字段

| 字段 | 必需 | 绑定支持 | 详细说明 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `redisHost` | Y | 输出 | Redis 主机的连接字符串。如果 `"redisType"` 为 `"cluster"`，可以是以逗号分隔的多个主机，也可以是单个主机。使用 Redis Sentinel（`"failover"` 为 `"true"`）时，也可以以逗号分隔的值提供多个 Sentinel 地址。 | `localhost:6379`, `redis-master.default.svc.cluster.local:6379`, `sentinel1:26379,sentinel2:26379,sentinel3:26379` |
| `redisPassword` | N | 输出 | Redis 密码 | `"password"` |
| `redisUsername` | N | 输出 | Redis 主机的用户名。默认为空。请确保 Redis 服务器版本为 6 或以上，并已正确创建 ACL 规则。 | `"username"` |
| `useEntraID` | N | 输出 | 为 Azure Cache for Redis 实现 EntraID 支持。启用前需要：<ul><li>`redisHost` 名称必须以 `"server:port"` 的形式指定</li><li>必须启用 TLS</li></ul> 详细了解此设置，请参阅 [创建 Redis 实例 > Azure Cache for Redis]({{% ref "#创建-redis-实例" %}}) | `"true"`, `"false"` |
| `useOIDC` | N | 输出 | 使用 `private_key_jwt` 客户端身份验证方法（RFC 7523）的 OpenID Connect 进行身份验证。从身份提供方获取的 OAuth2 访问令牌会被用作 Redis `AUTH` 命令的密码，并在过期前自动刷新。不得与 `redisPassword` 或 `useEntraID` 同时使用。此组件支持 [Redis 状态存储文档]({{% ref "setup-redis.md#oidc-private_key_jwt-authentication" %}})中记录的全部 `oidc*` 元数据字段 | `"true"`, `"false"` |
| `enableTLS` | N | 输出 | 如果 Redis 实例支持使用公共证书的 TLS，可以配置为启用或禁用 TLS。默认为 `"false"` | `"true"`, `"false"` |
| `insecureSkipTLSVerify` | N | 输出 | 当 `enableTLS` 为 `"true"` 时，跳过 TLS 证书验证。仅用于测试。默认为 `"false"` | `"true"`, `"false"` |
| `clientCert`        | N | 输出        | 客户端证书的内容，用于需要客户端证书的 Redis 实例。必须与 `clientKey` 一起使用，且 `enableTLS` 必须设为 true。建议按[此处]({{% ref component-secrets.md %}})所述使用机密存储 | `"----BEGIN CERTIFICATE-----\nMIIC..."` |
| `clientKey`        | N | 输出        | 客户端私钥的内容，与 `clientCert` 一起用于身份验证。建议按[此处]({{% ref component-secrets.md %}})所述使用机密存储 | `"----BEGIN PRIVATE KEY-----\nMIIE..."` |
| `failover`           | N | 输出         | 启用故障转移配置的属性。需要设置 sentinelMasterName。启用后，redisHost 应包含 Sentinel 地址。默认为 `"false"` | `"true"`, `"false"`
| `sentinelMasterName` | N | 输出         | Sentinel 主节点名称。参见 [Redis Sentinel 文档](https://redis.io/docs/reference/sentinel-clients/) | `""`,  `"mymaster"`
| `sentinelUsername`   | N | 输出         | Redis Sentinel 的用户名。仅当 "failover" 为 "true" 且 Redis Sentinel 启用了身份验证时适用 | `"username"`
| `sentinelPassword`   | N | 输出         | Redis Sentinel 的密码。仅当 "failover" 为 "true" 且 Redis Sentinel 启用了身份验证时适用 | `"password"`
| `redeliverInterval`  | N | 输出        | 检查待重新投递消息的时间间隔。默认为 `"60s"`。`"0"` 表示禁用重新投递。 | `"30s"`
| `processingTimeout`  | N | 输出        | 消息处于待处理状态多久后才会尝试重新投递。默认为 `"15s"`。`"0"` 表示禁用重新投递。 | `"30s"`
| `redisType`        | N | 输出        | Redis 的类型。有两个有效值：`"node"` 表示单节点模式，`"cluster"` 表示 Redis 集群模式。默认为 `"node"`。 | `"cluster"`
| `redisDB`        | N | 输出        | 连接 Redis 后选择的数据库。如果 `"redisType"` 为 `"cluster"`，则忽略此选项。默认为 `"0"`。 | `"0"`
| `redisMaxRetries`        | N | 输出        | 放弃之前可重试命令的最大次数。默认不重试失败的命令。  | `"5"`
| `redisMinRetryInterval`        | N | 输出        | 命令每次重试之间的最小退避时间。默认为 `"8ms"`；`"-1"` 表示禁用退避。 | `"8ms"`
| `redisMaxRetryInterval`        | N | 输出        | 命令每次重试之间的最大退避时间。默认为 `"512ms"`；`"-1"` 表示禁用退避。 | `"5s"`
| `dialTimeout`        | N | 输出        | 建立新连接的拨号超时。默认为 `"5s"`。  | `"5s"`
| `readTimeout`        | N | 输出        | 套接字读取超时。达到后，Redis 命令会以超时失败，而不是阻塞。默认为 `"3s"`，`"-1"` 表示无超时。 | `"3s"`
| `writeTimeout`        | N | 输出        | 套接字写入超时。达到后，Redis 命令会以超时失败，而不是阻塞。默认与 readTimeout 相同。 | `"3s"`
| `poolSize`        | N | 输出        | 最大套接字连接数。默认为运行时（runtime.NumCPU）报告的每个 CPU 10 个连接。 | `"20"`
| `poolTimeout`        | N | 输出        | 所有连接都忙碌时，客户端等待连接并在返回错误前的时长。默认为 readTimeout 加 1 秒。 | `"5s"`
| `maxConnAge`        | N | 输出        | 客户端使连接退役（关闭）时的连接时长。默认为不关闭超龄连接。 | `"30m"`
| `minIdleConns`        | N | 输出        | 为避免新建连接带来的性能损耗而保持打开的最小空闲连接数。默认为 `"0"`。 | `"2"`
| `idleCheckFrequency`        | N | 输出        | 空闲连接回收器进行空闲检查的频率。默认为 `"1m"`。`"-1"` 表示禁用空闲连接回收器。 | `"-1"`
| `idleTimeout`        | N | 输出        | 客户端关闭空闲连接前的时长。应小于服务器的超时时间。默认为 `"5m"`。`"-1"` 表示禁用空闲超时检查。 | `"10m"`

## 绑定支持

此组件支持以下操作的**输出绑定**：

- `create`
- `get`
- `delete`

### create

你可以使用 `create` 操作在 Redis 中存储一条记录。该操作会设置一个用于保存值的键。如果键已存在，则覆盖其值。

#### 请求

```json
{
  "operation": "create",
  "metadata": {
    "key": "key1"
  },
  "data": {
    "Hello": "World",
    "Lorem": "Ipsum"
  }
}
```

#### 响应

成功时返回 HTTP 204（No Content）和空正文。

### get

你可以使用 `get` 操作获取 Redis 中的一条记录。该操作获取之前设置的键。

该操作接受可选参数 `delete`，默认为 `false`。设为 `true` 时，该操作会使用 Redis 的 `GETDEL` 命令。例如，它会返回之前设置的 `value`，然后将其删除。

#### 请求

```json
{
  "operation": "get",
  "metadata": {
    "key": "key1"
  },
  "data": {
  }
}
```

#### 响应

```json
{
  "data": {
    "Hello": "World",
    "Lorem": "Ipsum"
  }
}
```

#### 带 delete 标志的请求

```json
{
  "operation": "get",
  "metadata": {
    "key": "key1",
    "delete": "true"
  },
  "data": {
  }
}
```

### delete

你可以使用 `delete` 操作删除 Redis 中的一条记录。无论键是否存在，都返回成功。

#### 请求

```json
{
  "operation": "delete",
  "metadata": {
    "key": "key1"
  }
}
```

#### 响应

成功时返回 HTTP 204（No Content）和空正文。


## 支持的服务器和版本

Dapr 的 Redis 绑定组件已针对以下 Redis 和 Valkey 版本进行测试：

| 服务器 | 版本 |
|--------|----------|
| Redis | 6.x, 7.x |
| [Valkey](https://valkey.io) | 8.x, 9.x |

## 创建 Redis 实例

Dapr 可以使用任何 Redis 实例：容器化的、运行在本地开发机上的，或托管的云服务。

{{< tabpane text=true >}}

{{% tab "自托管" %}}
Dapr CLI 会自动为你创建并设置一个 Redis Streams 实例。运行 `dapr init` 时，Redis 实例会通过 Docker 安装，组件文件也会创建在默认目录中（Mac/Linux 上为 `$HOME/.dapr/components` 目录，Windows 上为 `%USERPROFILE%\.dapr\components`）。
{{% /tab %}}

{{% tab "Kubernetes" %}}
你可以使用 [Helm](https://helm.sh/) 在 Kubernetes 集群中快速创建一个 Redis 实例。此方法需要先[安装 Helm](https://github.com/helm/helm#install)。

1. 将 Redis 安装到你的集群中。
    ```bash
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install redis bitnami/redis --set image.tag=6.2
    ```

2. 运行 `kubectl get pods`，查看集群中正在运行的 Redis 容器。
3. 在 redis.yaml 文件中将 `redis-master:6379` 设为 `redisHost`。例如：

    ```yaml
        metadata:
        - name: redisHost
          value: redis-master:6379
    ```

4. 接下来，获取 Redis 密码，具体操作因所用操作系统而略有不同：
    - **Windows**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" > encoded.b64`，这会生成一个包含编码后密码的文件。接着运行 `certutil -decode encoded.b64 password.txt`，将 Redis 密码写入名为 `password.txt` 的文本文件。复制密码，然后删除这两个文件。

    - **Linux/MacOS**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" | base64 --decode`，并复制输出的密码。

    将该密码设为 redis.yaml 文件中的 `redisPassword` 值。例如：

    ```yaml
        - name: redisPassword
          value: "lhDOkwTlp0"
    ```
{{% /tab %}}

{{% tab "AWS" %}}
[AWS Redis](https://aws.amazon.com/redis/)
{{% /tab %}}

{{% tab "Azure" %}}
1. [按照 Microsoft 官方文档创建 Azure Cache for Redis 实例。](https://docs.microsoft.com/azure/azure-cache-for-redis/quickstart-create-redis)

1. 实例创建完成后，从 Azure 门户获取主机名（FQDN）和访问密钥。
   - 对于主机名（完全限定域名，FQDN）：
     - 进入该资源的**概览**页面。
     - 复制**主机名**的值。
   - 对于访问密钥：
     - 进入**设置** > **访问密钥**。
     - 复制并保存密钥。

1. 将主机名和密钥添加到 Dapr 可应用到集群的 `redis.yaml` 文件中。
   - 如果你运行的是示例，请将主机名和密钥添加到提供的 `redis.yaml` 中。
   - 如果你从头创建项目，请按照[组件格式](#组件格式)一节的说明创建 `redis.yaml` 文件。

1. 将 `redisHost` 键设为 `[上一步中的主机名]:6379`，并将 `redisPassword` 键设为你之前保存的密钥。

   **注意：** 在生产级应用中，请按照[机密管理]({{% ref component-secrets.md %}})的说明安全地管理你的机密。

1. 启用 EntraID 支持：
   - 在 Azure Redis 服务器上启用 Entra ID 身份验证。这可能需要几分钟。
   - 将 `useEntraID` 设为 `"true"`，以便为 Azure Cache for Redis 实现 EntraID 支持。

1. 将 `enableTLS` 设为 `"true"`，以支持 TLS。

> **注意：**`useEntraID` 假定你的 UserPrincipal（通过 AzureCLICredential）或系统分配的托管标识具有 RedisDataOwner 角色权限。如果使用用户分配的标识，[需要指定 `azureClientID` 属性]({{% ref "howto-mi.md#set-up-identities-in-your-component" %}})。
{{% /tab %}}

{{% tab "GCP" %}}
[GCP Cloud MemoryStore](https://cloud.google.com/memorystore/)
{{% /tab %}}

{{< /tabpane >}}


{{% alert title="注意" color="primary" %}}
Dapr CLI 在自托管模式下，会作为 `dapr init` 命令的一部分自动部署本地 Redis 实例。
{{% /alert %}}

## Redis Sentinel 配置

使用 Redis Sentinel 实现高可用时，请将 `redisType` 设为 `"node"`，通过 `failover: "true"` 启用故障转移模式，并提供 Sentinel 主节点名称。可以在 `redisHost` 字段中以逗号分隔的列表形式指定多个 Sentinel 地址，以实现冗余。

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
- [绑定构建块]({{% ref bindings %}})
- [如何操作：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
