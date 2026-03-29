---
type: docs
title: "HashiCorp Consul"
linkTitle: "HashiCorp Consul"
description: HashiCorp Consul 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-consul/"
---

## 组件格式

要设置 Hashicorp Consul 状态存储，请创建类型为 `state.consul` 的组件。请参阅[本指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.consul
  version: v1
  metadata:
  - name: datacenter
    value: <REPLACE-WITH-DATA-CENTER> # 必需。例如：dc1
  - name: httpAddr
    value: <REPLACE-WITH-CONSUL-HTTP-ADDRESS> # 必需。例如："consul.default.svc.cluster.local:8500"
  - name: aclToken
    value: <REPLACE-WITH-ACL-TOKEN> # 可选。默认：""
  - name: scheme
    value: <REPLACE-WITH-SCHEME> # 可选。默认："http"
  - name: keyPrefixPath
    value: <REPLACE-WITH-TABLE> # 可选。默认：""
```

{{% alert title="Warning" color="warning" %}}
以上示例将密钥以纯文本字符串形式使用。建议使用密钥存储来管理密钥，具体方法见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必需 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| datacenter         | Y        | 要使用的数据中心                     | `"dc1"`
| httpAddr           | Y        | Consul 服务器的地址          | `"consul.default.svc.cluster.local:8500"`
| aclToken           | N        | 每次请求的 ACL Token。默认为 `""` | `"token"`
| scheme             | N        | Consul 服务器的 URI scheme。默认为 `"http"` | `"http"`
| keyPrefixPath      | N        | Consul 中的键前缀路径。默认为 `""` | `"dapr"`

## 设置 HashiCorp Consul

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
你可以使用 Docker 在本地运行 Consul：

```
docker run -d --name=dev-consul -e CONSUL_BIND_INTERFACE=eth0 consul
```

然后可以使用 `localhost:8500` 与服务器交互。
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 Consul 最简单的方法是使用 [Helm chart](https://github.com/helm/charts/tree/master/stable/consul)：

```
helm install consul stable/consul
```

这会将 Consul 安装到 `default` 命名空间中。
要与 Consul 交互，请使用以下命令查找服务：`kubectl get svc consul`。

例如，如果使用上述示例安装，Consul 主机地址将是：

`consul.default.svc.cluster.local:8500`
{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读本指南了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
