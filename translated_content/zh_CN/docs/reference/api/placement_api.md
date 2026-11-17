---
type: docs
title: "Placement API 参考"
linkTitle: "Placement API"
description: "Placement API 的详细文档"
weight: 1100
---

{{% alert title="弃用通知" color="warning" %}}
独立的 Placement 服务计划在 Dapr v1.21 中弃用，届时由 [Scheduler service]({{% ref scheduler %}}) 默认提供 actor 放置功能。在此之前，可通过可选标志 `global.scheduler.placement.enabled=true`（默认为 `false`）启用 Scheduler 放置功能。此 API 不由 Scheduler 提供。
{{% /alert %}}

Dapr 提供了一个 HTTP API `/placement/state`，供 Placement 服务使用，用于暴露 placement 表信息。该 API 通过 sidecar 上与 healthz 相同的端口暴露。这是一个未经身份验证的端点，默认处于禁用状态。

若要在自托管模式下启用 placement 元数据，可在 Placement 服务上将环境变量 `DAPR_PLACEMENT_METADATA_ENABLED` 或命令行参数 `metadata-enabled` 设置为 `true`。参见[如何在自托管模式下运行 Placement 服务]({{% ref "self-hosted-no-docker.md#enable-actors" %}})。

{{% alert title="重要" color="warning" %}}
当在[多租户模式]({{% ref namespaced-actors.md %}})下运行 placement 时，请禁用 `metadata-enabled` 命令行参数，以防止不同命名空间之间看到彼此的数据。
{{% /alert %}}

如果您使用 Helm 在 Kubernetes 上部署 Placement 服务，若要启用 placement 元数据，请将 `dapr_placement.metadataEnabled` 设置为 `true`。

> **注意：** 此 API 仅在独立的 Placement 服务中可用。当 Actor 放置由 [Scheduler service]({{% ref "placement#serving-placement-from-the-scheduler-service" %}}) 提供时，`/placement/state` 端点不可用。

## 用例

placement 表 API 可用于获取当前的 placement 表，其中包含所有已注册的 Actor。这有助于调试，并允许工具提取和展示有关 Actor 的信息。

## HTTP 请求

```
GET http://localhost:<healthzPort>/placement/state
```

## HTTP 响应代码

代码 | 描述
---- | -----------
200  | 返回 placement 表信息
500  | Placement 无法返回 placement 表信息

## HTTP 响应体

**Placement 表 API 响应对象**

名称                   | 类型                                                                  | 描述
----                   | ----                                                                  | -----------
tableVersion           | int                                                                   | placement 表版本
hostList               | [Actor 主机信息](#actorhostinfo)[]                                    | 已注册 Actor 主机信息的 json 数组。

<a id="actorhostinfo"></a>**Actor 主机信息**

名称  | 类型    | 描述
----  | ----    | -----------
name  | string  | Actor 的 host:port 地址。
appId | string  | app id。
actorTypes | json 字符串数组 | 其托管的 Actor 类型列表。
updatedAt | timestamp | Actor 注册或更新的时间戳。

## 示例

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
