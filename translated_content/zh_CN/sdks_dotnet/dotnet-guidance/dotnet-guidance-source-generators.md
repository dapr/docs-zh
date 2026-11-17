---
type: docs
title: "Dapr 源代码分析器和生成器"
linkTitle: "Roslyn 分析器/生成器"
weight: 85300
description: 用于常见 Dapr 问题的代码分析器和修复
no_list: true
---

Dapr 支持日益丰富的可选 Roslyn 分析器与代码修复提供程序集合，用于检查代码中的代码质量问题。从 v1.16 版本开始，开发者可以在每个标准功能包的基础上，从 NuGet 安装额外的项目，从而在解决方案中启用这些分析器。

{{% alert title="Note" color="primary" %}}

Dapr .NET SDK 的未来版本将默认包含这些分析器，无需单独安装包。

{{% /alert %}}

规则违规通常标记为 `Info` 或 `Warning`，因此如果分析器发现问题，不一定会中断构建。所有代码分析违规都带有前缀 "DAPR"，并通过该前缀后的数字进行唯一区分。

{{% alert title="Note" color="primary" %}}

目前，诊断标识符的前两位数字与不同的 Dapr 包一一对应，但随着更多分析器的开发，这一映射方式未来可能会发生变化。

{{% /alert %}}

## 安装和配置分析器
以下包提供 Roslyn 分析器：
- Dapr.Actors.Analyzers
- Dapr.Jobs.Analyzers
- Dapr.Messaging.Analyzers（自动捆绑在 `Dapr.Messaging` 中）
- Dapr.Workflow.Analyzers

在每个希望分析器运行的项目中安装每个 NuGet 包。对于 `Dapr.Messaging` 或 `Dapr.Actors.Next` 这类元包，分析器和源生成器会随包自动包含。该包将作为项目依赖项安装，分析器会在您编写代码时或作为 CI/CD 构建的一部分运行。分析器会标记现有代码中的问题，并在您构建项目时警告新出现的问题。

我们的许多分析器都有关联的代码修复，可以自动纠正问题。如果您的 IDE 支持此功能，任何可用的代码修复都将作为代码中的内联菜单选项显示。

此外，我们的大多数分析器还应该报告代码中被识别为规则关键方面的特定语法所在的行号和列号。如果您的 IDE 支持，双击任何分析器警告应该直接跳转到违反分析器规则的代码部分。

