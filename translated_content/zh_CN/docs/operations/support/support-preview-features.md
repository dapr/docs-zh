---
type: docs
title: "预览功能"
linkTitle: "预览功能"
weight: 4000
description: "当前预览功能列表"
---
Dapr 中的预览功能在首次发布时被视为实验性功能。

运行时预览功能需要显式选择加入才能使用。运行时选择加入是在 Dapr 应用配置中的预览设置功能中指定的。有关更多信息，请参阅[如何：启用预览功能]({{%ref preview-features%}})。

对于 CLI，无需显式选择加入，只需使用该功能首次引入的版本即可。

## 当前预览功能

| 功能 | 描述 | 设置 | 文档 | 引入版本 |
| --- | --- | --- | --- | --- |
| **可插拔组件** | 允许创建支持 gRPC 的任何语言编写的自托管 gRPC 组件。支持以下组件 API：state store、pub/sub、binding | N/A | [可插拔组件概念]({{%ref "components-concept#pluggable-components" %}})| v1.9  |
| **Kubernetes 上的 Multi-App Run** | 从单个配置文件配置多个 Dapr 应用程序，并通过单个命令在 Kubernetes 上运行 | `dapr run -k -f` | [Multi-App Run]({{% ref multi-app-dapr-run.md %}}) | v1.12 |
| **加密** | 无需管理密钥即可加密或解密数据  | N/A | [加密概念]({{% ref "components-concept#cryptography" %}})| v1.11  |
| **Actor 状态 TTL** | 允许 Actor 保存记录到设置了生存时间（TTL）的 state store，以自动清理旧数据。在其当前实现中，带有 TTL 的 Actor 状态可能无法被客户端正确反映，请阅读 [Actor 状态事务]({{% ref actors_api.md %}}) 了解更多信息。 | `ActorStateTTL` | [Actor 状态事务]({{% ref actors_api.md %}}) | v1.11  |
| **工作流集群部署** | 当工作流客户端与位于负载均衡器后面的同一 appID 的多个 daprd 通信时，使工作流能够正常运行。仅在使用 [Dapr shared]({{% ref "kubernetes-dapr-shared" %}}) 时相关 | `WorkflowsClusteredDeployment`| [Dapr Shared]({{% ref "kubernetes-dapr-shared" %}}) | v1.16  |
| **工作流持久化活动结果** | 如果设置，可确保在多应用场景中，即使拥有该工作流的应用程序不可用，活动结果也会被持久地发送给所属工作流。当所有 Dapr 应用运行相同版本时，强烈建议始终启用。自 v1.18 起默认启用。 | `WorkflowsRemoteActivityReminder` | [多应用程序工作流]({{% ref "workflow-multi-app.md#durable-activity-results" %}}) | v1.17 |
| **工作流历史签名** | 使用边车的 mTLS X.509 身份，对工作流历史事件进行加密签名和验证。可检测工作流状态是否被篡改。**默认禁用**；设置为 `true` 即可启用。签名是单向的承诺：一旦为某个工作流启用，就无法再禁用。 | `WorkflowHistorySigning` | [工作流历史签名]({{% ref "workflow-history-signing.md" %}}) | v1.18 |
| **工作流快速路径** | 在本地驱动工作流的唤醒和活动执行，并将活动完成事件合并为一次 state store 提交，从而移除工作流热路径中每个事件对应的调度器提醒以及大部分 state store 提交。至少一次执行语义保持不变。**默认禁用**；当配置了由调度器强制执行的工作流并发限制时，它会自行禁用。 | `WorkflowsFastPath` | [工作流快速路径]({{% ref "workflow-fast-path.md" %}}) | v1.19 |
