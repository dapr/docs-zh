---
type: docs
title: "速率限制"
linkTitle: "速率限制"
description: "使用 rate limit middleware 来限制每秒请求数"
aliases:
- /zh-hans/developing-applications/middleware/supported-middleware/middleware-rate-limit/
---

速率限制 [HTTP middleware]({{% ref middleware.md %}}) 允许限制每秒允许的最大 HTTP 请求数。速率限制可以保护你的应用程序免受拒绝服务（DoS）攻击。DoS 攻击可能由恶意的第三方发起，也可能由你软件中的错误引起（即“友军误伤”式 DoS 攻击）。

## component 格式

在以下定义中，每秒最大请求数设置为 10：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: ratelimit
spec:
  type: middleware.http.ratelimit
  version: v1
  metadata:
  - name: maxRequestsPerSecond
    value: 10
```

## 规范 metadata 字段

| 字段 | 详情 | 示例 |
|-------|---------|---------|
| `maxRequestsPerSecond` | 按远程 IP 计算的每秒最大请求数。<br>component 会查看 `X-Forwarded-For` 和 `X-Real-IP` 请求头来确定调用方的 IP。 | `10`

一旦达到限制，请求将失败并返回 HTTP 状态码 *429: Too Many Requests*。

{{% alert title="重要" color="warning" %}}
速率限制在每个 Dapr sidecar 中独立执行，而不是在整个集群范围内执行。
{{% /alert %}}

或者：
- [最大并发设置]({{% ref control-concurrency.md %}})可用于对应用程序进行速率限制，它适用于所有流量，无论远程 IP、协议或路径如何。
- [workflow 并发限制]({{% ref workflow-concurrency.md %}})提供按 workflow 和按 activity 的并发控制，包括由 Scheduler 跨所有副本强制执行的全局限制。

## Dapr 配置

要应用 middleware，必须在[配置]({{% ref configuration-concept.md %}})中引用它。请参阅[middleware 流水线]({{% ref "middleware.md#customize-processing-pipeline"%}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: ratelimit
      type: middleware.http.ratelimit
```

## 相关链接

- [控制最大并发]({{% ref control-concurrency.md %}})
- [middleware]({{% ref middleware.md %}})
- [Dapr 配置]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
