---
type: docs
title: "RethinkDB"
linkTitle: "RethinkDB"
description: RethinkDB 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-rethinkdb/"
---

## 组件格式

要设置 RethinkDB 状态存储，请创建一个类型为 `state.rethinkdb` 的组件。请参阅[如何操作指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})来创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.rethinkdb
  version: v1
  metadata:
  - name: address
    value: <REPLACE-RETHINKDB-ADDRESS> # 必填，例如 127.0.0.1:28015 或 rethinkdb.default.svc.cluster.local:28015。
  - name: database
    value: <REPLACE-RETHINKDB-DB-NAME> # 必填，例如 dapr（仅限字母数字）
  - name: table
    value: # 可选
  - name: username
    value: <USERNAME> # 可选
  - name: password
    value: <PASSWORD> # 可选
  - name: archive
    value: bool # 可选（存储是否应保留所有状态更改的归档表）
```

{{% alert title="Warning" color="warning" %}}
上述示例使用纯文本字符串作为密钥。建议使用密钥存储来管理密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

如果将可选的 `archive` 元数据设置为 `true`，则在每次状态更改时，RethinkDB 状态存储还会在 `daprstate_archive` 表中记录带有时间戳的状态更改。这允许对由 Dapr 管理的状态进行时间序列分析。

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| address            | Y        | RethinkDB 服务器的地址 | `"127.0.0.1:28015"`, `"rethinkdb.default.svc.cluster.local:28015"`
| database           | Y        | 要使用的数据库。仅限字母数字 | `"dapr"`
| table              | N        | 要使用的表名称 | `"table"`
| username           | N        | 用于连接的用户名 | `"user"`
| password           | N        | 用于连接的密码 | `"password"`
| archive            | N        | 是否归档表 | `"true"`, `"false"`

## 设置 RethinkDB

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
您可以使用 Docker 在本地运行 [RethinkDB](https://rethinkdb.com/)：

```
docker run --name rethinkdb -v "$PWD:/rethinkdb-data" -d rethinkdb:latest
```

要连接到管理 UI：

```shell
open "http://$(docker inspect --format '{{ .NetworkSettings.IPAddress }}' rethinkdb):8080"
```
{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读如何操作指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明。
- [状态管理构建块]({{% ref state-management %}})
