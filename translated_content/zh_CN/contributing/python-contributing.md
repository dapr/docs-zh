---
type: docs
title: "为 Python SDK 贡献"
linkTitle: "Python SDK"
weight: 3000
description: 关于为 Dapr Python SDK 贡献的指南
---

当为 [Python SDK](https://github.com/dapr/python-sdk) 贡献时，应遵循以下规则和最佳实践。

## 示例

`examples` 目录包含代码示例，供用户运行以尝试各种 Python SDK 包和扩展的特定功能。在编写新的和更新的示例时，请注意：

- 所有示例都应能在 Windows、Linux 和 MacOS 上运行。虽然 Python 代码在操作系统之间保持一致，但任何示例前/后的命令应通过 [tabpane]({{% ref "contributing-docs.md#tabbed-content" %}}) 提供选项
- 包含下载/安装任何所需先决条件的步骤。对于一个全新操作系统安装的用户来说，应该能够开始示例并完成它而不会出现错误。指向外部下载页面的链接是可以的。

## 文档

`daprdocs` 目录包含渲染到 [Dapr 文档](https://docs.dapr.io) 网站的 markdown 文件。当构建文档网站时，该仓库会被克隆并配置，使其内容与文档内容一起渲染。在编写文档时，请注意：

   - 除了这些规则外，还应遵循 [文档指南]({{% ref contributing-docs.md %}}) 中的所有规则
   - 所有文件和目录应以 `python-` 为前缀，以确保所有文件/目录名称在所有 Dapr 文档中全局唯一

## Github Dapr Bot 命令

查看 [daprbot 文档](https://docs.dapr.io/contributing/daprbot/)，了解您可以在此仓库中运行的常见任务的 GitHub 命令。例如，您可以运行 `/assign`（作为问题的评论）将问题分配给用户或用户组。
