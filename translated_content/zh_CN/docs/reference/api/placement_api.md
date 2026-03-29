---
type: docs
title: "Placement API 参考"
linkTitle: "Placement API"
description: "Placement API 的详细文档"
weight: 1100
---

Dapr 为 Placement 服务提供了一个 HTTP API `/placement/state`，用于暴露 placement 表信息。该 API 在边车的 healthz 相同端口上暴露。这是一个未经身份验证的端点，默认情况下处于禁用状态。

若要在自承载模式下启用 placement 元数据，您可以在 Placement 服务上将 `DAPR_PLACEMENT_METADATA_ENABLED` 环境变量或 `metadata-enabled` 命令行参数设置为 `true`。参见[如何在自承载模式下运行 Placement 服务]({{% ref "self-hosted-no-docker.md#enable-actors" %}})。

{{% alert title="重要" color="warning" %}}
当在[多租户模式]({{% ref namespaced-actors.md %}})下运行 placement 时，请禁用 `metadata-enabled` 命令行参数，以防止不同命名空间看到彼此的数据。
{{% /alert %}}

如果您使用 Helm 在 Kubernetes 上部署 Placement 服务，若要启用 placement 元数据，请将 `dapr_placement.metadataEnabled` 设置为 `true`。

## 用例

placement 表 API 可用于获取当前的 placement 表，其中包含所有已注册的 actor。这对于调试很有帮助，并允许工具提取和展示有关 actor 的信息。

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
hostList               | [Actor Host Info](#actorhostinfo)[]                                   | 已注册 actor 主机信息的 json 数组。

<a id="actorhostinfo"></a>**Actor 主机信息**

名称  | 类型    | 描述
----  | ----    | -----------
name  | string  | actor 的 host:port 地址。
appId | string  | app id。
actorTypes | json 字符串数组 | 其托管的 actor 类型列表。
updatedAt | timestamp | actor 注册/更新的时间戳。

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
