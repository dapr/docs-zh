---
type: docs
title: "概念文章模板"
linkTitle: "概念模板"
weight: 10
description: 创建概念文章的建议模板和指导
---


## 贡献新的概念或概述文章

概念（或概述）文章回答以下问题：

- 为什么要关注此功能？
- 它能帮助你解决哪些问题？

虽然组件、API 或 SDK 规范可能帮助读者了解如何使用或使用这些功能，但概念文章提供了更深层次和上下文。可以链接到规范文章，但尽量不要简单重复规范内容。

在命名概念文章时，确保名称、参数和术语与规范保持一致。必要时确保两者都得到更新。

{{% alert title="Note" color="primary" %}}
此模板仅是建议。可根据文档目的自由更改。
{{% /alert %}}

了解更多关于[贡献 Dapr 文档]({{% ref contributing-docs %}})的信息，例如 [front-matter]({{% ref "contributing-docs#front-matter" %}}) 和 [shortcodes]({{% ref "contributing-docs#shortcodes" %}})。

### 模板

```md
---
type: #Required; docs
title: #Required; 简短、清晰的标题
linkTitle: #Required; 简短标题
weight: #Required; 根据层级使用正确的权重
description: #Required; 一句话描述文章内容
---

<!--
Remove all the comments in this template before opening a PR.
-->

<!-- 
H1: The title in the Hugo front-matter serves as the article's markdown H1. 
-->

<!-- 简介
Required. Brief intro that describes the concepts that the article will cover. Link off to the appropriate reference, specs, or how-to guides to provide context. -->

<!-- 
Include a diagram or image, if possible. 
-->

## <第 1 节 H2>

<!-- 
Add your content here.  
-->

## <第 2 节 H2>

<!-- 
Each H2 step should start with a noun/descriptive word.
-->

## <第 3 节 H2>

<!--
Add your content here.
-->

<!--
Include diagrams or images throughout, where applicable.
-->

## 尝试 <概念>

<!-- 
If applicable, include a section with links to the related quickstart, how-to guides, or tutorials. --> 

### 快速入门和教程

Want to put the Dapr <topic> API to the test? Walk through the following quickstart and tutorials to see <topic> in action:

| Quickstart/tutorial | Description |
| ------------------- | ----------- |
| [<topic> quickstart](link) | Description of the quickstart. |
| [<topic> tutorial](link) | Description of the tutorial. |

### 直接在应用中使用 <主题>

Want to skip the quickstarts? Not a problem. You can try out the <topic> building block directly in your application. After [Dapr is installed](link), you can begin using the <topic> API, starting with [the <topic> how-to guide](link).


-->

## 后续步骤

<!--
Link to related pages and examples. For example, the related API spec, related building blocks, etc.
-->

```
