---
type: docs
title: "超时弹性策略"
linkTitle: "超时"
weight: 10
description: "配置超时的弹性策略"
---

网络调用可能因多种原因失败，导致应用程序无限期等待响应。通过设置超时时长，您可以切断那些无响应的服务，释放资源以处理新请求。

超时是可选策略，可用于提前终止长时间运行的操作。设置一个现实的超时时长，反映生产环境中的实际响应时间。如果超出了超时时长：

- 正在进行的操作将被终止（如果可能）。
- 返回错误。

## 超时策略格式

```yaml
spec:
  policies:
    # 超时是指定的时长。
    timeouts:
      timeoutName: timeout1
      general: 5s
      important: 60s
      largeResponse: 10s
```

### 规范元数据

| 字段 | 详情 | 示例 |
| timeoutName | 超时策略的名称 | `timeout1` |
| general | 标记为"general"的超时时长。使用 Go 的 [time.ParseDuration](https://pkg.go.dev/time#ParseDuration) 格式。没有设置最大值。 | `15s`、`2m`、`1h30m` |
| important | 标记为"important"的超时时长。使用 Go 的 [time.ParseDuration](https://pkg.go.dev/time#ParseDuration) 格式。没有设置最大值。 | `15s`、`2m`、`1h30m` |
| largeResponse | 等待大型响应的超时时长。使用 Go 的 [time.ParseDuration](https://pkg.go.dev/time#ParseDuration) 格式。没有设置最大值。 | `15s`、`2m`、`1h30m` |

> 如果未指定超时值，策略不会强制执行时间，默认为您根据请求客户端设置的值。

## 后续步骤

- [了解更多关于默认弹性策略]({{% ref default-policies.md %}})
- 了解更多关于：
  - [重试策略]({{% ref retries-overview.md %}})
  - [熔断器策略]({{% ref circuit-breakers.md %}})

## 相关链接

试用其中一个弹性快速入门：
- [弹性：服务间]({{% ref resiliency-serviceinvo-quickstart.md %}})
- [弹性：状态管理]({{% ref resiliency-state-quickstart.md %}})
