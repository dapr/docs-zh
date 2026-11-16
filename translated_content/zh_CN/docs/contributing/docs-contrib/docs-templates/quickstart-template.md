---
type: docs
title: "快速入门指南模板"
linkTitle: "快速入门模板"
weight: 20
description: 创建快速入门指南的建议模板和指导
---

## 贡献新的快速入门指南

Dapr 快速入门指南由简明的说明组成，引导读者完成一个已经准备好的快速入门。这些快速入门保存在 [dapr/quickstarts 仓库](https://github.com/dapr/quickstarts)中。每个快速入门将一整个功能或构建块打包在一起，让读者无需改动自己的项目，就能轻松体验它的工作方式。

快速入门说明应简洁、直接、清晰。快速入门指南的唯一目的，是引导读者完成准备好的快速入门。如果你想解释快速入门背后的概念，请引导读者阅读概念文章，以获取更多背景信息。

{{% alert title="注意" color="primary" %}}
此模板仅作为建议。你可以根据文档的用途自由修改。
{{% /alert %}}

了解更多关于[贡献 Dapr 文档]({{% ref contributing-docs %}})的信息，例如 [front-matter]({{% ref "contributing-docs#front-matter" %}}) 和 [shortcodes]({{% ref "contributing-docs#shortcodes" %}})。

### 模板

```md
---
type: #必需；docs
title: #必需；"Quickstart: 简洁、清晰的标题"
linkTitle: #必需；这将显示在文档目录中
weight: #必需；根据层级使用正确的权重
description: #必需；一句话描述文章内容
---

<!--
Remove all the comments in this template before opening a PR.
-->

<!-- 
H1: The title in the Hugo front-matter serves as the article's markdown H1. 
-->

<!-- Introductory paragraph  
Required. Light intro that briefly describes what the quickstart will cover. Link off to the appropriate concept or overview docs to provide context. -->

<!-- 
Include a diagram or image, if possible. 
-->

<!-- 
Make sure the quickstart includes examples for multiple programming languages. 
-->

## Pre-requisites

<!--
Make sure the reader is prepared for a successful quickstart walk through by listing what they may need.
-->

## Step 1: Set up the environment

<!-- 
Link to the quickstart sample for the reader to clone. 
-->

## Step 2: <action or task>

<!-- 
Each H2 step should start with a verb/action word.
-->

<!--
Include code snippets where possible. 
-->

## Tell us what you think!

We're continuously working to improve our Quickstart examples and value your feedback. Did you find this quickstart helpful? Do you have suggestions for improvement?

Join our [Discord Server](https://diagrid.ws/dapr-discord) and share your thoughts.

<!-- 由于 Dapr 是一个开放的贡献者社区，请务必提供 Discord 讨论的链接，以欢迎反馈。
-->

## Next steps

<!--
Link to related pages and examples. For example, the building block overview, the HTTP version of an SDK quickstart sample, etc.
-->

<!--
Use the button shortcode to direct readers to more in-depth, related scenarios, like the Dapr tutorials.
-->

```
