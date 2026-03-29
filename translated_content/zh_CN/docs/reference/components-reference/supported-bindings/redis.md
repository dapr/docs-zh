---
type: docs
title: "Redis binding spec"
linkTitle: "Redis"
description: "Redis 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/redis/"
---

## 组件格式

要设置 Redis 绑定，需创建一个类型为 `bindings.redis` 的组件。请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。

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
```

{{% alert title="Warning" color="warning" %}}
上述示例使用明文字符串表示密钥。建议按照[此处]({{% ref component-secrets.md %}})的说明使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `redisHost` | Y | 输出 |  redis 主机的连接字符串。如果 `"redisType"` 为 `"cluster"`，可以是多个用逗号分隔的主机或单个主机。使用 Redis Sentinel（`"failover"` 为 `"true"`）时，也可以提供多个 sentinel 地址，用逗号分隔。 | `localhost:6379`, `redis-master.default.svc.cluster.local:6379`, `sentinel1:26379,sentinel2:26379,sentinel3:26379` |
| `redisPassword` | N | 输出 | Redis 密码 | `"password"` |
| `redisUsername` | N | 输出 | Redis 主机的用户名。默认为空。请确保您的 redis 服务器版本为 6 或以上，并且已正确创建 acl 规则。 | `"username"` |
| `useEntraID` | N | 输出 | 为 Azure Cache for Redis 实现 EntraID 支持。启用此功能前：<ul><li>`redisHost` 名称必须以 `"server:port"` 的形式指定</li><li>必须启用 TLS</li></ul> 在[创建 Redis 实例 > Azure Cache for Redis]({{% ref "#create-a-redis-instance" %}})下了解有关此设置的更多信息 | `"true"`, `"false"` |
| `enableTLS` | N | 输出 |  如果 Redis 实例支持带有公共证书的 TLS，可以配置为启用或禁用 TLS。默认为 `"false"` | `"true"`, `"false"` |
| `clientCert`        | N | 输出        | 客户端证书的内容，用于需要客户端证书的 Redis 实例。必须与 `clientKey` 一起使用，并且 `enableTLS` 必须设置为 true。建议按照[此处]({{% ref component-secrets.md %}})的说明使用密钥存储  | `"----BEGIN CERTIFICATE-----\nMIIC..."` |
| `clientKey`        | N | 输出        | 客户端私钥的内容，与 `clientCert` 结合使用进行身份验证。建议按照[此处]({{% ref component-secrets.md %}})的说明使用密钥存储  | `"----BEGIN PRIVATE KEY-----\nMIIE..."` |
| `failover`           | N | 输出         | 用于启用故障转移配置的属性。需要设置 sentinelMasterName。启用时，redisHost 应包含 sentinel 地址。默认为 `"false"` | `"true"`, `"false"`
| `sentinelMasterName` | N | 输出         | sentinel 主节点名称。请参阅 [Redis Sentinel 文档](https://redis.io/docs/reference/sentinel-clients/) | `""`,  `"mymaster"`
| `sentinelUsername`   | N | 输出         | Redis Sentinel 的用户名。仅在 "failover" 为 true 且 Redis Sentinel 已启用身份验证时适用 | `"username"`
| `sentinelPassword`   | N | 输出         | Redis Sentinel 的密码。仅在 "failover" 为 true 且 Redis Sentinel 已启用身份验证时适用 | `"password"`
| `redeliverInterval`  | N | 输出        | 检查待重新投递消息的间隔时间。默认为 `"60s"`。`"0"` 禁用重新投递。 | `"30s"`
| `processingTimeout`  | N | 输出        | 消息在尝试重新投递前必须保持待处理的时间量。默认为 `"15s"`。`"0"` 禁用重新投递。 | `"30s"`
| `redisType`        | N | 输出        | redis 的类型。有两个有效值，一个是 `"node"` 用于单节点模式，另一个是 `"cluster"` 用于 redis 集群模式。默认为 `"node"`。 | `"cluster"`
| `redisDB`        | N | 输出        | 连接到 redis 后选择的数据库。如果 `"redisType"` 是 `"cluster"`，则忽略此选项。默认为 `"0"`。 | `"0"`
| `redisMaxRetries`        | N | 输出        | 放弃前重试命令的最大次数。默认不重试失败的命令。  | `"5"`
| `redisMinRetryInterval`        | N | 输出        | 每次重试之间 redis 命令的最小退避时间。默认为 `"8ms"`； `"-1"` 禁用退避。 | `"8ms"`
| `redisMaxRetryInterval`        | N | 输出        | 每次重试之间 redis 命令的最大退避时间。默认为 `"512ms"`；`"-1"` 禁用退避。 | `"5s"`
| `dialTimeout`        | N | 输出        | 建立新连接的拨号超时时间。默认为 `"5s"`。  | `"5s"`
| `readTimeout`        | N | 输出        | 套接字读取超时时间。如果达到超时，redis 命令将以超时失败而不是阻塞。默认为 `"3s"`，`"-1"` 表示无超时。 | `"3s"`
| `writeTimeout`        | N | 输出        | 套接字写入超时时间。如果达到超时，redis 命令将以超时失败而不是阻塞。默认为 readTimeout。 | `"3s"`
| `poolSize`        | N | 输出        | 套接字连接的最大数量。默认为每个 CPU 10 个连接，由 runtime.NumCPU 报告。 | `"20"`
| `poolTimeout`        | N | 输出        | 如果所有连接都忙，客户端等待连接的时间量，然后返回错误。默认为 readTimeout + 1 秒。 | `"5s"`
| `maxConnAge`        | N | 输出        | 连接的年龄，客户端在该年龄后关闭连接。默认不关闭旧连接。 | `"30m"`
| `minIdleConns`        | N | 输出        | 保持打开的最小空闲连接数，以避免与创建新连接相关的性能下降。默认为 `"0"`。 | `"2"`
| `idleCheckFrequency`        | N | 输出        | 空闲连接清理器执行的空闲检查频率。默认为 `"1m"`。 `"-1"` 禁用空闲连接清理器。 | `"-1"`
| `idleTimeout`        | N | 输出        | 客户端关闭空闲连接的时间量。应小于服务器的超时时间。默认为 `"5m"`。 `"-1"` 禁用空闲超时检查。 | `"10m"`

## 绑定支持

此组件支持具有以下操作的**输出绑定**：

- `create`
- `get`
- `delete`

### create

您可以使用 `create` 操作在 Redis 中存储记录。这将设置一个键来保存一个值。如果该键已存在，则覆盖该值。

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

如果成功，返回 HTTP 204（无内容）和空正文。

### get

您可以使用 `get` 操作在 Redis 中获取记录。这将获取一个先前设置的键。

这采用一个可选参数 `delete`，默认为 `false`。当设置为 `true` 时，此操作使用 Redis 的 `GETDEL` 操作。例如，它返回先前设置的 `value` 然后删除它。

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

#### 带有 delete 标志的请求

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

您可以使用 `delete` 操作在 Redis 中删除记录。无论键是否存在，都返回成功。

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

如果成功，返回 HTTP 204（无内容）和空正文。


## 创建 Redis 实例

Dapr 可以使用任何 Redis 实例 - 容器化、在本地开发机器上运行或托管云服务，只要 Redis 的版本为 5.0.0 或更高版本。

*注意：Dapr 不支持 Redis >= 7。建议使用 Redis 6*

{{< tabpane text=true >}}

{{% tab "自托管" %}}
Dapr CLI 将自动为您创建并设置 Redis Streams 实例。
当您运行 `dapr init` 时，Redis 实例将通过 Docker 安装，组件文件将在默认目录中创建。（`$HOME/.dapr/components` 目录（Mac/Linux）或 Windows 上的 `%USERPROFILE%\.dapr\components`）。
{{% /tab %}}

{{% tab "Kubernetes" %}}
您可以使用 [Helm](https://helm.sh/) 在我们的 Kubernetes 集群中快速创建 Redis 实例。此方法需要[安装 Helm](https://github.com/helm/helm#install)。

1. 将 Redis 安装到您的集群中。
    ```bash
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install redis bitnami/redis --set image.tag=6.2
    ```

2. 运行 `kubectl get pods` 以查看 Redis 容器现在正在您的集群中运行。
3. 在您的 redis.yaml 文件中添加 `redis-master:6379` 作为 `redisHost`。例如：

    ```yaml
        metadata:
        - name: redisHost
          value: redis-master:6379
    ```

4. 接下来，我们将获取 Redis 密码，根据我们使用的操作系统略有不同：
    - **Windows**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" > encoded.b64`，这将创建一个包含您的编码密码的文件。接下来，运行 `certutil -decode encoded.b64 password.txt`，这会将您的 redis 密码放入名为 `password.txt` 的文本文件中。复制密码并删除这两个文件。

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

1. 实例创建后，从 Azure 门户获取主机名（FQDN）和访问密钥。 
   - 对于主机名： 
     - 导航到资源的**概述**页面。
     - 复制**主机名**值。
   - 对于访问密钥： 
     - 导航到**设置** > **访问密钥**。 
     - 复制并保存您的密钥。

1. 将您的密钥和主机名添加到 Dapr 可以应用到集群的 `redis.yaml` 文件中。 
   - 如果您正在运行示例，将主机和密钥添加到提供的 `redis.yaml` 中。 
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

使用 Redis Sentinel 实现高可用性时，将 `redisType` 设置为 `"node"`，使用 `failover: "true"` 启用故障转移模式，并提供 sentinel 主节点名称。可以在 `redisHost` 字段中以逗号分隔的列表形式指定多个 sentinel 地址以实现冗余。

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
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
