---
type: docs
title: "Alibaba Cloud Tablestore binding 规范"
linkTitle: "Alibaba Cloud Tablestore"
description: "Alibaba Tablestore binding 组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/alicloudtablestore/"
---

## 组件格式

要设置 Alibaba Cloud Tablestore binding，请创建类型为 `bindings.alicloud.tablestore` 的组件。有关如何创建和应用 secretstore 配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。有关如何使用 Dapr 组件检索和使用密钥，请参阅[引用密钥]({{% ref component-secrets.md %}})指南。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mytablestore
spec:
  type: bindings.alicloud.tablestore
  version: v1
  metadata:
  - name: endpoint
    value: "[endpoint]"
  - name: accessKeyID
    value: "[key-id]"
  - name: accessKey
    value: "[access-key]"
  - name: instanceName
    value: "[instance]"
  - name: tableName
    value: "[table]"
  - name: endpoint
    value: "[endpoint]"
```

{{% alert title="Warning" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段         | 必填 | Binding 支持  | 详情 | 示例 |
|---------------|----------|---------|---------|---------|
| `endpoint`    | Y | Output | Alicloud Tablestore 端点。 | https://tablestore-cn-hangzhou.aliyuncs.com
| `accessKeyID` | Y | Output | Access key ID 凭证。 |
| `accessKey`   | Y | Output | Access key 凭证。 |
| `instanceName`      | Y | Output | 实例名称。 |
| `tableName`      | Y | Output | 表名称。 |

## Binding 支持

此组件支持**输出 binding**，具有以下操作：

- `create`：[创建对象](#create-object)

### 创建对象

要执行创建对象操作，请使用 `POST` 方法调用 binding，并传入以下 JSON 正文：

```json
{
  "operation": "create",
  "data": "YOUR_CONTENT",
  "metadata": {
    "primaryKeys": "pk1"
  }
} 
```

{{% alert title="Note" color="primary" %}}
注意 `metadata.primaryKeys` 字段是必填项。
{{% /alert %}}

### 删除对象

要执行删除对象操作，请使用 `POST` 方法调用 binding，并传入以下 JSON 正文：

```json
{
  "operation": "delete",
  "metadata": {
   "primaryKeys": "pk1",
   "columnToGet": "name,age,date"
  },
  "data": {
    "pk1": "data1"
  }
} 
```

{{% alert title="Note" color="primary" %}}
注意 `metadata.primaryKeys` 字段是必填项。
{{% /alert %}}

### 列出对象

要执行列出对象操作，请使用 `POST` 方法调用 binding，并传入以下 JSON 正文：

```json
{
  "operation": "delete",
  "metadata": {
    "primaryKeys": "pk1",
    "columnToGet": "name,age,date"
  },
  "data": {
    "pk1": "data1",
    "pk2": "data2"
  }
} 
```

{{% alert title="Note" color="primary" %}}
注意 `metadata.primaryKeys` 字段是必填项。
{{% /alert %}}

### 获取对象

要执行获取对象操作，请使用 `POST` 方法调用 binding，并传入以下 JSON 正文：

```json
{
  "operation": "delete",
  "metadata": {
    "primaryKeys": "pk1"
  },
  "data": {
    "pk1": "data1"
  }
} 
```

{{% alert title="Note" color="primary" %}}
注意 `metadata.primaryKeys` 字段是必填项。
{{% /alert %}}

## 相关链接

- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
