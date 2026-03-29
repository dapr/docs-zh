---
type: docs
title: "Redis"
linkTitle: "Redis"
description: Redis lock 组件的详细信息
---

## 组件格式

要设置 Redis lock，请创建一个类型为 `lock.redis` 的组件。请参阅[此指南]({{% ref "howto-use-distributed-lock" %}})了解如何创建 lock。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: <HOST>
  - name: redisPassword #可选。
    value: <PASSWORD>
  - name: useEntraID
    value: <bool> # 可选。允许值：true, false。
  - name: enableTLS
    value: <bool> # 可选。允许值：true, false。
  - name: failover
    value: <bool> # 可选。允许值：true, false。
  - name: sentinelMasterName
    value: <string> # 可选
  - name: maxRetries
    value: # 可选
  - name: maxRetryBackoff
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
```

{{% alert title="警告" color="warning" %}}
上面的示例将 secret 用作纯文本字符串。建议使用 secret store 来管理 secret，具体方法请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}


## 规范元数据字段

| 字段                 | 必填  | 详情                                                                                                                                                                                                                                                                                                           | 示例                                                         |
|-----------------------|:--------:|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| redisHost             |    Y     | Redis 主机的连接字符串。如果 `"redisType"` 是 `"cluster"`，它可以是多个以逗号分隔的主机，也可以是单个主机。当使用 Redis Sentinel（`"failover"` 为 `"true"`）时，也可以提供多个 sentinel 地址，以逗号分隔的值的形式。 | `localhost:6379`, `redis-master.default.svc.cluster.local:6379`, `sentinel1:26379,sentinel2:26379,sentinel3:26379` 主机                                                                                                                                                                                                                                                                              | `localhost:6379`, `redis-master.default.svc.cluster.local:6379` |
| redisPassword         |    N     | Redis 主机的密码。默认无。可以是 `secretKeyRef` 以使用 secret 引用                                                                                                                                                                                                                              | `""`, `"KeFg23!"`                                               |
| redisUsername         |    N     | Redis 主机的用户名。默认为空。请确保您的 redis 服务器版本为 6 或更高版本，并且已正确创建 acl 规则。                                                                                                                                                                               | `""`, `"default"`                                               |
| useEntraID            |    N     | 为 Azure Cache for Redis 实现 EntraID 支持。在启用此功能之前：<ul><li>`redisHost` 名称必须以 `"server:port"` 的形式指定</li><li>必须启用 TLS</li></ul> 在[创建 Redis 实例 > Azure Cache for Redis]({{% ref "#setup-redis" %}})下了解有关此设置的更多信息 | `"true"`, `"false"`                                             |
| enableTLS             |    N     | 如果 Redis 实例支持具有公共证书的 TLS，可以配置为启用或禁用。默认为 `"false"`                                                                                                                                                                                   | `"true"`, `"false"`                                             |
| maxRetries            |    N     | 放弃前的最大重试次数。默认为 `3`                                                                                                                                                                                                                                                       | `5`, `10`                                                       |
| maxRetryBackoff       |    N     | 每次重试之间的最大退避时间。默认为 `2` 秒；`"-1"` 禁用退避。                                                                                                                                                                                                                             | `3000000000`                                                    |
| failover              |    N     | 用于启用故障转移配置的属性。需要设置 sentinelMasterName。启用后，redisHost 应包含 sentinel 地址。默认为 `"false"` | `"true"`, `"false"`                                             |
| sentinelMasterName    |    N     | Sentinel 主节点名称。请参阅 [Redis Sentinel 文档](https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/)                                                                                                                                                                                                              | `"mymaster"`                                                    |
| sentinelPassword      |    N     |  Redis Sentinel 的密码。默认无。仅当 "failover" 为 true 且 Redis Sentinel 已启用身份验证时适用 | `""`, `"KeFg23!"`
| redeliverInterval     |    N     | 检查待重新传递的消息之间的间隔。默认为 `"60s"`。`"0"` 禁用重新传递。                                                                                                                                                                                                | `"30s"`                                                         |
| processingTimeout     |    N     | 消息在尝试重新传递之前必须待处理的时间量。默认为 `"15s"`。`"0"` 禁用重新传递。                                                                                                                                                                                   | `"30s"`                                                         |
| redisType             |    N     | Redis 的类型。有两个有效值，一个是 `"node"` 用于单节点模式，另一个是 `"cluster"` 用于 redis 集群模式。默认为 `"node"`。                                                                                                                                                       | `"cluster"`                                                     |
| redisDB               |    N     | 连接到 redis 后选择的数据库。如果 `"redisType"` 是 `"cluster"`，此选项将被忽略。默认为 `"0"`。                                                                                                                                                                                           | `"0"`                                                           |
| redisMaxRetries       |    N     | `maxRetries` 的别名。如果设置了两个值，则忽略 `maxRetries`。                                                                                                                                                                                                                                           | `"5"`                                                           |
| redisMinRetryInterval |    N     | 每次重试之间 redis 命令的最小退避时间。默认为 `"8ms"`； `"-1"` 禁用退避。                                                                                                                                                                                                              | `"8ms"`                                                         |         
| redisMaxRetryInterval |    N     | `maxRetryBackoff` 的别名。如果设置了两个值，则忽略 `maxRetryBackoff`。                                                                                                                                                                                                                                 | `"5s"`                                                          |        
| dialTimeout           |    N     | 建立新连接的拨号超时时间。默认为 `"5s"`。                                                                                                                                                                                                                                                | `"5s"`                                                          |
| readTimeout           |    N     | 套接字读取的超时时间。如果达到超时，redis 命令将因超时而失败，而不是阻塞。默认为 `"3s"`，`"-1"` 表示无超时。                                                                                                                                                                     | `"3s"`                                                          |
| writeTimeout          |    N     | 套接字写入的超时时间。如果达到超时，redis 命令将因超时而失败，而不是阻塞。默认为 readTimeout。                                                                                                                                                                                      | `"3s"`                                                          |
| poolSize              |    N     | 套接字连接的最大数量。默认为运行时报告的每个 CPU 10 个连接（NumCPU）                                                                                                                                                                                                     | `"20"                                                           |
| poolTimeout           |    N     | 如果所有连接都忙，客户端等待连接的时间，然后返回错误。默认为 readTimeout + 1 秒。                                                                                                                                                                            | `"5s"`                                                          |
| maxConnAge            |    N     | 客户端停用（关闭）连接的连接年龄。默认是不关闭旧连接。                                                                                                                                                                                                     | `"30m"`                                                         |
| minIdleConns          |    N     | 保持打开的空闲连接的最小数量，以避免与创建新连接相关的性能下降。默认为 `"0"`。                                                                                                                                                        | `"2"`                                                           |
| idleCheckFrequency    |    N     | 空闲连接清理器执行的空闲检查频率。默认为 `"1m"`。`"-1"` 禁用空闲连接清理器。                                                                                                                                                                                             | `"-1"`                                                          |
| idleTimeout           |    N     | 客户端关闭空闲连接之后的时间量。应小于服务器的超时时间。默认为 `"5m"`。`"-1"` 禁用空闲超时检查。                                                                                                                                                       | `"10m"`                                                         |

