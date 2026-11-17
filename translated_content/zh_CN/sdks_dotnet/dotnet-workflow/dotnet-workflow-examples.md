---
type: docs
title: ".NET workflow 示例"
linkTitle: "GitHub 上的 workflow 示例"
weight: 3000
description: 探索 GitHub 上的 Dapr workflow 代码示例
---

## Dapr Quickstarts 仓库中的 workflow 教程

GitHub 上的 Dapr Quickstarts 仓库包含许多 workflow 教程，展示各种 workflow 模式以及如何使用 workflow 管理操作。你可以在 [quickstarts/tutorials/workflow/csharp](https://github.com/dapr/quickstarts/tree/master/tutorials/workflow/csharp) 文件夹中找到这些教程。

## .NET SDK 仓库中的 workflow 示例

GitHub 上的 Dapr .NET SDK 仓库包含多个示例，演示如何将 Dapr Workflows 与 .NET 结合使用。你可以在 [examples/Workflow](https://github.com/dapr/dotnet-sdk/tree/master/examples/Workflow) 文件夹中找到这些示例。

对于大负载，请参阅 [Workflow data references（alpha）]({{% ref dotnet-workflow-data-references.md %}})，其中介绍了自动卸载、显式引用、流式示例和基准对比。Binary Store 以及本 SDK 的集成均处于 alpha 阶段。跨应用调用的输入默认为内联方式；若要显式允许引用，则需要兼容的、能感知负载的目标，并且这些目标须能够访问相同的被引用对象。[JavaScript SDK]({{% ref js-workflow-data-references.md %}}) 同样支持来自 `@dapr/dapr` 3.19.0 的版本 1 信封格式，具备兼容的序列化方式，且不执行负载阶段的还原。请勿假定其他语言的 SDK 支持数据引用。

## 后续步骤

- [试用 Dapr University workflow 课程](https://www.diagrid.io/dapr-university#dapr-workflow)
