---
type: docs
title: "重大变更与弃用"
linkTitle: "重大变更与弃用"
weight: 2500
description: "重大变更与弃用的处理"
---

## 重大变更 

重大变更定义为在升级到下一个稳定次要版本的 Dapr 工件（SDK、CLI、运行时等）后，对以下任何内容的更改导致现有的第三方应用程序或脚本出现编译错误或不良运行时行为：

- 代码行为
- 架构
- 默认配置值
- 命令行参数
- 发布的指标
- Kubernetes 资源模板
- 公共可访问的 API
- 公共可见的 SDK 接口、方法、类或属性

重大变更可以立即应用于以下情况：

- 尚未达到 1.0.0 版本的项目
- 预览功能
- Alpha API
- SDK 中的预览或 Alpha 接口、类、方法或属性
- Alpha 或 Beta 阶段的 Dapr 组件
- `github.com/dapr/components-contrib` 的接口
- 文档和博客中的 URL
- **例外**情况，即**必须**修复严重错误或安全漏洞。

### 应用重大变更的流程

应用重大变更有一个流程：

1. 必须在某个版本中发布弃用通知。
1. 重大变更将在宣布弃用的版本之后的两个（2）版本中应用。
   - 例如，功能 X 在 1.0.0 版本说明中宣布弃用，随后将在 1.2.0 中移除。

## 弃用

弃用可应用于：

1. API，包括 alpha API
1. 预览功能
1. 组件
1. CLI
1. 可能导致安全漏洞的功能

弃用内容会出现在版本说明中名为 "Deprecations" 的部分下，该部分指示：

- 将来不再支持已弃用功能的时间点。例如版本 x.y.z。这至少在两个（2）版本之前。
- 如果适用，在版本说明中记录用户必须采取的任何步骤来修改其代码、操作等。

在宣布未来的重大变更后，变更将在 2 个版本或 6 个月后生效，以较晚者为准。已弃用的功能应响应警告，但除此之外不执行任何操作。


## 已宣布的弃用

| 功能                                                                                                                                                                                                                                                                                                     | 弃用公告                 | 移除版本       |
|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------------------------|----------------|
| GET /v1.0/shutdown API（用户应改用 [POST API]({{% ref kubernetes-job.md %}})）                                                                                                                                                                                                                 | 1.2.0                    | 1.4.0          |
| Java domain builder 类已弃用（用户应改用 [setters](https://github.com/dapr/java-sdk/issues/587)）                                                                                                                                                                                                    | Java SDK 1.3.0           | Java SDK 1.5.0 |
| 服务调用将不再提供默认的 `application/json` 内容类型头，当未指定 content-type 时。如果你调用的应用依赖此头，则必须为服务调用显式[设置内容类型头]({{% ref "service_invocation_api.md#request-contents" %}})。 | 1.7.0                    | 1.9.0          |
| 使用 `invoke` 方法的 gRPC 服务调用已被弃用。请改用代理模式服务调用。请参阅 [How-To: 使用 gRPC 调用服务]({{% ref howto-invoke-services-grpc.md %}}) 以使用代理模式。                                                                                         | 1.9.0                    | 1.10.0         |
| CLI 标志 `--app-ssl`（在 Dapr CLI 和 daprd 中）已被弃用，取而代之的是使用值为 `https` 或 `grpcs` 的 `--app-protocol`。[daprd:6158](https://github.com/dapr/dapr/issues/6158) [cli:1267](https://github.com/dapr/cli/issues/1267)                                                 | 1.11.0                   | 1.13.0         |
| Hazelcast 发布订阅组件                                                                                                                                                                                                                                                                                | 1.9.0                    | 1.11.0         |
| Twitter 绑定组件                                                                                                                                                                                                                                                                                   | 1.10.0                   | 1.11.0         |
| NATS Streaming 发布订阅组件                                                                                                                                                                                                                                                                             | 1.11.0                   | 1.13.0         |
| 工作流 API Alpha1 `/v1.0-alpha1/workflows` 已被弃用，取而代之的是工作流客户端                                                                                                                                                                                                                  | 1.15.0                   | 1.17.0         |
| 将 `http-max-request-size` 标志/注解迁移到 `max-body-size`。请参阅 [How-To: 处理更大的主体请求]({{% ref increase-request-size.md %}})                                                                                                                                                  | 1.14.0                   | 1.17.0         |
| 移除工作流实例 ID 重用策略。对 ID 冲突的 `IGNORE` 与 `TERMINATE` 操作不再受支持：创建实例 ID 已被正在运行的工作流占用的工作流时，操作始终因冲突而失败。仍然暴露该策略的 SDK 选项（例如 Python SDK 中的 `reuse_id_policy`）已被弃用，并被 1.18+ 运行时静默忽略。                              | 1.18.0                   | 1.18.0         |
| 工作流实例 ID 重用要求整个工作流树均已进入终止状态。当由其上一次执行创建的任何子工作流（递归检查）仍在运行时，重新创建已完成、已失败或已终止的工作流的实例 ID 会被拒绝。请使用唯一的实例 ID，或清除（purge）该工作流以无条件释放其 ID。                                                                | 1.18.2                   | 1.18.2         |
| 独立的 Placement 服务计划在 1.21 中弃用，届时由调度器默认负责 Actor 放置。从 1.19 起，你可以通过 Helm 值 `global.scheduler.placement.enabled=true`（默认为 `false`）提前选择启用。参见 [Placement 服务]({{% ref placement.md %}})。 | 1.19.0                   | 尚未安排 |
| Python SDK：未使用 `SubscriptionMessage` 注解事件参数的 `dapr.ext.grpc` 主题处理程序会接收已弃用的 `cloudevents.sdk.event.v1.Event` 类型，并且 `subscribe()` 会发出 `DeprecationWarning`。请为处理程序添加 `dapr.ext.grpc.SubscriptionMessage` 注解。从 Python SDK 1.20 起，未注解的处理程序将接收 `SubscriptionMessage`。从 Python SDK 1.21 起，`dapr[grpc]` 扩展不再安装 `cloudevents`。 | Python SDK 1.19.0        | Python SDK 1.22.0 |
| Python SDK：顶层的 `flask_dapr` 包是一个兼容层（shim），会发出 `FutureWarning`。请改为从 `dapr.ext.flask` 导入。安装旧的 `dapr-ext-*` 或 `flask-dapr` 包时，`import dapr` 也会发出 `FutureWarning`。请卸载这些包，并安装 `dapr` 对应的扩展，例如 `pip install "dapr[fastapi,workflow]"`。兼容层与这两类警告将保留至 Python SDK 1.21。 | Python SDK 1.19.0        | Python SDK 1.22.0 |
| Python SDK：`schedule_new_workflow` 的 `reuse_id_policy` 参数不再有任何作用，并会发出 `DeprecationWarning`。实例 ID 在已有实例进入终止状态后即可重用。请移除该参数。 | Python SDK 1.18.3        | Python SDK 1.21.0 |
| Python SDK：带有 `http://` 或 `https://` 前缀的 gRPC 端点（例如 `DAPR_GRPC_ENDPOINT` 中的 `https://grpc.example.com:443`）会发出 `DeprecationWarning`（1.19 之前为 `UserWarning`）。请改用 `host:port?tls=true` 或 `host:port?tls=false`。这些端点仍可正常工作。 | Python SDK 1.19.0        | 尚未安排 |

## 相关链接

- 阅读[版本控制策略]({{% ref support-versioning.md %}})
- 阅读[支持的版本]({{% ref support-release-policy.md %}})
