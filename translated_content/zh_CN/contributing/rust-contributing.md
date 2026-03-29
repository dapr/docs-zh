---
type: docs
title: "为 Rust SDK 做贡献"
linkTitle: "Rust SDK"
weight: 3000
description: 为 Dapr Rust SDK 做贡献的指南
---

在为 [Rust SDK](https://github.com/dapr/rust-sdk) 做贡献时，应遵循以下规则和最佳实践。

## 示例

`examples` 目录包含代码示例，供用户运行以体验各种 Rust SDK 包和扩展的特定功能。它还托管用于验证的组件示例。在编写和更新示例时，请牢记：

- 所有示例应能在 Windows、Linux 和 MacOS 上运行。虽然 Rust 代码在操作系统之间是一致的，除了少数操作系统功能特性需要条件编译，但任何示例前/后命令都应通过 [tabpane]({{% ref "contributing-docs.md#tabbed-content" %}}) 提供选项
- 包含下载/安装任何必需先决条件的步骤。刚安装好操作系统的人应该能够开始示例并顺利完成，不会出现错误。链接到外部下载页面是可以的。
- 示例应通过验证，并包含机械化的 markdown 步骤，并添加到验证工作流中 [待定](#)

## 文档

`daprdocs` 目录包含渲染到 [Dapr 文档](https://docs.dapr.io) 网站的 markdown 文件。当构建文档网站时，此仓库会被克隆并配置，使其内容与文档内容一起渲染。在编写文档时，请牢记：

   - 除了这些规则外，还应遵循[文档指南]({{% ref contributing-docs.md %}})中的所有规则。
   - 所有文件和目录应以 `rust-` 为前缀，以确保所有文件/目录名称在所有 Dapr 文档中全局唯一。

## 更新 Protobuf

要从 `dapr/dapr` 仓库拉取 protobuf，可以运行仓库根目录中的脚本，如下所示：

```bash
./update-protos.sh
```

默认情况下，脚本从 Dapr 仓库的 master 分支获取最新的 proto 更新。如果需要选择特定的发行版本，使用 -v 标志：

```bash
./update-protos.sh -v v1.13.0
```
