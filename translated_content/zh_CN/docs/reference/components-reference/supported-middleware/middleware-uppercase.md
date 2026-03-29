---
type: docs
title: "将请求体转换为大写"
linkTitle: "Uppercase"
description: "使用 uppercase 中间件测试您的 HTTP 管道是否正常工作"
aliases:
- /developing-applications/middleware/supported-middleware/middleware-uppercase/
---

uppercase [HTTP 中间件]({{% ref middleware.md %}}) 将请求体转换为大写字母，用于测试管道是否正常工作。它仅应用于本地开发。

## 组件格式

在以下定义中，它将请求体的内容转换为大写：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: uppercase
spec:
  type: middleware.http.uppercase
  version: v1
```

此组件没有需要配置的 `metadata`。

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
    - name: uppercase
      type: middleware.http.uppercase
```

## 相关链接

- [中间件]({{% ref middleware.md %}})
- [配置概念]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
