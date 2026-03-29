---
type: docs
title: "RouterChecker HTTP 请求路由"
linkTitle: "RouterChecker"
description: "使用 routerchecker 中间件阻止无效的 HTTP 请求路由"
aliases:
- /developing-applications/middleware/supported-middleware/middleware-routerchecker/
---

RouterChecker HTTP [中间件]（{{% ref middleware.md %}}）组件利用正则表达式来检查 HTTP 请求路由的有效性，防止无效路由进入 Dapr 集群。RouterChecker 组件会过滤掉错误请求，从而减少遥测和日志数据中的噪音。

## 组件格式

RouterChecker 将一组规则应用于传入的 HTTP 请求。你可以使用正则表达式在组件元数据中定义这些规则。在以下示例中，HTTP 请求 RouterChecker 被设置为根据 `^[A-Za-z0-9/._-]+$` 正则表达式验证所有请求消息。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: routerchecker 
spec:
  type: middleware.http.routerchecker
  version: v1
  metadata:
  - name: rule
    value: "^[A-Za-z0-9/._-]+$"
```

在此示例中，上述定义将产生以下通过/失败案例：

```shell
PASS /v1.0/invoke/demo/method/method
PASS /v1.0/invoke/demo.default/method/method
PASS /v1.0/invoke/demo.default/method/01
PASS /v1.0/invoke/demo.default/method/METHOD
PASS /v1.0/invoke/demo.default/method/user/info
PASS /v1.0/invoke/demo.default/method/user_info
PASS /v1.0/invoke/demo.default/method/user-info

FAIL /v1.0/invoke/demo.default/method/cat password
FAIL /v1.0/invoke/demo.default/method/" AND 4210=4210 limit 1
FAIL /v1.0/invoke/demo.default/method/"$(curl
```

## 规范元数据字段

| 字段 | 详情 | 示例 |
|-------|---------|---------|
| rule | HTTP 请求 RouterChecker 使用的正则表达式 | `^[A-Za-z0-9/._-]+$`|

## Dapr 配置

要应用该中间件，必须在[配置]（{{% ref configuration-concept.md %}}）中引用它。请参阅[中间件管道]（{{% ref "middleware.md#customize-processing-pipeline"%}}）。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: routerchecker 
      type: middleware.http.routerchecker
```

## 相关链接

- [中间件]({{% ref middleware.md %}})
- [配置概念]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
