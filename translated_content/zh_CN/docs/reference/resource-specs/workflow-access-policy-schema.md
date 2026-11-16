---
type: docs
title: "WorkflowAccessPolicy 规范"
linkTitle: "WorkflowAccessPolicy"
description: "Dapr WorkflowAccessPolicy 资源的基本规范"
weight: 6000
---

`WorkflowAccessPolicy` 是一种 Dapr 资源，用于控制哪些应用可以执行工作流操作（调度、终止、触发事件、暂停、恢复、清除、获取、重新运行），以及在目标应用上跨应用调度活动。策略是纯粹的允许列表：只要有任一已加载的规则匹配，调用即被允许。

{{% alert title="不支持跨命名空间工作流" color="warning" %}}
工作流始终限定在单个命名空间内。无论策略内容如何，也无论是否加载了任何策略，跨命名空间的工作流和活动调用都会被拒绝。多应用程序工作流中的所有调用方和目标都必须位于同一命名空间。
{{% /alert %}}

## 格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: <REPLACE-WITH-NAME>
  namespace: <NAMESPACE>
scopes:
  - <TARGET-APP-ID>
spec:
  rules:
    - callers:
        - appID: <CALLER-APP-ID>
      workflows:
        - name: <WORKFLOW-NAME-OR-GLOB-PATTERN>
          operations: [schedule, terminate, raise, pause, resume, purge, get, rerun]
      activities:
        - name: <ACTIVITY-NAME-OR-GLOB-PATTERN>
```

## 规范字段

字段按它们在 YAML 文档中出现的顺序列出。

| 字段 | 必需 | 类型 | 说明 | 示例 |
|-------|:--------:|------|-------------|---------|
| `scopes` | 否 | 列表 | 此策略适用的目标应用 ID。若省略或为空，则策略适用于所有应用。策略在被调用方（目标）一侧强制执行。 | `["order-service"]` |
| `rules` | 否 | 列表 | 规则的允许列表。只要有任一规则匹配，调用即被允许。若在已加载策略的情况下省略 `rules` 或其为空，则所有跨应用调用都会被拒绝。 | 见下文 |
| `rules[].callers` | 是 | 列表 | 此规则适用的调用方对象列表。必须至少包含一项。 | 见下文 |
| `rules[].callers[].appID` | 是 | 字符串 | 调用方应用的 Dapr App ID。调用方必须与目标位于同一命名空间；跨命名空间的工作流调用始终被拒绝，且不受支持。 | `frontend-app` |
| `rules[].workflows` | 否\* | 列表 | 授予匹配调用方的工作流规则。 | 见下文 |
| `rules[].workflows[].name` | 是 | 字符串 | 工作流的精确名称，或其 [glob 模式](https://pkg.go.dev/path#Match)。支持 `*`、`?` 和 `[abc]` 字符类。 | `OrderWF`, `Report*` |
| `rules[].workflows[].operations` | 是 | 列表 | 授予的操作集合：`schedule`、`terminate`、`raise`、`pause`、`resume`、`purge`、`get`、`rerun`。每个操作在跨应用调用方针对指定工作流调用时强制执行。 | `[schedule, terminate]` |
| `rules[].workflows[].requires` | 否 | 列表 | 可选的有序历史事件列表（最多 20 个），调用方的[传播历史]({{% ref workflow-history-propagation.md %}})中必须全部按顺序存在，规则才适用。仅当规则的唯一操作为 `schedule` 时有效。需要启用[历史签名]({{% ref workflow-history-signing.md %}})；若签名未启用，`requires` 规则始终拒绝。 | 见下文 |
| `rules[].activities` | 否\* | 列表 | 授予匹配调用方的活动规则。活动只支持调度，因此没有 `operations` 字段。 | 见下文 |
| `rules[].activities[].name` | 是 | 字符串 | 活动的精确名称，或其 [glob 模式](https://pkg.go.dev/path#Match)。 | `ChargePayment`, `Refund*` |
| `rules[].activities[].requires` | 否 | 列表 | 可选的有序历史事件列表（最多 20 个），调用方的传播历史中必须全部按顺序存在，规则才适用。条目结构与 `rules[].workflows[].requires` 相同。 | 见下文 |
| `rules[].workflows[].requires[].eventType` | 是 | 字符串 | 要匹配的历史事件，取值为以下之一：`activity.started`、`activity.completed`、`workflow.started`、`workflow.completed`、`event.raised`。`workflow.started` 匹配调用方调度的子工作流，而非其自身的执行。活动的 `requires` 条目使用相同的字段。 | `activity.completed` |
| `rules[].workflows[].requires[].name` | 是 | 字符串 | 活动名称（`activity.*`）、子工作流名称（`workflow.*`）或外部事件名称（`event.raised`）。 | `fraud-check` |
| `rules[].workflows[].requires[].appID` | 是 | 字符串 | 必须产生该事件的 App ID；只有当事件来自该应用的传播历史时，才会匹配。 | `checkout` |

\* 每条规则中，`workflows` 与 `activities` 至少须有一个。

该架构还设置了大小限制，因此体积很大或由程序生成的策略可能无法通过验证。`rules`、`rules[].callers`、`rules[].workflows` 和 `rules[].activities` 各最多容纳 100 个条目，`operations` 最多 8 个，每个 `requires` 列表最多 20 个。每个 `appID` 和 `name` 的值长度为 1 到 256 个字符。应用了 1.19 版 CRD 后，Kubernetes API 服务器会拒绝违反这些限制的策略。边车在加载或重新加载每个策略时，也会用同一架构进行校验，无论是 Kubernetes 还是自托管模式，遇到无效策略时都会跳过它，并在日志中记录警告。

## 示例

下面的策略适用于 `order-service` 应用。它授予 `frontend-app` 和 `api-gateway` 调度 `OrderWF`、`CheckoutWF` 工作流以及 `ProcessPayment` 活动的权限。第二条规则授予 `admin-app` 在 `order-service` 上调度任意工作流和活动的权限。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: order-processing-policy
  namespace: production
scopes:
  - order-service
spec:
  rules:
    - callers:
        - appID: frontend-app
        - appID: api-gateway
      workflows:
        - name: OrderWF
          operations: [schedule]
        - name: CheckoutWF
          operations: [schedule]
      activities:
        - name: ProcessPayment
    - callers:
        - appID: admin-app
      workflows:
        - name: "*"
          operations: [schedule]
      activities:
        - name: "*"
```

## 使用 `requires` 的示例

此策略只允许 `checkout` 在 `payments-service` 上调度 `ChargeCard` 活动，且前提是 `checkout` 的[传播历史]({{% ref workflow-history-propagation.md %}})中显示已完成的 `fraud-check`，其后已完成 `human-approval`（两者均由 `checkout` 产生）。`requires` 需要启用[历史签名]({{% ref workflow-history-signing.md %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: payments-requires
  namespace: production
scopes:
  - payments-service
spec:
  rules:
    - callers:
        - appID: checkout
      activities:
        - name: ChargeCard
          requires:
            - eventType: activity.completed
              name: fraud-check
              appID: checkout
            - eventType: activity.completed
              name: human-approval
              appID: checkout
```

## 相关链接

- [了解如何配置工作流访问策略]({{% ref workflow-access-policy.md %}})
- [安全概念]({{% ref security-concept.md %}})
- [多应用程序工作流]({{% ref workflow-multi-app.md %}})
- [工作流历史传播]({{% ref workflow-history-propagation.md %}})
- [工作流历史签名]({{% ref workflow-history-signing.md %}})
