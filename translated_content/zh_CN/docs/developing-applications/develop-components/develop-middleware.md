---
type: docs
title: "如何编写中间件组件"
linkTitle: "中间件组件"
weight: 200
description: "了解如何开发中间件组件"
aliases:
  - /zh-hans/developing-applications/middleware/middleware-overview/
  - /zh-hans/concepts/middleware-concept/
---

Dapr 允许通过链接一系列中间件组件来定义自定义处理管道。在本指南中，你将学习如何创建中间件组件。要了解如何配置现有中间件组件，请参阅[配置中间件组件]({{% ref middleware.md %}})。

## 编写自定义 HTTP 中间件

Dapr 中的 HTTP 中间件封装了标准的 Go [net/http](https://pkg.go.dev/net/http) 处理函数。

你的中间件需要实现一个中间件接口，该接口定义了一个 **GetHandler** 方法，该方法返回一个 [**http.Handler**](https://pkg.go.dev/net/http#Handler) 回调和一个 **error**：

```go
type Middleware interface {
  GetHandler(metadata middleware.Metadata) (func(next http.Handler) http.Handler, error)
}
```

处理程序接收一个 `next` 回调，该回调应该被调用以继续处理请求。

你的处理程序实现可以包括入站逻辑、出站逻辑，或两者兼有：

```go

func (m *customMiddleware) GetHandler(metadata middleware.Metadata) (func(next http.Handler) http.Handler, error) {
  var err error
  return func(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
      // Inbound logic
      // ...

      // Call the next handler
      next.ServeHTTP(w, r)

      // Outbound logic
      // ...
    }
  }, err
}
```

## 相关链接

- [组件 schema]({{% ref component-schema.md %}})
- [配置概览]({{% ref configuration-overview.md %}})
- [API 中间件示例](https://github.com/dapr/samples/tree/master/middleware-oauth-google)
