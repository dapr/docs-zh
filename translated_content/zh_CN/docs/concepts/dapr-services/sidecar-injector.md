---
type: docs
title: "Dapr Sidecar Injector control plane 服务概述"
linkTitle: "Sidecar 注入器"
description: "Dapr sidecar 注入器进程概述"
---

在 [Kubernetes 模式]({{% ref kubernetes %}}) 下运行 Dapr 时，会创建一个运行 Dapr Sidecar Injector 服务的 Pod。该服务会查找使用 [Dapr 注解]({{% ref arguments-annotations-overview %}}) 初始化的 Pod，然后在该 Pod 中为 [daprd 服务]({{% ref sidecar %}}) 创建另一个容器。

## 运行 sidecar 注入器

sidecar 注入器服务作为 `dapr init -k` 的一部分部署，或通过 Dapr Helm 图表部署。有关在 Kubernetes 上运行 Dapr 的更多信息，请访问 [Kubernetes 托管页面]({{% ref kubernetes %}})。

## 授权的 service account

sidecar 注入器的准入 webhook 只处理来自已授权 Kubernetes service account 的请求。这决定了哪些控制器和 service account 在创建或更新 Pod 时可以触发 sidecar 注入。

默认情况下，注入器会授权一组知名的 Kubernetes 控制器（例如 `replicaset-controller`、`deployment-controller`、`statefulset-controller` 等），以及 `system:masters` 组中的用户。你可以通过配置 Helm 值 `dapr_sidecar_injector.allowedServiceAccounts` 来授权额外的 service account。

如果 Pod 创建请求来自未授权的 service account，注入器会静默跳过该 Pod 的 sidecar 注入。

### 配置

service account 以 `namespace:name` 格式指定。多个条目可以用逗号分隔。支持使用 Go 的 [`path.Match`](https://pkg.go.dev/path#Match) 语法编写 glob 模式：

| 模式 | 说明 | 示例 |
|---------|-------------|---------|
| `*` | 匹配任意长度的字符序列 | `my-ns:*` 匹配 namespace `my-ns` 中的所有 service account |
| `?` | 匹配任意单个字符 | `staging-?:*` 匹配 `staging-1`、`staging-a` 等 |
| `[...]` | 匹配一个字符类 | `proj-*:sa-[abc]*` 匹配以 `sa-a`、`sa-b` 或 `sa-c` 开头的 service account |

### 示例

通过 [Helm](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md#dapr-sidecar-injector-options) 进行配置：

```bash
helm install dapr dapr/dapr --namespace dapr-system \
  --set dapr_sidecar_injector.allowedServiceAccounts="my-namespace:my-service-account,team-*:deploy-*"
```

或者在 Helm values 文件中配置：

```yaml
dapr_sidecar_injector:
  allowedServiceAccounts: "my-namespace:my-service-account,team-*:deploy-*"
```

模式示例：

| 模式 | 匹配范围 |
|---------|---------|
| `my-ns:my-sa` | 精确匹配：namespace `my-ns` 中的 service account `my-sa` |
| `my-ns:*` | namespace `my-ns` 中的所有 service account |
| `team-*:deploy-*` | 名称以 `team-` 开头的 namespace 中，名称以 `deploy-` 开头的 service account |
| `*:*` | 所有 namespace 中的所有 service account |

{{% alert title="注意" color="primary" %}}
`dapr_sidecar_injector.allowedServiceAccountsPrefixNames` Helm 值自 v1.18 起已弃用。请改用 `dapr_sidecar_injector.allowedServiceAccounts` 并使用 glob 模式迁移你的条目（例如，`my-ns:my-prefix*` 可替代之前的前缀匹配行为）。已弃用的值仍然可用，但会记录一条弃用警告。
{{% /alert %}}
