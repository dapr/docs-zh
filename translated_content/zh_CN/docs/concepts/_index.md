---
type: docs
title: "Dapr 概念"
linkTitle: "概念"
weight: 10
description: "了解 Dapr，包括其主要特性和能力"
---

欢迎阅读 Dapr 概念指南！

Dapr 围绕**持久执行**构建：即使发生崩溃、重启和中断，也能保证你的代码运行至完成。其核心是一个持久且可验证的 [workflow 引擎]({{% ref workflow-overview.md %}})，用于编排长时间运行的业务流程，并为[持久 AI 代理]({{% ref "developing-ai" %}})提供支撑。在此之上，Dapr 还提供一组模块化的 [building blocks]({{% ref building-blocks-concept.md %}}) 和可插拔的 [components]({{% ref components-concept.md %}})，用于解决构建分布式系统时的常见挑战。

本节将介绍 Dapr 背后的核心理念，从持久 workflows、building blocks 和 components，到其安全模型、resiliency 和 observability。

{{% alert title="开始使用 Dapr" color="primary" %}}
如果你已准备好开始使用 Dapr 进行开发，请访问[入门部分]({{%ref getting-started%}})。
{{< button text="安装 Dapr" page="getting-started.md" >}}
{{% /alert %}}
