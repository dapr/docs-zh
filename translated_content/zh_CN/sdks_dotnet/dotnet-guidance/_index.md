---
type: docs
title: "Dapr .NET SDK 最佳实践"
linkTitle: "最佳实践"
weight: 85000
description: 高效使用 Dapr .NET SDK
---

## 以信心构建

Dapr .NET SDK 提供了丰富的功能集用于构建分布式应用。本节提供在生产场景中高效使用 SDK 的实用指南——聚焦于可靠性、可维护性和开发者体验。

涵盖的主题包括：

- Dapr 构建块中的错误处理策略
- 管理实验性功能并抑制相关警告
- 利用源代码分析器和生成器来减少样板代码并及早发现问题
- 使用 Dapr.Testcontainers 运行集成测试
- 基于 Dapr 应用的通用 .NET 开发实践

## 错误模型指南

Dapr 操作可能因多种原因而失败——网络问题、组件配置错误或瞬态故障。SDK 提供了结构化的错误类型，帮助您区分可重试错误和致命错误。

了解如何有效使用 `DaprException` 及其派生类型[详见此处]({{% ref dotnet-guidance-error-model.md %}})。

## 实验性属性

部分 SDK 功能被标记为实验性，可能在未来的版本中发生变化。这些功能使用 `[Experimental]` 进行标注，默认情况下会生成构建时警告。您可以：

- 使用 `#pragma warning disable` 选择性抑制警告
- 使用 `SuppressMessage` 属性进行更精细的控制
- 跟踪整个代码库中的实验性功能使用情况

了解更多关于 `[Experimental]` 属性的使用[详见此处]({{% ref dotnet-guidance-experimental-attributes.md %}})。

## 源代码工具

SDK 包含基于 Roslyn 的分析器和源代码生成器，帮助您更轻松地编写更好的代码。这些工具能够：

- 对 SDK 的常见误用发出警告
- 为 Actor 注册和调用生成样板代码
- 支持 IDE 集成以提供更快的反馈

阅读更多关于如何安装和使用这些分析器的内容[详见此处]({{% ref dotnet-guidance-source-generators.md %}})。

## 其他指南

本节旨在支持广泛的开发场景。随着应用复杂性的增长，您会发现越来越多与 .NET 中 Dapr 相关的实践和模式——从 Actor 生命周期管理到配置策略和性能调优。

了解如何使用 `Dapr.Testcontainers` 运行集成测试[详见此处]({{% ref dotnet-guidance-testcontainers.md %}})。
