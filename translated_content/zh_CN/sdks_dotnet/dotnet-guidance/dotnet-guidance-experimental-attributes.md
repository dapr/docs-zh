---
type: docs
title: "Experimental Attributes"
linkTitle: "Experimental Attributes"
weight: 85200
description: 了解为什么我们用 `[Experimental]` 属性标记某些方法
---

## Experimental Attributes

### Experimental Attributes 简介

随着 .NET 8 的发布，C# 12 引入了 `[Experimental]` 属性，它提供了一种标准化的方式来标记仍在开发或实验阶段的 API。该属性定义在 `System.Diagnostics.CodeAnalysis` 命名空间中，需要一个诊断 ID 参数，用于在使用实验性 API 时生成编译器警告。

在 Dapr .NET SDK 中，我们现在使用 `[Experimental]` 属性而不是 `[Obsolete]` 来标记尚未通过稳定生命周期认证的构建块和组件。这种方法提供了更清晰的区分：

1. **Experimental APIs** — 已经可用但仍在演进的功能，尚未根据 [Dapr Component Certification Lifecycle](https://docs.dapr.io/operations/components/certification-lifecycle/) 认证为稳定。

2. **Obsolete APIs** — 真正已被弃用并将在未来版本中移除的功能。

### 在 Dapr .NET SDK 中的使用

在 Dapr .NET SDK 中，我们在类级别为仍处于 [Component Certification Lifecycle](https://docs.dapr.io/operations/components/certification-lifecycle/) 的 Alpha 或 Beta 阶段的构建块应用 `[Experimental]` 属性。该属性包括：

- 一个用于标识实验性构建块的诊断 ID
- 一个指向该构建块相关文档的 URL

例如：

```csharp
using System.Diagnostics.CodeAnalysis;
namespace Dapr.Cryptography.Encryption 
{ 
    [Experimental("DAPR_CRYPTOGRAPHY", UrlFormat = "https://docs.dapr.io/developing-applications/building-blocks/cryptography/cryptography-overview/")] 
    public class DaprEncryptionClient 
    { 
        // Implementation 
    } 
}
```

诊断 ID 遵循 `DAPR_[BUILDING_BLOCK_NAME]` 的命名约定，例如：

- `DAPR_CONVERSATION` — 用于 Conversation 构建块
- `DAPR_CRYPTOGRAPHY` — 用于 Cryptography 构建块
- `DAPR_JOBS` — 用于 Jobs 构建块
- `DAPR_DISTRIBUTEDLOCK` — 用于 Distributed Lock 构建块

### 抑制 Experimental 警告

当您使用标记有 `[Experimental]` 属性的 API 时，编译器会生成错误。要在不将自己的代码标记为实验性的情况下构建解决方案，您需要抑制这些错误。以下是几种方法：

#### 选项 1：使用 #pragma 指令

您可以使用 `#pragma warning` 指令来抑制特定代码段的警告：

```csharp
// Disable experimental warning 
#pragma warning disable DAPR_CRYPTOGRAPHY 
// Your code using the experimental API 
var client = new DaprEncryptionClient(); 
// Re-enable the warning 
#pragma warning restore DAPR_CRYPTOGRAPHY
```

这种方法适用于只想抑制代码中特定部分的警告。

#### 选项 2：项目级抑制

要为整个项目抑制警告，请将以下内容添加到您的 `.csproj` 文件中。

```xml
<PropertyGroup>
    <NoWarn>$(NoWarn);DAPR_CRYPTOGRAPHY</NoWarn>
</PropertyGroup>
```

您可以包含多个用分号分隔的诊断 ID：

```xml
<PropertyGroup>
    <NoWarn>$(NoWarn);DAPR_CONVERSATION;DAPR_JOBS;DAPR_DISTRIBUTEDLOCK;DAPR_CRYPTOGRAPHY</NoWarn>
</PropertyGroup>
```

这种方法对于需要使用实验性 API 的测试项目特别有用。

#### 选项 3：目录级抑制

要为目录中的多个项目抑制警告，请添加一个 `Directory.Build.props` 文件：

```xml
<PropertyGroup>
    <NoWarn>$(NoWarn);DAPR_CONVERSATION;DAPR_JOBS;DAPR_DISTRIBUTEDLOCK;DAPR_CRYPTOGRAPHY</NoWarn>
</PropertyGroup>
```

该文件应放置在测试项目的根目录中。您可以在 [MSBuild 文档](https://learn.microsoft.com/visualstudio/msbuild/customize-by-directory) 中了解更多关于使用 `Directory.Build.props` 文件的信息。

### Experimental API 的生命周期

随着构建块通过认证生命周期并达到 "Stable" 阶段，`[Experimental]` 属性将被移除。此时用户无需进行任何迁移或代码更改，只需移除之前添加的警告抑制即可。

相反，`[Obsolete]` 属性现在将专门保留给真正被弃用并计划移除的 API。当您看到标记有 `[Obsolete]` 的方法或类时，应根据属性消息中提供的迁移指导计划迁移。

### 最佳实践

1. **在应用程序代码中：**
   - 谨慎使用实验性 API，因为它们可能会在未来版本中发生变化
   - 考虑将实验性 API 的使用隔离，以便将来更容易更新
   - 记录您对实验性 API 的使用，以便团队了解

2. **在测试代码中：**
   - 使用项目级抑制以避免在测试代码中充斥警告抑制
   - 定期审查您使用的实验性 API，并检查它们是否已稳定

3. **在为 SDK 做贡献时：**
   - 对于尚未完成认证的新构建块使用 `[Experimental]`
   - 仅对真正被弃用的 API 使用 `[Obsolete]`
   - 在 `UrlFormat` 参数中提供清晰的文档链接

### 其他资源

- [Dapr Component Certification Lifecycle](https://docs.dapr.io/operations/components/certification-lifecycle/)
- [C# Experimental Attribute Documentation](https://learn.microsoft.com/dotnet/csharp/language-reference/proposals/csharp-12.0/experimental-attribute)
