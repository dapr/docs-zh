---
type: docs
title: "为 Go SDK 做贡献"
linkTitle: "Go SDK"
weight: 3000
description: 为 Dapr Go SDK 做贡献的指南
---

在为 [Go SDK](https://github.com/dapr/go-sdk) 做贡献时，应遵循以下规则和最佳实践。

## 示例

`examples` 目录包含代码示例，供用户运行以试用各种 Go SDK 包和扩展的特定功能。在编写新的和更新的示例时，请记住：

- 所有示例都应能在 Windows、Linux 和 MacOS 上运行。虽然 Go 代码在各个操作系统之间保持一致，但任何示例前/后命令都应通过 [tabpane]({{% ref "contributing-docs.md#tabbed-content" %}}) 提供选项
- 应包含下载/安装任何所需先决条件的步骤。对于全新操作系统安装的用户，应该能够从示例开始并无错误地完成。链接到外部下载页面也是可以的。

## 文档

`daprdocs` 目录包含 markdown 文件，这些文件被渲染到 [Dapr 文档](https://docs.dapr.io) 网站中。构建文档网站时，会克隆此仓库并对其进行配置，使其内容与文档内容一起渲染。在编写文档时，请记住：

   - 除了这些规则外，还应遵循 [文档指南]({{% ref contributing-docs.md %}}) 中的所有规则
   - 所有文件和目录都应以 `go-` 为前缀，以确保所有文件/目录名称在所有 Dapr 文档中都是全局唯一的
