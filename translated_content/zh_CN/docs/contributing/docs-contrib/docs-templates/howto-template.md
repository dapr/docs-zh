---
type: docs
title: "How-to 指南模板"
linkTitle: "How-to 模板"
weight: 30
description: 创建 how-to 指南的建议模板和指导
---

## 贡献新的 how-to 指南

How-to 指南为以下读者提供循序渐进的实践指导：

- 启用某个功能
- 集成某项技术
- 在特定场景中使用 Dapr

与快速入门相比，how-to 指南可以被视为"进阶版"的自引导文档。How-to 场景所需时间更长，且更容易应用到读者的个人项目或环境中。

在命名 how-to 文档时，请在文件名中包含子目录名称。如果需要创建新的子目录，请确保其具有描述性，并包含相关组件或概念名称。例如，_pubsub-namespaces_。

{{% alert title="注意" color="primary" %}}
此模板仅作为建议。请根据文档目的自由调整。
{{% /alert %}}

了解更多关于[为 Dapr 文档做贡献]({{% ref contributing-docs %}})的信息，例如 [front-matter]({{% ref "contributing-docs#front-matter" %}}) 和 [短代码]({{% ref "contributing-docs#shortcodes" %}})。

### 模板

```md
---
type: #Required; docs
title: #Required; "How to: Brief, clear title"
linkTitle: #Required; "How to: Shorter than regular title, to show in table of contents"
weight: #Required; Use the correct weight based on hierarchy
description: #Required; One-sentence description of what to expect in the article
---

<!--
Remove all the comments in this template before opening a PR.
-->

<!-- 
H1: The title in the Hugo front-matter serves as the article's markdown H1. 
-->

<!-- 导言段落  
Required. Light intro that briefly describes what the how-to will cover and any default Dapr characteristics. Link off to the appropriate concept or overview docs to provide context. -->

<!-- 
Include a diagram or image, if possible. 
-->

<!--
If applicable, link to the related quickstart in a shortcode note or alert with text like:

 If you haven't already, [try out the <topic> quickstart](link) for a quick walk-through on how to use <topic>.

-->

<!-- 
Make sure the how-to includes examples for multiple programming languages, OS, or deployment targets, if applicable. 
-->

## <操作或任务>

<!-- 
Unlike quickstarts, do not use "Step 1", "Step 2", etc.  
-->

## <操作或任务>

<!-- 
Each H2 step should start with a verb/action word.
-->

-->
Include code snippets where possible. 
-->

## 下一步

<!--
Link to related pages and examples. For example, the building block overview, the related tutorial, API reference, etc.
-->

```
