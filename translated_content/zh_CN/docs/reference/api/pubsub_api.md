---
type: docs
title: "发布订阅 API 参考"
linkTitle: "发布/订阅 API"
description: "发布订阅 API 的详细文档"
weight: 1200
---

## 向指定主题发布消息

此端点允许您向正在监听 `topic` 的多个消费者发布数据。
Dapr 保证此端点至少一次（At-Least-Once）语义。

### HTTP 请求

```
POST http://localhost:<daprPort>/v1.0/publish/<pubsubname>/<topic>[?<metadata>]
```

### HTTP 响应码

代码 | 描述
---- | -----------
204  | 消息已投递
403  | 消息被访问控制拒绝
404  | 未提供 pubsub 名称或主题
500  | 投递失败

### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`pubsubname` | 发布订阅组件的名称
`topic` | 主题的名称
`metadata` | 元数据的查询参数，如下所述

> 注意，所有 URL 参数区分大小写。

```shell
curl -X POST http://localhost:3500/v1.0/publish/pubsubName/deathStarStatus \
  -H "Content-Type: application/json" \
 -d '{
       "status": "completed"
     }'
```

### 请求头

`Content-Type` 请求头告诉 Dapr 在构造 CloudEvent 信封时您的数据遵循的内容类型。`Content-Type` 请求头值会填充 CloudEvent 中的 `datacontenttype` 字段。

除非另有说明，Dapr 假定为 `text/plain`。如果您的 content type 是 JSON，请使用值为 `application/json` 的 `Content-Type` 请求头。

如果要发送自己的自定义 CloudEvent，请为 `Content-Type` 请求头使用 `application/cloudevents+json` 值。

#### 元数据

元数据可以通过请求 URL 中的查询参数发送。必须以 `metadata.` 为前缀，如下所示。

参数 | 描述
--------- | -----------
`metadata.ttlInSeconds` | 消息过期的秒数，如[此处所述]({{% ref pubsub-message-ttl.md %}})
`metadata.rawPayload` | 布尔值，确定 Dapr 是否应在不将其包装为 CloudEvent 的情况下发布事件，如[此处所述]({{% ref pubsub-raw.md %}})

> 根据每个发布订阅组件，可提供其他元数据参数。

## 向指定主题发布多条消息

此端点允许您向正在监听 `topic` 的消费者发布多条消息。

### HTTP 请求

```
POST http://localhost:<daprPort>/v1.0/publish/bulk/<pubsubname>/<topic>[?<metadata>]
```

请求体应包含一个 JSON 条目数组，其中包含：
- 唯一的条目 ID
- 要发布的事件
- 事件的内容类型

如果事件的 content type 不是 `application/cloudevents+json`，它将自动包装为 CloudEvent（除非 `metadata.rawPayload` 设置为 `true`）。

示例：

```bash
curl -X POST http://localhost:3500/v1.0/publish/bulk/pubsubName/deathStarStatus \
  -H 'Content-Type: application/json' \
  -d '[
        {
            "entryId": "ae6bf7c6-4af2-11ed-b878-0242ac120002",
            "event":  "first text message",
            "contentType": "text/plain"
        },
        {
            "entryId": "b1f40bd6-4af2-11ed-b878-0242ac120002",
            "event":  {
                "message": "second JSON message"   
            },
            "contentType": "application/json"
        },
      ]'
```

### 请求头

`Content-Type` 请求头应始终设置为 `application/json`，因为请求体是一个 JSON 数组。

### URL 参数

|**参数**|**描述**|
|--|--|
|`daprPort`|Dapr 端口|
|`pubsubname`|发布/订阅组件的名称|
|`topic`|主题的名称|
|`metadata`|[元数据]({{% ref "pubsub_api.md#metadata" %}})的查询参数|

### 元数据

元数据可以通过请求 URL 中的查询参数发送。必须以 `metadata.` 为前缀，如下表所示。

|**参数**|**描述**|
|--|--|
|`metadata.rawPayload`|布尔值，确定 Dapr 是否应在不将消息包装为 CloudEvent 的情况下发布消息。|
|`metadata.maxBulkPubBytes`|在批量发布请求中发布的最大字节数。|


#### HTTP 响应

|**HTTP 状态**|**描述**|
|--|--|
|204|所有消息已投递|
|400|发布/订阅不存在|
|403|被访问控制拒绝|
|500|至少有一条消息未能投递|

在 500 状态码的情况下，响应体将包含一个 JSON 对象，其中包含未能投递的条目列表。例如，从上面的请求中，如果事件为 `"first text message"` 的条目未能投递，响应将包含其条目 ID 和来自底层发布/订阅组件的错误消息。

```json
{
  "failedEntries": [
    {
      "entryId": "ae6bf7c6-4af2-11ed-b878-0242ac120002",
      "error": "some error message"
    },
  ],
  "errorCode": "ERR_PUBSUB_PUBLISH_MESSAGE"
}
```

## 可选的应用程序（用户代码）路由

### 提供路由供 Dapr 发现主题订阅

Dapr 将调用用户代码上的以下端点以发现主题订阅：

#### HTTP 请求

```
GET http://localhost:<appPort>/dapr/subscribe
```

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用程序端口

#### HTTP 响应体

一个 JSON 编码的字符串数组。

示例：

