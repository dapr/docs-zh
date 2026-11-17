---
type: docs
title: "Shutdown API 参考"
linkTitle: "Shutdown API"
description: "Shutdown API 的详细文档"
weight: 1150
---

Shutdown API 会触发 Dapr sidecar（`daprd`）的优雅关闭。它与 daprd 收到 `SIGTERM` 时执行的关闭流程相同：input binding 与 pub/sub 的订阅会被关闭，正在处理的请求可以完成（受 `--dapr-graceful-shutdown-seconds` 限制），reminder 与 component 会被刷新，然后进程退出。

该 API 有两种模式：

- **优雅关闭**（默认）：触发常规的关闭流程并立即返回。
- **强制关闭**：跳过优雅关闭流程，在短暂延迟后通过 `os.Exit(1)` 退出进程，以便 HTTP/gRPC 响应能够发送出去。适用于sidecar 卡住、排空请求没有进展的情况。

## HTTP 请求

```
POST http://localhost:<daprPort>/v1.0/shutdown
```

### URL 参数

该端点不接受路径参数或查询参数。

### 请求标头

| 标头 | 必填 | 说明 |
| --- | :---: | --- |
| `Dapr-Force-Shutdown` | N | 存在时（任意非空值），会使 daprd 跳过优雅关闭流程，在发送完 HTTP 响应后通过 `os.Exit(1)` 立即退出。 |

### 响应

调用成功时返回 HTTP `204 No Content`。随后sidecar 开始异步关闭，这意味着随着各项服务关闭，之后发往该 sidecar 的请求将开始失败。调用方不应把响应的返回时间当作关闭已完成的信号；应使用进程或容器的生命周期信号来判断。

### 示例

触发优雅关闭：

```bash
curl -X POST http://localhost:3500/v1.0/shutdown
```

不排空请求，立即强制关闭：

```bash
curl -X POST -H "Dapr-Force-Shutdown: 1" http://localhost:3500/v1.0/shutdown
```

## gRPC 请求

对应的 gRPC 方法为 `dapr.proto.runtime.v1.Dapr/Shutdown`（在 `v1` 版本中已 GA）。

### gRPC metadata

| metadata 键 | 必填 | 说明 |
| --- | :---: | --- |
| `dapr-force-shutdown` | N | 存在时，daprd 会跳过优雅关闭，并在短暂延迟后通过 `os.Exit(1)` 退出。与 HTTP 标头 `Dapr-Force-Shutdown` 等效（HTTP 处理程序会把该标头桥接到 gRPC metadata上下文中，使 `Universal.Shutdown` 只保留一条代码路径）。 |

## 何时使用哪种模式

| 模式 | 适用场景 | 注意事项 |
| --- | --- | --- |
| 优雅关闭（默认） | 常规的运维人员触发关闭、自动化 CI 清理，以及需要 daprd 干净退出的 [Kubernetes job]({{% ref "kubernetes-job.md" %}}) | 受 `--dapr-graceful-shutdown-seconds`（默认 5）和 `--dapr-block-shutdown-duration` 限制。在配置的排空或阻塞时间窗口结束之前，sidecar 不会退出。 |
| 强制关闭 | sidecar 卡住、排空没有进展时，或需要确定性拆除的端到端测试 | 退出码为 `1`。会把非零退出视为失败的容器编排器会将其当作崩溃处理；仅在可以接受时使用。 |

## API 允许列表

可以通过 [API 允许列表]({{% ref "api-allowlist.md" %}}) 允许或拒绝 `Shutdown`，API 名称使用 `shutdown`（HTTP：`v1.0`，gRPC：`v1`）。

## 相关链接

- [Dapr Kubernetes job]({{% ref "kubernetes-job.md" %}})
- [sidecar 健康检查与优雅关闭]({{% ref "sidecar-health.md#delay-graceful-shutdown" %}})
- [sidecar 参数与注解]({{% ref "arguments-annotations-overview.md" %}})
- [API 允许列表]({{% ref "api-allowlist.md" %}})
