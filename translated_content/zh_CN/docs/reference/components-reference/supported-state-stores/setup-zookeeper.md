---
type: docs
title: "Zookeeper"
linkTitle: "Zookeeper"
description: Zookeeper 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-zookeeper/"
---

## 组件格式

要设置 Zookeeper 状态存储，请创建一个类型为 `state.zookeeper` 的组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.zookeeper
  version: v1
  metadata:
  - name: servers
    value: <REPLACE-WITH-COMMA-DELIMITED-SERVERS> # 必填。示例："zookeeper.default.svc.cluster.local:2181"
  - name: sessionTimeout
    value: <REPLACE-WITH-SESSION-TIMEOUT> # 必填。示例："5s"
  - name: maxBufferSize
    value: <REPLACE-WITH-MAX-BUFFER-SIZE> # 可选。默认值："1048576"
  - name: maxConnBufferSize
    value: <REPLACE-WITH-MAX-CONN-BUFFER-SIZE> # 可选。默认值："1048576"
  - name: keyPrefixPath
    value: <REPLACE-WITH-KEY-PREFIX-PATH> # 可选。
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| servers            | Y        | 服务器列表，以逗号分隔 | `"zookeeper.default.svc.cluster.local:2181"`
| sessionTimeout     | Y        | 会话超时值       | `"5s"`
| maxBufferSize      | N        | 缓冲区的最大大小。默认为 `"1048576"` | `"1048576"`
| maxConnBufferSize  | N        | 连接缓冲区的最大大小。默认为 `"1048576`" | `"1048576"`
| keyPrefixPath      | N        | Zookeeper 中的键前缀路径。无默认值 | `"dapr"`

## 设置 Zookeeper

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
您可以使用 Docker 在本地运行 Zookeeper：

```
docker run --name some-zookeeper --restart always -d zookeeper
```

然后您可以使用 `localhost:2181` 与服务器交互。
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 Zookeeper 最简单的方法是使用 [Helm chart](https://github.com/helm/charts/tree/master/incubator/zookeeper)：

```
helm repo add incubator http://storage.googleapis.com/kubernetes-charts-incubator
helm install zookeeper incubator/zookeeper
```

这会将 Zookeeper 安装到 `default` 命名空间中。
要与 Zookeeper 交互，请使用以下命令查找服务：`kubectl get svc zookeeper`。

例如，如果使用上述示例安装，Zookeeper 主机地址将是：

`zookeeper.default.svc.cluster.local:2181`
{{% /tab %}}

{{< /tabpane >}}


## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读此指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
