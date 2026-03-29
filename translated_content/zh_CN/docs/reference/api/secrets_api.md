---
type: docs
title: "Secrets API 参考"
linkTitle: "Secrets API"
description: "Secrets API 的详细文档"
weight: 1300
---

## 获取 Secret

此端点允许你从指定的 secret store 中获取 secret 的值。

### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/secrets/<secret-store-name>/<name>
```

#### URL 参数

参数 | 描述
--------- | -----------
daprPort | Dapr 端口
secret-store-name | 要获取 secret 的 secret store 名称
name | 要获取的 secret 名称

> 注意，所有 URL 参数区分大小写。

#### 查询参数

某些 secret store 支持**可选的**、每个请求的 metadata 属性。使用查询参数来提供这些属性。例如：

```
GET http://localhost:<daprPort>/v1.0/secrets/<secret-store-name>/<name>?metadata.version_id=15
```

请注意，并非所有 secret store 都支持相同的参数集。例如：
- Hashicorp Vault、GCP Secret Manager 和 AWS Secret Manager 支持 `version_id` 参数
- 仅 AWS Secret Manager 支持 `version_stage` 参数 
- 仅 Kubernetes Secrets 支持 `namespace` 参数
查看每个 [secret store 的文档]({{% ref supported-secret-stores.md %}}) 以获取支持的参数列表。

### HTTP 响应

#### 响应体

如果 secret store 支持在 secret 中包含多个键值对，则返回一个 JSON payload，其中键名作为字段，对应的值作为字段值。

对于仅具有名称/值语义的 secret store，则返回一个 JSON payload，其中 secret 名称作为字段，secret 的值作为值。

[参见 secret store 的分类]({{% ref supported-secret-stores.md %}})，了解哪些支持 secret 中的多个键以及名称/值语义。

##### 包含多个键的 secret 响应（例如 Kubernetes）：

```shell
curl http://localhost:3500/v1.0/secrets/kubernetes/db-secret
```

```json
{
  "key1": "value1",
  "key2": "value2"
}
```

以上示例演示了来自包含多个键的 secret 的 secret store 的响应。请注意，secret 名称（`db-secret`）**不会**作为结果的一部分返回。

##### 来自具有名称/值语义的 secret store 的响应：

```shell
curl http://localhost:3500/v1.0/secrets/vault/db-secret
```

```json
{
  "db-secret": "value1"
}
```

以上示例演示了来自具有名称/值语义的 secret store 的响应。与包含多个键的 secret 的 secret store 的结果相比，此结果返回单个键值对，其中 secret 名称（`db-secret`）作为键值对中的键返回。

#### 响应代码

代码 | 描述
---- | -----------
200  | OK
204  | Secret 未找到
400  | Secret store 缺失或配置错误
403  | 访问被拒绝
500  | 获取 secret 失败或未定义 secret store

### 示例

```shell
curl http://localhost:3500/v1.0/secrets/mySecretStore/db-secret
```

```shell
curl http://localhost:3500/v1.0/secrets/myAwsSecretStore/db-secret?metadata.version_id=15&metadata.version_stage=production
```

## 批量获取 Secret

此端点允许你获取 secret store 中的所有 secret。
如果配置 secret store，建议为 Dapr 使用 [token 认证]({{%ref "api-token.md"%}})。

### HTTP 请求

```
GET http://localhost:<daprPort>/v1.0/secrets/<secret-store-name>/bulk
```

#### URL 参数

参数 | 描述
--------- | -----------
daprPort | Dapr 端口
secret-store-name | 要获取 secret 的 secret store 名称

> 注意，所有 URL 参数区分大小写。

### HTTP 响应

#### 响应体

返回的响应是一个包含 secret 的 JSON。JSON 对象将包含 secret 名称作为字段，以及 secret 键和值的映射作为字段值。

##### 包含多个 secret 且 secret 中包含多个键/值的响应（例如 Kubernetes）：

```shell
curl http://localhost:3500/v1.0/secrets/kubernetes/bulk
```

```json
{
    "secret1": {
        "key1": "value1",
        "key2": "value2"
    },
    "secret2": {
        "key3": "value3",
        "key4": "value4"
    }
}
```

#### 响应代码

代码 | 描述
---- | -----------
200  | OK
400  | Secret store 缺失或配置错误
403  | 访问被拒绝
500  | 获取 secret 失败或未定义 secret store

### 示例

```shell
curl http://localhost:3500/v1.0/secrets/vault/bulk
```

```json
{
    "key1": {
        "key1": "value1"
    },
    "key2": {
        "key2": "value2"
    }
}
```
