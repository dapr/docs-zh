---
type: docs
title: "Azure Table Storage "
linkTitle: "Azure Table Storage "
description: 关于 Azure Table Storage 状态存储组件的详细信息，该组件可用于连接到 Cosmos DB Table API 和 Azure Tables
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-azure-tablestorage/"
---

## 组件格式

要设置 Azure Tablestorage 状态存储，请创建一个类型为 `state.azure.tablestorage` 的组件。请参阅[本指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.azure.tablestorage
  version: v1
  metadata:
  - name: accountName
    value: <REPLACE-WITH-ACCOUNT-NAME>
  - name: accountKey
    value: <REPLACE-WITH-ACCOUNT-KEY>
  - name: tableName
    value: <REPLACE-WITH-TABLE-NAME>
# - name: cosmosDbMode
#   value: false
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体说明请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `accountName`        | Y        | 存储账户名称 | `"mystorageaccount"`。
| `accountKey`         | Y        | 主密钥或辅助存储密钥 | `"key"`
| `tableName`          | Y        | 用于 Dapr 状态的表的名称。如果表不存在，将自动为你创建 | `"table"`
| `cosmosDbMode`       | N        | 如果启用，则连接到 Cosmos DB Table API 而非 Azure Tables（存储账户）。默认为 `false`。 | `"false"`
| `serviceURL`         | N        | 完整的存储服务终结点 URL。适用于公有云之外的 Azure 环境。 | `"https://mystorageaccount.table.core.windows.net/"`
| `skipCreateTable`    | N        | 跳过对指定存储表的检查（以及在必要时创建该表）。在使用具有最小权限的 Active Directory 身份验证时很有用。默认为 `false`。 | `"true"`

### Microsoft Entra ID 身份验证

Azure Cosmos DB 状态存储组件支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息以及根据所选的 Microsoft Entra ID 身份验证机制需要提供的相关组件元数据字段，请参阅[向 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})。

你可以在[下一节](#setting-up-cosmos-db-for-authenticating-with-azure-ad)中阅读有关使用 Microsoft Entra ID 身份验证设置 Cosmos DB 的其他信息。

## 选项 1：设置 Azure Table Storage

[按照 Azure 文档中的说明](https://docs.microsoft.com/azure/storage/common/storage-account-create?tabpane=azure-portal)创建 Azure 存储账户。

如果你希望为 Dapr 创建一个表，可以提前创建。不过，除非启用了 `skipCreateTable` 选项，否则如果表不存在，Table Storage 状态提供程序会自动为你创建一个。

要设置 Azure Table Storage 作为状态存储，你需要以下属性：
- **AccountName**：存储账户名称。例如：**mystorageaccount**。
- **AccountKey**：主密钥或辅助存储密钥。如果使用 Microsoft Entra ID 身份验证，请跳过此项。
- **TableName**：用于 Dapr 状态的表的名称。如果表不存在，将自动为你创建，除非启用了 `skipCreateTable` 选项。
- **cosmosDbMode**：将此项设置为 `false` 以连接到 Azure Tables。

## 选项 2：设置 Azure Cosmos DB Table API

[按照 Azure 文档中的说明](https://docs.microsoft.com/azure/cosmos-db/table/how-to-use-python?tabpane=azure-portal#1---create-an-azure-cosmos-db-account)创建一个具有 Table API 的 Cosmos DB 账户。

如果你希望为 Dapr 创建一个表，可以提前创建。不过，除非启用了 `skipCreateTable` 选项，否则如果表不存在，Table Storage 状态提供程序会自动为你创建一个。

要设置 Azure Cosmos DB Table API 作为状态存储，你需要以下属性：
- **AccountName**：Cosmos DB 账户名称。例如：**mycosmosaccount**。
- **AccountKey**：Cosmos DB 主密钥。如果使用 Microsoft Entra ID 身份验证，请跳过此项。
- **TableName**：用于 Dapr 状态的表的名称。如果表不存在，将自动为你创建，除非启用了 `skipCreateTable` 选项。
- **cosmosDbMode**：将此项设置为 `true` 以连接到 Azure Tables。


## 分区

Azure Table Storage 状态存储使用在 Dapr API 请求中提供的 `key` 属性来确定 `row key`。服务名称用作 `partition key`。这提供了最佳性能，因为每种服务类型在自己的表分区中存储状态。

此状态存储在表存储中创建一个名为 `Value` 的列，并将原始状态放入其中。

例如，以下来自名为 `myservice` 的服务的操作

```shell
curl -X POST http://localhost:3500/v1.0/state \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "nihilus",
          "value": "darth"
        }
      ]'
```

将在表中创建以下记录：

| PartitionKey | RowKey  | Value |
| ------------ | ------- | ----- |
| myservice    | nihilus | darth |

## 并发

Azure Table Storage 状态并发是通过根据[官方文档]( https://docs.microsoft.com/azure/storage/common/storage-concurrency#managing-concurrency-in-table-storage)使用 `ETag` 来实现的。


## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