```json
[
  {
    "pubsubname": "pubsub",
    "topic": "newOrder",
    "routes": {
      "rules": [
        {
          "match": "event.type == order",
          "path": "/orders"
        }
      ]
      "default" : "/otherorders"
    },
    "metadata": {
      "rawPayload": "true"
    }
  }
]
```

> 注意，所有订阅参数区分大小写。

#### 元数据

可选地，可以通过请求体发送元数据。

参数 | 描述
--------- | -----------
`rawPayload` | 布尔值，用于订阅不符合 CloudEvent 规范的事件，如[此处所述]({{% ref pubsub-raw.md %}})

### 提供路由供 Dapr 投递主题事件

为了投递主题事件，将使用订阅响应中指定的路由对用户代码进行 `POST` 调用。在 `routes` 下，您可以提供[在接收到消息主题时将特定条件匹配到特定路径的规则。]({{% ref "howto-route-messages.md" %}}) 您还可以为没有特定匹配的规则提供默认路由。

以下示例说明了这一点，考虑在端口 3000 上为路由 `orders` 订阅主题 `newOrder`：`POST http://localhost:3000/orders`

#### HTTP 请求

```
POST http://localhost:<appPort>/<path>
```

> 注意，所有 URL 参数区分大小写。

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用程序端口
`path` | 订阅配置中的路由路径

#### 预期的 HTTP 响应

HTTP 2xx 响应表示消息已成功处理。

为了更丰富的响应处理，可以发送带有处理状态的 JSON 编码的有效载荷体：

```json
{
  "status": "<status>"
}
```

状态 | 描述
--------- | -----------
`SUCCESS` | 消息已成功处理
`RETRY` | 消息将由 Dapr 重试
`DROP` | 记录警告并丢弃消息
其他 | 错误，消息将由 Dapr 重试

Dapr 假定没有 `status` 字段的 JSON 编码有效载荷响应或 HTTP 2xx 的空有效载荷响应为 `SUCCESS`。

HTTP 响应可能不同于 HTTP 2xx。以下是 Dapr 在不同 HTTP 状态下的行为：

HTTP 状态 | 描述
--------- | -----------
2xx | 消息根据有效载荷中的状态进行处理（如果为空则为 `SUCCESS`；如果有效载荷无效则忽略）。
404 | 记录错误并丢弃消息
其他 | 记录警告并重试消息

## 从指定主题订阅多条消息

这允许您在监听 `topic` 时从代理订阅多条消息。

为了以批量方式接收主题订阅的消息，应用程序：

- 需要在发送要订阅的主题列表时选择 `bulkSubscribe`
- 可选地，可以配置 `maxMessagesCount` 和/或 `maxAwaitDurationMs`
有关如何选择加入的更多详细信息，请参阅[批量发送和接收消息]({{% ref pubsub-bulk.md %}}) 指南。

#### 批量订阅的预期 HTTP 响应

HTTP 2xx 响应表示此批量消息中的条目（单个消息）已被应用程序处理，Dapr 现在将检查每个 EntryId 的状态。
需要发送带有针对每个条目的处理状态的 JSON 编码有效载荷体：

```json
{
  "statuses": 
  [ 
    {
    "entryId": "<entryId1>",
    "status": "<status>"
    }, 
    {
    "entryId": "<entryId2>",
    "status": "<status>"
    } 
  ]
}
```

> 注意：如果 Dapr 在从应用程序收到的响应中找不到 EntryId 状态，则该条目的状态被视为 `RETRY`。

状态 | 描述
--------- | -----------
`SUCCESS` | 消息已成功处理
`RETRY` | 消息将由 Dapr 重试
`DROP` | 记录警告并丢弃消息

HTTP 响应可能不同于 HTTP 2xx。以下是 Dapr 在不同 HTTP 状态下的行为：

HTTP 状态 | 描述
--------- | -----------
2xx | 消息根据有效载荷中的状态进行处理。
404 | 记录错误并丢弃所有消息
其他 | 记录警告并重试所有消息

#### CloudEvents 二进制模式

支持发布使用 CloudEvents HTTP 绑定定义的二进制模式的 CloudEvents。在此模式下，HTTP 主体仅包含有效载荷字节，CloudEvent 属性作为带有 `ce_` 前缀的请求头传递。提供所需的请求头（`ce_specversion`、`ce_type`、`ce_source`、`ce_id`）以及任何可选的请求头（例如 `ce_subject` 或 `ce_time`）。
Dapr 将 HTTP `Content-Type` 请求头复制到 CloudEvent 的 `datacontenttype` 属性中，并将生成的事件转发给订阅者。

示例发送四个原始字节：

```bash
curl -X POST http://localhost:3500/v1.0/publish/pubsubName/deathStarStatus \
  -H "Content-Type: application/octet-stream" \
  -H "ce_specversion: 1.0" \
  -H "ce_type: com.example.deathstar.status.changed" \
  -H "ce_source: urn:example:/deathstar" \
  -H "ce_id: 3a58b9b8-24d2-4f62-84f4-6177c2fe0633" \
  --data-binary $'\x01\x02\x03\x04'
```

## 消息信封

Dapr 发布订阅遵循 [CloudEvents 1.0 版本](https://github.com/cloudevents/spec/blob/v1.0/spec.md)。

## 相关链接

* [如何发布和消费主题]({{% ref howto-publish-subscribe.md %}})
* [发布/订阅示例](https://github.com/dapr/quickstarts/tree/master/tutorials/pub-sub)
