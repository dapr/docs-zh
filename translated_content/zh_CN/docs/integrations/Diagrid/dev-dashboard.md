---
type: docs
title: "Diagrid Dapr Dev Dashboard"
linkTitle: "Dapr Dev Dashboard"
description: "为本地 Dapr 开发提供的免费配套工具，可实时查看你的 Dapr 应用"
weight: 1000
aliases:
  - /zh-hans/integrations/diagrid/diagrid-dev-dashboard/
---

[Dapr Dev Dashboard]({{% ref dapr-dev-dashboard.md %}}) 是一款免费的开源配套工具，用于辅助本地 Dapr 开发。它会自动发现你机器上运行的 Dapr 应用，并提供可视化和检查工具，以加快开发工作流。它以单个二进制文件的形式分发，支持 macOS、Linux 和 Windows。

<br /><img src="/images/integrations/diagrid/applications-light.png" alt="Diagrid Dev Dashboard 显示在本机发现的 Dapr 应用" width="800">

**应用监控**

跟踪所有正在运行的 Dapr 应用，并查看其健康状况、端口、PID 和运行时信息。

**工作流检查**

查看应用中的工作流执行情况，包括实时事件历史和执行状态，并可以终止、清除或重新运行工作流实例。

**Actor、订阅与状态**

查看 Actor 类型及活跃 Actor 数量，列出 pub/sub 的订阅，并向其发布测试消息，还可以浏览、添加和删除 state store 中的记录。

**组件与配置查看器**

浏览 Dapr 组件和配置，并使用构建向导创建组件和弹性策略定义，无需手动编写 YAML。

**控制平面与日志**

检查本地 Dapr 控制平面服务的状态，并以过滤和高亮的方式实时流式输出边车和应用日志。

**Dapr CLI 命令**

复制与当前查看内容相匹配的 Dapr CLI 命令，例如工作流实例的执行历史。

Dev Dashboard 可与通过 `dapr run`、Aspire、Docker Compose 或 Dapr Testcontainers 启动的应用一起使用。

{{< button text="了解更多关于 Diagrid Dev Dashboard 的信息" page="dapr-dev-dashboard.md" >}}
