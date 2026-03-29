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
| **可插拔组件** | 允许创建支持 gRPC 的任何语言编写的自托管 gRPC 组件。支持以下组件 API：状态存储、发布订阅、绑定 | N/A | [可插拔组件概念]({{%ref "components-concept#pluggable-components" %}})| v1.9  |
| **Kubernetes 多应用运行** | 从单个配置文件配置多个 Dapr 应用程序，并通过单个命令在 Kubernetes 上运行 | `dapr run -k -f` | [多应用运行]({{% ref multi-app-dapr-run.md %}}) | v1.12 |
| **加密** | 无需管理密钥即可加密或解密数据  | N/A | [加密概念]({{% ref "components-concept#cryptography" %}})| v1.11  |
| **Actor 状态 TTL** | 允许 Actor 保存记录到设置了生存时间（TTL）的状态存储，以自动清理旧数据。在其当前实现中，带有 TTL 的 Actor 状态可能无法被客户端正确反映，阅读 [Actor 状态事务]({{% ref actors_api.md %}}) 了解更多信息。 | `ActorStateTTL` | [Actor 状态事务]({{% ref actors_api.md %}}) | v1.11  |
| **组件热重载** | 允许 Dapr 加载的组件进行"热重载"。当在 Kubernetes 中创建/更新/删除组件规范时，或在自托管模式下在文件上进行时，会重新加载组件规范。忽略对 Actor 状态存储和工作流后端的更改。 | `HotReload`| [热重载]({{% ref components-concept.md %}}) | v1.13  |
| **订阅热重载** | 允许声明式订阅进行"热重载"。订阅在 Kubernetes 中创建/更新/删除时或在自托管模式下的文件中进行时重新加载。重新加载时不影响正在进行的消息。 | `HotReload`| [热重载]({{% ref "subscription-methods.md#declarative-subscriptions" %}}) | v1.14  |
| **工作流集群部署** | 当工作流客户端与负载均衡器后端的同一 appID 的多个 daprd 通信时，启用工作流功能。仅在使用 [Dapr 共享]({{% ref "kubernetes-dapr-shared" %}}) 时相关 | `WorkflowsClusteredDeployment`| [Dapr 共享]({{% ref "kubernetes-dapr-shared" %}}) | v1.16  |
| **工作流持久化活动结果** | 如果设置，可确保在多应用场景中，活动结果被持久地发送到拥有工作流，即使拥有工作流的应用程序不可用。除非运行多个 Dapr 版本，否则应启用此功能开关。默认情况下出于向后兼容性而禁用。  | `WorkflowsRemoteActivityReminder` | [多应用工作流]({{% ref "workflow-multi-app.md#durable-activity-results" %}}) | v1.17 |
