---
type: docs
title: "为 Java SDK 贡献"
linkTitle: "Java SDK"
weight: 3000
description: 为 Dapr Java SDK 贡献的指南
---

在为 [Java SDK](https://github.com/dapr/java-sdk) 贡献时，应遵循以下规则和最佳实践。

## 示例

`examples` 目录包含代码示例，供用户运行以试用各种 Java SDK 包和扩展的特定功能。在编写和更新示例时，请记住：

- 所有示例都应能在 Windows、Linux 和 MacOS 上运行。虽然 Java 代码在不同操作系统之间是一致的，但任何示例前后的命令都应通过 [tabpane]({{% ref "contributing-docs.md#tabbed-content" %}}) 提供选项
- 包含下载/安装任何所需先决条件的步骤。从全新操作系统安装开始的人应该能够开始并完成该示例而不会出错。指向外部下载页面的链接是可以的。

## 文档

`daprdocs` 目录包含 markdown 文件，这些文件被渲染到 [Dapr Docs](https://docs.dapr.io) 网站上。构建文档网站时，此仓库被克隆并配置，使其内容与文档内容一起渲染。在编写文档时，请记住：

   - 除了这些规则外，还应遵循[文档指南]({{% ref contributing-docs.md %}})中的所有规则
   - 所有文件和目录应以 `java-` 为前缀，以确保所有文件/目录名称在所有 Dapr 文档中全局唯一

## Github Dapr Bot 命令

查看 [daprbot 文档](https://docs.dapr.io/contributing/daprbot/)，了解你可以在此仓库中运行的常见任务的 Github 命令。例如，你可以运行 `/assign`（作为问题评论）将问题分配给自己。