### 抑制特定分析器
如果您希望阻止分析器对项目的某个特定部分进行检查，可以通过多种方式单独抑制其输出。有关在项目或文件中抑制分析器的更多信息，请阅读相关的 [.NET 文档](https://learn.microsoft.com/dotnet/fundamentals/code-analysis/suppress-warnings#use-the-suppressmessageattribute)。

### 禁用所有分析器
如果您希望在不移除任何提供分析器的包的情况下禁用项目中的所有分析器，请在 csproj 文件中将 `EnableNETAnalyzers` 属性设置为 `false`。

## 可用的分析器

| 诊断 ID | Dapr 包 | 类别 | 严重性 | 添加版本 | 描述 | 可用代码修复 |
|---------------|---------------|------------------|----------|---------------|----------------------------------------------------------------------------------------------------------------------------------------------|--------------------|
| DAPR1001 | Dapr.Common | Compatibility | Warning | 1.18 | API 要求的 Dapr 运行时版本高于已配置的目标版本。 | No |
| DAPR1002 | Dapr.Common | Compatibility | Warning | 1.18 | 无法解析已配置的 Dapr 运行时目标版本 | No |
| DAPR1003 | Dapr.Common | Compatibility | Warning | 1.18 | 无法解析 API 声明的最低 Dapr 运行时版本 | No |
| DAPR1301 | Dapr.Workflow | Usage | Warning | 1.16 | 工作流类型未向依赖注入提供程序注册。**注意：** 安装 `Dapr.Workflow.Versioning` 后不会应用此规则。 | Yes |
| DAPR1302 | Dapr.Workflow | Usage | Warning | 1.16 | 工作流活动类型未向依赖注入提供程序注册 | Yes |
| DAPR1401 | Dapr.Actors | Usage | Warning | 1.16 | Actor timer 方法调用要求类型上存在指定的回调方法 | No |
| DAPR1402 | Dapr.Actors | Usage | Warning | 1.16 | Actor 类型未向依赖注入注册 | Yes |
| DAPR1403 | Dapr.Actors | Interoperability | Info | 1.16 | 将 options.UseJsonSerialization 设置为 true，以支持与非 .NET Actor 的互操作性 | Yes |
| DAPR1404 | Dapr.Actors | Usage | Warning | 1.16 | 调用 app.MapActorsHandlers 为 Dapr Actor 映射端点 | Yes |
| DAPR1410 | Dapr.Actors.Next | Compatibility | Warning | 1.18 | Actor 状态结构变更会破坏已发布的序列化 | Yes |
| DAPR1411 | Dapr.Actors.Next | Concurrency | Warning | 1.18 | Actor 轮次不得逸出 scheduler | Yes |
| DAPR1412 | Dapr.Actors.Next | Concurrency | Warning | 1.18 | Actor 轮次不得阻塞 | Yes |
| DAPR1413 | Dapr.Actors.Next | Determinism | Warning | 1.18 | Actor 轮次必须使用 TimeProvider | Yes |
| DAPR1414 | Dapr.Actors.Next | Determinism | Warning | 1.18 | Actor 轮次必须使用感知 scheduler 的种子随机源 | Yes |
| DAPR1415 | Dapr.Actors.Next | Compatibility | Warning | 1.18 | Actor 状态迁移目标不可达 | Yes |
| DAPR1416 | Dapr.Actors.Next | Design | Info | 1.18 | Actor 轮次过滤器应保持横切性质 | Yes |
| DAPR1417 | Dapr.Actors.Next | Usage | Warning | 1.18 | Actor 接口方法必须返回异步类型 | No |
| DAPR1418 | Dapr.Actors.Next | Compatibility | Warning | 1.18 | Actor 接口变更会破坏已发布的 wire contract | Yes |
| DAPR1419 | Dapr.Actors.Next | Concurrency | Warning | 1.18 | Actor 字段不应持有可变的共享状态 | No |
| DAPR1420 | Dapr.Actors.Next | Usage | Warning | 1.18 | Actor 类型名称必须能够区分共享的 Actor 契约 | No |
| DAPR1421 | Dapr.Actors.Next | Usage | Warning | 1.18 | Actor 实现必须公开生成的客户端契约 | Yes |
| DAPR1423 | Dapr.Actors.Next | Compatibility | Warning | 1.18 | Actor 状态类型未关联到其迁移族 | Yes |
| DAPR1424 | Dapr.Actors.Next | Compatibility | Warning | 1.18 | Actor 状态迁移链存在缺口 | No |
| DAPR1425 | Dapr.Actors.Next | Compatibility | Warning | 1.18 | Actor 状态迁移步骤需要升级器 | Yes |
| DAPR1426 | Dapr.Actors.Next | Compatibility | Warning | 1.18 | Actor 状态迁移的 fold path 有歧义 | No |
| DAPR1427 | Dapr.Actors.Next | Usage | Warning | 1.18 | Actor 状态名称映射到多个迁移族 | No |
| DAPR1428 | Dapr.Actors.Next | Usage | Info | 1.18 | Actor 状态的使用应指向最新的状态版本 | No |
| DAPR1429 | Dapr.Actors.Next | Usage | Error | 1.18 | 计划中的 Actor reminder/timer 回调与可分派的 Actor 方法不匹配 | Yes |
| DAPR1430 | Dapr.Actors.Next | Usage | Warning | 1.18 | 计划中的 Actor reminder/timer 指向本应用中不存在的 Actor 类型 | No |
| DAPR1431 | Dapr.Actors.Next | Usage | Error | 1.18 | 计划中的 Actor reminder/timer 回调方法未通过生成的 Actor 客户端公开 | No |
| DAPR1501 | Dapr.Jobs | Usage | Warning | 1.16 | Job 调用要求在 IEndpointRouteBuilder 上为每个预期的 job 设置并配置 MapDaprScheduledJobHandler | No |
| DAPR1610 | Dapr.Messaging | Usage | Warning | 1.18 | Topic 同时以 Streaming 和 Programmatic 两种投递模式注册 | No |
| DAPR1611 | Dapr.Messaging | Usage | Error | 1.18 | [DaprTopic] 应用于未实现 ITopicHandler<T> 或 ITopicHandler<T, TResult> 的类 | No |
| DAPR1612 | Dapr.Messaging | Compatibility | Warning | 1.18 | 消息类型未在源生成的 JsonSerializerContext 中注册，无法兼容 Native AOT | No |
| DAPR1613 | Dapr.Messaging | Usage | Warning | 1.18 | Programmatic topic 订阅要求调用 `app.MapDaprAppCallback()`，或使用统一的 `app.MapDaprMessaging()` 端点映射 | Yes |
| DAPR1614 | Dapr.Messaging | Usage | Warning | 1.18 | 直接调用 `DaprMessagingRegistration`，而不是使用生成的 `services.AddDaprMessaging()` | No |
| DAPR1615 | Dapr.Messaging | Usage | Warning | 1.18 | 存在订阅者注册或端点映射，但没有匹配的 topic 订阅者 | No |
| DAPR1616 | Dapr.Messaging | Usage | Warning | 1.18 | `[DaprTopic]` 启用了某项功能，但未填充必需的配套属性 | No |
| DAPR1617 | Dapr.Messaging | Usage | Warning | 1.18 | `[DaprTopic]` 设置了一个属性，但该属性对所选功能或投递模式会被忽略 | No |

## 分析器类别
以下是分析器可以分配到的各个有效类别，这些类别是按照 .NET 分析器使用的标准类别建模的：
- Design
- Documentation
- Globalization
- Interoperability
- Maintainability
- Naming
- Performance
- Reliability
- Security
- Usage
- Compatibility
