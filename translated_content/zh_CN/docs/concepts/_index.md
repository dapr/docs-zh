---
type: docs
title: "Dapr 概念"
linkTitle: "概念"
weight: 10
description: "了解 Dapr，包括其主要特性和能力"
---

欢迎阅读 Dapr 概念指南！

Dapr 围绕**持久执行**构建：即使发生崩溃、重启和中断，也能保证你的代码运行至完成。其核心是一个持久且可验证的[工作流引擎]({{% ref workflow-overview.md %}})，用于编排长时间运行的业务流程并为[持久 AI 代理]({{% ref "developing-ai" %}})提供支持；此外，它还依托一组模块化的[构建块]({{% ref building-blocks-concept.md %}})和[可插拔组件]({{% ref components-concept.md %}})，解决构建分布式系统时常见的挑战。

本节将介绍 Dapr 的核心概念，从持久工作流、构建块和组件，到其安全模型、弹性和可观测性。

{{% alert title="开始使用 Dapr" color="primary" %}}
如果你已准备好开始使用 Dapr 进行开发，请访问[入门部分]({{%ref getting-started%}})。
{{< button text="安装 Dapr" page="getting-started.md" >}}
{{% /alert %}}
