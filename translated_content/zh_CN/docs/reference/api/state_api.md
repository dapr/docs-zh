---
type: docs
title: "状态管理 API 参考"
linkTitle: "状态管理 API"
description: "状态管理 API 的详细文档"
weight: 1500
---

## 组件文件

Dapr `statestore.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
  namespace: <NAMESPACE>
spec:
  type: state.<TYPE>
  version: v1
  metadata:
  - name:<KEY>
    value:<VALUE>
  - name: <KEY>
    value: <VALUE>
```

| 设置 | 描述 |
| ------- | ----------- |
| `metadata.name` | 状态存储的名称。 |
| `spec/metadata` | 一个开放的键值对元数据，允许绑定定义连接属性。 |

## 键方案

Dapr 状态存储是键/值存储。为确保数据兼容性，Dapr 要求这些数据存储遵循固定的键方案。对于常规状态，键格式为：

```
<App ID>||<state key>
```

对于 Actor 状态，键格式为：

```
<App ID>||<Actor type>||<Actor id>||<state key>
```

## 保存状态

此端点允许您保存状态对象数组。

### HTTP 请求

```
POST http://localhost:<daprPort>/v1.0/state/<storename>
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 用户配置的 `statestore.yaml` 组件文件中的 `metadata.name` 字段。请参阅上文提到的 [Dapr 状态存储配置结构](#component-file)。

可选的请求元数据通过 URL 查询参数传递。例如，
```
POST http://localhost:3500/v1.0/state/myStore?metadata.contentType=application/json
```
> 所有 URL 参数区分大小写。

> 由于 `||` 是保留字符串，因此不能在 `<state key>`
> 字段中使用。

#### 请求正文

状态对象的 JSON 数组。每个状态对象包含以下字段：

字段 | 描述
---- | -----------
`key` | 状态键
`value` | 状态值，可以是任何字节数组
`etag` | （可选）状态 ETag
`metadata` | （可选）要传递给状态存储的附加键值对
`options` | （可选）状态操作选项；请参阅[状态操作选项](#optional-behaviors)

> **ETag 格式：** Dapr 运行时将 ETag 视为不透明字符串。确切的 ETag 格式由相应的数据存储定义。

#### 元数据

元数据可以通过请求 URL 中的查询参数发送。必须以 `metadata.` 为前缀，如下所示。

参数 | 描述
--------- | -----------
`metadata.ttlInSeconds` | 消息过期的秒数，如[此处所述]({{% ref state-store-ttl.md %}})

> **TTL：** 只有特定的状态存储支持 TTL 选项，根据[支持的状态存储]({{% ref supported-state-stores.md %}})。

### HTTP 响应

#### 响应代码

代码 | 描述
---- | -----------
`204`  | 状态已保存
`400`  | 状态存储缺失或配置错误或请求格式错误
`500`  | 保存状态失败

#### 响应正文

无。

### 示例

```shell
curl -X POST http://localhost:3500/v1.0/state/starwars?metadata.contentType=application/json \
  -H "Content-Type: application/json" \
  -d '[
        {
          "key": "weapon",
          "value": "DeathStar",
          "etag": "1234"
        },
        {
          "key": "planet",
          "value": {
            "name": "Tatooine"
          }
        }
      ]'
