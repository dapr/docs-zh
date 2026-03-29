---
type: docs
title: "Dapr 源代码分析器和生成器"
linkTitle: "Roslyn 分析器/生成器"
weight: 85300
description: 用于常见 Dapr 问题的代码分析器和修复
no_list: true
---

Dapr 支持日益丰富的可选 Roslyn 分析器和代码修复提供程序，用于检查代码中的代码质量问题。从 v1.16 版本开始，开发者可以在每个标准功能包的基础上，从 NuGet 安装额外的项目，从而在解决方案中启用这些分析器。

{{% alert title="Note" color="primary" %}}

Dapr .NET SDK 的未来版本将默认包含这些分析器，无需单独安装包。

{{% /alert %}}

规则违规通常标记为 `Info` 或 `Warning`，因此如果分析器发现问题，不一定会中断构建。所有代码分析违规都带有前缀 "DAPR"，并通过该前缀后的数字进行唯一区分。

{{% alert title="Note" color="primary" %}}

目前，诊断标识符的前两位数字与不同的 Dapr 包一一对应，但随着更多分析器的开发，这一映射方式未来可能会发生变化。

{{% /alert %}}

## 安装和配置分析器
在 v1.16 Dapr 版本发布后，以下包将可通过 NuGet 获取：
- Dapr.Actors.Analyzers
- Dapr.Jobs.Analyzers
- Dapr.Workflow.Analyzers

在您希望运行分析器的每个项目中安装每个 NuGet 包。该包将作为项目依赖项安装，分析器将在您编写代码时或作为 CI/CD 构建的一部分运行。分析器会标记现有代码中的问题，并在构建项目时警告您新出现的问题。

我们的许多分析器都有关联的代码修复，可以自动纠正问题。如果您的 IDE 支持此功能，任何可用的代码修复都将作为代码中的内联菜单选项显示。

此外，我们的大多数分析器还应该报告代码中被识别为规则关键方面的特定语法所在的行号和列号。如果您的 IDE 支持，双击任何分析器警告应该直接跳转到违反分析器规则的代码部分。

### 抑制特定分析器
如果您希望阻止分析器对项目的某个特定部分进行检查，可以通过多种方式单独抑制其输出。有关在项目或文件中抑制分析器的更多信息，请阅读相关的 [.NET 文档](https://learn.microsoft.com/dotnet/fundamentals/code-analysis/suppress-warnings#use-the-suppressmessageattribute)。

### 禁用所有分析器
如果您希望在不移除任何提供分析器的包的情况下禁用项目中的所有分析器，请在 csproj 文件中将 `EnableNETAnalyzers` 属性设置为 `false`。

## 可用的分析器

| 诊断 ID | Dapr 包 | 类别         | 严重性     | 添加版本                                                                                                                           | 描述                                                                                                                        | 可用代码修复 |
| -- | -- |------------------|--------------|-----------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------| -- |
| DAPR1301 | Dapr.Workflow | Usage | Warning      | 1.16                                                                                                                                    | 工作流类型未向依赖注入提供程序注册                                                         | Yes |
| DAPR1302 | Dapr.Workflow | Usage | Warning | 1.16                                                                                                                                    | 工作流活动类型未向依赖注入提供程序注册                                                | Yes | 
| DAPR1401 | Dapr.Actors | Usage            | Warning      | 1.16                                                                                                                                    | Actor 计时器方法调用要求在类型上存在指定的回调方法                                                  | No                 |
| DAPR1402 | Dapr.Actors | Usage            | Warning      | 1.16                                                                                                                                    | Actor 类型未向依赖注入注册                                                                         | Yes                                                                                 |
| DAPR1403 | Dapr.Actors | Interoperability | Info         | 1.16                                                                                                                                    | 将 options.UseJsonSerialization 设置为 true 以支持与非 .NET actor 的互操作性                                          | Yes                                                                                 |
| DAPR1404 | Dapr.Actors | Usage            | Warning      | 1.16                                                                                                                                    | 调用 app.MapActorsHandlers 以映射 Dapr actor 的端点                                                                        | Yes                                                                                       |
| DAPR1501 | Dapr.Jobs | Usage            | Warning      | 1.16 |  Job 调用要求为 IEndpointRouteBuilder 上每个预期的作业设置和配置 MapDaprScheduledJobHandler | No                                                                                        |

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
