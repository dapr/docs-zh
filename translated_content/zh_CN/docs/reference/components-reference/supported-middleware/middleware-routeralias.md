---
type: docs
title: "Router alias http request routing"
linkTitle: "Router 别名"
description: "使用 router alias 中间件将任意 HTTP 路由别名为 Dapr 端点"
aliases:
- /developing-applications/middleware/supported-middleware/middleware-routeralias/
---

Router alias HTTP [中间件]({{% ref middleware.md %}})组件允许您将传入 Dapr 的任意 HTTP 路由转换为有效的 Dapr API 端点。

## 组件格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: routeralias 
spec:
  type: middleware.http.routeralias
  version: v1
  metadata:
    # String containing a JSON-encoded or YAML-encoded dictionary
    # Each key in the dictionary is the incoming path, and the value is the path it's converted to
    - name: "routes"
      value: |
        {
          "/mall/activity/info": "/v1.0/invoke/srv.default/method/mall/activity/info",
          "/hello/activity/{id}/info": "/v1.0/invoke/srv.default/method/hello/activity/info",
          "/hello/activity/{id}/user": "/v1.0/invoke/srv.default/method/hello/activity/user"
        }
```

在上面的示例中，传入的 HTTP 请求 `/mall/activity/info?id=123` 会被转换为 `/v1.0/invoke/srv.default/method/mall/activity/info?id=123`。

# 规范元数据字段

| 字段 | 详情 | 示例 |
|-------|---------|---------|
| `routes` | 包含 JSON 编码或 YAML 编码字典的字符串。字典中的每个键是传入路径，值是其要转换到的路径。 | 见上面的示例 |

## Dapr 配置

要应用中间件，必须在[配置]({{% ref configuration-concept.md %}})中引用它。请参阅[中间件管道]({{% ref "middleware.md#customize-processing-pipeline"%}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: routeralias 
      type: middleware.http.routeralias
```

## 相关链接

- [中间件]({{% ref middleware.md %}})
- [配置概念]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
