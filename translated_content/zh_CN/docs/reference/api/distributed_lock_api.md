---
type: docs
title: "分布式锁 API 参考"
linkTitle: "分布式锁 API"
description: "分布式锁 API 详细文档"
weight: 700
---

## 加锁

此端点允许您通过提供指定的锁所有者和要锁定的资源 ID 来获取锁。

### HTTP 请求

```
POST http://localhost:<daprPort>/v1.0-alpha1/lock/<storename>
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 组件文件中的 `metadata.name` 字段。请参阅[组件 schema]({{% ref component-schema.md %}})

#### 查询参数

无

### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
204  | 空响应
400  | 请求格式错误
500  | 请求失败

### HTTP 请求体

加锁端点接收以下 JSON 负载：

```json
{
    "resourceId": "",
    "lockOwner": "",
    "expiryInSeconds": 0
}
```

字段 | 描述
---- | -----------
resourceId  | 要锁定的资源 ID。可以是任何值
lockOwner  | 锁所有者的名称。应针对每个请求设置为唯一值
expiryInSeconds  | 锁在过期前持有的时间（秒）

### HTTP 响应体

加锁端点返回以下负载：

```json
{
    "success": true
}
```

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha/lock/redisStore \
  -H "Content-Type: application/json" \
  -d '{
        "resourceId": "lock1",
        "lockOwner": "vader",
        "expiryInSeconds": 60
      }'

{
    "success": "true"
}
```

## 解锁

此端点允许您根据锁所有者和资源 ID 解除现有的锁。

### HTTP 请求

```
POST http://localhost:<daprPort>/v1.0-alpha1/unlock/<storename>
```

#### URL 参数

参数 | 描述
--------- | -----------
`daprPort` | Dapr 端口
`storename` | 组件文件中的 `metadata.name` 字段。请参阅[组件 schema]({{% ref component-schema.md %}})

#### 查询参数

无

### HTTP 响应码

代码 | 描述
---- | -----------
200  | 请求成功
204  | 空响应
400  | 请求格式错误
500  | 请求失败

### HTTP 请求体

解锁端点接收以下 JSON 负载：

```json
{
    "resourceId": "",
    "lockOwner": ""
}
```

### HTTP 响应体

解锁端点返回以下负载：

```json
{
    "status": 0
}
```

`status` 字段包含以下响应代码：

代码 | 描述
---- | -----------
0  | 成功
1  | 锁不存在
2  | 锁属于其他所有者
3  | 内部错误

### 示例

```shell
curl -X POST http://localhost:3500/v1.0-alpha/unlock/redisStore \
  -H "Content-Type: application/json" \
  -d '{
        "resourceId": "lock1",
        "lockOwner": "vader"
      }'

{
    "status": 0
}
```
