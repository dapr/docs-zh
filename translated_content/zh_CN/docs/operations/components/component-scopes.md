---
type: docs
title: "操作指南：将组件限定到一个或多个应用程序"
linkTitle: "限定对组件的访问"
weight: 400
description: "限制组件只能被特定的 Dapr 实例访问"
---

Dapr 组件具有命名空间（与 Kubernetes 命名空间概念是独立的），这意味着 Dapr 运行时实例只能访问部署到同一命名空间的组件。

当 Dapr 运行时，它会将其自身配置的命名空间与组件的命名空间进行匹配，并仅加载和初始化与其命名空间匹配的组件。不同命名空间中的所有其他组件都不会被加载。

## 命名空间
命名空间可用于限制组件只能被特定的 Dapr 实例访问。

{{< tabpane text=true >}}

{{% tab "自托管" %}}
在自托管模式下，开发者可以通过设置 `NAMESPACE` 环境变量为 Dapr 实例指定命名空间。
如果设置了 `NAMESPACE` 环境变量，Dapr 将不会加载任何在元数据中未指定相同命名空间的组件。

例如，给定以下位于 `production` 命名空间中的组件
```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
```

要告知 Dapr 其部署到的命名空间，请设置环境变量：

MacOS/Linux：

```bash
export NAMESPACE=production
# 像往常一样运行 Dapr
```
Windows：

```powershell
setx NAMESPACE "production"
# 像往常一样运行 Dapr
```
{{% /tab %}}

{{% tab "Kubernetes" %}}
让我们考虑 Kubernetes 中的以下组件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
```

在此示例中，Redis 组件仅可由运行在 `production` 命名空间内的 Dapr 实例访问。
{{% /tab %}}

{{< /tabpane >}}

{{% alert title="注意" color="primary" %}}
应用于命名空间 "A" 的组件 YAML 可以*引用*命名空间 "B" 中的实现。例如，命名空间 "production-A" 中的 Redis 组件 YAML 可以将 Redis 主机地址指向部署在命名空间 "production-B" 中的 Redis 实例。

有关示例，请参阅[使用多个命名空间配置发布订阅组件]({{% ref "pubsub-namespaces.md" %}})。
{{% /alert %}}

## 使用作用域控制应用程序对组件的访问
开发者和操作员可能希望限制某个应用程序或特定的一组应用程序访问某个数据库。
为了实现这一点，Dapr 允许你在组件 YAML 上指定 `scopes`。添加到组件的应用程序作用域仅允许具有特定 ID 的应用程序使用该组件。

以下示例展示了如何为两个启用了 Dapr 的应用程序授予访问名为 `statestore` 的 Redis 组件的权限，这两个应用程序的 app ID 分别为 `app1` 和 `app2`，而该组件本身位于 `production` 命名空间中

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis-master:6379
scopes:
- app1
- app2
```
### 社区电话演示

{{< youtube id=8W-iBDNvCUM start=1763 >}}

## 在服务调用中使用命名空间
阅读[跨命名空间的服务调用]({{% ref "service-invocation-namespaces.md" %}})以了解更多关于在服务间调用时使用命名空间的信息。

## 在发布订阅中使用命名空间
阅读[使用多个命名空间配置发布订阅组件]({{% ref "pubsub-namespaces.md" %}})以了解更多关于在发布订阅中使用命名空间的信息。

## 相关链接

- [使用多个命名空间配置发布订阅组件]({{% ref "pubsub-namespaces.md" %}})
- [使用密钥作用域]({{% ref "secrets-scopes.md" %}})
- [限制可从密钥存储读取的密钥]({{% ref "secret-scope.md" %}})
