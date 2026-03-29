---
type: docs
title: "Metadata API 参考"
linkTitle: "Metadata API"
description: "Metadata API 的详细文档"
weight: 1000
---

Dapr 有一个元数据 API，返回关于边车的信息，允许运行时可发现性。元数据端点返回以下信息。
- 运行时版本
- 已加载资源列表（`components`、`subscriptions` 和 `HttpEndpoints`）
- 注册的 actor 类型
- 启用的功能
- 应用程序连接详情
- 包含信息的自定义临时属性。

## Metadata API

### 组件
每个已加载的组件提供其名称、类型和版本，以及关于组件功能形式的支持功能信息。
这些功能可用于[状态存储]({{% ref supported-state-stores.md %}})和[绑定]({{% ref supported-bindings.md %}})组件类型。下表显示了给定版本的组件类型及其功能列表。此列表可能会在未来增长，仅代表已加载组件的功能。

组件类型 | 功能
---------------| ------------
状态存储    | ETAG, TRANSACTION, ACTOR, QUERY_API
绑定        | INPUT_BINDING, OUTPUT_BINDING

### HTTPEndpoints
每个已加载的 `HttpEndpoint` 提供一个名称，以轻松识别与运行时关联的 Dapr 资源。

### 订阅
元数据 API 返回应用程序已向 Dapr 运行时注册的发布订阅订阅列表。这包括发布订阅名称、主题、路由、死信主题、订阅类型以及与订阅关联的元数据。

### 启用的功能
通过 Configuration 规范启用的功能列表（包括构建时覆盖）。

### 应用连接详情
元数据 API 返回与 Dapr 到应用程序的连接相关的信息。这包括应用端口、协议、主机、最大并发数以及健康检查详情。

### Scheduler 连接详情
与到一个或多个 scheduler 主机的连接相关的信息。

### 工作流 API 运行时详情
与工作流 API 运行时详情相关的信息。

### 属性

元数据 API 允许您以键值对的格式存储额外的属性信息。这些是临时的内存中的数据，如果边车重新加载则不会持久化。此信息应在边车创建时添加（例如，应用程序启动后）。

## 获取 Dapr 边车信息

获取由元数据端点提供的 Dapr 边车信息。

### 用例：
获取元数据 API 可用于发现已加载组件支持的不同功能。它可以帮助运维人员确定要为所需功能配置哪些组件。

### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/metadata
```

### URL 参数

参数 | 描述
--------- | -----------
daprPort  | Dapr 端口。

### HTTP 响应代码

代码 | 描述
---- | -----------
200  | 返回元数据信息
500  | Dapr 无法返回元数据信息

### HTTP 响应正文

**元数据 API 响应对象**

名称                   | 类型                                                                  | 描述
----                   | ----                                                                  | -----------
id                     | string                                                                | 应用程序 ID
runtimeVersion         | string                                                                | Dapr 运行时版本
enabledFeatures        | string[]                                                              | 由 Dapr 配置启用的功能列表，请参阅 https://docs.dapr.io/operations/configuration/preview-features/
actors                 | [元数据 API 响应注册 Actor](#metadataapiresponseactor)[] | 注册的 actor 元数据的 json 编码数组。
extended.attributeName | string                                                                | 自定义属性列表，以键值对形式，其中键是属性名称。
components             | [元数据 API 响应组件](#metadataapiresponsecomponent)[]    | 已加载组件元数据的 json 编码数组。
httpEndpoints          | [元数据 API 响应 HttpEndpoint](#metadataapiresponsehttpendpoint)[] | 已加载 HttpEndpoints 元数据的 json 编码数组。
subscriptions          | [元数据 API 响应订阅](#metadataapiresponsesubscription)[] | 发布订阅订阅元数据的 json 编码数组。
appConnectionProperties| [元数据 API 响应应用连接属性](#metadataapiresponseappconnectionproperties) | 应用连接属性的 json 编码对象。
scheduler              | [元数据 API 响应调度器](#metadataapiresponsescheduler) | 调度器连接属性的 json 编码对象。
workflows              | [元数据 API 响应工作流](#metadataapiresponseworkflows) | 工作流运行时属性的 json 编码对象

<a id="metadataapiresponseactor"></a>**元数据 API 响应注册 Actor**

名称  | 类型    | 描述
----  | ----    | -----------
type  | string  | 注册的 actor 类型。
count | integer | 运行中的 actor 数量。

<a id="metadataapiresponsecomponent"></a>**元数据 API 响应组件**

名称    | 类型   | 描述
----    | ----   | -----------
name    | string | 组件名称。
type    | string | 组件类型。
version | string | 组件版本。
capabilities | array | 此组件类型和版本支持的功能。

<a id="metadataapiresponsehttpendpoint"></a>**元数据 API 响应 HttpEndpoint**

名称    | 类型   | 描述
----    | ----   | -----------
name    | string | HttpEndpoint 的名称。

<a id="metadataapiresponsesubscription"></a>**元数据 API 响应订阅**

名称            | 类型   | 描述
----            | ----   | -----------
pubsubname      | string | 发布订阅的名称。
topic           | string | 主题名称。
metadata        | object | 与订阅关联的元数据。
rules           | [元数据 API 响应订阅规则](#metadataapiresponsesubscriptionrules)[] | 与订阅关联的规则列表。
deadLetterTopic | string | 死信主题名称。
type            | string | 订阅类型，可以是 `DECLARATIVE`、`STREAMING` 或 `PROGRAMMATIC`。

<a id="metadataapiresponsesubscriptionrules"></a>**元数据 API 响应订阅规则**

名称    | 类型   | 描述
----    | ----   | -----------
match   | string | 用于匹配消息的 CEL 表达式，请参阅 https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/#common-expression-language-cel
path    | string | 如果匹配表达式为 true，则路由消息的路径。

<a id="metadataapiresponseappconnectionproperties"></a>**元数据 API 响应应用连接属性**

名称          | 类型   | 描述
----          | ----   | -----------
port          | integer| 应用程序正在侦听的端口。
protocol      | string | 应用程序使用的协议。
channelAddress| string | 应用程序正在侦听的主机地址。
maxConcurrency| integer| 应用程序可以处理的最大并发请求数。
health        | [元数据 API 响应应用连接属性健康检查](#metadataapiresponseappconnectionpropertieshealth) | 应用程序的健康检查详情。

<a id="metadataapiresponseappconnectionpropertieshealth"></a>**元数据 API 响应应用连接属性健康检查**

名称            | 类型   | 描述
----            | ----   | -----------
healthCheckPath | string | 健康检查路径，适用于 HTTP 协议。
healthProbeInterval | string | 每次健康探测之间的时间，以 go duration 格式。
healthProbeTimeout | string | 每次健康探测的超时时间，以 go duration 格式。
healthThreshold | integer | 在应用程序被视为不健康之前的最大失败健康探测次数。

<a id="metadataapiresponsescheduler"></a>**元数据 API 响应调度器**

名称            | 类型   | 描述
----            | ----   | -----------
connected_addresses | string[] | 表示已连接的调度器主机的地址的字符串列表。

<a id="metadataapiresponseworkflows"></a>**元数据 API 响应工作流**

名称             | 类型    | 描述
----             | ----    | -----------
connectedWorkers | integer | 已连接的工作流工作者的数量。

### 示例

```shell
curl http://localhost:3500/v1.0/metadata
```

```json
{
  "id": "myApp",
  "runtimeVersion": "1.12.0",
  "enabledFeatures": [
    "ServiceInvocationStreaming"
  ],
  "actors": [
    {
      "type": "DemoActor"
    }
  ],
  "components": [
    {
      "name": "pubsub",
      "type": "pubsub.redis",
      "version": "v1"
    },
    {
      "name": "statestore",
      "type": "state.redis",
      "version": "v1",
      "capabilities": [
        "ETAG",
        "TRANSACTIONAL",
        "ACTOR"
      ]
    }
  ],
  "httpEndpoints": [
    {
      "name": "my-backend-api"
    }
  ],
  "subscriptions": [
    {
      "type": "DECLARATIVE",
      "pubsubname": "pubsub",
      "topic": "orders",
      "deadLetterTopic": "",
      "metadata": {
        "ttlInSeconds": "30"
      },
      "rules": [
          {
              "match": "%!s(<nil>)",
              "path": "orders"
          }
      ]
    }
  ],
  "extended": {
    "appCommand": "uvicorn --port 3000 demo_actor_service:app",
    "appPID": "98121",
    "cliPID": "98114",
    "daprRuntimeVersion": "1.12.0"
  },
  "appConnectionProperties": {
    "port": 3000,
    "protocol": "http",
    "channelAddress": "127.0.0.1",
    "health": {
      "healthProbeInterval": "5s",
      "healthProbeTimeout": "500ms",
      "healthThreshold": 3
    }
  },
  "scheduler": {
    "connected_addresses": [
      "10.244.0.47:50006",
      "10.244.0.48:50006",
      "10.244.0.49:50006"
    ]
  },
  "workflows": {
    "connectedWorkers": 1
  }
}
```

## 向 Dapr 边车信息添加自定义标签

向由元数据端点存储的 Dapr 边车信息添加自定义标签。

### 用例：
例如，Dapr CLI 在自托管模式下运行 dapr 时使用元数据端点来存储托管边车的进程的 PID 以及用于运行应用程序的命令。应用程序也可以在启动后添加属性作为键。

### HTTP 请求

```
PUT http://localhost:<daprPort>/v1.0/metadata/attributeName
```

### URL 参数

参数      | 描述
---------      | -----------
daprPort       | Dapr 端口。
attributeName  | 自定义属性名称。这是键值对中的键名称。

### HTTP 请求正文

在请求中，您需要将自定义属性值作为 RAW 数据传递：

```json
{
  "Content-Type": "text/plain"
}
```

在请求的正文中放置您要存储的自定义属性值：

```
attributeValue
```

### HTTP 响应代码

代码 | 描述
---- | -----------
204  | 自定义属性已添加到元数据信息

### 示例

向元数据端点添加自定义属性：

```shell
curl -X PUT -H "Content-Type: text/plain" --data "myDemoAttributeValue" http://localhost:3500/v1.0/metadata/myDemoAttribute
```

获取元数据信息以确认您的自定义属性已添加：

```json
{
  "id": "myApp",
  "runtimeVersion": "1.12.0",
  "enabledFeatures": [
    "ServiceInvocationStreaming"
  ],
  "actors": [
    {
      "type": "DemoActor"
    }
  ],
  "components": [
    {
      "name": "pubsub",
      "type": "pubsub.redis",
      "version": "v1"
    },
    {
      "name": "statestore",
      "type": "state.redis",
      "version": "v1",
      "capabilities": [
        "ETAG",
        "TRANSACTIONAL",
        "ACTOR"
      ]
    }
  ],
  "httpEndpoints": [
    {
      "name": "my-backend-api"
    }
  ],
  "subscriptions": [
    {
      "type": "PROGRAMMATIC",
      "pubsubname": "pubsub",
      "topic": "orders",
      "deadLetterTopic": "",
      "metadata": {
        "ttlInSeconds": "30"
      },
      "rules": [
          {
              "match": "%!s(<nil>)",
              "path": "orders"
          }
      ]
    }
  ],
  "extended": {
    "myDemoAttribute": "myDemoAttributeValue",
    "appCommand": "uvicorn --port 3000 demo_actor_service:app",
    "appPID": "98121",
    "cliPID": "98114",
    "daprRuntimeVersion": "1.12.0"
  },
  "appConnectionProperties": {
    "port": 3000,
    "protocol": "http",
    "channelAddress": "127.0.0.1",
    "health": {
      "healthProbeInterval": "5s",
      "healthProbeTimeout": "500ms",
      "healthThreshold": 3
    }
  },
  "scheduler": {
    "connected_addresses": [
      "10.244.0.47:50006",
      "10.244.0.48:50006",
      "10.244.0.49:50006"
    ]
  },
  "workflows": {
    "connectedWorkers": 1
  }
}
```
