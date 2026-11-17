---
type: docs
title: "workflow 快速路径"
linkTitle: "快速路径"
weight: 4500
description: "在本地驱动 workflow 轮次与 activity，并把 activity 完成合并进单次状态提交，从 workflow 热路径上去掉 Scheduler 往返与 state store 提交"
is_preview: true
---

workflow 快速路径是 Dapr sidecar 内部的三项优化的组合。它们去掉了每个 workflow 轮次中按事件创建的 Scheduler reminder，以及大部分 state store 提交，同时保留与默认路径相同的至少一次执行保证。workflow 和 activity 在已经持有对应工作的主机上驱动执行，activity 完成也不再单独提交，而是持久化到下一次轮次的那一次 state store 提交之中。

{{% alert title="预览功能" color="warning" %}}
快速路径从 Dapr v1.19 起以[预览功能]({{% ref "support-preview-features.md" %}})的形式提供，由 `WorkflowsFastPath` feature gate 控制。它默认关闭，需要通过 [配置的 `features` 列表]({{% ref "preview-features.md" %}})按应用启用。

快速路径完全位于 sidecar 内部。无需升级 SDK，也无需修改应用；workflow SDK 与 sidecar 之间的协议保持不变。
{{% /alert %}}

## 概述

workflow 通过*轮次*推进。一次轮次会唤醒 workflow Actor，在你的应用代码中重放 workflow 历史以及新事件，然后提交结果（新的 history event，以及需要调度的 activity 或 timer）。每一次 activity 完成、external event、timer 或启动请求，都会触发一次轮次。

如果不启用快速路径，每次轮次都要经由 Scheduler service 驱动，并多次访问 state store：

1. 到达的事件先提交到 workflow 的持久化收件箱。
2. 在 Scheduler 中创建一个名为 `new-event-<code>-<id>` 的一次性 reminder（即 job upsert），它会回调 workflow Actor，之后被删除。
3. 轮次执行，并提交新的历史。
4. 轮次调度的每个 activity，在 activity 主体运行之前，都会在 activity Actor 上获得自己的一次性 `run-activity` reminder。

对于顺序 workflow，每次轮次合计约产生四次经 fsync 的 state store 提交、两次 Scheduler 往返，以及约九次 gRPC 跳转，而且 Scheduler 为每个事件保存一个 job。

快速路径用三段机制替代这一流程，三者同时启用：

