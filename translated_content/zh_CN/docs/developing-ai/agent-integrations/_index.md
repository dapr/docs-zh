---
type: docs
title: "Agent 集成"
linkTitle: "Agent 集成"
weight: 25
description: "关于如何将 agent 框架与 Dapr 运行时集成的相关信息"
---

### Dapr 中的 agent 集成是什么？

Dapr 通过为其他 agent 框架提供在生产环境中运行所需的关键功能来对其进行增强和扩展：

* 使用 [Dapr 工作流]({{% ref workflow-overview %}}) 实现持久执行，以支持弹性且长时间运行的 AI 任务
* 使用 Dapr 的 [状态管理 API]({{% ref "state-management-overview" %}}) 实现可移植的 agent 上下文和记忆
* 使用 [Dapr 发布订阅]({{% ref "pubsub-overview" %}}) 和 [服务调用]({{% ref service-invocation-overview %}}) 实现可靠且安全的 agent 间通信
* 安全的 agent [身份]({{< ref "concepts/security-concept" >}}#application-identity)

{{< button text="安装 Dapr" page="getting-started.md" >}}

借助 Dapr，使用自选框架编写 AI 系统的开发者可以通过 Dapr API 加速开发，并更有信心地将 agent 系统投入生产环境。
