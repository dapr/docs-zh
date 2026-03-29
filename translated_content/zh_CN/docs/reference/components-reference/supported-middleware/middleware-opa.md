---
type: docs
title: "应用 Open Policy Agent (OPA) 策略"
linkTitle: "Open Policy Agent (OPA)"
description: "使用中间件对传入请求应用 Open Policy Agent (OPA) 策略"
aliases:
- /developing-applications/middleware/supported-middleware/middleware-opa/
---

Open Policy Agent (OPA) [HTTP 中间件]({{% ref middleware.md %}})将 [OPA 策略](https://www.openpolicyagent.org/)应用于传入的 Dapr HTTP 请求。这可用于对应用端点应用可重用的授权策略。

## 组件格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: my-policy
spec:
  type: middleware.http.opa
  version: v1
  metadata:
    # `includedHeaders` 是以逗号分隔的、不区分大小写的请求头集合，
    # 这些请求头将被包含在请求输入中。
    # 默认情况下，请求头不会传递给策略。若要在输入中接收传入请求头，
    # 请包含此配置
    - name: includedHeaders
      value: "x-my-custom-header, x-jwt-header"

    # `defaultStatus` 是拒绝响应时返回的状态码
    - name: defaultStatus
      value: 403

    # `readBody` 控制中间件是否在内存中读取完整的请求体，
    # 以便用于策略决策。
    - name: readBody
      value: "false"

    # `rego` 是要评估的 open policy agent 策略。必填
    # 策略包必须是 http，且策略必须设置 data.http.allow
    - name: rego
      value: |
        package http

        default allow = true

        # Allow 也可以是一个对象，并包含其他属性

        # 例如，如果你想在策略失败时重定向，可以设置状态码为 301，
        # 并在响应上设置 location 请求头：
        allow = {
            "status_code": 301,
            "additional_headers": {
                "location": "https://my.site/authorize"
            }
        } {
            not jwt.payload["my-claim"]
        }

        # 你也可以允许请求并为其添加额外的请求头：
        allow = {
            "allow": true,
            "additional_headers": {
                "x-my-claim": my_claim
            }
        } {
            my_claim := jwt.payload["my-claim"]
        }
        jwt = { "payload": payload } {
            auth_header := input.request.headers["Authorization"]
            [_, jwt] := split(auth_header, " ")
            [_, payload, _] := io.jwt.decode(jwt)
        }
```

你可以使用 [官方 OPA playground](https://play.openpolicyagent.org) 原型和实验策略。例如，[可以在这里找到上述示例策略](https://play.openpolicyagent.org/p/oRIDSo6OwE)。

## 规范元数据字段

| 字段  | 详情 | 示例 |
|--------|---------|---------|
| `rego` | Rego 策略语言 | 见上文 |
| `defaultStatus`   | 拒绝响应时返回的状态码 | `"403"`
| `readBody`   | 如果设置为 `true`（默认值），则会完整读取每个请求的请求体到内存中，并可用于策略决策。如果你的策略不依赖于检查请求体，考虑将其禁用（设置为 `false`）以获得显著的性能提升。 | `"false"`
| `includedHeaders` | 以逗号分隔的、不区分大小写的请求头集合，这些请求头将被包含在请求输入中。默认情况下，请求头不会传递给策略。若要在输入中接收传入请求头，请包含此配置 | `"x-my-custom-header, x-jwt-header"`

## Dapr 配置

要应用中间件，必须在 [配置]({{% ref configuration-concept.md %}})中引用它。请参阅[中间件管道]({{% ref "middleware.md#customize-processing-pipeline"%}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: my-policy
      type: middleware.http.opa
```

## 输入

此中间件提供 [`HTTPRequest`](#httprequest) 作为输入。

### HTTPRequest

`HTTPRequest` 输入包含关于传入 HTTP 请求的所有相关信息。

```go
type Input struct {
  request HTTPRequest
}

type HTTPRequest struct {
  // 请求方法（例如 GET、POST 等...）
  method string
  // 原始请求路径（例如 "/v2/my-path/"）
  path string
  // 将路径分解为多个部分以便于使用（例如 ["v2", "my-path"]）
  path_parts string[]
  // 原始查询字符串（例如 "?a=1&b=2"）
  raw_query string
  // 将查询分解为键及其值
  query map[string][]string
  // 请求头
  // 注意：默认情况下，不包含任何请求头。你必须通过
  // `spec.metadata.includedHeaders` 指定想要接收的请求头（见上文）
  headers map[string]string
  // 请求方案（例如 http、https）
  scheme string
  // 请求体（例如 http、https）
  body string
}
```

## 结果

策略必须设置 `data.http.allow`，其值为 `boolean` 类型，或带有 `allow` 布尔属性的 `object` 类型。`allow` 为 `true` 将允许请求，而 `false` 值将拒绝请求，并返回由 `defaultStatus` 指定的状态码。以下策略使用默认值，演示了对所有请求返回 `403 - Forbidden`：

```go
package http

default allow = false
```

这等同于：

```go
package http

default allow = {
  "allow": false
}
```

### 更改拒绝响应的状态码

拒绝请求时，你可以覆盖返回的状态码。例如，如果你想返回 `401` 而不是 `403`，可以执行以下操作：

```go
package http

default allow = {
  "allow": false,
  "status_code": 401
}
```

### 添加响应头

要重定向，请添加请求头并将 `status_code` 设置为返回结果：

```go
package http

default allow = {
  "allow": false,
  "status_code": 301,
  "additional_headers": {
    "Location": "https://my.redirect.site"
  }
}
```

### 添加请求头

你还可以在允许的请求上设置额外的请求头：

```go
package http

default allow = false

allow = { "allow": true, "additional_headers": { "X-JWT-Payload": payload } } {
  not input.path[0] == "forbidden"
  // 其中 `jwt` 是另一个规则的结果
  payload := base64.encode(json.marshal(jwt.payload))
}
```

### 结果结构

```go
type Result bool
// 或
type Result struct {
  // 是否允许或拒绝传入请求
  allow bool
  // 覆盖拒绝响应的状态码；可选
  status_code int
  // 在允许的请求或拒绝响应上设置请求头；可选
  additional_headers map[string]string
}
```

## 相关链接

- [Open Policy Agent](https://www.openpolicyagent.org)
- [HTTP API 示例](https://www.openpolicyagent.org/docs/latest/http-api-authorization/)
- [中间件]({{% ref middleware.md %}})
- [配置概念]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
