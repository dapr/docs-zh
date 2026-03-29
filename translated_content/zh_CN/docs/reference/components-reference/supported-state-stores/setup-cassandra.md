---
type: docs
title: "Cassandra"
linkTitle: "Cassandra"
description: Cassandra 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-cassandra/"
---

## 组件格式

要设置 Cassandra 状态存储，请创建类型为 `state.cassandra` 的组件。请参阅[本指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.cassandra
  version: v1
  metadata:
  - name: hosts
    value: <REPLACE-WITH-COMMA-DELIMITED-HOSTS> # 必填。示例：cassandra.cassandra.svc.cluster.local
  - name: username
    value: <REPLACE-WITH-PASSWORD> # 可选。默认值：""
  - name: password
    value: <REPLACE-WITH-PASSWORD> # 可选。默认值：""
  - name: consistency
    value: <REPLACE-WITH-CONSISTENCY> # 可选。默认值："All"
  - name: table
    value: <REPLACE-WITH-TABLE> # 可选。默认值："items"
  - name: keyspace
    value: <REPLACE-WITH-KEYSPACE> # 可选。默认值："dapr"
  - name: protoVersion
    value: <REPLACE-WITH-PROTO-VERSION> # 可选。默认值："4"
  - name: replicationFactor
    value: <REPLACE-WITH-REPLICATION-FACTOR> #  可选。默认值："1"
```

{{% alert title="警告" color="warning" %}}
上述示例使用明文字符串作为密钥。建议使用密钥存储来管理密钥，具体说明请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| hosts             | Y        | 主机的逗号分隔值 | `"cassandra.cassandra.svc.cluster.local"`。
| port              | N        |  通信端口。默认值为 `"9042"` | `"9042"`
| username          | Y        | 数据库用户的用户名。无默认值 | `"user"`
| password          | Y        | 用户的密码  | `"password"`
| consistency       | N        | 一致性值 | `"All"`、`"Quorum"`
| table             | N        | 表名。默认值为 `"items"` | `"items"`、`"tab"`
| keyspace          | N        | 要使用的 Cassandra 键空间。默认值为 `"dapr"` | `"dapr"`
| protoVersion      | N        | 客户端的协议版本。默认值为 `"4"` | `"3"`、`"4"`
| replicationFactor | N        | 调用的复制因子。默认值为 `"1"` | `"3"`

## 设置 Cassandra

{{< tabpane text=true >}}

{{% tab "自托管" %}}
您可以使用 Datastax Docker 镜像在本地运行 Cassandra：

```
docker run -e DS_LICENSE=accept --memory 4g --name my-dse -d datastax/dse-server -g -s -k
```

然后您可以使用 `localhost:9042` 与服务器交互。
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 Cassandra 最简单的方法是使用 [Helm chart](https://github.com/helm/charts/tree/master/incubator/cassandra)：

```
kubectl create namespace cassandra
helm install cassandra incubator/cassandra --namespace cassandra
```

这将默认把 Cassandra 安装到 `cassandra` 命名空间中。
要与 Cassandra 交互，请使用以下命令查找服务：`kubectl get svc -n cassandra`。

例如，如果使用上述示例安装，Cassandra DNS 将是：

`cassandra.cassandra.svc.cluster.local`
{{% /tab %}}

{{< /tabpane >}}

## Apache Ignite

[Apache Ignite](https://ignite.apache.org/) 与作为缓存层的 Cassandra 集成不被此组件支持。

## Apache Ignite

[Apache Ignite](https://ignite.apache.org/) 与作为缓存层的 Cassandra 集成不被此组件支持。

## Apache Ignite

[Apache Ignite](https://ignite.apache.org/) 与作为缓存层的 Cassandra 集成不被此组件支持。

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