## 设置 Redis

Dapr 可以使用任何 Redis 实例：容器化的、在本地开发机器上运行的，或托管的云服务。

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
当您运行 `dapr init` 时，会自动创建一个 Redis 实例作为 Docker 容器
{{% /tab %}}

{{% tab "Kubernetes" %}}
您可以使用 [Helm](https://helm.sh/) 在我们的 Kubernetes 集群中快速创建 Redis 实例。此方法需要[安装 Helm](https://github.com/helm/helm#install)。

1. 将 Redis 安装到您的集群中。请注意，我们显式地设置了一个镜像标签以获得大于 5 的版本，这是 Dapr 的发布/订阅功能所要求的。如果您打算仅将 Redis 用作状态存储（而不用于发布/订阅），则不必设置镜像版本。
    ```bash
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install redis bitnami/redis --set image.tag=6.2
    ```

2. 运行 `kubectl get pods` 以查看 Redis 容器现在在您的集群中运行。
3. 在您的 [redis.yaml](#component-format) 文件中添加 `redis-master:6379` 作为 `redisHost`。例如：
    ```yaml
        metadata:
        - name: redisHost
          value: redis-master:6379
    ```
4. 接下来，获取 Redis 密码，这根据我们使用的操作系统略有不同：
    - **Windows**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" > encoded.b64`，这将创建一个包含编码密码的文件。接下来，运行 `certutil -decode encoded.b64 password.txt`，这会将您的 redis 密码放入名为 `password.txt` 的文本文件中。复制密码并删除这两个文件。

    - **Linux/MacOS**：运行 `kubectl get secret --namespace default redis -o jsonpath="{.data.redis-password}" | base64 --decode` 并复制输出的密码。

    将此密码作为 `redisPassword` 值添加到您的 [redis.yaml](#component-format) 文件中。例如：
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

1. 创建实例后，从 Azure 门户获取主机名（FQDN）和您的访问密钥。 
   - 对于主机名： 
     - 导航到资源的**概览**页面。
     - 复制**主机名**值。
   - 对于您的访问密钥： 
     - 导航到**设置** > **访问密钥**。 
     - 复制并保存您的密钥。

1. 将您的密钥和主机名添加到 Dapr 可以应用于您的集群的 `redis.yaml` 文件中。 
   - 如果您正在运行示例，请将主机和密钥添加到提供的 `redis.yaml` 中。 
   - 如果您是从头开始创建项目，请按照[组件格式部分](#component-format)中的说明创建 `redis.yaml` 文件。 
   
1. 将 `redisHost` 键设置为 `[上一步中的主机名]:6379`，将 `redisPassword` 键设置为之前保存的密钥。 
   
   **注意：** 在生产级应用程序中，请遵循 [secret 管理]({{% ref component-secrets.md %}}) 说明来安全管理您的 secret。

1. 启用 EntraID 支持：
   - 在您的 Azure Redis 服务器上启用 Entra ID 身份验证。这可能需要几分钟时间。
   - 将 `useEntraID` 设置为 `"true"` 以为 Azure Cache for Redis 实现 EntraID 支持。

1. 将 `enableTLS` 设置为 `"true"` 以支持 TLS。 

> **注意：**`useEntraID` 假定您的 UserPrincipal（通过 AzureCLICredential）或 SystemAssigned 托管标识具有 RedisDataOwner 角色权限。如果使用用户分配的标识，[您需要指定 `azureClientID` 属性]({{% ref "howto-mi.md#set-up-identities-in-your-component" %}})。

{{% /tab %}}

{{% tab "GCP" %}}
[GCP Cloud MemoryStore](https://cloud.google.com/memorystore/)
{{% /tab %}}

{{< /tabpane >}}


## Redis Sentinel 行为

连接到 Redis Sentinel 时，请使用 `redisType: "node"`。此外，将 `failover` 设置为 `"true"`，并将 `sentinelMasterName` 设置为主节点的名称。可以在 `redisHost` 字段中以逗号分隔的列表形式指定多个 sentinel 地址以实现冗余。

故障转移特征：
- 故障转移期间的锁丢失：如果锁在原始主节点故障之前未复制到提升的副本，则在主节点故障转移期间可能会丢失锁
- 故障转移窗口：自动主节点提升期间服务器短暂不可用（通常为几秒）
- 一致性：所有操作都路由到当前主节点，保持锁一致性

{{% alert title="警告" color="warning" %}}
请考虑运行 Redis 的高可用性和故障转移与故障转移事件期间可能丢失的锁之间的权衡。您的应用程序应能容忍故障转移场景期间的短暂锁丢失。
{{% /alert %}}

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [分布式锁构建块]({{% ref distributed-lock-api-overview %}})
