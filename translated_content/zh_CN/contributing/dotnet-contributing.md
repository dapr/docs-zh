---
type: docs
title: "为 .NET SDK 做贡献"
linkTitle: ".NET SDK"
weight: 3000
description: 为 Dapr .NET SDK 做贡献的指南
---

# 欢迎！
如果您正在阅读本文，您可能有兴趣为 Dapr 和/或 Dapr .NET SDK 做贡献。欢迎加入本项目，感谢您对贡献的兴趣！

请查阅相关文档，熟悉 Dapr 是什么以及它要实现的目标，并通过 [Discord](https://bit.ly/dapr-discord) 与我们联系。请告诉我们您希望如何贡献，我们很乐意提供想法和建议。

为 Dapr 做贡献有多种方式：
- 为 [Dapr runtime](https://github.com/dapr/dapr/issues/new/choose) 或 [Dapr .NET SDK](https://github.com/dapr/dotnet-sdk/issues/new/choose) 提交错误报告
- 提出新的 [runtime 能力](https://github.com/dapr/proposals/issues/new/choose) 或 [SDK 功能](https://github.com/dapr/dotnet-sdk/issues/new/choose)
- 改进 [Dapr 主项目](https://github.com/dapr/docs) 或 [Dapr .NET SDK 专属](https://github.com/dapr/dotnet-sdk/tree/master/daprdocs) 的文档
- 为实现各种构建块的组件新增或改进现有[组件](https://github.com/dapr/components-contrib/)
- 增强 [.NET 可插拔组件 SDK 能力](https://github.com/dapr-sandbox/components-dotnet-sdk)
- 改进 Dapr .NET SDK 代码库和/或修复 bug（详见下文）

如果您是代码库的新手，请随时在 Discord 的 #dotnet-sdk 频道询问如何实现更改或提出一般性问题。您不需要获得许可即可处理任何问题，但请注意，如果某个问题已分配给某人，这表明可能有人已开始处理该问题。特别是如果该问题已有一段时间没有活动，请随时联系，确认他们是否仍有兴趣继续，或者您是否可以接手，并使用您的实现打开一个拉取请求。

如果您想将自己分配给某个问题，请使用 "/assign" 回复对话，机器人会将您分配给它。

我们已将一些问题标记为 `good-first-issue` 或 `help wanted`，表明这些可能是小型的、自包含的更改。

如果您对实现不确定，请将其创建为草稿拉取请求，并通过标记 `@dapr/maintainers-dotnet-sdk` 并提供一些您需要帮助的上下文来征求 [.NET 维护者](https://github.com/orgs/dapr/teams/maintainers-dotnet-sdk) 的反馈。

# 贡献规则和最佳实践

为 [.NET SDK](https://github.com/dapr/dotnet-sdk) 做贡献时，应遵循以下规则和最佳实践。

## 拉取请求
通常不鼓励仅包含格式更改的拉取请求。拉取请求应旨在修复 bug、添加新功能或改进现有功能。

请尽量将拉取请求的内容最小化，使其仅涵盖单个问题。涉及大量文件的大型 PR 不太可能在短时间内被审查或接受。在单个 PR 中处理许多不同问题使得难以确定您的代码是否完全解决了潜在问题，并使代码审查变得复杂。

## 测试
所有拉取请求都应包含单元测试和/或集成测试，以反映添加或更改内容的性质，以便清楚地表明功能按预期工作。避免使用自动生成的测试来多次重复测试相同的功能。相反，应通过验证更改的每个可能路径来提高代码覆盖率，以便未来的贡献者可以更容易地理解您逻辑的轮廓并更容易地识别局限性。

## 示例

`examples` 目录包含代码示例，供用户运行以尝试各种 Dapr .NET SDK 包和扩展的特定功能。在编写和更新示例时，请记住：

- 所有示例都应能够在 Windows、Linux 和 MacOS 上运行。虽然 .NET Core 代码在操作系统之间保持一致，但任何示例前/后命令都应通过 [tabpane]({{% ref "contributing-docs.md#tabbed-content" %}}) 提供选项
- 包含下载/安装任何所需先决条件的步骤。对于全新操作系统安装的人来说，应该能够从示例开始并完成而不会出错。指向外部下载页面的链接是可以的。

## 文档

`daprdocs` 目录包含呈现到 [Dapr Docs](https://docs.dapr.io) 网站的 markdown 文件。当构建文档网站时，会克隆此仓库并进行配置，使其内容与文档内容一起呈现。在编写文档时，请记住：

   - 除了这些规则外，还应遵循 [docs 指南]({{% ref contributing-docs.md %}}) 中的所有规则。
   - 所有文件和目录都应以 `dotnet-` 为前缀，以确保所有文件/目录名称在所有 Dapr 文档中全局唯一。

所有拉取请求都应努力在代码中包含 XML 文档，清楚地说明功能的作用以及存在的原因，以及对已发布文档的更改，以便为其他开发人员阐明您的更改如何改进 Dapr 框架。

## GitHub Dapr Bot 命令

查看 [daprbot 文档](https://docs.dapr.io/contributing/daprbot/)，了解您可以在该仓库中运行的常见任务的 GitHub 命令。例如，您可以在问题上评论 `/assign` 将其分配给自己。

## 提交签名
提交到 Dapr .NET SDK 的所有代码必须由编写它的开发者签名。这意味着每个提交都必须以以下内容结尾：
> Signed-off-by: First Last <flast@example.com>

姓名和电子邮件地址必须与提交更改的用户的注册 GitHub 姓名和电子邮件地址匹配。我们使用机器人在拉取请求中检测这一点，如果此检查无法验证，我们将无法合并 PR。

如果您注意到 PR 由于早期 PR 历史中的 DCO 检查失败而未能验证，请考虑在本地压缩 PR 并重新提交，以确保签名声明包含在提交历史中。

# 语言、工具和流程
Dapr .NET SDK 中的所有源代码都是用 C# 编写的，并以最早支持的 .NET SDK 可用的最新语言版本为目标。截至 v1.16，这意味着同时支持 .NET 8 和 .NET 9。可用的最新语言版本是 [C# version 12](https://learn.microsoft.com/zh-cn/dotnet/csharp/whats-new/csharp-version-history#c-version-12)

贡献者欢迎使用他们最舒适开发的任何 IDE，但请不要随您的贡献提交 IDE 特定的偏好文件，因为这些文件将被拒绝。
