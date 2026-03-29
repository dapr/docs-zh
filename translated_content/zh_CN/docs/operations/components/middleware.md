---
type: docs
title: "配置中间件组件"
linkTitle: "配置中间件"
weight: 2000
description: "通过添加中间件组件自定义处理管道"
---

Dapr 允许通过链式串联一系列中间件组件来定义自定义处理管道。可以在两个位置使用中间件管道：

1. 构建块 API - 调用任何 Dapr HTTP API 时执行 HTTP 中间件组件。
2. 服务到服务调用 - 将 HTTP 中间件组件应用于服务到服务调用。

## 配置 API 中间件管道

启动时，Dapr 边车会为传入的 HTTP 调用构建一个中间件处理管道。默认情况下，该管道由 [追踪]({{% ref tracing-overview.md %}}) 和 CORS 中间件组成。可以通过 Dapr [配置]({{% ref configuration-concept.md %}}) 添加额外的中间件，并按定义的顺序添加到管道中。该管道应用于所有 Dapr API 端点，包括状态、发布订阅、服务调用、绑定、密钥、配置、分布式锁等。

请求在路由到用户代码之前会经过所有定义的中间件组件，然后在返回给客户端之前，以相反的顺序经过定义的中间件，如下图所示。

<img src="/images/middleware.png" width="800" alt="Diagram showing the flow of a request and a response through the middlewares, as described in the paragraph above" />

使用 `httpPipeline` 配置调用 Dapr HTTP API 时，会执行 HTTP 中间件组件。

以下配置示例定义了一个使用 [OAuth 2.0 中间件]({{% ref middleware-oauth2.md %}}) 和 [大写中间件组件]({{% ref middleware-uppercase.md %}}) 的自定义管道。在这种情况下，所有请求都通过 OAuth 2.0 协议进行授权，并在转发到用户代码之前转换为大写文本。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline
  namespace: default
spec:
  httpPipeline:
    handlers:
      - name: oauth2
        type: middleware.http.oauth2
      - name: uppercase
        type: middleware.http.uppercase
```

与其他组件一样，中间件组件可以在[支持的中间件参考]({{% ref supported-middleware %}})和 [`dapr/components-contrib` 仓库](https://github.com/dapr/components-contrib/tree/master/middleware/http) 中找到。

{{< button page="supported-middleware.md" text="查看所有中间件组件" >}}

## 配置应用中间件管道

在进行服务到服务调用时，您也可以使用任何中间件组件。例如，在零信任环境中添加令牌验证、为特定应用端点转换请求或应用 OAuth 策略。

服务到服务调用中间件组件应用于从 Dapr 边车到接收应用程序（服务）的所有**传出**调用，如下图所示。

<img src="/images/app-middleware.png" width="800" alt="Diagram showing the flow of a service invocation request. Requests from the callee Dapr sidecar to the callee application go through the app middleware pipeline as described in the paragraph above." />

任何可用作 HTTP 中间件的中间件组件都可以使用 `appHttpPipeline` 配置作为中间件组件应用于服务到服务调用调用。下面的示例为从 Dapr 边车（服务调用的目标）到应用此配置的应用程序的所有传出调用添加 `uppercase` 中间件组件。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: pipeline
  namespace: default
spec:
  appHttpPipeline:
    handlers:
      - name: uppercase
        type: middleware.http.uppercase
```

## 相关链接

- [了解如何编写中间件组件]({{% ref develop-middleware.md %}})
- [组件架构]({{% ref component-schema.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
- [API 中间件示例](https://github.com/dapr/samples/tree/master/middleware-oauth-google)
