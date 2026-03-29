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
在提交 PR 之前移除此模板中的所有注释。
-->

<!-- 
H1：Hugo front-matter 中的标题作为文章的 markdown H1。 
-->

<!-- 导言段落  
必填。简短的介绍，简要描述 how-to 将涵盖的内容以及任何默认的 Dapr 特性。链接到相应的概念或概述文档以提供背景。-->

<!-- 
如果可能，包含图表或图像。 
-->

<!--
如果适用，在短代码注释或提示中链接到相关的快速入门，例如：

 如果尚未尝试，请先[试用 <主题> 快速入门](link)，以快速了解如何使用 <主题>。

-->

<!-- 
确保 how-to 包含多种编程语言、操作系统或部署目标的示例（如果适用）。 
-->

## <操作或任务>

<!-- 
与快速入门不同，不要使用"步骤 1"、"步骤 2"等。  
-->

## <操作或任务>

<!-- 
每个 H2 步骤应以动词/动作词开头。
-->

-->
尽可能包含代码片段。 
-->

## 下一步

<!--
链接到相关页面和示例。例如，构建块概述、相关教程、API 参考等。
-->

```
