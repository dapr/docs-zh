---
type: docs
title: "Alibaba Cloud TableStore"
linkTitle: "Alibaba Cloud TableStore"
description: "关于用于 Dapr 的 Alibaba Cloud TableStore 状态存储组件的详细信息"
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-alicloud-tablestore/"
---

## 组件格式

要设置 Alibaba Cloud TableStore 状态存储，请创建类型为 `state.alicloud.tablestore` 的组件。
请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.alicloud.tablestore
  version: v1
  metadata:
  - name: endpoint
    value: <REPLACE-WITH-ENDPOINT>
  - name: instanceName
    value: <REPLACE-WITH-INSTANCE-NAME>
  - name: tableName
    value: <REPLACE-WITH-TABLE-NAME>
  - name: accessKeyID
    value: <REPLACE-WITH-ACCESS-KEY-ID>
  - name: accessKey
    value: <REPLACE-WITH-ACCESS-KEY>
````

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。
建议按照[此处]({{% ref component-secrets.md %}})的描述使用 secret store 来管理密钥。
{{% /alert %}}

## 规格元数据字段

| 字段           | 必填   | 详情                                                                             | 示例                               |
| ------------- | :----: | ------------------------------------------------------------------------------- | --------------------------------- |
| `endpoint`    |   Y    | Alibaba Cloud TableStore 实例的端点                                                   | `"https://tablestore.aliyuncs.com"` |
| `instanceName` |   Y    | Alibaba Cloud TableStore 实例的名称                                                   | `"my_instance"`                   |
| `tableName`   |   Y    | 用于 Dapr 状态的表的名称。如果不存在，将会创建它                                           | `"my_table"`                      |
| `accessKeyID` |   Y    | 用于身份验证的访问密钥 ID                                                              | `"my_access_key_id"`              |
| `accessKey`   |   Y    | 用于身份验证的访问密钥                                                                 | `"my_access_key"`                 |

---

## 身份验证

Alibaba Cloud TableStore 支持使用 **Access Key** 和 **Access Key ID** 进行身份验证。

你也可以使用 Dapr 的 [secret store]({{% ref component-secrets.md %}}) 来安全地存储这些值，而不是直接将它们包含在 YAML 文件中。

使用密钥引用的示例：

```yaml
- name: accessKeyID
  secretKeyRef:
    name: alicloud-secrets
    key: accessKeyID
- name: accessKey
  secretKeyRef:
    name: alicloud-secrets
    key: accessKey
```

---


## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读此[指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