```

## 获取状态

此端点允许您获取特定键的状态。

### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/state/<storename>/<key>
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 用户配置的 statestore.yaml 组件文件中的 `metadata.name` 字段。请参阅上文提到的 [Dapr 状态存储配置结构](#component-file)。
`key` | 所需状态的键
`consistency` | （可选）读取一致性模式；请参阅[状态操作选项](#optional-behaviors)
`metadata` | （可选）作为查询参数传递给状态存储的元数据

可选的请求元数据通过 URL 查询参数传递。例如，
```
GET http://localhost:3500/v1.0/state/myStore/myKey?metadata.contentType=application/json
```

> 注意，所有 URL 参数区分大小写。

### HTTP 响应

#### 响应代码

代码 | 描述
---- | -----------
`200`  | 获取状态成功
`204`  | 未找到键
`400`  | 状态存储缺失或配置错误
`500`  | 获取状态失败

#### 响应头

头 | 描述
--------- | -----------
`ETag` | 返回值的 ETag

#### 响应正文

JSON 编码的值

### 示例

```shell
curl http://localhost:3500/v1.0/state/starwars/planet?metadata.contentType=application/json
```

> 以上命令返回状态：

```json
{
  "name": "Tatooine"
}
```

将元数据作为查询参数传递：

```
GET http://localhost:3500/v1.0/state/starwars/planet?metadata.partitionKey=mypartitionKey&metadata.contentType=application/json
```

## 批量获取状态

此端点允许您获取给定键列表的值列表。

### HTTP 请求

```
POST/PUT http://localhost:<daprPort>/v1.0/state/<storename>/bulk
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 用户配置的 statestore.yaml 组件文件中的 `metadata.name` 字段。请参阅上文提到的 [Dapr 状态存储配置结构](#component-file)。
`metadata` | （可选）作为查询参数传递给状态存储的元数据

可选的请求元数据通过 URL 查询参数传递。例如，
```
POST/PUT http://localhost:3500/v1.0/state/myStore/bulk?metadata.partitionKey=mypartitionKey
```

> 注意，所有 URL 参数区分大小写。

### HTTP 响应

#### 响应代码

代码 | 描述
---- | -----------
`200`  | 获取状态成功
`400`  | 状态存储缺失或配置错误
`500`  | 批量获取状态失败

#### 响应正文

JSON 编码值的数组

### 示例

```shell
curl http://localhost:3500/v1.0/state/myRedisStore/bulk \
  -H "Content-Type: application/json" \
  -d '{
          "keys": [ "key1", "key2" ],
          "parallelism": 10
      }'
```

> 以上命令返回键/值对象数组：

```json
[
  {
    "key": "key1",
    "value": "value1",
    "etag": "1"
  },
  {
    "key": "key2",
    "value": "value2",
    "etag": "1"
  }
]
```

将元数据作为查询参数传递：

```
POST http://localhost:3500/v1.0/state/myRedisStore/bulk?metadata.partitionKey=mypartitionKey
```

## 删除状态

此端点允许您删除特定键的状态。

### HTTP 请求

```
DELETE http://localhost:<daprPort>/v1.0/state/<storename>/<key>
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 用户配置的 statestore.yaml 组件文件中的 `metadata.name` 字段。请参阅上文提到的 [Dapr 状态存储配置结构](#component-file)。
`key` | 所需状态的键
`concurrency` | （可选）*first-write* 或 *last-write*；请参阅[状态操作选项](#optional-behaviors)
`consistency` | （可选）*strong* 或 *eventual*；请参阅[状态操作选项](#optional-behaviors)

可选的请求元数据通过 URL 查询参数传递。例如，
```
DELETE http://localhost:3500/v1.0/state/myStore/myKey?metadata.contentType=application/json
```

> 注意，所有 URL 参数区分大小写。

#### 请求头

头 | 描述
--------- | -----------
If-Match | （可选）与要删除的键关联的 ETag

### HTTP 响应

#### 响应代码

代码 | 描述
---- | -----------
`204`  | 删除状态成功
`400`  | 状态存储缺失或配置错误
`500`  | 删除状态失败

#### 响应正文

无。

### 示例

```shell
curl -X DELETE http://localhost:3500/v1.0/state/starwars/planet -H "If-Match: xxxxxxx"
```

## 查询状态

此端点允许您查询键/值状态。

{{% alert title="alpha" color="warning" %}}
此 API 处于 alpha 阶段。
{{% /alert %}}

### HTTP 请求

```
POST/PUT http://localhost:<daprPort>/v1.0-alpha1/state/<storename>/query
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 用户配置的 statestore.yaml 组件文件中的 `metadata.name` 字段。请参阅上文提到的 [Dapr 状态存储配置结构](#component-file)。
`metadata` | （可选）作为查询参数传递给状态存储的元数据

可选的请求元数据通过 URL 查询参数传递。例如，
```
POST http://localhost:3500/v1.0-alpha1/state/myStore/query?metadata.contentType=application/json
```

> 注意，所有 URL 参数区分大小写。

#### 响应代码

代码 | 描述
---- | -----------
`200`  | 状态查询成功
`400`  | 状态存储缺失或配置错误
`500`  | 状态查询失败

#### 响应正文

JSON 编码值的数组

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha1/state/myStore/query?metadata.contentType=application/json \
  -H "Content-Type: application/json" \
  -d '{
        "filter": {
          "OR": [
            {
              "EQ": { "person.org": "Dev Ops" }
            },
            {
              "AND": [
                {
                  "EQ": { "person.org": "Finance" }
                },
                {
                  "IN": { "state": [ "CA", "WA" ] }
                }
              ]
            }
          ]
        },
        "sort": [
          {
            "key": "state",
            "order": "DESC"
          },
          {
            "key": "person.id"
          }
        ],
        "page": {
          "limit": 3
        }
      }'
```

> 以上命令返回对象数组以及令牌：

```json
{
  "results": [
    {
      "key": "1",
      "data": {
        "person": {
          "org": "Dev Ops",
          "id": 1036
        },
        "city": "Seattle",
        "state": "WA"
      },
      "etag": "6f54ad94-dfb9-46f0-a371-e42d550adb7d"
    },
    {
      "key": "4",
      "data": {
        "person": {
          "org": "Dev Ops",
          "id": 1042
        },
        "city": "Spokane",
        "state": "WA"
      },
      "etag": "7415707b-82ce-44d0-bf15-6dc6305af3b1"
    },
    {
      "key": "10",
      "data": {
        "person": {
          "org": "Dev Ops",
          "id": 1054
        },
        "city": "New York",
        "state": "NY"
      },
      "etag": "26bbba88-9461-48d1-8a35-db07c374e5aa"
    }
  ],
  "token": "3"
}
```

将元数据作为查询参数传递：

```
POST http://localhost:3500/v1.0-alpha1/state/myStore/query?metadata.partitionKey=mypartitionKey
```

## 状态事务

将更改持久化到状态存储作为[事务操作]({{% ref "state-management-overview.md#transactional-operations" %}})。

> 此 API 依赖于支持事务的状态存储组件。

有关支持事务的状态存储的完整当前列表，请参阅[状态存储组件规范]({{% ref "supported-state-stores.md" %}})。

#### HTTP 请求

```
POST/PUT http://localhost:<daprPort>/v1.0/state/<storename>/transaction
```

#### HTTP 响应代码

代码 | 描述
---- | -----------
`204`  | 请求成功
`400`  | 状态存储缺失或配置错误或请求格式错误
`500`  | 请求失败

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 用户配置的 statestore.yaml 组件文件中的 `metadata.name` 字段。请参阅上文提到的 [Dapr 状态存储配置结构](#component-file)。

可选的请求元数据通过 URL 查询参数传递。例如，
```
POST http://localhost:3500/v1.0/state/myStore/transaction?metadata.contentType=application/json
```

> 注意，所有 URL 参数区分大小写。

#### 请求正文

字段 | 描述
---- | -----------
`operations` | 状态 `operation` 的 JSON 数组
`metadata` | （可选）适用于所有操作的事务的 `metadata`

所有事务数据库都实现以下必需的操作：

操作 | 描述
--------- | -----------
`upsert` | 添加或更新值
`delete` | 删除值

每个操作都有一个关联的 `request`，包含以下字段：

请求 | 描述
---- | -----------
`key` | 状态键
`value` | 状态值，可以是任何字节数组
`etag` | （可选）状态 ETag
`metadata` | （可选）要传递给状态存储的附加键值对，适用于此操作
`options` | （可选）状态操作选项；请参阅[状态操作选项](#optional-behaviors)

#### 示例
以下示例显示了对 `key1` 的 `upsert` 操作和对 `key2` 的 `delete` 操作。这应用于状态存储中名为 "planet" 的分区。两个操作要么成功要么失败。

```shell
curl -X POST http://localhost:3500/v1.0/state/starwars/transaction \
  -H "Content-Type: application/json" \
  -d '{
        "operations": [
          {
            "operation": "upsert",
            "request": {
              "key": "key1",
              "value": "myData"
            }
          },
          {
            "operation": "delete",
            "request": {
              "key": "key2"
            }
          }
        ],
        "metadata": {
          "partitionKey": "planet"
        }
      }'
