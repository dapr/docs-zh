---
type: docs
title: "MongoDB"
linkTitle: "MongoDB"
description: MongoDB 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-mongodb/"
---

## 组件格式

要设置 MongoDB 状态存储，请创建类型为 `state.mongodb` 的组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})以了解如何创建和应用状态存储配置。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.mongodb
  version: v1
  metadata:
  - name: server
    value: <REPLACE-WITH-SERVER> # 除非设置了 "host" 字段，否则必填。示例："server.example.com"
  - name: host
    value: <REPLACE-WITH-HOST> # 除非设置了 "server" 字段，否则必填。示例："mongo-mongodb.default.svc.cluster.local:27017"
  - name: username
    value: <REPLACE-WITH-USERNAME> # 可选。示例："admin"
  - name: password
    value: <REPLACE-WITH-PASSWORD> # 可选。
  - name: databaseName
    value: <REPLACE-WITH-DATABASE-NAME> # 可选。默认值："daprStore"
  - name: collectionName
    value: <REPLACE-WITH-COLLECTION-NAME> # 可选。默认值："daprCollection"
  - name: writeConcern
    value: <REPLACE-WITH-WRITE-CONCERN> # 可选。
  - name: readConcern
    value: <REPLACE-WITH-READ-CONCERN> # 可选。
  - name: operationTimeout
    value: <REPLACE-WITH-OPERATION-TIMEOUT> # 可选。默认值："5s"
  - name: params
    value: <REPLACE-WITH-ADDITIONAL-PARAMETERS> # 可选。示例："?authSource=daprStore&ssl=true"
  # 如果希望将 MongoDB 作为 actor 的状态存储，请取消注释（可选）
  #- name: actorStateStore
  #  value: "true"

```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯文本字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储。
{{% /alert %}}

### Actor 状态存储和事务支持

当用作 actor 状态存储或利用事务时，MongoDB 必须在[副本集](https://www.mongodb.com/docs/manual/replication/)中运行。

如果希望将 MongoDB 用作 actor 存储，请在组件 YAML 中添加此元数据选项：

```yaml
  - name: actorStateStore
    value: "true"
```

## 规格元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| server             | Y<sup>1</sup> | 使用 DNS SRV 记录时要连接的服务器 | `"server.example.com"`
| host               | Y<sup>1</sup> | 要连接的主机 | `"mongo-mongodb.default.svc.cluster.local:27017"`
| username           | N        | 连接用户的用户名（与 `host` 结合使用时适用） | `"admin"`
| password           | N        | 用户的密码（与 `host` 结合使用时适用） | `"password"`
| databaseName       | N        | 要使用的数据库的名称。默认为 `"daprStore"` | `"daprStore"`
| collectionName     | N        | 要使用的集合的名称。默认为 `"daprCollection"` | `"daprCollection"`
| writeConcern       | N        | 要使用的写入关注点 | `"majority"`
| readConcern        | N        | 要使用的读取关注点  | `"majority"`, `"local"`,`"available"`, `"linearizable"`, `"snapshot"`
| operationTimeout   | N        | 操作的超时时间。默认为 `"5s"` | `"5s"`
| params             | N<sup>2</sup> | 要使用的附加参数 | `"?authSource=daprStore&ssl=true"`
| actorStateStore    | N        | 将此状态存储用于 actor。默认为 `"false"` | `"true"`, `"false"`

> <sup>[1]</sup> `server` 和 `host` 字段互斥。如果两者都未设置或同时设置，Dapr 将返回错误。

> <sup>[2]</sup> `params` 字段接受一个查询字符串，将连接特定选项指定为 `<name>=<value>` 对，用 `&` 分隔并以 `?` 为前缀。例如，要使用 "daprStore" 数据库作为身份验证数据库并在连接中启用 SSL/TLS，请将 params 指定为 `?authSource=daprStore&ssl=true`。有关可用选项及其用例的列表，请参阅 [mongodb 手册](https://docs.mongodb.com/manual/reference/connection-string/#std-label-connections-connection-options)。

## 设置 MongoDB

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
您可以使用 Docker 在本地运行单个 MongoDB 实例：

```sh
docker run --name some-mongo -d -p 27017:27017 mongo
```

然后可以通过 `localhost:27017` 与服务器交互。如果您在组件定义中没有指定 `databaseName` 值，请确保创建一个名为 `daprStore` 的数据库。

为了将 MongoDB 状态存储用于事务和 actor 状态存储，您需要以副本集的方式运行 MongoDB。有关使用 Docker 创建三节点副本集的方法，请参阅[官方文档](https://www.mongodb.com/compatibility/deploying-a-mongodb-cluster-with-docker)。
{{% /tab %}}

{{% tab "Kubernetes" %}}
您可以使用 Bitnami 打包的 [Helm chart](https://github.com/bitnami/charts/tree/main/bitnami/mongodb/) 在 Kubernetes 上方便地安装 MongoDB。请参阅 Helm chart 的文档以部署 MongoDB，包括作为独立服务器和使用副本集（使用事务和 actor 所必需）。
这会将 MongoDB 安装到 `default` 命名空间。
要与服务进行交互，可以使用以下命令：`kubectl get svc mongo-mongodb`。
例如，如果使用上面的 Helm 默认设置进行安装，MongoDB 主机地址将是：
`mongo-mongodb.default.svc.cluster.local:27017`
按照屏幕上的说明获取 MongoDB 的 root 密码。
默认情况下，用户名通常为 `admin`。
{{% /tab %}}

{{< /tabpane >}}

### TTLs 和清理

此状态存储支持为 Dapr 存储的记录设置[生存时间（TTL）]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，您可以设置 `ttlInSeconds` 元数据属性来指示数据应被视为"过期"的时间。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[此指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
