---
type: docs
title: "Experimental Attributes"
linkTitle: "Experimental Attributes"
weight: 85200
description: 了解为什么我们用 `[Experimental]` 属性标记某些方法
---

## Experimental Attributes

### Experimental Attributes 简介

随着 .NET 8 的发布，C# 12 引入了 `[Experimental]` 属性，它提供了一种标准化的方式来标记仍在开发或处于实验阶段的 API。该属性定义在 `System.Diagnostics.CodeAnalysis` 命名空间中，需要一个诊断 ID 参数，用于在使用实验性 API 时生成编译器警告。

{{% alert title=".NET 框架支持" color="warning" %}}
请注意，.NET 8 和 .NET 9 将于 2026 年 11 月结束支持。Dapr v1.20 将不再支持这两个版本；只有 .NET 10 和 .NET 11 会支持到 2027 年底。
{{% /alert %}}

在 Dapr .NET SDK 中，我们现在使用 `[Experimental]` 属性而不是 `[Obsolete]` 来标记尚未通过稳定生命周期认证的 building block 和 component。这种方式能在以下两者之间提供更清晰的区分：

1. **Experimental APIs** — 已经可用但仍在演进的功能，尚未根据 [Dapr Component Certification Lifecycle](https://docs.dapr.io/operations/components/certification-lifecycle/) 认证为稳定。

2. **Obsolete APIs** — 真正已被弃用并将在未来版本中移除的功能。

### 在 Dapr .NET SDK 中的使用

在 Dapr .NET SDK 中，我们在类级别为仍处于 [Component Certification Lifecycle](https://docs.dapr.io/operations/components/certification-lifecycle/) 的 Alpha 或 Beta 阶段的 building block 应用 `[Experimental]` 属性。该属性包括：

- 一个用于标识实验性 building block 的诊断 ID
- 一个指向该 building block 相关文档的 URL

例如：

```csharp
using System.Diagnostics.CodeAnalysis;
namespace Dapr.Cryptography.Encryption 
{ 
    [Experimental("DAPR_CRYPTOGRAPHY", UrlFormat = "https://docs.dapr.io/developing-applications/building-blocks/cryptography/cryptography-overview/")] 
    public class DaprEncryptionClient 
    { 
        // 实现 
    } 
}
```

诊断 ID 遵循 `DAPR_[BUILDING_BLOCK_NAME]` 的命名约定，例如：

- `DAPR_CONVERSATION` — 用于 conversation building block
- `DAPR_CRYPTOGRAPHY` — 用于 cryptography building block
- `DAPR_DISTRIBUTEDLOCK` — 用于分布式锁 building block

### 抑制 Experimental 警告

使用标记了 `[Experimental]` 属性的 API 时，编译器会生成错误。要在不将自己的代码标记为实验性的情况下构建解决方案，您需要抑制这些错误。以下是几种做法：

#### 选项 1：使用 #pragma 指令

您可以使用 `#pragma warning` 指令为特定代码段抑制警告：

```csharp
// 禁用 experimental 警告 
#pragma warning disable DAPR_CRYPTOGRAPHY 
// 使用实验性 API 的代码 
var client = new DaprEncryptionClient(); 
// 重新启用该警告 
#pragma warning restore DAPR_CRYPTOGRAPHY
```

这种方式适用于只想为代码中特定部分抑制警告的情况。

#### 选项 2：项目级抑制

要为整个项目抑制警告，请在您的 `.csproj` 文件中添加以下内容。

```xml
<PropertyGroup>
    <NoWarn>$(NoWarn);DAPR_CRYPTOGRAPHY</NoWarn>
</PropertyGroup>
```

您可以包含多个以分号分隔的诊断 ID：

```xml
<PropertyGroup>
    <NoWarn>$(NoWarn);DAPR_CONVERSATION;DAPR_DISTRIBUTEDLOCK;DAPR_CRYPTOGRAPHY</NoWarn>
</PropertyGroup>
```

这种方式对需要使用实验性 API 的测试项目特别有用。

#### 选项 3：目录级抑制

要为目录中的多个项目抑制警告，请添加一个 `Directory.Build.props` 文件：

```xml
<PropertyGroup>
    <NoWarn>$(NoWarn);DAPR_CONVERSATION;DAPR_DISTRIBUTEDLOCK;DAPR_CRYPTOGRAPHY</NoWarn>
</PropertyGroup>
```

该文件应放在测试项目的根目录中。您可以在 [MSBuild 文档](https://learn.microsoft.com/visualstudio/msbuild/customize-by-directory) 中进一步了解 `Directory.Build.props` 文件的用法。

### Experimental API 的生命周期

随着 building block 通过认证生命周期并进入 Stable（稳定）阶段，`[Experimental]` 属性将被移除。届时用户无需进行任何迁移或代码修改，只需删除之前添加的警告抑制（如果有的话）。

相反，`[Obsolete]` 属性现在将专门保留给真正已被弃用并计划移除的 API。当您看到标记了 `[Obsolete]` 的方法或类时，应按照属性消息中提供的迁移指南规划迁移。

### 最佳实践

1. **在应用程序代码中：**
    - 谨慎使用实验性 API，因为它们在未来版本中可能发生变化
    - 考虑隔离实验性 API 的使用，以便将来更容易更新
    - 记录您对实验性 API 的使用，以便团队了解

2. **在测试代码中：**
    - 使用项目级抑制，避免在测试代码中充斥警告抑制
    - 定期检查您正在使用的实验性 API，并确认它们是否已稳定

3. **为 SDK 做贡献时：**
    - 对尚未完成认证的新 building block 使用 `[Experimental]`
    - 仅对真正已弃用的 API 使用 `[Obsolete]`
    - 在 `UrlFormat` 参数中提供清晰的文档链接

### 其他资源

- [Dapr Component Certification Lifecycle](https://docs.dapr.io/operations/components/certification-lifecycle/)
- [C# Experimental 属性文档](https://learn.microsoft.com/dotnet/csharp/language-reference/proposals/csharp-12.0/experimental-attribute)
