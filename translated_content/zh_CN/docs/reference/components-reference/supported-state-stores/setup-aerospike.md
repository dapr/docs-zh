---
type: docs
title: "Aerospike"
linkTitle: "Aerospike"
description: Aerospike 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-aerospike/"
---

## 组件格式

要设置 Aerospike 状态存储，请创建一个类型为 `state.Aerospike` 的组件。有关如何创建和应用状态存储配置，请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.Aerospike
  version: v1
  metadata:
  - name: hosts
    value: <REPLACE-WITH-HOSTS> # 必填。以逗号分隔的主机字符串。示例："aerospike:3000,aerospike2:3000"
  - name: namespace
    value: <REPLACE-WITH-NAMESPACE> # 必填。Aerospike 命名空间。
  - name: set
    value: <REPLACE-WITH-SET> # 可选
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的说明使用密钥存储来管理密钥。
{{% /alert %}}

## 规格元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| hosts              | Y        | 数据库服务器的主机名/端口  | `"localhost:3000"`, `"aerospike:3000,aerospike2:3000"`
| namespace          | Y        | Aerospike 命名空间 | `"namespace"`
| set                | N        | 数据库中的 setName  | `"myset"`

## 设置 Aerospike

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
您可以使用 Docker 在本地运行 Aerospike：

```
docker run -d --name aerospike -p 3000:3000 -p 3001:3001 -p 3002:3002 -p 3003:3003 aerospike
```

然后可以使用 `localhost:3000` 与服务器交互。
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 Aerospike 最简单的方法是使用 [Helm chart](https://github.com/helm/charts/tree/master/stable/aerospike)：

```
helm repo add incubator http://storage.googleapis.com/kubernetes-charts-incubator
helm install --name my-aerospike --namespace aerospike stable/aerospike
```

这会将 Aerospike 安装到 `aerospike` 命名空间中。
要与 Aerospike 交互，使用以下命令查找服务：`kubectl get svc aerospike -n aerospike`。

例如，如果使用上述示例安装，Aerospike 主机地址将是：

`aerospike-my-aerospike.aerospike.svc.cluster.local:3000`
{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读有关配置状态存储组件的说明，请参阅[此指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})
- [状态管理构建块]({{% ref state-management %}})
