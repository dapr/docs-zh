---
type: docs
title: ".NET 工作流示例"
linkTitle: "GitHub 上的工作流示例"
weight: 3000
description: 探索 GitHub 上的 Dapr 工作流代码示例
---

## Dapr Quickstarts 仓库中的工作流教程

GitHub 上的 Dapr Quickstarts 仓库包含许多工作流教程，展示各种工作流模式以及如何使用工作流管理操作。你可以在 [quickstarts/tutorials/workflow/csharp](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp) 文件夹中找到这些教程。

## .NET SDK 仓库中的工作流示例

GitHub 上的 Dapr .NET SDK 仓库包含多个示例，演示如何将 Dapr Workflows 与 .NET 结合使用。你可以在 [examples/Workflow](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow) 文件夹中找到这些示例。

对于大型有效负载，请参阅 [工作流数据引用（alpha）]({{% ref dotnet-workflow-data-references.md %}})，其中介绍了自动卸载、显式引用、流式示例和基准对比。二进制存储以及本 SDK 的集成均处于 alpha 阶段。跨应用调用的输入默认为内联方式；若要显式允许引用，则需要兼容的、能感知有效负载的目标，并且这些目标须能够访问相同的被引用对象。[JavaScript SDK]({{% ref js-workflow-data-references.md %}}) 同样支持来自 `@dapr/dapr` 3.19.0 的版本 1 信封格式，具备兼容的序列化方式，且不执行有效负载阶段的还原。请勿假定其他语言的 SDK 支持数据引用。

## 后续步骤

- [试用 Dapr University 工作流课程](https://www.diagrid.io/dapr-university#dapr-workflow)
