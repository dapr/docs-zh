---
type: docs
title: "How-To: 应用 workflow access policy"
linkTitle: "workflow access policy"
weight: 5000
description: "限制哪些应用可以在目标应用上调用 workflow 和 activity 操作"
---

使用 workflow access policy，你可以控制哪些调用方应用被允许在目标应用上调用特定的 workflow 操作。`WorkflowAccessPolicy` 是一种 Kubernetes CRD（在自托管模式下为 YAML 资源），在被调用方一侧进行评估。你可以通过 `scopes` 为其设置作用域，将其限定到一个或多个目标应用；若省略 `scopes`，则该策略将应用于所有应用。

workflow access policy 是纯粹的允许列表。仅当某个已加载策略中的某条规则同时匹配调用方、操作以及 workflow 或 activity 名称时，请求才会被允许。未加载任何策略时，所有调用都被允许（默认开放），以保持向后兼容。自调用（调用方 App ID 与目标 App ID 相同）无论策略内容如何，始终被允许。

{{% alert title="不支持跨 namespace workflow" color="warning" %}}
workflow 始终限定在单个 namespace 内。来自与目标不同 namespace 的调用方发起的任何 workflow 或 activity 调用，无论策略内容如何、无论是否加载了任何策略，始终会被拒绝。multi-application workflow 中涉及的所有 App ID 必须位于同一 namespace。
{{% /alert %}}

## 前提条件

- [已启用 mTLS 的 Dapr 安装]({{% ref mtls %}})。跨应用强制执行需要 mTLS，因为调用方的身份是从 mTLS 客户端证书中嵌入的 SPIFFE ID 提取的。

## 术语

### 调用方与目标应用

workflow access policy 描述的是 *调用方* 应用被允许对 *目标* 应用执行哪些操作：

