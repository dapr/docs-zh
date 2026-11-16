---
type: docs
title: "Dapr Jobs JavaScript SDK"
linkTitle: "作业"
weight: 120000
description: 使用 JavaScript SDK 调度、获取、删除和处理 Dapr Jobs
---

使用 Dapr JavaScript SDK 在 Node.js 应用中调度未来的操作。作业可以只运行一次、按固定间隔运行，或基于日历进行调度，并可选择配置负载和失败策略。

本文档面向 **`@dapr/dapr` 3.19.0 或更高版本** 以及 **Dapr 运行时 1.16 或更高版本**，并需要正在运行的 [Scheduler 服务]({{% ref "concepts/dapr-services/scheduler.md" %}})。

SDK 通过现有的客户端和服务端提供作业功能：

| API | 用途 |
| --- | --- |
| `DaprClient.jobs.schedule(name, options)` | 创建作业，或显式覆盖已有作业。 |
| `DaprClient.jobs.get(name)` | 获取作业的调度计划、负载及其他设置。 |
| `DaprClient.jobs.delete(name)` | 按名称删除作业。 |
| `DaprServer.jobs.listen(name, callback)` | 为指定名称的作业注册异步处理程序。 |
| `CronExpressionBuilder` | 构建包含六个字段的 cron 表达式，可选指定时区。 |

HTTP 和 gRPC 都支持作业管理和 JSON 回调。不透明的二进制负载在调度、获取和回调时都需要使用 gRPC。SDK 会为所连接的运行时自动选择稳定版或 Alpha1 版本的 Jobs API。

以上即为本包版本中 JavaScript SDK 的 Jobs API。它不提供列出作业、批量删除、按前缀删除，或针对单个操作的取消选项。不要假设其他语言 SDK 中的全部管理方法在 JavaScript 中都可用。

如需快速入门，请参阅 [作业操作指南]({{% ref js-jobs-howto.md %}})。若要了解选项、序列化、兼容性和错误处理，请阅读 [客户端与回调用法指南]({{% ref js-jobs-client-usage.md %}})；若需基于日历进行调度，请参阅 [cron 构建器指南]({{% ref js-jobs-cron.md %}})。

有关底层构建块，请参阅 [作业概述]({{% ref jobs-overview.md %}}) 和 [Jobs API 参考]({{% ref jobs_api.md %}})。
