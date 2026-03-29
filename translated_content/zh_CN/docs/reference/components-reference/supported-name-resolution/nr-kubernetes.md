---
type: docs
title: "Kubernetes DNS"
linkTitle: "Kubernetes DNS"
description: Kubernetes DNS 名称解析组件的详细信息
---

## 配置格式

通常，Dapr 会在 [Kubernetes 模式]({{% ref kubernetes %}}) 下自动配置 Kubernetes DNS 名称解析。除非需要对 Kubernetes 名称解析组件进行某些覆盖，否则无需额外配置即可将 Kubernetes DNS 用作名称解析提供程序。

如果需要覆盖，可以在 [Dapr 配置]({{% ref configuration-overview.md %}}) CRD 中添加 `nameResolution` 规范，并将 `component` 字段设置为 `"kubernetes"`。其他配置字段可以在 `configuration` 映射中按需设置，如下所示。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "kubernetes"
    configuration:
      clusterDomain: "cluster.local"  # 与 template 字段互斥
      template: "{{.ID}}-{{.Data.region}}.internal:{{.Port}}" # 与 clusterDomain 字段互斥
```

## 行为

该组件使用 Kubernetes 集群的 DNS 提供程序来解析目标应用程序。你可以在 [Kubernetes 文档](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) 中了解更多信息。

## 规范配置字段

配置规范固定为 Consul API 的 v1.3.0 版本

| 字段        | 必填 | 类型 | 详情  | 示例 |
|--------------|:--------:|-----:|:---------|----------|
| clusterDomain       | N        | `string` | 用于解析地址的集群域。此字段与 `template` 字段互斥。| `cluster.local`
| template | N        | `string` | 使用 [text/template](https://pkg.go.dev/text/template#Template) 解析地址时要解析的模板字符串。该模板将由 [ResolveRequest](https://github.com/dapr/components-contrib/blob/release-{{% dapr-latest-version short="true" %}}/nameresolution/requests.go#L20) 结构体中的字段填充。此字段与 `clusterDomain` 字段互斥。 | `{{.ID}}-{{.Data.region}}.{{.Namespace}}.internal:{{.Port}}`


## 相关链接

- [服务调用构建块]({{% ref service-invocation %}})
- [Kubernetes DNS 文档](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
