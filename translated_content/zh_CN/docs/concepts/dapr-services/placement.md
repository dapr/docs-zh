---
type: docs
title: "Dapr Placement 控制平面服务概述"
linkTitle: "Placement"
description: "Dapr Placement 服务概述"
---

Dapr Placement 服务用于计算和分发运行在[自托管模式]({{% ref self-hosted %}})或 [Kubernetes]({{% ref kubernetes %}})上的 [Dapr actors]({{% ref actors %}}) 位置的分布式哈希表。哈希表按命名空间分组，将 actor 类型映射到 pod 或进程，以便 Dapr 应用程序可以与 actor 通信。每当 Dapr 应用程序激活 Dapr actor 时，Placement 服务会使用最新的 actor 位置更新哈希表。

## 自托管模式

Placement 服务 Docker 容器作为 [`dapr init`]({{% ref self-hosted-with-docker %}}) 的一部分自动启动。如果您以 [slim-init 模式]({{% ref self-hosted-no-docker %}}) 运行，也可以作为进程手动运行。

## Kubernetes 模式

Placement 服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm 图表部署。您可以在高可用（HA）模式下运行 Placement。[了解有关在 Kubernetes 服务中设置 HA 模式的更多信息。]({{% ref "kubernetes-production#individual-service-ha-helm-configuration" %}})

有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## Placement 表

有一个[Placement 服务的 HTTP API `/placement/state`]({{% ref placement_api %}}) 用于暴露 placement 表信息。该 API 在 sidecar 上与 healthz 相同的端口上暴露。这是一个未经身份验证的端点，默认情况下被禁用。您需要将 `DAPR_PLACEMENT_METADATA_ENABLED` 环境变量或 `metadata-enabled` 命令行参数设置为 true 来启用它。如果您使用 helm，只需将 `dapr_placement.metadataEnabled` 设置为 true。

{{% alert title="重要" color="warning" %}}
当将 actors 部署到不同的命名空间时（{{% ref namespaced-actors %}}），如果您想阻止从所有命名空间检索 actors，建议禁用 `metadata-enabled`。metadata 端点作用于所有命名空间。
{{% /alert %}}

### 用例
placement 表 API 可用于检索当前的 placement 表，其中包含在所有命名空间中注册的所有 actors。这对于调试和允许工具提取并呈现有关 actors 的信息很有帮助。

### HTTP 请求

```
GET http://localhost:<healthzPort>/placement/state
```

### HTTP 响应代码

代码 | 描述
---- | -----------
200  | 返回 Placement 表信息
500  | Placement 无法返回 Placement 表信息

### HTTP 响应体

**Placement 表 API 响应对象**

名称                   | 类型                                                                  | 描述
----                   | ----                                                                  | -----------
tableVersion           | int                                                                   | Placement 表版本
hostList               | [Actor 主机信息](#actorhostinfo)[]                                   | 已注册 actor 主机信息的 json 数组。

<a id="actorhostinfo"></a>**Actor 主机信息**

名称  | 类型    | 描述
----  | ----    | -----------
name  | string  | actor 的 host:port 地址。
appId | string  | app id。
actorTypes | json string array | 它托管的 actor 类型列表。
updatedAt | timestamp | actor 注册/更新的时间戳。

### 示例

```shell
 curl localhost:8080/placement/state
```

```json
{
    "hostList": [{
            "name": "198.18.0.1:49347",
            "namespace": "ns1",
            "appId": "actor1",
            "actorTypes": ["testActorType1", "testActorType3"],
            "updatedAt": 1690274322325260000
        },
        {
            "name": "198.18.0.2:49347",
            "namespace": "ns2",
            "appId": "actor2",
            "actorTypes": ["testActorType2"],
            "updatedAt": 1690274322325260000
        },
        {
            "name": "198.18.0.3:49347",
            "namespace": "ns2",
            "appId": "actor2",
            "actorTypes": ["testActorType2"],
            "updatedAt": 1690274322325260000
        }
    ],
    "tableVersion": 1
}
```

## 禁用 Placement 服务

可以使用以下设置禁用 Placement 服务：

```
global.actors.enabled=false
```

在 Kubernetes 模式下，使用此设置不会部署 Placement 服务。这不仅会禁用 actor 部署，还会禁用工作流，因为工作流使用 actors。但是，此设置仅适用于 Kubernetes 模式，而使用 `--slim` 初始化 Dapr 会阻止在自托管模式下部署 Placement 服务。

有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面](https://docs.dapr.io/operations/hosting/kubernetes/)。

## 相关链接

[了解有关 Placement API 的更多信息。]({{% ref placement_api %}})
