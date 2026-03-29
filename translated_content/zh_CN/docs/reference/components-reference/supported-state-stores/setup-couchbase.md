---
type: docs
title: "Couchbase"
linkTitle: "Couchbase"
description: Couchbase 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-couchbase/"
---

## 组件格式

要设置 Couchbase 状态存储，需创建一个类型为 `state.couchbase` 的组件。请参阅[本指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.couchbase
  version: v1
  metadata:
  - name: couchbaseURL
    value: <REPLACE-WITH-URL> # 必填。示例："http://localhost:8091"
  - name: username
    value: <REPLACE-WITH-USERNAME> # 必填。
  - name: password
    value: <REPLACE-WITH-PASSWORD> # 必填。
  - name: bucketName
    value: <REPLACE-WITH-BUCKET> # 必填。
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯文本字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规格元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| couchbaseURL       | Y        | Couchbase 服务器的 URL | `"http://localhost:8091"`
| username           | Y        | 数据库用户名           | `"user"`
| password           | Y        | 访问密码               | `"password"`
| bucketName         | Y        | 写入的 bucket 名称      |  `"bucket"`

## 设置 Couchbase

{{< tabpane text=true >}}

{{% tab "自托管" %}}
您可以使用 Docker 在本地运行 Couchbase：

```
docker run -d --name db -p 8091-8094:8091-8094 -p 11210:11210 couchbase
```

然后您可以使用 `localhost:8091` 与服务器交互并开始服务器设置。
{{% /tab %}}

{{% tab "Kubernetes" %}}
在 Kubernetes 上安装 Couchbase 的最简单方法是使用 [Helm chart](https://github.com/couchbase-partners/helm-charts#deploying-for-development-quick-start)：

```
helm repo add couchbase https://couchbase-partners.github.io/helm-charts/
helm install couchbase/couchbase-operator
helm install couchbase/couchbase-cluster
```
{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
