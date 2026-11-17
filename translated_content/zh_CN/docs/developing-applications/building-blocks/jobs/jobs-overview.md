---
type: docs
title: "Jobs overview"
linkTitle: "概述"
weight: 1000
description: "jobs API building block 概述"
---

许多应用程序都需要 job 调度，或需要在将来执行某个操作。jobs API 是一个编排器，用于调度这些将来的 job，可以在特定时间执行，也可以按特定间隔执行。

jobs API 不仅能帮助你调度 job，在内部，Dapr 还使用 Scheduler service 来调度 actor reminder。

Dapr 中的 Jobs 由以下部分组成：
- [jobs API building block]({{% ref jobs_api %}})
- [Scheduler control plane service]({{% ref "concepts/dapr-services/scheduler.md" %}})

[查看示例场景。]({{% ref "#场景" %}})

{{< diagram name="scheduler-architecture" width="85" >}}

## 工作原理

jobs API 是一个 job 调度器，而不是运行 job 的执行器。该设计以持久性和水平扩展性优先于精确性，保证 *至少一次* 执行 job。这意味着：
- **保证：** job 永远不会在到期时间*之前*被调用。
- **不保证：** job 在到期时间*之后*被调用的时间上限。

所有计划 job 的详细信息和用户关联数据都存储在 Scheduler service 内嵌的 Etcd 数据库中。
你可以使用 job 来：

- **延迟你的[pub/sub 消息]({{% ref pubsub-overview %}})。** 你可以在未来的特定时间发布消息（例如：从今天起一周后，或特定的 UTC 日期/时间）。
- 在应用程序之间调度 [service invocation]({{% ref service-invocation-overview %}}) 方法调用。

## 场景

job 调度在以下场景中可能很有用：

- **自动化数据库备份：**
   确保数据库每天备份，以防止数据丢失。安排备份脚本每天凌晨 2 点运行，它将创建数据库备份并将其存储在安全位置。

- **定期数据处理和 ETL（提取、转换、加载）：**
   处理和转换来自各种来源的原始数据，并将其加载到数据仓库中。安排 ETL job 在特定时间运行（例如：每小时、每天），以获取新数据、处理数据，并用最新信息更新数据仓库。

- **电子邮件通知和报告：**
   通过电子邮件接收每日销售报告和每周绩效摘要。安排一个 job 生成所需报告，并在每天早上 6 点发送每日报告，在每周一早上 8 点发送每周摘要。

- **维护任务和系统更新：**
   执行定期维护任务，例如清除临时文件、更新软件和检查系统运行状况。安排各种维护脚本在非高峰时段运行，例如周末或深夜，以最大程度减少对用户的干扰。

- **金融交易的批处理：**
   处理大量需要批处理并在每个工作日结束时结算的交易。安排批处理 job 在每个工作日下午 5 点运行，汇总当天的交易并执行必要的结算和对账。

Dapr 的 jobs API 确保这些场景中描述的任务始终如一且可靠地执行，无需手动干预，从而提高效率并降低出错风险。

## 功能

Jobs API 的主要功能是让你创建、检索和删除计划中的 job。默认情况下，当你创建一个名称已存在的 job 时，操作会失败，除非你显式地将 `overwrite` 标志设置为 `true`。这可以确保现有 job 不会被意外修改或覆盖。

### 跨多个副本调度 job

当你创建一个 job 时，如果不显式设置 `overwrite` 标志，它不会替换同名的现有 job。这意味着每次创建 job 时都会重置计数，并且在嵌入式 etcd 中只为该 job 保留 1 条记录。因此，即使你的所有应用程序都在启动时调度了同一个 job，你也无需担心多个 job 被创建并触发，只有最新的 job 会被记录并执行。

Scheduler service 使 job 的调度能够跨多个副本扩展，同时保证 job 只会由 1 个 Scheduler service 实例触发。

## 试用 jobs API

你可以在应用程序中试用 jobs API。在[安装 Dapr]({{% ref install-dapr-cli %}})后，你就可以从[操作指南：调度 job 指南]({{% ref howto-schedule-and-handle-triggered-jobs %}})开始使用 jobs API。

## 后续步骤

- [了解如何使用 jobs API]({{% ref howto-schedule-and-handle-triggered-jobs %}})
- [了解有关 Scheduler control plane service 的更多信息]({{% ref "concepts/dapr-services/scheduler" %}})
- [Jobs API 参考]({{% ref jobs_api %}})