```

## 为 Actor 配置状态存储

Actor 不支持多个状态存储，并且需要与 Dapr 一起使用事务状态存储。[查看当前实现事务状态存储接口的服务]({{% ref "supported-state-stores.md" %}})。如果您的状态存储由分布式数据库支持，您必须确保它提供强一致性。

在 `statestore.yaml` 组件文件的元数据部分中，为属性 `actorStateStore` 使用 `true` 值来指定要用于 Actor 的状态存储。
例如，以下组件 yaml 将配置 Redis 用作 Actor 的状态存储。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: <redis host>
  - name: redisPassword
    value: ""
  - name: actorStateStore
    value: "true"

```

## 可选行为

### 键方案

兼容 Dapr 的状态存储应使用以下键方案：

* *\<App ID>||\<state key>* 常规状态的键格式
* *\<App ID>||\<Actor type>||\<Actor id>||\<state key>* Actor 状态的键格式。

### 并发

Dapr 使用带有 ETag 的优化并发控制（OCC）。Dapr 对状态存储提出以下可选要求：

* 兼容 Dapr 的状态存储可以使用 ETag 支持乐观并发控制。当 ETag 满足以下条件时，存储允许更新：
  * 与 *save* 或 *delete* 请求关联。
  * 与数据库中的最新 ETag 匹配。
