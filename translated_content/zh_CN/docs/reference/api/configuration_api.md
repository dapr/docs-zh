---
type: docs
title: "Configuration API 参考"
linkTitle: "Configuration API"
description: "配置 API 的详细文档"
weight: 400
---

## 获取配置

此端点允许您从存储中获取配置。

### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/configuration/<storename>
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 组件文件中的 `metadata.name` 字段。参考 [组件规范]({{% ref component-schema.md%}})

#### 查询参数

如果未提供查询参数，则返回所有配置项。
要指定要获取的配置项的键，请使用一个或多个 `key` 查询参数。例如：

```
GET http://localhost:<daprPort>/v1.0/configuration/mystore?key=config1&key=config2
```

要检索所有配置项：

```
GET http://localhost:<daprPort>/v1.0/configuration/mystore
```

#### 请求体

无

### HTTP 响应

#### 响应代码

代码 | 描述
---- | -----------
`204`  | 获取操作成功
`400`  | 配置存储缺失或配置错误或请求格式错误
`500`  | 获取配置失败

#### 响应体

每个配置项的键/值对的 JSON 编码值。

### 示例

```shell
curl -X GET 'http://localhost:3500/v1.0/configuration/mystore?key=myConfigKey' 
```

> 上述命令返回以下 JSON：

```json
{
    "myConfigKey": {
        "value":"myConfigValue"
    }
}
```

## 订阅配置

此端点允许您订阅配置更改。当配置存储中的值被更新或删除时，会发送通知。这使应用程序能够对配置更改做出反应。

### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/configuration/<storename>/subscribe
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 组件文件中的 `metadata.name` 字段。参考 [组件规范]({{% ref component-schema.md%}})

#### 查询参数

如果未提供查询参数，则订阅所有配置项。
要指定要订阅的配置项的键，请使用一个或多个 `key` 查询参数。例如：

```
GET http://localhost:<daprPort>/v1.0/configuration/mystore/subscribe?key=config1&key=config2
```

要订阅所有更改：

```
GET http://localhost:<daprPort>/v1.0/configuration/mystore/subscribe
```

#### 请求体

无

### HTTP 响应

#### 响应代码

代码 | 描述
---- | -----------
`200`  | 订阅操作成功
`400`  | 配置存储缺失或配置错误或请求格式错误
`500`  | 订阅配置更改失败

#### 响应体

JSON 编码值

### 示例

```shell
curl -X GET 'http://localhost:3500/v1.0/configuration/mystore/subscribe?key=myConfigKey' 
```

> 上述命令返回以下 JSON：

```json
{
  "id": "<unique-id>"
}
```

返回的 `id` 参数可用于取消订阅订阅 API 调用中提供的特定键集。应用程序应保留此值。

## 取消订阅配置

此端点允许您取消订阅配置更改。

### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/configuration/<storename>/<subscription-id>/unsubscribe
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 组件文件中的 `metadata.name` 字段。参考 [组件规范]({{% ref component-schema.md%}})
`subscription-id` | 订阅端点响应中返回的 `id` 字段的值

#### 查询参数

无

#### 请求体

无

### HTTP 响应

#### 响应代码

代码 | 描述
---- | -----------
`200`  | 取消订阅操作成功
`400`  | 配置存储缺失或配置错误或请求格式错误
`500`  | 取消订阅配置更改失败

#### 响应体

```json
{
    "ok" : true
}
```

### 示例

```shell
curl -X GET 'http://localhost:3500/v1.0-alpha1/configuration/mystore/bf3aa454-312d-403c-af95-6dec65058fa2/unsubscribe'
```

> 上述命令返回以下 JSON：

操作成功时：

```json
{
  "ok": true
}
```
操作失败时：

```json
{
  "ok": false,
  "message": "<dapr 返回的错误消息>"
}
```

## 可选的应用程序（用户代码）路由

### 提供一个路由供 Dapr 发送配置更改

订阅配置更改后，每当配置项更改时，Dapr 会调用应用程序。您的应用程序可以有一个 `/configuration` 端点，该端点会为所有订阅的键更新调用。可以通过添加 `/<store-name>` 使端点更具体地针对给定的配置存储，并通过向路由添加 `/<store-name>/<key>` 使其针对特定键。

#### HTTP 请求

```
POST http://localhost:<appPort>/configuration/<store-name>/<key>
```

#### URL 参数

参数 | 描述
--------- | -----------
`appPort` | 应用程序端口
`storename` | 组件文件中的 `metadata.name` 字段。参考 [组件规范]({{% ref component-schema.md%}})
`key` | 订阅的键

#### 请求体

给定订阅 ID 的配置项列表。配置项可以具有与之关联的版本，该版本在通知中返回。

```json
{
    "id": "<subscription-id>",
    "items": [
        "key": "<key-of-configuration-item>",
        "value": "<new-value>",
        "version": "<version-of-item>"
    ]
}
```

#### 示例

```json
{
    "id": "bf3aa454-312d-403c-af95-6dec65058fa2",
    "items": [
        "key": "config-1",
        "value": "abcdefgh",
        "version": "1.1"
    ]
}
```


## 后续步骤

- [Configuration API 概述]({{% ref configuration-api-overview.md %}})
- [操作指南：从存储管理配置]({{% ref howto-manage-configuration.md %}})
