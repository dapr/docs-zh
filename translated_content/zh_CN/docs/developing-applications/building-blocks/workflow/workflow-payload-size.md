---
type: docs
title: "workflow 负载大小"
linkTitle: "负载大小"
weight: 9500
description: "Dapr 如何处理接近 sidecar 最大请求体大小的 workflow 和 activity 负载，以及用于反映其与该上限接近程度的指标"
---

Dapr sidecar 与 workflow SDK 之间的派发通过单个双向 gRPC 流（`GetWorkItems`）进行。每次派发都会通过该流发送一个 `WorkflowRequest` 或 `ActivityRequest`，其中包含 workflow 的 `PastEvents`、`NewEvents`，以及（对于 multi-app workflow）`PropagatedHistory`。该流上单条消息的最大大小受 sidecar 的 `--max-body-size` 标志（及等效的 `dapr.io/max-body-size` 注解）限制，默认为 **4 MiB**。

{{% alert title="注意" color="primary" %}}
使用 [stateful workflow client]({{% ref "workflow-stateful-client.md" %}}) 时，已预热的工作进程只会收到自其上一轮次以来新增的 history event，因此实际经过该流的内容通常远小于 workflow 的完整历史。这并不会提高本页所述的上限。下面的大小检查针对的是状态中保存的 workflow 完整历史，发生在工作项被缩减为增量之前，因此无论如何，workflow 都会在同一位置停滞，即便实际发送的消息只是一个很小的增量。该检查必须保守：执行检查时，sidecar 尚不知道哪个工作进程会接收该轮次，而对该实例而言处于冷状态（未持有其状态）的工作进程总是会收到完整历史。
{{% /alert %}}

## 优雅停滞

编排器会在每次派发写入流之前预先检查其大小。大小预算为 **`--max-body-size` 的 95%**；其余 5% 为余量，用于覆盖引擎注入 `WorkflowStarted` 事件以及 gRPC 分帧的开销。

当某次派发将超出预算时：

- 违规的 workflow 会进入**停滞状态**。其工作项不会发送给 SDK，流上也不会抛出 `ResourceExhausted`。
- 流保持打开，其他 workflow 仍会正常派发。
- 停滞是持久的：重新加载或重新派发该 workflow 会再次执行相同的预检查，因此在运维人员采取行动之前，该 workflow 将一直处于停滞状态。

这只是一种针对单个 workflow 的安全机制，而不是背压或配额功能。运维人员应采取以下任一措施：

1. **提高受影响 sidecar 上的 `--max-body-size`**（并重启该 sidecar）。下一次派发将通过预检查，workflow 随之恢复。activity 派发沿用相同的余量规则，因此也请考虑 activity 的输入和输出大小。
2. 若负载无限制增长（例如，某个 workflow 长时间不断向一个大列表追加内容），则**强制清除该 workflow**。参见[操作指南：管理 workflow]({{% ref howto-manage-workflow.md %}})。
3. **重构 workflow**，避免在 activity 之间传递大负载。例如，改为传递引用（对象存储 URL、state store 键）而非内联数据。

.NET SDK 的 [Workflow data references（alpha）]({{% ref dotnet-workflow-data-references.md %}}) 为上述第三种方式提供了可选的 Binary Store 卸载功能及显式引用。Binary Store 与 SDK 集成均处于 alpha 阶段，可能会发生变更。跨应用使用需要兼容且支持负载感知的 .NET 应用，并且这些应用能够访问相同的被引用对象；其他 Dapr 语言 SDK 目前不支持数据引用。卸载不会提高派发上限，也不会减小其他 history event 的大小。

同样的预检查也适用于 activity 派发；超大的 activity 请求只会使该 activity 停滞，而不会使其父 workflow 停滞。

## 指标

由于停滞在应用层无声无息，两个直方图指标可在 workflow 触发阈值*之前*，展示负载与阈值的接近程度。两个指标记录的都是**比值**（负载大小 / `--max-body-size`），而不是绝对字节数。比值在配置了不同 `--max-body-size` 值的 sidecar 之间通用，能够超出原始字节分布 4 GiB 的上限，并使得与停滞接近程度相关的查询变得十分简单。

| 指标 | 标签 | 记录于 |
| --- | --- | --- |
| `runtime/workflow/payload/size_ratio` | `app_id`, `namespace`, `workflow_name` | 每次 workflow 派发（`runWorkflow`） |
| `runtime/workflow/activity/payload/size_ratio` | `app_id`, `namespace`, `workflow_name`, `activity_name` | 每次 activity 派发（包括触发停滞的那一次） |

两个直方图共用的桶集中在 0.95 停滞阈值附近：

```
0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 1.0, 1.5, 2.0
```

取值大于等于 `1.0` 的，对应超过 `--max-body-size` 本身的派发。取值在 `(0.95, 1.0]` 范围内的，对应触发了安全阈值并进入停滞状态的派发。

当 `--max-body-size` 被设为非正值（`0` 或负数）时，将完全跳过记录。这表示“无限制”，与 Dapr HTTP 服务器所用的约定一致。没有上限时比值没有定义。使用默认的 `4Mi`（或任何显式设置的正值）时，记录始终处于启用状态。

### 建议的告警

以下是使用 Prometheus 的一个实用基线：

```promql
# 任一 workflow 的第 99 百分位派发距离停滞阈值在 5% 以内。
histogram_quantile(0.99,
  sum by (le, app_id, workflow_name) (
    rate(runtime_workflow_payload_size_ratio_bucket[5m])
  )
) > 0.9
```

```promql
# 任一 activity 在最近 5 分钟内至少已停滞一次。
sum by (app_id, workflow_name, activity_name) (
  increase(runtime_workflow_activity_payload_size_ratio_bucket{le="+Inf"}[5m])
  -
  increase(runtime_workflow_activity_payload_size_ratio_bucket{le="0.95"}[5m])
) > 0
```

这两条查询均与实际的 `--max-body-size` 设置无关，因此在你提高上限之后仍然有效。

## 相关链接

- [操作指南：处理更大的请求体]({{% ref increase-request-size.md %}})（提高 `--max-body-size`）
- [workflow 功能与概念]({{% ref workflow-features-concepts.md %}})
- [操作指南：管理 workflow]({{% ref howto-manage-workflow.md %}})（强制清除）
- [workflow 架构]({{% ref workflow-architecture.md %}})
