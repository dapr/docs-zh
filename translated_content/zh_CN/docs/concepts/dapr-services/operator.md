---
type: docs
title: "Dapr Operator 控制平面服务概述"
linkTitle: "Operator"
description: "Dapr operator 服务概述"
---

当在 [Kubernetes 模式]({{% ref kubernetes %}})下运行 Dapr 时，运行 Dapr Operator 服务的 pod 会管理 [Dapr 组件]({{% ref components %}})更新，并为 Dapr 提供 Kubernetes 服务端点。

## 运行 operator 服务

operator 服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm charts 部署。有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## 其他配置选项

operator 服务包含其他配置选项。

### 注入器看门狗

operator 服务包含一个 _injector watchdog_ 功能，它定期轮询 Kubernetes 集群中运行的所有 pod，并确认在带有 `dapr.io/enabled=true` 注解的 pod 中已注入 Dapr 边车。它的主要目的是解决 [Injector 服务]({{% ref sidecar-injector %}})未能成功将边车（`daprd` 容器）注入 pod 的情况。


注入器看门狗在以下几种情况下可能有用：

- 从完全停止的 Kubernetes 集群恢复。当集群完全停止然后重新启动时（包括完全集群故障的情况），pod 会以随机顺序重新启动。如果您的应用程序在 Dapr 控制平面（特别是 Injector 服务）准备就绪之前重新启动，Dapr 边车可能不会被注入到您应用程序的 pod 中，导致您的应用程序表现异常。

- 解决边车注入器可能的随机故障，例如 Injector 服务内的临时故障。


如果看门狗检测到某个 pod 应该有权车但实际没有，它会删除该 pod。然后 Kubernetes 会重新创建该 pod，再次调用 Dapr 边车注入器。

注入器看门狗功能**默认是禁用的**。

您可以通过向 `operator` 命令传递 `--watch-interval` 标志来启用它，它可以采用以下值之一：


- `--watch-interval=0`：禁用注入器看门狗（如果省略标志，则为默认值）。
- `--watch-interval=<interval>`：启用注入器看门狗，并按给定间隔轮询所有 pod；间隔值是一个包含单位的字符串。例如：`--watch-interval=10s`（每 10 秒）或 `--watch-interval=2m`（每 2 分钟）。
- `--watch-interval=once`：注入器看门狗仅在 operator 服务启动时运行一次。

如果您使用 Helm，可以使用 [`dapr_operator.watchInterval` 选项](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md#dapr-operator-options)配置注入器看门狗，其值与命令行标志相同。


> 当 operator 服务以高可用（HA）模式运行且有多个副本时，使用注入器看门狗是安全的。在这种情况下，Kubernetes 会自动选出一个"领导者"实例，该实例是唯一运行注入器看门狗服务的实例。

> 但是，在 HA 模式下，如果您配置注入器看门狗只运行"一次"，则每次选出 operator 服务实例作为领导者时，实际上都会启动看门狗轮询。这意味着，如果 operator 服务的领导者崩溃并选出新的领导者，将会再次触发注入器看门狗。

观看此视频了解注入器看门狗的概述：

<div class="embed-responsive embed-responsive-16by9">
<iframe width="360" height="315" src="https://www.youtube-nocookie.com/embed/ecFvpp24lpo?start=1848" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