- **目标**应用是承载被调度的 workflow 或 activity 的应用。策略在目标的 Dapr sidecar 内强制执行（被调用方侧强制执行）。策略通过 `spec.scopes` 字段应用于目标，该字段列出策略所适用的目标 App ID。
- **调用方**应用是发起 workflow 或 activity 调用的应用。对于跨应用调用，调用方的 App ID 取自 mTLS 客户端证书中的 [SPIFFE](https://spiffe.io/) 身份。对于同一 sidecar 内的（自）调用，则直接使用本地 App ID。

mTLS 证书中嵌入的 SPIFFE ID 格式为 `spiffe://<trustdomain>/ns/<namespace>/<appid>`。在评估 workflow access policy 时，会从该身份中提取 App ID 和 namespace。

### workflow 与 activity 名称匹配

策略规则中的 workflow 和 activity 名称可以按精确名称或 glob 模式进行匹配。Glob 匹配遵循 Go 的 [`path.Match`](https://pkg.go.dev/path#Match) 语义：

- `*` 匹配任意不含分隔符的字符序列
- `?` 匹配任意单个不含分隔符的字符
- `[abc]` 匹配集合中的任意字符（字符类）

### 操作

workflow 规则授予所列调用方对指定 workflow 执行特定操作的权限：`schedule`、`terminate`、`raise`（raise event）、`pause`、`resume`、`purge`、`get`（读取 metadata 或等待状态）和 `rerun`。以上操作均可跨应用调用：调用方应用既可以在 workflow 内部（child workflow、activity、detached workflow）中调用，也可以通过客户端 API（Dapr workflow API 中的 `appID` 字段或查询参数，以及 workflow SDK 客户端中的 App ID 选项）指向由另一应用承载的 workflow。是否允许每次调用由目标的策略决定。

- workflow 规则需要 `operations` 字段，列出所授予的操作。
- activity 规则没有 `operations` 字段。activity 仅支持调度。

对于非调度操作，规则中的 workflow `name` 会与目标实例状态中记录的名称进行匹配。对不存在的实例执行的操作会解析为空的 workflow 名称，因此只有 `name: "*"` 规则能够匹配它。

## CRD 规范

下面的示例展示了 workflow access policy 中的每个字段。该策略通过 `scopes` 应用于 `production` namespace 中的 `orders-target`。它授予 `frontend` 和 `ops-console` 应用（即 `callers`）以下权限：调度 `OrderWF`、调度名称以 `Report` 开头的任意 workflow，以及调度 `ChargePayment` activity 和名称以 `RefundEvent` 开头的任意 activity。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: orders-policy
  namespace: production
scopes:
  - orders-target
spec:
  rules:
    - callers:
        - appID: frontend
        - appID: ops-console
      workflows:
        - name: OrderWF
          operations: [schedule]
        - name: "Report*"
          operations: [schedule]
      activities:
        - name: ChargePayment
        - name: "RefundEvent*"
```

### 规范字段

字段按其在 YAML 文档中出现的顺序列出。

| 字段 | 必填 | 类型 | 说明 |
|-------|:--------:|------|-------------|
| `scopes` | N | list | 该策略适用的目标 App ID。若省略或为空，则该策略适用于所有应用。策略始终在被调用方（目标）一侧强制执行。 |
| `rules` | N | list | 规则的允许列表。只要有任一规则匹配，调用即被允许。若目标已加载策略但 `rules` 被省略或为空，则所有跨应用调用均被拒绝。 |
| `rules[].callers` | Y | list | 该规则适用的调用方对象列表。至少包含一项。每个调用方都必须显式列出（自调用除外，自调用始终被允许）。 |
| `rules[].callers[].appID` | Y | string | 调用方应用的 Dapr App ID。调用方必须与目标位于同一 namespace；跨 namespace 的 workflow 调用始终被拒绝，且不受支持。 |
| `rules[].workflows` | N* | list | 授予匹配调用方的 workflow 规则。 |
| `rules[].workflows[].name` | Y | string | workflow 的精确名称或 [glob 模式](https://pkg.go.dev/path#Match)。 |
| `rules[].workflows[].operations` | Y | list | 授予的操作集合：`schedule`、`terminate`、`raise`、`pause`、`resume`、`purge`、`get`、`rerun`。每项操作在跨应用调用方针对指定 workflow 调用时强制执行。 |
| `rules[].workflows[].requires` | N | list | 可选的有序 history event 列表，要使该规则生效，这些事件必须全部出现在调用方的 propagated history 中。仅当规则的唯一操作为 `schedule` 时有效。参见[基于调用方历史控制调度](#使用-requires-基于调用方历史控制调度)。 |
| `rules[].activities` | N* | list | 授予匹配调用方的 activity 规则。 |
| `rules[].activities[].name` | Y | string | activity 的精确名称或 [glob 模式](https://pkg.go.dev/path#Match)。activity 仅支持 `schedule` 操作，因此没有 `operations` 字段。 |
| `rules[].activities[].requires` | N | list | 可选的有序 history event 列表，要使该规则生效，这些事件必须全部出现在调用方的 propagated history 中。参见[基于调用方历史控制调度](#使用-requires-基于调用方历史控制调度)。 |

\* 每条规则中至少须包含 `workflows` 或 `activities` 之一。

## 策略语义

1. **未加载任何策略：** 所有 workflow 和 activity 请求均被允许。当不存在任何策略时，这保持了向后兼容。
2. **加载了一个或多个策略：** 目标默认拒绝。仅当某条规则同时匹配调用方、workflow 或 activity 名称，以及（针对 workflow）操作时，跨应用操作才被允许。
3. **自调用始终被允许：** 若调用方 App ID 与目标 App ID 相同，则无论策略内容如何，请求均被允许。这意味着目标应用无需在自身策略中列出自己，即可调度自己的 workflow 或 activity（包括基于内部 reminder 的执行路径）。
4. **跨 namespace 的 workflow 调用始终被拒绝。** 不支持跨 namespace 的 workflow。策略具有 namespace，并通过 `scopes` 应用于其所在 namespace 中的目标应用。调用方必须与目标位于同一 namespace；来自任何其他 namespace 的调用始终被拒绝，无论是否加载了策略，即使调用方 App ID 出现在某条规则中。
5. **跨应用强制执行需要 mTLS：** 若加载了任何策略且未启用 mTLS，跨应用调用会被拒绝，因为无法验证调用方的 SPIFFE 身份。
6. **Glob 匹配：** `*`、`?` 和字符类同时适用于 workflow 名称和 activity 名称。

## 使用 `requires` 基于调用方历史控制调度

默认情况下，规则仅根据调用方*是谁*以及其正在调度*什么*来授予访问权限。通过可选的 `requires` 字段，你还可以基于调用方*已经完成了什么*来控制调度，即调用方的[传播 workflow 历史]({{% ref workflow-history-propagation.md %}})中的事件。只有当调用方的 propagated history 按所列顺序包含全部所列事件时，`schedule` 才被允许。

这使目标可以在执行敏感操作之前强制实施前置步骤序列。例如，“仅当该调用方已完成 `fraud-check` activity 时，才允许调度 `ChargeCard`”。

`requires` 可以附加到：

- **workflow 规则**，但仅当规则的唯一操作为 `schedule`（`operations: [schedule]`）时。
- **activity 规则**。

{{% alert title="requires 需要启用 history signing 和传播" color="warning" %}}
`requires` 基于调用方的 propagated history 进行控制。只有当该历史能够通过密码学方式验证时，它才是可信的，因此必须启用[workflow history signing]({{% ref workflow-history-signing.md %}})。若未启用签名，任何包含 `requires` 块的规则都无法授予访问权限：它会失败关闭，调用被拒绝。调用方还必须在调用时[传播其历史]({{% ref workflow-history-propagation.md %}})；不携带历史的请求永远无法满足 `requires` 块。
{{% /alert %}}

### 所需事件条目

`requires` 列表中的每个条目描述一个必须存在的 history event：

| 字段 | 必填 | 类型 | 说明 |
|-------|:--------:|------|-------------|
| `eventType` | Y | string | 要匹配的 history event 类型。可选值之一：`activity.started`、`activity.completed`、`workflow.started`、`workflow.completed`、`event.raised`。 |
| `name` | Y | string | activity 名称（`activity.*`）、child workflow 名称（`workflow.*`）或 external event 名称（`event.raised`）。 |
| `appID` | Y | string | 必须产生该事件的 App ID。仅当事件来自该应用的 propagated history 时才匹配。 |

`eventType` 与 workflow 生命周期事件的对应关系如下：

| `eventType` | 匹配的含义 |
|-------------|---------|
| `activity.started` | 调用方调度了指定名称的 activity |
| `activity.completed` | 指定名称的 activity 在调用方的历史中已完成 |
| `workflow.started` | 调用方调度了具有给定名称的 child workflow |
| `workflow.completed` | 指定名称的 child workflow 已完成 |
| `event.raised` | 已触发了具有给定名称的 external event |

{{% alert title="workflow.started 匹配 child workflow" color="primary" %}}
`workflow.started` 匹配的是调用方调度的*子* workflow，而不是调用方自身的 workflow 执行。若以调用方自身的 workflow 名称进行控制，条件将始终满足，因此不起任何作用。
{{% /alert %}}

### 顺序与组合要求

- **所有条目都必须匹配（与）。** 每个所列事件都必须出现在调用方的 propagated history 中。
- **条目有序。** 每个条目必须匹配一个位于满足前一个条目的事件之后（含该事件）的事件。列出 `[fraud-check, human-approval]` 意味着 `fraud-check` 必须发生在 `human-approval` 之前。
- **用多条规则表达替代方案（或）。** 若要在两组前置序列之一满足时允许调用，请添加多条 `name` 相同、各自带有 `requires` 的 workflow 规则。只要任一匹配规则满足，即授予访问权限。

`requires` 列表最多可包含 20 个条目。

### 示例：以已完成的前置步骤控制 activity

仅当 `checkout` 的 propagated history 中显示有由 `checkout` 自身产生的 `fraud-check` activity 已完成时，才允许它在 `payments-service` 上调度 `ChargeCard` activity。

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
```

## 强制执行路径

workflow access policy 在编排器和 activity Actor 内部、在持有 Actor 锁的情况下、于加载 workflow 内部状态之后强制执行。这消除了在解析 workflow 名称与分派操作之间可能出现的检查时间到使用时间（TOCTOU）竞争。

涵盖的跨应用路径包括：在 workflow 内部于另一应用上调度 child workflow 或 activity，以及以目标 App ID 调用的每个客户端级操作（schedule、terminate、raise（raise event）、pause、resume、purge、get、rerun）：调用方应用的 sidecar 会访问目标应用的 workflow/activity Actor，由其在分派前评估策略。同一强制执行点还会阻止跨应用调用方尝试调用非主体 Actor 方法，或尝试向目标 Actor 注入 reminder。

## 策略示例

### 场景 1：限制谁可以调度跨应用 workflow

允许 `orchestrator-app` 在 `default` namespace 的 `order-service` 应用上调度 `OrderWF`。除 `order-service` 自身外（自调用始终被允许），其他应用均无法调度该 workflow。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: order-service-policy
  namespace: default
scopes:
  - order-service
spec:
  rules:
    - callers:
        - appID: orchestrator-app
      workflows:
        - name: OrderWF
          operations: [schedule]
```

### 场景 2：通过 glob 匹配调度 workflow

允许 `analytics-app` 在 `reporting-service` 应用上调度任何名称以 `Report` 开头的 workflow。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: reporting-glob
  namespace: default
scopes:
  - reporting-service
spec:
  rules:
    - callers:
        - appID: analytics-app
      workflows:
        - name: "Report*"
          operations: [schedule]
```

### 场景 3：跨应用 activity（multi-application workflow）

使用 multi-application workflow 时，目标应用无需在 `callers` 中列出自身即可执行自己的 activity。自调用始终被允许，因此该策略仅描述哪些*其他*应用可以在目标上调度 activity。在下面的策略中，`orchestrator-app` 可以在 `ml-worker` 应用上调度 `TrainModel` 和 `ValidateModel` activity，其他应用则无法调度。由于不支持跨 namespace workflow 且此类调用始终被拒绝，`orchestrator-app` 必须与 `ml-worker` 位于同一 namespace。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: ml-worker-policy
  namespace: production
scopes:
  - ml-worker
spec:
  rules:
    - callers:
        - appID: orchestrator-app
      activities:
        - name: TrainModel
        - name: ValidateModel
```

`ml-worker` 仍然可以在自身上调度 `TrainModel` 和 `ValidateModel`，无需出现在规则中，因为它是本地应用。

### 场景 4：单个调用方同时拥有 workflow 和 activity 的访问权限

单条规则即可同时授予调用方调度 workflow 和 activity 的权限。此处 `api-gateway` 应用可以在 `payments-service` 应用上调度 `ChargeCustomer` workflow、`ChargePayment` activity，以及任何名称以 `Refund` 开头的 activity。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: payments-policy
  namespace: default
scopes:
  - payments-service
spec:
  rules:
    - callers:
        - appID: api-gateway
      workflows:
        - name: ChargeCustomer
          operations: [schedule]
      activities:
        - name: ChargePayment
        - name: "Refund*"
```

### 场景 5：namespace 范围默认拒绝

与 Kubernetes [`NetworkPolicy`](https://kubernetes.io/docs/concepts/services-networking/network-policies/#default-deny-all-ingress-traffic) 通过选中 namespace 中的每个 Pod 来默认拒绝入站流量的做法类似，你可以将一个策略应用于 namespace 中的每个应用。省略 `scopes` 使策略适用于所有应用，并且不定义任何规则（`rules` 为空列表或省略）。由于策略是纯粹的允许列表，一个没有任何可匹配规则的已加载策略会拒绝每个跨应用请求。自调用仍然始终被允许，因此每个应用仍可继续调度自己的 workflow 和 activity（包括基于内部 reminder 的执行路径）。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: default-deny
  namespace: production
spec:
  rules: []
```

这是 namespace 最严格的策略姿态：任何应用都无法在 `production` 中的其他应用上调度 workflow 或 activity，且所有跨应用调用均被拒绝。以此默认拒绝的基线为起点，按需叠加额外的、范围狭窄的策略（参照前面的场景），以授予特定调用方所需的访问权限。由于策略是纯粹的允许列表，这些额外策略中的规则会相互叠加，仅开放它们明确授予的访问权限。

## 生产环境最佳实践

- **使用默认拒绝。** 为目标加载任何 `WorkflowAccessPolicy` 都会自动拒绝未被明确列出的跨应用请求。若要使用最严格的基线，请从 namespace 范围的默认拒绝策略（参见[场景 5](#场景-5namespace-范围默认拒绝)）开始，并仅在需要时添加范围狭窄的策略。保持策略精简，并在添加新 workflow 时进行审查。
- **谨慎使用 glob 模式。** 像 `*` 这样的模式可能授予比预期更广的访问权限。尽可能优先使用精确名称，仅对稳定的名称系列使用 glob 模式。
- **启用 mTLS。** 跨应用强制执行需要 mTLS。若未启用 mTLS，加载任何策略后跨应用请求都会被拒绝。
- **审计拒绝日志。** 每当请求被 workflow access policy 拒绝时，Dapr 都会记录一条警告。利用这些日志发现配置错误和未授权的调用方。
- **使用 `scopes` 指定策略的目标。** 仅将每个策略应用于应当执行该策略的应用，以减少每个 daprd 需要加载的范围。

## 自托管设置

在自托管模式下，将 workflow access policy YAML 放入资源目录（默认为 `$HOME/.dapr/components`，或通过 `--resources-path` 传入的路径）。

```yaml
apiVersion: dapr.io/v1alpha1
kind: WorkflowAccessPolicy
metadata:
  name: my-policy
scopes:
  - my-app
spec:
  rules:
    - callers:
        - appID: frontend
      workflows:
        - name: MyWorkflow
          operations: [schedule]
```

要进行跨应用强制执行，必须通过在本地运行 Sentry 来启用 mTLS。有关在自托管模式下配置 mTLS 的详细信息，请参阅[为自托管设置和配置 mTLS 证书]({{% ref "mtls/#self-hosted" %}})。

{{% alert title="在没有 mTLS 的情况下进行本地开发" color="primary" %}}
仅*跨应用*强制执行需要 mTLS，因为调用方身份取自 mTLS 证书中的 SPIFFE ID。同一 sidecar 内的（自）调用不依赖 mTLS，始终被允许，因此你无需运行 Sentry 即可在本地开发和测试单应用 workflow。一旦需要验证跨应用策略的强制执行，请在启用 mTLS 的情况下运行。
{{% /alert %}}

## Kubernetes 设置

在 Kubernetes 中，使用 `kubectl` 应用 `WorkflowAccessPolicy` CRD：

```bash
kubectl apply -f workflow-access-policy.yaml
```

Dapr Operator 监视 `WorkflowAccessPolicy` 资源，并根据 `scopes` 字段将其分发到相应的 sidecar。在 Kubernetes 模式下，mTLS 默认启用。

## 热重载支持

workflow access policy 在 Kubernetes 和自托管模式下均支持热重载。创建、更新或删除策略无需重启 Dapr sidecar 即可生效。

## 相关链接

- [安全概念]({{% ref security-concept.md %}})
- [multi-application workflow]({{% ref workflow-multi-app.md %}})
- [workflow history propagation]({{% ref workflow-history-propagation.md %}})
- [workflow history signing]({{% ref workflow-history-signing.md %}})
- [workflow 概述]({{% ref workflow-overview.md %}})
- [service invocation 访问控制]({{% ref invoke-allowlist.md %}})
- [设置与配置 mTLS 证书]({{% ref mtls %}})
- [WorkflowAccessPolicy CRD 参考]({{% ref workflow-access-policy-schema.md %}})
