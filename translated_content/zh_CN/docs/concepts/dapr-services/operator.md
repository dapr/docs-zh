---
type: docs
title: "Dapr Operator 控制平面服务概述"
linkTitle: "Operator"
description: "Dapr Operator 服务概述"
---

在 [Kubernetes 模式]({{% ref kubernetes %}})下运行 Dapr 时，运行 Dapr Operator 服务的 Pod 管理 [Dapr 组件]({{% ref components %}}) 更新，并为 Dapr 提供 Kubernetes 服务端点。

## 运行 Operator 服务

Operator 服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm charts 部署。有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## 其他配置选项

Operator 服务包含其他配置选项。

### 注入器看门狗

Operator 服务包含 _注入器看门狗_ 功能，该功能定期轮询 Kubernetes 集群中运行的所有 Pod，并确认 Dapr 边车已注入到具有 `dapr.io/enabled=true` 注解的 Pod 中。该功能主要用于处理 [注入器服务]({{% ref sidecar-injector %}}) 未能成功将边车（`daprd` 容器）注入到 Pod 的场景。


注入器看门狗在多种情况下都很有用，包括：

- 从完全停止的 Kubernetes 集群中恢复。当集群完全停止然后重新启动时（包括集群完全故障的情况），Pod 以随机顺序重启。如果应用程序在 Dapr 控制平面（特别是注入器服务）准备就绪之前重启，Dapr 边车可能无法注入到应用程序的 Pod 中，导致应用程序行为异常。

- 解决边车注入器潜在的随机故障，例如注入器服务内部的瞬时故障。


如果看门狗检测到应该有边车但没有边车的 Pod，它将删除该 Pod。然后 Kubernetes 将重新创建该 Pod，再次调用 Dapr 边车注入器。

注入器看门狗功能**默认禁用**。

您可以通过向 `operator` 命令传递 `--watch-interval` 标志来启用它，该标志可以采用以下值之一：


- `--watch-interval=0`：禁用注入器看门狗（省略该标志时的默认值）。
- `--watch-interval=<interval>`：启用注入器看门狗，并按指定间隔轮询所有 Pod；间隔值的字符串包含时间单位。例如：`--watch-interval=10s`（每 10 秒）或 `--watch-interval=2m`（每 2 分钟）。
- `--watch-interval=once`：注入器看门狗在 Operator 服务启动时仅运行一次。

如果使用 Helm，可以使用 `dapr_operator.watchInterval` 选项配置注入器看门狗，该选项与命令行标志具有相同的值。


> 在 HA（高可用）模式下运行 Operator 服务时（配置多个副本），注入器看门狗是安全可用的。在此情况下，Kubernetes 会自动选举一个"领导者"实例，这是唯一运行注入器看门狗服务的实例。  

> 然而，在 HA 模式下，如果将注入器看门狗配置为仅"运行一次"，当 Operator 服务实例被选为领导者时，看门狗轮询会实际启动。这意味着，如果 Operator 服务的领导者崩溃并选出新的领导者，将再次触发注入器看门狗。

观看此视频，了解注入器看门狗的概览：

<div class="embed-responsive embed-responsive-16by9">
<iframe width="360" height="315" src="https://www.youtube-nocookie.com/embed/ecFvpp24lpo?start=1848" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
</div>
