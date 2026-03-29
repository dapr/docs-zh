---
type: docs
title: "Microsoft SQL Server & Azure SQL"
linkTitle: "Microsoft SQL Server & Azure SQL"
description: Microsoft SQL Server 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-sqlserver-v2/"
---

{{% alert title="Note" color="primary" %}}
这是 Sql Server 状态存储组件的 v2 版本，支持 Dapr 工作流。建议新应用使用 v2 版本。

Sql Server v2 状态存储组件与 [v1 组件]({{% ref setup-sqlserver.md %}}) 不兼容，两个组件之间无法迁移数据。

目前没有弃用 v1 组件的计划。
{{% /alert %}}

## 组件格式

此状态存储组件可用于 [Microsoft SQL Server](https://learn.microsoft.com/sql/) 和 [Azure SQL](https://learn.microsoft.com/azure/azure-sql/)。

要设置此状态存储，请创建类型为 `state.sqlserver` 的组件。有关如何创建和应用状态存储配置，请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.sqlserver
  version: v2
  metadata:
    # 使用 SQL Server 凭据进行身份验证
    - name: connectionString
      value: |
        Server=myServerName\myInstanceName;Database=myDataBase;User Id=myUsername;Password=myPassword;

    # 使用 Microsoft Entra ID 进行身份验证（仅限 Azure SQL）
    # "useAzureAD" 必须设置为 "true"
    - name: useAzureAD
      value: true
    # Azure SQL 数据库的连接字符串或 URL，可选包含数据库名称
    - name: connectionString
      value: |
        sqlserver://myServerName.database.windows.net:1433?database=myDataBase

    # 其他可选字段（列出默认值）
    - name: tableName
      value: "state"
    - name: metadataTableName
      value: "dapr_metadata"
    - name: schema
      value: "dbo"
    - name: keyType
      value: "string"
    - name: keyLength
      value: "200"
    - name: indexedProperties
      value: ""
    - name: cleanupIntervalInSeconds
      value: "3600"
   # 如果希望将 Microsoft SQL Server 用作 actor 的状态存储，请取消注释此行（可选）
   #- name: actorStateStore
   #  value: "true"
```

{{% alert title="Warning" color="warning" %}}
上面的示例使用纯文本字符串作为密钥。建议使用密钥存储来管理密钥，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

如果希望将 SQL Server用作 [actor 状态存储]({{% ref "state_api.md#configuring-state-store-for-actors" %}})，请在元数据中添加以下内容：

```yaml
  - name: actorStateStore
    value: "true"
```

## 规范元数据字段

### 使用 SQL Server 凭据进行身份验证

使用 SQL Server 凭据进行身份验证时，以下元数据选项是**必需**的。SQL Server 和 Azure SQL 都支持此方式。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `connectionString` | Y | 用于连接的连接字符串。<br>如果连接字符串包含数据库，则该数据库必须已存在。否则，如果省略数据库，将创建名为 "Dapr" 的默认数据库。  | `"Server=myServerName\myInstanceName;Database=myDataBase;User Id=myUsername;Password=myPassword;"` |

### 使用 Microsoft Entra ID 进行身份验证

仅 Azure SQL 支持使用 Microsoft Entra ID 进行身份验证。可以使用 Dapr 支持的所有身份验证方法，包括客户端凭据（"服务主体"）和托管标识。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `useAzureAD` | Y | 必须设置为 `true` 以使组件能够从 Microsoft Entra ID 获取访问令牌。 | `"true"` |
| `connectionString` | Y | Azure SQL 数据库的连接字符串或 URL，**不包含凭据**。<br>如果连接字符串包含数据库，则该数据库必须已存在。否则，如果省略数据库，将创建名为 "Dapr" 的默认数据库。  | `"sqlserver://myServerName.database.windows.net:1433?database=myDataBase"` |
| `azureTenantId` | N | Microsoft Entra ID 租户的 ID | `"cd4b2887-304c-47e1-b4d5-65447fdd542b"` |
| `azureClientId` | N | 客户端 ID（应用程序 ID） | `"c7dd251f-811f-4ba2-a905-acd4d3f8f08b"` |
| `azureClientSecret` | N | 客户端密钥（应用程序密码） | `"Ecy3XG7zVZK3/vl/a2NSB+a1zXLa8RnMum/IgD0E"` |

### 其他元数据选项

| 字段              | 必需 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `tableName`          | N        | 要使用的表名。字母数字和下划线。默认为 `"state"` | `"table_name"`
| `metadataTableName` | N | Dapr 用于存储少量元数据属性的表的名称。默认为 `dapr_metadata`。 | `"dapr_metadata"`
| `keyType`            | N        | 使用的键类型。支持的值：`"string"`（默认）、`"uuid"`、`"integer"`。| `"string"`
| `keyLength`          | N        | 键的最大长度。如果 "keyType" 不是 `string`，则忽略此项。默认为 `"200"` | `"200"`
| `schema`             | N        | 要使用的架构。默认为 `"dbo"` | `"dapr"`,`"dbo"`
| `indexedProperties`  | N        | 索引属性列表，作为包含 JSON 文档的字符串。 |  `'[{"column": "transactionid", "property": "id", "type": "int"}, {"column": "customerid", "property": "customer", "type": "nvarchar(100)"}]'`
| `actorStateStore` | N | 指示 Dapr 应为 actor 状态存储配置此组件（[更多信息]({{% ref "state_api.md#configuring-state-store-for-actors" %}})）。 | `"true"`
| `cleanupIntervalInSeconds` | N | 清理过期 TTL 行的间隔（以秒为单位）。默认：`"3600"`（即 1 小时）。将此值设置为 <=0 会禁用定期清理。 | `"1800"`, `"-1"`


## 创建 Microsoft SQL Server/Azure SQL 实例

[按照说明](https://docs.microsoft.com/azure/azure-sql/database/single-database-create-quickstart?view=azuresql&tabpane=azure-portal)从 Azure 文档中了解如何创建 SQL 数据库。数据库必须先创建，Dapr 才能使用它。

为了将 SQL Server 设置为状态存储，您需要以下属性：

- **连接字符串**：SQL Server 连接字符串。例如：server=localhost;user id=sa;password=your-password;port=1433;database=mydatabase;
- **架构**：要使用的数据库架构（默认=dbo）。如果不存在，将创建该架构
- **表名**：数据库表名。如果不存在，将创建该表
- **索引属性**：来自 json 数据的可选属性，将被索引并作为单独的列持久化

### 创建专用用户

当使用专用用户（非 `sa`）连接时，用户需要这些授权 - 即使用户是所需数据库架构的所有者：

- `CREATE TABLE`
- `CREATE TYPE`

### TTL 和清理

此状态存储支持使用 Dapr 存储的记录的[生存时间（TTL）]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，您可以设置 `ttlInSeconds` 元数据属性来指示数据应在多少秒后被视为"过期"。

由于 SQL Server 没有内置的 TTL 支持，Dapr 通过在状态表中添加一列来实现此功能，指示数据何时应被视为"过期"。"过期"记录不会返回给调用者，即使它们仍物理存储在数据库中。后台"垃圾收集器"会定期扫描状态表中的过期行并删除它们。

您可以使用 `cleanupIntervalInSeconds` 元数据属性设置过期记录的删除间隔，默认为 3600 秒（即 1 小时）。

- 较长的间隔需要对过期行进行不太频繁的扫描，但可能需要存储过期记录更长时间，从而可能需要更多存储空间。如果您计划在状态表中存储许多具有短 TTL 的记录，请考虑将 `cleanupIntervalInSeconds` 设置为较小的值 - 例如，`300`（300 秒，或 5 分钟）。
- 如果您不打算将 TTL 与 Dapr 和 SQL Server 状态存储一起使用，您应该考虑将 `cleanupIntervalInSeconds` 设置为 <= 0 的值（例如 `0` 或 `-1`）以禁用定期清理并减少数据库的负载。

状态存储在 `ExpireDate` 列上没有索引，这意味着每次清理操作都必须执行全表扫描。如果您打算向包含大量使用 TTL 的记录的表写入数据，您应该考虑在 `ExpireDate` 列上创建索引。索引使查询更快，但使用更多存储空间并略微减慢写入速度。

```sql
CREATE CLUSTERED INDEX expiredate_idx ON state(ExpireDate ASC)
```

## 高级

### v1 和 v2 之间的区别

Sqlserver 状态存储 v1 在 Dapr 1.5 中引入。[预先存在的 v1]({{% ref setup-sqlserver.md %}}) 仍然可用，并未被弃用。

在 v2 组件中，表模式已更改，目标是完全支持工作流。最值得注意的是，Dapr 存储的值现在属于 _VARBINARY_ 类型，这允许工作流正确地存储数据。  
然而，由于此更改，v2 组件不支持 [Dapr 状态存储查询 API]({{% ref howto-state-query-api.md %}})。

由于这些更改，v1 和 v2 组件无法从同一个表读取或写入数据。也无法在组件的两个版本之间迁移数据。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
