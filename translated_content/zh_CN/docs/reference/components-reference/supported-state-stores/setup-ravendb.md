---
type: docs
title: "RavenDB"
linkTitle: "RavenDB"
description: RavenDB 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-ravendb/"
---

## 组件格式

要设置 RavenDB 状态存储，需创建类型为 `state.ravendb` 的组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.ravendb
  version: v1
  metadata:
  - name: serverURL
    value: <REPLACE-WITH-SERVER-URL> # 必填。示例："http://localhost:8080"
  - name: databaseName
    value: <REPLACE-WITH-DATABASE-NAME> # 可选。默认值："daprStore"
  - name: certPath
    value: <REPLACE-WITH-CERT-PATH> # 除非服务器不安全，否则必填。
  - name: keyPath
    value: <REPLACE-WITH-KEY-PATH> # 除非服务器不安全，否则必填。
  - name: EnableTTL
    value: <REPLACE-WITH-ENABLE-TTL> # 可选。默认值："true"
  - name: TTLFrequency
    value: <REPLACE-WITH-TTL-FREQUENCY> # 可选。示例："15"。默认值："60"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处描述]({{% ref component-secrets.md %}})使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| serverURL          | Y        | RavenDB 实例的 URL | `"http://localhost:8080"` |
| databaseName       | N        | 要使用的数据库名称。默认为 `"daprStore"` | `"daprStore"` |
| certPath           | N<sup>1</sup> | 证书文件路径 | `"/path/to/client.certificate.crt"` |
| keyPath            | N<sup>1</sup> | 密钥文件路径 | `"/path/to/certificate.key"` |
| EnableTTL          | N        | 启用 TTL 功能的布尔值。默认为 `"true"` | `"true"` |
| TTLFrequency       | N        | TTL 清理频率（秒）。默认为 `"60"` | `"60"` |

> <sup>[1]</sup> 如果服务器 URL 为 `http`，则 `certPath` 和 `keyPath` 字段不是必填的。但是，如果服务器 URL 为 `https` 且未提供 `certPath` 和 `keyPath`，则 Dapr 会返回错误。

### TTL 与清理

此状态存储支持使用 Dapr 存储记录的[生存时间（Time-To-Live，TTL）]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，可以设置 `ttlInSeconds` 元数据属性来指示数据何时应被视为"过期"。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[此指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
