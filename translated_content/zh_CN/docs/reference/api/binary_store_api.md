---
type: docs
title: "Binary Store API 参考"
linkTitle: "Binary Store API"
description: "Dapr Binary Store API 的详细文档"
weight: 1550
---

Binary Store API 用于在已配置的 Binary Store 组件中存储、检索和删除二进制文件。HTTP API 目前处于 Alpha 阶段，使用 `v1.0-alpha1` 版本。上传时的请求体和下载时的响应体均为原始文件字节，而非 JSON。

## 组件文件

Binary Store 需要配置为 Dapr 组件。`metadata.name` 是 API 请求中使用的存储名称，`spec.type` 用于选择组件实现：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mystore
spec:
  type: binarystore.<TYPE>
  version: v1
  metadata:
    - name: <KEY>
      value: <VALUE>
```

`spec.metadata` 中的值取决于所选的组件。有关本地内存示例，请参阅[Binary Store 操作指南]({{% ref howto-use-binary-store.md %}})。

## HTTP API

所有操作均使用以下 URL：

```text
http://localhost:<daprPort>/v1.0-alpha1/binarystore/<storeName>/<fileName>
```

| 参数 | 说明 |
|-----------|-------------|
| `daprPort` | Dapr 边车的 HTTP 端口。 |
| `storeName` | 已配置的 Binary Store 组件的 `metadata.name`。 |
| `fileName` | 存储中的文件名或相对路径。 |

文件名可以包含嵌套的相对路径。不要使用开头或结尾的斜杠、空路径段、`.` 或 `..` 路径段，也不要使用字符 `\`、`*`、`?`、`[`、`]` 和 `#`。运行时会拒绝这些名称。

### 上传文件但不替换已有文件

#### HTTP 请求

```text
POST http://localhost:<daprPort>/v1.0-alpha1/binarystore/<storeName>/<fileName>
```

请求体为原始文件内容。成功的请求返回 `204 No Content`。如果文件已存在，请求返回 `409 Conflict`。

### 上传或替换文件

#### HTTP 请求

```text
PUT http://localhost:<daprPort>/v1.0-alpha1/binarystore/<storeName>/<fileName>
```

请求体为原始文件内容。如果同名文件已存在，此操作会替换该文件。成功的请求返回 `204 No Content`。

### 获取文件

#### HTTP 请求

```text
GET http://localhost:<daprPort>/v1.0-alpha1/binarystore/<storeName>/<fileName>
```

#### HTTP 响应

成功的请求返回 `200 OK`，响应的内容类型为 `application/octet-stream`，响应体为文件字节。如果文件不存在，运行时返回 `404 Not Found`。

### 删除文件

#### HTTP 请求

```text
DELETE http://localhost:<daprPort>/v1.0-alpha1/binarystore/<storeName>/<fileName>
```

成功的请求返回 `204 No Content`。如果文件不存在，运行时返回 `404 Not Found`。

### 错误

| 状态码 | 说明 |
|-------------|-------------|
| `400 Bad Request` | 文件名无效、未找到 Binary Store 组件，或请求格式不正确。 |
| `404 Not Found` | 请求的文件不存在。 |
| `409 Conflict` | `POST` 请求尝试创建已存在的文件。 |
| `413 Content Too Large` | 组件因文件超过已配置的单文件大小限制而拒绝该文件。 |
| `507 Insufficient Storage` | 组件因其已配置的总容量已耗尽而拒绝上传。 |
| `500 Internal Server Error` | 组件报告了意外错误。 |

实际的文件大小和总容量限制取决于组件。HTTP `PUT` 和 `POST` 上传不受边车 [`--max-body-size`]({{% ref increase-request-size.md %}}) 限制的约束，因此只有组件限制生效。组件还可能返回其后端特有的错误。

## gRPC API

gRPC API 处于 Alpha 阶段，并提供以下方法：

| 方法 | 流式传输 | 说明 |
|--------|-----------|-------------|
| `SetBinaryFileAlpha1` | 客户端流式 | 第一条请求消息包含组件名称、文件名以及可选的覆盖设置（默认为 false）。后续消息以分块形式携带文件内容。 |
| `GetBinaryFileAlpha1` | 服务端流式 | 获取文件，并以分块形式返回其内容。 |
| `DeleteBinaryFileAlpha1` | 一元 | 从组件中删除指定名称的文件。 |

## 后续步骤

- 阅读[Binary Store 概述]({{% ref binarystore-overview.md %}})。
- 参阅[Binary Store 操作指南]({{% ref howto-use-binary-store.md %}})。
- 探索适用于 .NET 应用程序的 [Dapr .NET SDK](https://docs.dapr.io/developing-applications/sdks/dotnet/)。