- **本地唤醒**：提交事件的那台主机自己驱动该轮次，而不是创建按事件的 reminder。[详细了解](#第-1-段本地唤醒)
- **本地活动驱动**：派发到达后，activity 主体会立即在其所在主机上运行，无需 `run-activity` reminder，前提是派发它的 workflow 确认其兜底恢复机制已就绪。[详细了解](#第-2-段本地活动驱动)
- **完成折叠**：activity 完成先暂存在内存中，并持久化到下一次轮次的那一次提交中。只有该提交成功之后，activity Actor 才会收到确认。[详细了解](#第-3-段完成折叠)

持久性从"每个事件一个 Scheduler job"转变为"每个活跃 workflow instance 一个可重复执行的 *janitor* reminder"。本地驱动失败的唤醒由该 janitor 恢复；失败的 activity 驱动还会升级回其持久的 `run-activity` reminder。至少一次执行与事件顺序保持不变。

## 前提条件

- 应用的每个 sidecar 都需运行 Dapr v1.19 或更高版本。旧版 sidecar 会忽略快速路径信号并继续使用 reminder，因此混合版本的推出是安全的，但只有已升级的主机会走快速路径。
- 必须运行 [Scheduler service]({{% ref "scheduler.md" %}})。janitor 兜底机制本身就是一个 Scheduler reminder。
- 不得配置由 Scheduler 强制执行的[workflow 并发限制]({{% ref "workflow-concurrency.md" %}})。参见[并发限制](#并发限制)。
- 任何支持 Dapr Workflow 的 Actor state store 均可。快速路径会在 activity Actor 的状态前缀下添加一个很小的 `execution-claim` 键，且只在 placement 变化时写入。

## 配置

在应用的配置资源中启用快速路径：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  features:
    - name: WorkflowsFastPath
      enabled: true
```

该门控在 sidecar 启动时读取。修改之后，需要重启应用的 sidecar。

该设置的作用范围限于使用该配置的应用。在[multi-application workflow]({{% ref "workflow-multi-app.md" %}})中，只有当托管该 activity 的应用的配置也启用了快速路径时，该 activity 才会在本地驱动；否则它保留持久 reminder 路径。

如果配置同时设置了由 Scheduler 强制执行的并发限制，sidecar 会在启动时输出以下日志，并改为运行默认的 reminder 路径：

```
WorkflowsFastPath is enabled but scheduler-enforced workflow concurrency limits are configured; disabling the fast path so the limits are enforced
```

随时关闭快速路径都是安全的，无需任何迁移。对于仍在运行的实例，遗留的 janitor reminder 会作为普通轮次或空操作触发，并在实例完成后自行删除；任何已创建的 `run-activity` reminder，其行为与默认路径完全相同。

## 单次轮次的开销

| 步骤 | 不启用快速路径 | 启用快速路径 |
| ---- | --------------------- | ------------------ |
| activity 完成到达 | 提交到收件箱（一次提交） | 暂存在内存中；activity Actor 的调用保持打开，直到轮次提交 |
| 唤醒 workflow Actor | `new-event` reminder：job upsert（一次提交）、Scheduler 触发往返、job 删除 | 同一主机上的本地驱动循环，不调用 Scheduler |
| 轮次结果 | 历史提交（一次提交） | 一次提交，包含折叠进来的完成；然后确认 activity Actor |
| 派发 activity | `run-activity` reminder：job upsert（一次提交）、触发往返、job 删除 | 目标主机上的独立本地驱动，无 reminder |
| 持久兜底 | 每个 reminder 各自兜底 | 每个活跃实例一个可重复执行的 janitor reminder，只创建一次，每 20 秒触发一次；没有待处理工作时为空操作 |

下面两张图展示了同一个顺序步骤（一个 activity 完成，并调度下一个 activity）在默认路径与快速路径上的过程。

{{< mermaid >}}
sequenceDiagram
    participant A as Activity actor (result sender)
    participant W as Workflow actor
    participant S as State store
    participant J as Scheduler
    participant P as Workflow app
    A->>W: AddWorkflowEvent(TaskCompleted)
    W->>S: commit inbox row (commit 1)
    W->>J: upsert new-event reminder (commit 2)
    W-->>A: ack
    J->>W: trigger new-event reminder
    W->>P: run turn (history + inbox)
    P-->>W: actions (TaskScheduled)
    W->>S: commit history, clear inbox (commit 3)
    J->>J: delete the fired reminder
    W->>A: Execute(next activity)
    A->>J: upsert run-activity reminder (commit 4)
    A-->>W: ack
    J->>A: trigger run-activity reminder
    A->>P: run activity body
    P-->>A: result
    A->>W: AddWorkflowEvent(TaskCompleted) for the next turn
{{< /mermaid >}}

{{< mermaid >}}
sequenceDiagram
    participant A as Activity actor (result sender)
    participant W as Workflow actor
    participant S as State store
    participant J as Scheduler
    participant P as Workflow app
    Note over W,J: one repeating janitor reminder per live instance, asserted once per residency
    A->>W: AddWorkflowEvent(TaskCompleted)
    W->>W: hold the completion in memory, notify the drive loop
    Note over A,W: the sender call stays open until the folding turn commits
    W->>P: run turn (history + held completion)
    P-->>W: actions (TaskScheduled)
    W->>S: single commit: history including the folded completion (commit 1)
    W-->>A: ack (durable)
    W->>A: Execute(next activity, localDrive=true)
    A-->>W: accepted, detached local drive armed
    A->>P: run activity body
    P-->>A: result
    A->>W: AddWorkflowEvent(TaskCompleted) for the next turn
    J-->>W: janitor fire every 20s: no-op while nothing is pending
{{< /mermaid >}}

在托管部署上的同集群 A/B 对比中，五个 activity 的顺序 workflow，其 state store 提交次数从不启用快速路径时的约 45 次，降至仅启用本地唤醒与本地 activity 两段时的约 26 次，再加上完成折叠后降至约 17 次。注意事项参见[性能参考](#性能参考)。

## 工作原理

### 第 1 段：本地唤醒

当事件已提交到 workflow 的收件箱后，workflow Actor 会自行驱动该轮次，而不再为每个事件创建 reminder：

1. Actor 首先确保其 [janitor 兜底](#janitor-兜底机制)reminder 已存在。如果无法创建 janitor，Actor 会回退到针对该事件的持久 reminder，因此持久性从不依赖快速路径是否成功。
2. Actor 向每个实例的通道发送一个通知，该通道容量为 1。待处理的通知会合并，这与被替换的 reminder 按名称覆盖的行为一致。
3. 如果该实例没有正在运行的驱动循环，则启动一个。循环每收到一个通知运行一次轮次，并在无事可做时退出。循环与发送方之间有一套回收握手机制，保证在循环退出期间发出的通知绝不丢失：要么正在退出的循环接手它，要么发送方启动一个新的循环。
4. 轮次通过本地主机上的常规 reminder 调用路径触发，并在该层禁用重试。因此，加锁、去重和错误处理与由 Scheduler 触发的轮次完全相同。
5. 每次驱动都会 drain 整个收件箱，而不仅仅是触发它的那个事件，因此轮次开始之前已保存的任何事件都会被处理。

如果轮次失败，循环会在原地以去相关的抖动退避重试，退避区间为 50 毫秒至 2 秒，总重试预算约 6 秒。如果轮次仍然失败，循环退出，由 janitor 在其下一次触发时接管恢复。本地唤醒失败时绝不会创建按事件的 reminder；janitor 是它唯一的持久兜底。

有两种情况保留 Scheduler 的到期时间：计划在未来某个时间启动的 workflow，以及到期时间在未来的任何唤醒。只有当前已到期的工作才会在本地驱动。

启动新实例时仍会创建持久的启动 reminder，但在快速路径下，它会被设定为 5 秒后才触发，作为休眠状态的兜底，而第一次轮次则在本地驱动。第一次轮次提交后，启动 reminder 会被删除。如果唯一持有第一次轮次的工作进程消失，兜底 reminder 会在宽限期后触发并恢复启动。被遗忘删除而残留的兜底 reminder，触发时遇到空收件箱，会以空操作确认。

运行中的 workflow 在确认一个空收件箱 reminder 后，会带着其缓存的历史常驻内存，而不像默认路径那样被停用，因为它的下一个事件通常很快就会到达。空闲的 Actor 会在大约一分钟后被 Actor 工厂的空闲回收器卸载；workflow 的终止轮次会立即释放其缓存的历史。

### janitor 兜底机制

janitor 是一个可重复执行的 Actor reminder，名为 `new-event-janitor`，每个活跃 workflow instance 一个：

- 它是惰性创建的：每次 workflow Actor 驻留期间只创建一次，即该实例第一次使用快速路径时。从未使用快速路径的实例不会创建它。创建操作是幂等的（Scheduler 按名称覆盖）。
- 它每 20 秒触发一次，并使用*丢弃*失败策略：它的触发周期本身就是它的重试。
- 它在 workflow 的终止轮次被删除，并在清除时被回收。
- 它的 `new-event` 前缀是有意为之的：早于 1.19 的 Dapr sidecar 会把任何 `new-event*` reminder 路由到普通轮次，因此即使 janitor 在实例已迁移到旧版主机后触发，也能驱动任何待处理的收件箱。

每次触发时，janitor 会加载实例状态，并只做最少必要的工作：

| 实例状态 | janitor 动作 | 记录为 |
| -------------- | -------------- | ----------- |
| 已清除 | 删除自身 | |
| 已完成、失败或已终止 | 处理终止提交之后仍待完成的收尾工作（父 workflow 通知、保留期 reminder），然后删除自身 | |
| 收件箱中有待处理行，且没有驱动在途 | 驱动一次轮次。这正是 janitor 存在的恢复事件 | `janitor_recovered` |
| 收件箱无行，但有等待折叠的完成且没有活跃的驱动者 | 驱动一次轮次，提交那些被暂存的完成 | `janitor_fold_recovered` |
| 收件箱无行，但有未解析且没有驱动在途的 `TaskScheduled` 事件 | 重新派发这些 activity（见[第 2 段](#第-2-段本地活动驱动)） | `janitor_redispatched` 及相关状态 |
| 无待处理工作 | 空操作，且不停用 Actor | |

空闲的 janitor 还能防止过期的内存缓存：对端主机可能在本主机加载状态之后写入了收件箱行。若在每个空闲实例的每次触发时都重新读取存储，将成为 janitor 的主要开销，因此探测会在连续的空闲触发之间退避（依次为第一、第二、第四和第八次触发，之后每八次一次）。因此，这种罕见的双重故障的恢复最多需要八个周期，而非一个。任何真实的 activity 都会重置这一节奏。

{{< diagram workflow-fast-path >}}

### 第 2 段：本地活动驱动

在默认路径上，workflow Actor 调用 activity Actor 的 `Execute`，后者创建一个一次性的 `run-activity` reminder，并且只在 Scheduler 触发它时才运行 activity 主体。正是这个 reminder 在 activity 主机崩溃后仍能保留下来。

启用快速路径后：

1. 当轮次调度了 activity，且 workflow 的 janitor 已就绪时，workflow Actor 会为每次 `Execute` 调用加上 `localDrive` 信号。如果 janitor 无法就绪，activity 仍会像之前一样通过持久 reminder 派发。
2. 运行快速路径的 activity 主机在收到带该信号的、已到期的 activity 时，会启动一个独立的本地驱动并立即返回，不创建 reminder。延迟的 activity，或正在关闭的主机，则使用 reminder。
3. 驱动通过常规的 reminder 调用路径调用 activity，最多尝试三次，并采用带抖动的退避。如果三次都失败，驱动会*升级*：创建持久的 `run-activity` reminder，恢复默认路径的无限重试链。如果升级本身也失败，workflow 的 janitor 会在一个周期内重新派发该 activity。
4. 如果驱动因 placement 变化而中断，而其执行在本主机上仍然存活，则不会升级，因为 reminder 会在新所有者上再次运行 activity 主体。这种情况由[执行认领记录](#执行认领记录)处理。

workflow 的 janitor 是 activity 的持久重驱动者，用于处理那些主机在发布结果之前就已死亡的 activity。每次触发时，它会在历史中查找没有在历史、收件箱或暂存完成中得到解析的 `TaskScheduled` 事件：

- janitor 第一次看到这样的任务时，会带上 `localDrive` 信号重新派发它。如果该 activity 实际上仍在执行，正在运行的执行会将此次重复派发作为跟随者吸收，结果只发布一次；重复的完成会被 workflow Actor 的去重机制丢弃。
- 如果同一任务在下一次触发时仍未解析，janitor 会升级：不带 `localDrive` 信号派发该 activity，使 activity 主机创建快速路径原本省略的持久 `run-activity` reminder。升级会在每个周期重复，直到任务解析为止；reminder 的创建是幂等的。
- 重新派发调用若因 activity Actor 忙于执行而在 30 秒后超时，属于健康的进行中情况，记录为 `janitor_redispatch_busy`。
- `ContinueAsNew` 之后，任务 ID 会从零重新开始，因此 janitor 针对每个任务的记账在每一代都会被重置。

已升级的 `run-activity` reminder 会在其任务解析后立即删除。若不回收，遗留的触发可能会在已不记得该执行的主机上再次运行 activity 主体。

{{< mermaid >}}
sequenceDiagram
    participant W as Workflow actor (dispatcher)
    participant A as Activity actor (target host)
    participant P as Activity app
    participant J as Scheduler
    W->>A: Execute(localDrive=true)
    A-->>W: accepted, no reminder created
    A->>A: detached drive, attempt 1 of 3
    A->>P: run activity body
    alt Body completes
        P-->>A: result
        A->>W: AddWorkflowEvent(TaskCompleted)
    else Attempt fails, retries left
        A->>A: jittered backoff 50ms to 2s, retry
    else 3 attempts failed
        A->>J: upsert durable run-activity reminder (escalated)
        J->>A: trigger, retry-forever policy resumes
    end
    Note over W,J: Janitor path when the activity host died before publishing
    J->>W: janitor fire, TaskScheduled still unresolved
    W->>A: Execute(localDrive=true, janitorRedispatch=true), first period
    Note over A: a live execution absorbs the duplicate as a follower
    J->>W: next janitor fire, still unresolved
    W->>A: Execute without localDrive, second period
    A->>J: create durable run-activity reminder
    W->>J: delete the escalated reminder once the task resolves
{{< /mermaid >}}

### 执行认领记录

在默认路径上，`run-activity` reminder 与主机无关：activity Actor 触发时由哪台主机持有，就由哪台主机运行 activity 主体。启用快速路径后，activity 主体执行期间不存在 reminder，因此在长时间运行的 activity 期间发生 placement 变化时，需要另一种方式来区分：上一个所有者上的执行是否仍然存活，还是它已随主机一同消亡。执行认领记录正是为此提供的：

- 只有当 placement 把一个仍有未结算执行的 Actor 迁离其主机时，才会在 activity Actor 的状态前缀下、键为 `execution-claim` 的位置写入该记录。稳态的快速路径执行从不为此访问存储；优雅关闭时也不会写入，因为执行会随进程一同结束，写入记录只会拖延新所有者。
- 在 activity 主体仍在运行时，上一个所有者每 10 秒（janitor 周期的一半）刷新记录中的心跳；结果发布后，将记录标记为已完成；并在短暂保留后删除它。
- 新所有者上的到达会读取该记录，并有三种结果：心跳仍在变化时**推迟**（到达方返回一个可恢复错误，稍后重试）；上一个所有者已发布结果时**已完成**（到达方直接确认，不执行）；心跳连续两个 janitor 周期（40 秒）未变化时**继续**（作为新的所有者执行）。
- 判断是否过期，是通过在读取方自己的时钟上观察心跳值是否保持不变。读取方从不把写入方的时间戳与自己的时间比较，因此主机之间的时钟偏差永远不会导致存活的执行被回收。

写入该记录时，其保证比默认路径更强：在 placement 交接期间，跨主机最多只有一个存活的 activity 主体，同时保留至少一次执行。如果写入失败，sidecar 会记录一条警告，该次交接则退回到普通的至少一次行为，此时两次执行可能重叠。

{{< mermaid >}}
sequenceDiagram
    participant O as Previous owner (activity host)
    participant S as Actor state store
    participant N as New owner after the placement change
    participant P as Activity app
    Note over O: placement moves the actor while a body is still running
    O->>S: write execution-claim record (task key, heartbeat)
    loop every 10s (half a janitor period)
        O->>S: refresh heartbeat
    end
    N->>S: recovery arrival reads the record
    alt Heartbeat still changing
        S-->>N: Defer: the body is live elsewhere, retry later
    else Previous owner published the result
        O->>S: mark Completed
        S-->>N: Completed: ack without executing
    else Heartbeat unchanged for 2 periods (40s) on the reader's clock
        S-->>N: Proceed: the previous owner is dead
        N->>P: run the activity body as the fresh owner
    end
    O->>S: delete the record after retention
{{< /mermaid >}}

### 第 3 段：完成折叠

当 activity Actor 在默认路径上把完成事件投递给 workflow Actor 时，workflow Actor 会把该事件提交到其持久收件箱然后确认；正是这次收件箱提交使完成具有持久性。快速路径去掉了这次提交：

1. workflow Actor 对到达的事件进行分类。只有 activity 的完成与失败（`TaskCompleted`、`TaskFailed`），且其任务执行 ID 与历史中的调度事件匹配，并到达一个正在运行、未处于停滞状态的实例时，才有资格折叠。其他一切仍走持久收件箱路径：通过 API 引发的 external event、child workflow 完成、重复事件，以及针对处于停滞状态或墓碑状态的实例的事件。
2. 符合条件的完成会被追加到内存中的暂存列表，驱动循环被通知，并释放 Actor 锁，以便轮次能够获取它。activity Actor 的调用保持打开。
3. 下一次轮次最多取走 128 个暂存的完成，把它们追加到交给你的 workflow 代码的事件中，并在其单次、事务性的 state store 提交中把它们持久化到历史里。
4. 只有在该提交成功之后，workflow Actor 才会确认 activity Actor。确认意味着"已持久化"。如果轮次因任何原因未提交（引擎错误、停滞、取消），暂存的完成会被以可恢复错误否定确认，activity Actor 的无限重试投递会重新投递它们。发送方的重试本身就是持久性的保证。

如果某个重试到达时其完成仍在暂存中，它会加入待处理条目并等待同一次提交；它绝不会被提前确认，因为提前确认会让唯一的持久重驱动者失效。等待时间上限为两分钟，超过之后发送方会收到可恢复错误并重试。如果 workflow Actor 在有暂存完成时发生停用（例如 placement 变化），每个暂存的完成都会被否定确认，使发送方针对新所有者重试。来自上一个 `ContinueAsNew` 代的暂存完成会被丢弃并确认，因为每一代的任务 ID 都会重新开始。

child workflow 完成从不折叠。child workflow 在持有自身轮次锁的情况下发布其完成；如果把该发布延迟到父 workflow 的轮次提交之后，当父 workflow 的轮次又派发回同一个 child workflow 时，就可能死锁。

{{< mermaid >}}
sequenceDiagram
    participant X as Sender (activity actor, retry forever)
    participant W as Workflow actor
    participant P as Workflow app
    participant S as State store
    X->>W: AddWorkflowEvent(TaskCompleted)
    W->>W: classify: activity completion, execution id matches, instance running
    W->>W: append to held completions, notify the drive loop, release the actor lock
    Note over X,W: the call blocks until the folding turn resolves, 2 minute cap
    W->>W: turn takes up to 128 held completions
    W->>P: run turn with the held completions as new events
    P-->>W: actions
    alt Turn commits
        W->>S: single transactional commit, history includes the folded events
        S-->>W: ok
        W-->>X: ack (status folded)
    else Turn does not commit (engine error, stall, cancel)
        W-->>X: recoverable error (status fold_nacked)
        X->>W: retry later, joins the pending entry or folds again
    else Actor deactivates with entries pending
        W-->>X: closed error, all pending entries flushed
        X->>W: retry lands on the new owner
    end
    Note over W: external events, child completions, stalled or tombstoned instances use the durable inbox
{{< /mermaid >}}

## 持久性与恢复

快速路径改变的是*由什么提供*持久性，而不是工作*是否*持久。下表列出了默认路径上 reminder 所覆盖的故障窗口、快速路径上由什么覆盖它们，以及记录每次恢复的指标状态，便于你观察恢复过程。

| 故障 | 恢复方式 | 最坏情况下增加的延迟 | 证据 |
| ------- | -------- | ------------------------ | ------- |
| 收件箱提交之后、轮次提交之前主机宕机 | 新所有者上的 janitor 驱动待处理的收件箱 | 一个 janitor 周期（20 秒） | `dapr_runtime_workflow_local_wake_count{status="janitor_recovered"}` |
| 同上，且对端把收件箱行写入了过期缓存 | janitor 退避之后的存储重新读取 | 最多八个周期 | 同上 |
| 本地驱动反复失败 | 原地重试（约 6 秒），然后由 janitor 接管 | 约 6 秒加一个周期 | 先 `status="failed"`，随后 `janitor_recovered` |
| 无法创建 janitor reminder | 持久的按事件 reminder，与默认路径完全相同 | Scheduler 触发延迟 | 警告日志 `failed to ensure janitor reminder, falling back to a durable wake-up reminder` |
| 唯一持有新实例第一次轮次的工作进程消失 | 创建后 5 秒到期的休眠启动 reminder | 5 秒加触发延迟 | 状态读取重新驱动过期启动时出现 `status="pending_start_redriven"` |
| 实例已保存，但其启动永远无法处理 | 实例以错误类型 `DAPR_WORKFLOW_UNSTARTABLE_STATE` 失败，而不是挂起 | 立即 | `status="unstartable_failed"` |
| activity 主机在发布结果之前宕机 | janitor 重新派发，之后升级为持久 reminder | 一到两个周期 | `dapr_runtime_workflow_local_activity_count{status="janitor_redispatched"}`，随后 `janitor_redispatch_escalated` |
| 本地活动驱动失败三次 | 立即升级为持久的 `run-activity` reminder | 数秒 | `status="escalated"` |
| placement 变化时，旧所有者上的 activity 主体仍在运行 | 认领记录使新所有者推迟，直到结果已完成或认领过期 | 最多两个周期（40 秒） | 回收过期认领时出现 `status="claim_evicted"` |
| 折叠轮次未能提交 | 发送方收到否定确认（nack）并重试 | 发送方退避，50 毫秒至 2 秒 | `dapr_runtime_workflow_completions_fold_count{status="fold_nacked"}` |
| 发送方消失且折叠驱动丢失 | janitor 驱动一次轮次，提交那些暂存的完成 | 一个周期 | `local_wake_count{status="janitor_fold_recovered"}` |
| Actor 停用时仍有暂存的完成 | 清空；发送方针对新所有者重试 | 发送方退避 | `fold_nacked` |

至少一次执行以及实例内事件的顺序保持不变：每次唤醒都会 drain 整个持久收件箱，每个 Actor 的轮次锁仍然串行化轮次，被折叠的完成则追加在同一个工作项中收件箱事件之后。只要执行认领记录被写入，它就提供了默认路径所没有的保证：在 placement 交接期间，跨主机最多只有一个存活的 activity 主体。

## 权衡

- **恢复延迟。** 丢失的唤醒会在一个 janitor 周期（20 秒）内恢复，而不是按 Scheduler 对失败 reminder 的重试节奏；丢失的 activity 派发则最多需要两个周期，之后才会恢复持久 reminder。作为交换，健康路径上完全没有 Scheduler 往返。
- **内存。** 运行中的 workflow Actor 在空收件箱触发之后仍保持驻留，并保留其缓存的历史，而不是像默认路径那样被停用。驻留时间受空闲回收器（约一分钟）、终止轮次立即释放历史，以及引擎的并发上限所约束。
- **Goroutine。** 每个有待处理工作的实例一个驱动循环，每个本地驱动的 activity 一个独立驱动，每次 placement 变化期间每个未结算的认领一个心跳。这些都限定在 Actor 工厂范围内，并在关闭时被 drain。
- **Scheduler 负载形态。** 按事件的 job 被替换为每个活跃实例一个、每 20 秒触发一次的可重复 job。因此，许多长期存活、大多处于空闲的实例，会产生一股少量的稳定 Scheduler 触发流，而非在空闲时毫无开销。janitor 的退避式存储探测使这股触发流的 state store 开销保持较低。
- **对发送方可见的延迟。** activity Actor 的完成调用现在会等待折叠轮次提交，而不是在收件箱提交之后就返回。增加的等待时间通过 `dapr_runtime_workflow_completions_fold_wait_latency` 暴露，并以两分钟为上限，超时后发送方重试。
- **扇入摊销。** 最多 128 个完成会折叠进一次提交，因此扇出/扇入模式获益最大。更宽的扇入会跨连续轮次提交，而不是放进一个无界事务中。
- **局部性。** 提交事件的主机也运行由此产生的轮次，activity 主体一经派发就在其目标主机上运行。工作仍通过 Actor placement 分布在各副本之间，但 Scheduler 不再位于相邻两步之间。

## 并发限制

由 Scheduler 强制执行的并发限制作用于每次 job 投递，而本地驱动会绕过 job 投递。为使这些限制保持有效，当 `spec.workflow` 中设置了以下任一项时，快速路径会在 sidecar 启动时自行禁用：

- `globalMaxConcurrentWorkflowInvocations`
- `globalMaxConcurrentActivityInvocations`
- 任何带有名称且 `maxConcurrent` 为正数的 `workflowConcurrencyLimits` 或 `activityConcurrencyLimits` 条目

per-sidecar limit `maxConcurrentWorkflowInvocations` 与 `maxConcurrentActivityInvocations` 由 sidecar 自身强制执行，与快速路径完全兼容。参见[workflow 并发限制]({{% ref "workflow-concurrency.md" %}})。

## 功能组合与上线

- **其他 workflow 功能。** 快速路径可与[Workflows Clustered Deployment]({{% ref "workflow-architecture.md#workflows-cluster-deployment-when-using-dapr-shared-with-workflow" %}})和[workflow history signing]({{% ref "workflow-history-signing.md" %}})组合使用。被折叠的完成会与轮次的其余部分在同一次提交中签名，janitor 的重新派发会对其携带的 propagated history 重新签名。Dapr 集成测试套件将 workflow 测试作为这三项功能的组合矩阵来运行。
- **混合版本。** `localDrive` 与 `janitorRedispatch` 信号作为 metadata 随内部 Actor 调用传递。无法识别它们的 sidecar 会忽略它们，并创建持久 reminder；janitor 的 `new-event` 名称会被旧版 sidecar 路由到普通轮次。请先将应用的每个 sidecar 升级到 1.19，然后再启用门控，使所有主机都走快速路径。
- **multi-application workflow。** 每个应用为自己的 Actor 做决定。即使调用方 workflow 启用了快速路径，由未启用快速路径的应用托管的 activity，仍会通过其持久的 `run-activity` reminder 执行。

## 指标

快速路径新增了以下 sidecar 指标。所有指标都带有 `app_id` 与 `namespace` 标签。

| 指标 | 类型 | 额外标签 | 含义 |
| ------ | ---- | ---------- | ------- |
| `dapr_runtime_workflow_local_wake_count` | 计数器 | `status` | 本地驱动的轮次，以及唤醒恢复的证据 |
| `dapr_runtime_workflow_local_wake_drive_latency` | 直方图（毫秒） | `status` | 从驱动请求开始到本地驱动的轮次返回的时间 |
| `dapr_runtime_workflow_local_activity_count` | 计数器 | `status` | 本地驱动的 activity 执行，以及 activity 恢复的证据 |
| `dapr_runtime_workflow_local_activity_drive_latency` | 直方图（毫秒） | `status` | 一次本地 activity 尝试，包括对应用的调用 |
| `dapr_runtime_workflow_completions_fold_count` | 计数器 | `status`（`folded`、`fold_nacked`） | 完成折叠的结果，在提交端记录 |
| `dapr_runtime_workflow_completions_fold_wait_latency` | 直方图（毫秒） | | activity Actor 等待其完成的折叠轮次提交所花费的时间 |
| `dapr_runtime_workflow_lock_wait` | 直方图（毫秒） | `operation` | 调用在每 Actor 轮次锁上排队的时间，按调用类型划分 |

唤醒与 activity 计数器的 `status` 取值如下：

| 状态 | 计数器 | 含义 |
| ------ | ------- | ------- |
| `success`、`failed` | 两者皆有 | 本地驱动尝试的结果 |
| `janitor_recovered` | 唤醒 | janitor 为一个没有驱动者的待处理收件箱驱动了一次轮次 |
| `janitor_fold_recovered` | 唤醒 | janitor 为一批没有驱动者的暂存完成驱动了一次轮次 |
| `stale_turn_rejected` | 唤醒 | 基于过期历史计算的轮次被拒绝并重试，而不是提交一个重复操作 |
| `unstartable_failed` | 唤醒 | 无法处理启动的实例被终止性地标记为失败 |
| `reminder_arm_detached`、`reminder_arm_detached_failed`、`reminder_arm_detached_skipped_shutdown` | 唤醒 | 收件箱提交之后失败的 reminder 创建，被独立重试，或该重试已放弃 |
| `pending_start_redriven` | 唤醒 | 状态读取重新确认了一个已过期的待启动实例的启动 reminder |
| `escalated`、`escalate_failed`、`escalate_skipped_shutdown` | activity | 丢失的本地驱动被升级为持久的 `run-activity` reminder，或升级失败，或在关闭时被跳过 |
| `janitor_redispatched`、`janitor_redispatch_busy`、`janitor_redispatch_failed` | activity | janitor 发出了一次重新派发，发现 activity 忙碌（属正常），或重新派发失败 |
| `janitor_redispatch_escalated` | activity | 重新派发的任务在一个周期后仍未解析，已升级为持久 reminder |
| `janitor_redispatch_suppressed` | activity | 由于该实例上有驱动正在进行，跳过了重新派发检查 |
| `janitor_escalation_reaped` | activity | 由于其任务已解析，已升级的 `run-activity` reminder 被删除 |
| `claim_evicted` | activity | 被死亡执行持有的过期进行中认领被驱逐，以便到达方重新执行 |

恢复类状态（`janitor_recovered`、`janitor_fold_recovered`、`stale_turn_rejected`、`unstartable_failed`、`reminder_arm_detached`、`reminder_arm_detached_failed`、`pending_start_redriven`、`janitor_redispatched`、`janitor_redispatch_escalated`、`janitor_escalation_reaped`、`claim_evicted`）在 sidecar 启动时即注册为零，因此缺失的序列可以与从未触发过的恢复路径区分开来。在健康的部署中，它们应保持为零。延迟直方图使用 sidecar 共享的 `latencyDistributionBuckets`；参见[配置指标]({{% ref "metrics-overview.md#customizing-workflow-latency-buckets" %}})。

### 建议告警

```promql
# 过去 15 分钟内，janitor 挽救了丢失的唤醒或暂存的完成。
sum by (app_id) (
  increase(dapr_runtime_workflow_local_wake_count{status=~"janitor_recovered|janitor_fold_recovered"}[15m])
) > 0
```

```promql
# activity 派发丢失，已被重新派发或升级为持久 reminder。
sum by (app_id) (
  increase(dapr_runtime_workflow_local_activity_count{status=~"janitor_redispatched|janitor_redispatch_escalated|escalated"}[15m])
) > 0
```

```promql
# 超过 5% 的已折叠完成被否定确认并退回给发送方（过载或轮次失败）。
sum by (app_id) (rate(dapr_runtime_workflow_completions_fold_count{status="fold_nacked"}[5m]))
  /
sum by (app_id) (rate(dapr_runtime_workflow_completions_fold_count[5m])) > 0.05
```

## 性能参考

{{% alert title="参考数据" color="primary" %}}
以下数据来自在托管部署上、使用 PostgreSQL Actor state store 进行的同集群 A/B 对比，测量于快速路径开发期间。它们说明的是变化的方向与大致幅度，而非保证。你的结果取决于 state store 的提交延迟、Scheduler 与 CPU 的余量，以及你的 workflow 形态。
{{% /alert %}}

| 场景 | 观察到的变化 |
| -------- | --------------- |
| 顺序 workflow，在本地唤醒基础上加入本地活动驱动 | 持续吞吐量约提高 50%；在固定请求速率下，引擎侧 p50 延迟在两个负载点分别下降 72% 和 84% |
| 在两者之上加入完成折叠 | 持续吞吐量再提高约 16% |
| 扇出 10 个 activity，整个栈的持续吞吐量 | 从每秒 25 个 workflow 提高到 167 个 |
| 每个五 activity 顺序 workflow 的 state store 提交次数 | 从约 45 次，降到约 26 次，再降到约 17 次 |
| 运行期间的恢复证据 | 零次丢失的驱动，零次 janitor 挽救 |

这些收益来自于减少工作，而不是把工作做得更快：每轮次更少的经 fsync 提交、热路径上不再有 Scheduler 触发，以及完成被摊销进单次提交。去掉这些之后，下一个限制通常是 sidecar 的 CPU 或 state store 的提交速率。

## 限制

- 快速路径是预览功能，默认关闭。
- 配置了由 Scheduler 强制执行的并发限制时，它会自行禁用。参见[并发限制](#并发限制)。
- 计划在未来某个时间启动的 workflow，以及具有未来到期时间的 activity，会继续走 Scheduler 路径，以保证其时序。
- 通过 API 引发的 external event 和 child workflow 完成，始终走持久收件箱路径；只有 activity 完成会被折叠。
- 在持续过载下，完成等待可能达到两分钟上限，之后 activity Actor 会重试。`fold_nacked` 的比例可以显示这种情况何时发生。
- janitor 周期（20 秒）、启动重驱宽限期（5 秒）与折叠等待上限（2 分钟）是固定的，不可配置。
- 在 multi-application workflow 中，只有当 activity 主机所属的应用启用了门控，该主机才会走快速路径。

## 常见问题

### 快速路径会改变至少一次的保证吗？

不会。默认路径上 reminder 所覆盖的每一个故障窗口，现在都由 janitor、回退到持久 reminder 的升级，或发送方的重试所覆盖。重复投递仍通过与之前相同的去重机制移除。参见[持久性与恢复](#持久性与恢复)。

### 启用之后还能关闭吗？

可以，随时都可以：将门控设为 `false` 并重启 sidecar 即可。这里没有任何持久化的承诺。运行中实例遗留的 janitor reminder 会作为普通轮次或空操作触发，并在实例完成时自行删除。

### 为什么我的 sidecar 日志显示快速路径已禁用？

因为配置设置了由 Scheduler 强制执行的并发限制。请删除全局或按名称设置的限制，或保留这些限制并接受默认路径。参见[并发限制](#并发限制)。

### 为什么 activity 完成的确认开始变慢了？

完成调用现在在折叠轮次提交之后才返回，而不是在收件箱提交之后返回。这就是 `dapr_runtime_workflow_completions_fold_wait_latency` 所显示的等待时间。整个轮次变快了；确认被推迟到了轮次末尾。

### 如果 placement 在 activity 运行期间迁移了它，会怎样？

上一个所有者会写入执行认领记录，并持续为其发送心跳。新所有者在心跳仍然有效时推迟；结果发布后直接确认而不执行；只有在心跳连续两个 janitor 周期过期后，才会重新执行。参见[执行认领记录](#执行认领记录)。

### 我需要修改应用或 SDK 吗？

不需要。快速路径完全在 sidecar 中实现，SDK 与 sidecar 之间的协议保持不变。

### janitor 会在已完成的 workflow 上继续触发吗？

不会。janitor 在 workflow 的终止轮次被删除。如果某次触发仍然到达了已完成或已清除的实例，janitor 会处理仍待完成的收尾工作，然后删除自身。

## 相关链接

- [workflow 概述]({{% ref "workflow-overview.md" %}})
- [workflow 架构]({{% ref "workflow-architecture.md" %}})
- [workflow 并发限制]({{% ref "workflow-concurrency.md" %}})
- [预览功能]({{% ref "support-preview-features.md" %}})
- [How-To: 启用预览功能]({{% ref "preview-features.md" %}})
- [配置指标]({{% ref "metrics-overview.md" %}})
- [workflow history signing]({{% ref "workflow-history-signing.md" %}})
- [Dapr Shared]({{% ref "kubernetes-dapr-shared" %}})
