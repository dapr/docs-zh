---
type: docs
title: "Dapr Operator control plane 服务概述"
linkTitle: "Operator"
description: "Dapr Operator 服务概述"
---

在 [Kubernetes 模式]({{% ref kubernetes %}})下运行 Dapr 时，运行 Dapr Operator 服务的 Pod 负责管理 [Dapr component]({{% ref components %}}) 的更新，并为 Dapr 提供 Kubernetes 服务端点。

## 运行 Operator 服务

Operator 服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm charts 部署。有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## 其他配置选项

Operator 服务包含一些额外的配置选项。

### 注入器看门狗

Operator 服务包含 _注入器看门狗_ 功能，该功能会定期轮询 Kubernetes 集群中运行的所有 Pod，并确认带有 `dapr.io/enabled=true` 注解的 Pod 中已注入 Dapr sidecar。该功能主要用于处理 [注入器服务]({{% ref sidecar-injector %}}) 未能成功将 sidecar（`daprd` 容器）注入 Pod 的情况。


注入器看门狗在以下几种情况中很有用：

- 从完全停止的 Kubernetes 集群中恢复。当集群被完全停止后再重新启动时（包括整个集群发生故障的情况），Pod 会以随机顺序重启。如果应用程序在 Dapr control plane（特别是注入器服务）就绪之前重启，Dapr sidecar 可能无法注入应用程序的 Pod 中，导致应用程序行为异常。

- 应对 sidecar injector 可能出现的随机故障，例如注入器服务内部的瞬时故障。


如果看门狗检测到本应注入 sidecar 却没有注入的 Pod，它会删除该 Pod。随后 Kubernetes 会重新创建该 Pod，并再次调用 Dapr sidecar injector。

注入器看门狗功能**默认禁用**。

你可以向 `operator` 命令传递 `--watch-interval` 标志来启用它，该标志可以取以下值之一：


- `--watch-interval=0`：禁用注入器看门狗（省略该标志时的默认值）。
- `--watch-interval=<interval>`：启用注入器看门狗，并按给定的间隔轮询所有 Pod；间隔值是包含时间单位的字符串。例如：`--watch-interval=10s`（每 10 秒）或 `--watch-interval=2m`（每 2 分钟）。
- `--watch-interval=once`：Operator 服务启动时，注入器看门狗只运行一次。

如果使用 Helm，可以通过 [`dapr_operator.watchInterval` 选项](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md#dapr-operator-options)配置注入器看门狗，该选项的取值与命令行标志相同。


> 在 HA（高可用）模式下运行 Operator 服务（配置多个副本）时，注入器看门狗可以安全使用。此时 Kubernetes 会自动选举一个“领导者”实例，只有该实例运行注入器看门狗服务。  

> 然而，在 HA 模式下，如果将注入器看门狗配置为“只运行一次”，那么每当 Operator 服务的某个实例被选为领导者时，看门狗轮询都会启动。这意味着，如果 Operator 服务的领导者崩溃并选出新的领导者，就会再次触发注入器看门狗。

观看此视频，了解注入器看门狗的概览：

<div class="embed-responsive embed-responsive-16by9">
<iframe width="360" height="315" src="https://www.youtube-nocookie.com/embed/ecFvpp24lpo?start=1848" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
