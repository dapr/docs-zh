---
type: docs
title: "Workflow Protocol - State & History"
linkTitle: "State & History"
weight: 500
description: "Workflow building block 内部机制的低层描述。"
---

# 状态和历史管理

Dapr Workflows 采用事件溯源（event sourcing）模式，这意味着 workflow 的状态是从一系列事件中推导出来的。本文档描述 Dapr 如何存储和管理这些历史记录与状态。

## 后端存储：Dapr Actors

默认情况下，Dapr Workflow 引擎使用 **Dapr Actors** 作为其存储后端。每个 workflow instance 都映射到一个唯一的 Actor 实例。这提供了以下特性：

- **并发控制**：Actor 确保在任意时刻只有一个操作在处理同一个 workflow instance。
- **可靠性**：Actor 状态会持久化到已配置的 Dapr state store 中。
- **timer**：Dapr Actors 提供持久化的 reminder，用于实现 workflow timer。

## workflow 状态架构

workflow instance（Actor）的状态由以下几个 component 构成：

### 1. metadata

存储有关该实例的高级信息：

- `instance_id`：workflow 的唯一 ID。
- `name`：workflow 的名称。
- `status`：当前运行时状态（如 Running、Completed、停滞状态 等）。
- `version`：workflow 版本的名称以及任何活跃的补丁。
- `created_at`：创建时间戳。
- `last_updated_at`：最后 activity 时间戳。
- `input`：原始输入数据。
- `output`：最终输出数据（如果已完成）。

### 2. 历史记录

一系列 `HistoryEvent` 对象，记录 workflow 中发生过的所有事件。为了优化大型历史记录，Dapr 通常会把 history event 分块存储，或作为单独的键存放在 state store 中：

- **键格式**：`wf-history-<instance_id>-<index>`
- **事件内容**：序列化的 protobuf 消息，包含事件类型、时间戳以及特定于类型的数据（例如 `TaskScheduled`、`TaskCompleted`）。部分事件类型还带有额外的类型专属字段，例如 `TimerCreated` 事件会记录 `origin`，用来标识该 timer 被调度的原因（参见 [Execution API]({{% ref "workflow-protocol-execution-api.md" %}})）。

### 3. 收件箱（待处理事件）

已发生但尚未被编排器处理（重放）的事件集合。包括：

- 向 workflow 引发的 external event。
- 已完成的 activity 结果。
- 已触发的 timer。

编排器下一次运行时，会“排空”收件箱，将这些事件移入历史记录，然后重放逻辑。

启用 `WorkflowsFastPath` 预览功能后，activity Actor 以无限重试语义投递的 activity 完成结果可以跳过收件箱：sidecar 会将其保存在内存中，并在下一轮次的提交（commit）时直接持久化到历史记录里，只有在该提交完成后才向 activity Actor 确认。external event、已触发的 timer 和 child workflow 完成始终经过收件箱。参见 [workflow 快速路径]({{% ref "workflow-fast-path.md" %}})。

### 4. 父级通知与创建输入

以下两个键仅用于 child workflow，且两者都不是永久性的：

- `parent-notify`：在 child workflow 进入终态的同一事务中写入的临时标记，记录父 workflow 尚未被通知。父 workflow 确认完成后即被清除；该标记存在期间，清除（purge）和实例 ID 复用都会被拒绝。
- `creation-input`：仅在启用 history signing 时写入。它保存父 workflow 创建该 child workflow 时使用的输入，存放在历史记录之外，因此在 `ContinueAsNew` 之后依然存在，并可在为完成结果出具证明（attestation）时与创建它的父 workflow 进行核对。

### 5. activity 执行认领

在 `WorkflowsFastPath` 预览功能下，如果某个 activity Actor 的执行仍在进行中，而 Actor placement 将其迁移到了另一台主机，该 Actor 会在自身状态前缀下写入一条 `execution-claim` 记录，并附带心跳；在结果发布之前，上一个所有者会持续刷新这个心跳。新的所有者通过读取该记录来决定：推迟执行、确认一个已发布的结果，还是作为新的所有者执行。该记录仅在 placement 变更前后写入，并在短暂的保留期后删除。

## 重放与状态重建

当工作进程（SDK）收到工作项时，Dapr 会提供 history event。SDK 通过按顺序重放这些事件，来重建编排的内部状态（例如本地变量、当前执行点）。

### 确定性原则与历史记录

历史记录是“真相的来源”。如果编排代码以非确定性的方式发生变化（例如在现有代码中间添加一个新的 activity 调用），重放将失败，因为代码发出的请求与记录的历史不再匹配。

## 清除状态

清除 workflow 时，Dapr 会从 state store 中删除 metadata 以及所有相关的 history event 键。这通常是为了在 workflow 结束后进行清理。