* 当写入请求中缺少 ETag 时，状态存储应以 *last-write-wins* 方式处理请求。这允许针对高吞吐量写入场景进行优化，在这些场景中数据争用较低或没有负面影响。
* 存储在向调用者返回状态时应 *始终* 返回 ETag。

### 一致性

Dapr 允许客户端为 *get*、*set* 和 *delete* 操作附加一致性提示。Dapr 支持两个一致性级别：**强** 和 **最终**。

#### 最终一致性

Dapr 假定数据存储默认是最终一致的。状态应该：

* 对于 *read* 请求，从任何副本返回数据。
* 对于 *write* 请求，在确认更新请求后异步将更新复制到配置的仲裁。

#### 强一致性

当附加强一致性提示时，状态存储应该：

* 对于 *read* 请求，在副本之间一致地返回最新数据。
* 对于 *write*/*delete* 请求，在完成写入请求之前将更新后的数据同步复制到配置的仲裁。

### 示例：完整的选项请求示例

以下是带有完整 `options` 定义的 *set* 请求示例：

```shell
curl -X POST http://localhost:3500/v1.0/state/starwars \
  -H "Content-Type: application/json" \
  -d '[
        {
          "key": "weapon",
          "value": "DeathStar",
          "etag": "xxxxx",
          "options": {
            "concurrency": "first-write",
            "consistency": "strong"
          }
        }
      ]'
```

### 示例：使用 ETag

以下是在兼容的状态存储中 *设置*/*删除* 对象时使用 ETag 的示例演练。此示例将 Redis 定义为 `statestore`。

1. 在状态存储中存储一个对象：

   ```shell
   curl -X POST http://localhost:3500/v1.0/state/statestore \
       -H "Content-Type: application/json" \
       -d '[
               {
                   "key": "sampleData",
                   "value": "1"
               }
       ]'
   ```

1. 获取对象以查找状态存储自动设置的 ETag：

   ```shell
   curl http://localhost:3500/v1.0/state/statestore/sampleData -v
   * Connected to localhost (127.0.0.1) port 3500 (#0)
   > GET /v1.0/state/statestore/sampleData HTTP/1.1
   > Host: localhost:3500
   > User-Agent: curl/7.64.1
   > Accept: */*
   >
   < HTTP/1.1 200 OK
   < Server: fasthttp
   < Date: Sun, 14 Feb 2021 04:51:50 GMT
   < Content-Type: application/json
   < Content-Length: 3
   < Etag: 1
   < Traceparent: 00-3452582897d134dc9793a244025256b1-b58d8d773e4d661d-01
   <
   * Connection #0 to host localhost left intact
   "1"* Closing connection 0
   ```

   上面返回的 ETag 是 1。如果您发送带有错误 ETag 的新请求来更新或删除数据，它将返回错误。省略 ETag 将允许请求。

   ```shell
   # Update
   curl -X POST http://localhost:3500/v1.0/state/statestore \
       -H "Content-Type: application/json" \
       -d '[
               {
                   "key": "sampleData",
                   "value": "2",
                   "etag": "2"
               }
       ]'
   {"errorCode":"ERR_STATE_SAVE","message":"failed saving state in state store statestore: possible etag mismatch. error from state store: ERR Error running script (call to f_83e03ec05d6a3b6fb48483accf5e594597b6058f): @user_script:1: user_script:1: failed to set key nodeapp||sampleData"}
   
   # Delete
   curl -X DELETE -H 'If-Match: 5' http://localhost:3500/v1.0/state/statestore/sampleData
   {"errorCode":"ERR_STATE_DELETE","message":"failed deleting state with key sampleData: possible etag mismatch. error from state store: ERR Error running script (call to f_9b5da7354cb61e2ca9faff50f6c43b81c73c0b94): @user_script:1: user_script:1: failed to delete node
   app||sampleData"}
   ```

1. 通过在请求正文（更新）或 `If-Match` 头（删除）中匹配 ETag 来更新或删除对象。当状态更新时，它会收到一个新的 ETag，未来的更新或删除将需要使用该 ETag。

   ```shell
   # Update
   curl -X POST http://localhost:3500/v1.0/state/statestore \
       -H "Content-Type: application/json" \
       -d '[
           {
               "key": "sampleData",
               "value": "2",
               "etag": "1"
           }
       ]'
   
   # Delete
   curl -X DELETE -H 'If-Match: 1' http://localhost:3500/v1.0/state/statestore/sampleData
   ```

## 后续步骤

- [状态管理概述]({{% ref state-management-overview.md %}})
- [操作指南：保存和获取状态]({{% ref howto-get-save-state.md %}})
