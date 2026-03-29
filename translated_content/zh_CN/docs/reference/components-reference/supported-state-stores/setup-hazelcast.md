---
type: docs
title: "Hazelcast"
linkTitle: "Hazelcast"
description: Hazelcast 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-hazelcast/"
---

## 创建 Dapr 组件

要设置 Hazelcast 状态存储，请创建类型为 `state.hazelcast` 的组件。有关如何创建和应用状态存储配置，请参阅[本指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.hazelcast
  version: v1
  metadata:
  - name: hazelcastServers
    value: <REPLACE-WITH-HOSTS> # Required. A comma delimited string of servers. Example: "hazelcast:3000,hazelcast2:3000"
  - name: hazelcastMap
    value: <REPLACE-WITH-MAP> # Required. Hazelcast map configuration.
```

{{% alert title="Warning" color="warning" %}}
上述示例使用纯文本字符串作为密钥。建议使用密钥存储来管理密钥，具体操作请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规格元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| hazelcastServers   | Y        | 服务器列表，以逗号分隔 | `"hazelcast:3000,hazelcast2:3000"`
| hazelcastMap       | Y        | Hazelcast Map 配置 | `"foo-map"`

## 设置 Hazelcast

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
您可以使用 Docker 在本地运行 Hazelcast：

```
docker run -e JAVA_OPTS="-Dhazelcast.local.publicAddress=127.0.0.1:5701" -p 5701:5701 hazelcast/hazelcast
```

然后可以使用 `127.0.0.1:5701` 与服务器进行交互。
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 Hazelcast 最简单的方法是使用 [Helm chart](https://github.com/helm/charts/tree/master/stable/hazelcast)。
{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
