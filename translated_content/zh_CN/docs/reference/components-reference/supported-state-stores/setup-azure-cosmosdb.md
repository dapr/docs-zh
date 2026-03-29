---
type: docs
title: "Azure Cosmos DB (SQL API)"
linkTitle: "Azure Cosmos DB (SQL API)"
description: Azure Cosmos DB (SQL API) 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-azure-cosmosdb/"
---

## 组件格式

要设置 Azure Cosmos DB 状态存储，请创建类型为 `state.azure.cosmosdb` 的组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: <REPLACE-WITH-URL>
  - name: masterKey
    value: <REPLACE-WITH-MASTER-KEY>
  - name: database
    value: <REPLACE-WITH-DATABASE>
  - name: collection
    value: <REPLACE-WITH-COLLECTION>
  # 如果您希望使用 Azure Cosmos DB 作为 actor 的状态存储，请取消注释此选项（可选）
  #- name: actorStateStore
  #  value: "true"
```

{{% alert title="警告" color="warning" %}}
上述示例使用明文字符串作为密钥。建议使用密钥存储来管理密钥，具体说明请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

如果您希望将 Cosmos DB 用作 actor 存储，请在 yaml 中添加以下内容。

```yaml
  - name: actorStateStore
    value: "true"
```

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| url                | Y        | Cosmos DB 的 URL | `"https://******.documents.azure.com:443/"`。
| masterKey          | Y*        | 用于向 Cosmos DB 账户进行身份验证的密钥。仅在不使用 Microsoft Entra ID 身份验证时需要。 | `"key"`
| database           | Y        | 数据库的名称  | `"db"`
| collection         | Y        | 集合（容器）的名称 | `"collection"`
| actorStateStore    | N        | 将此状态存储用于 actor。默认为 `"false"` | `"true"`, `"false"`

### Microsoft Entra ID 身份验证

Azure Cosmos DB 状态存储组件支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息以及根据选择的 Microsoft Entra ID 身份验证机制需要提供的组件元数据字段，请参阅 [Azure 身份验证文档]({{% ref authenticating-azure.md %}})。

您可以在[下方的部分](#setting-up-cosmos-db-for-authenticating-with-azure-ad)中阅读有关使用 Azure AD 身份验证设置 Cosmos DB 的更多信息。

## 设置 Azure Cosmos DB

[按照说明](https://docs.microsoft.com/azure/cosmos-db/how-to-manage-database-account)从 Azure 文档中了解如何创建 Azure Cosmos DB 账户。数据库和集合必须在 Dapr 使用之前在 Cosmos DB 中创建。

**重要：集合的分区键必须命名为 `/partitionKey`（注意：这是区分大小写的）。**

为了将 Cosmos DB 设置为状态存储，您需要以下属性：

- **URL**：Cosmos DB 的 URL。例如：`https://******.documents.azure.com:443/`
- **主密钥**：用于向 Cosmos DB 账户进行身份验证的密钥。如果使用 Microsoft Entra ID 身份验证，请跳过此项。
- **数据库**：数据库的名称
- **集合**：集合（或容器）的名称

### TTL 和清理

此状态存储支持使用 Dapr 存储的记录的[生存时间 (TTL)]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，您可以设置 `ttlInSeconds` 元数据属性以覆盖 CosmodDB 容器上的默认 TTL，指示数据何时应被视为"已过期"。请注意，只有当容器的 `DefaultTimeToLive` 字段具有非 NULL 值时，此值才会生效。有关更多信息，请参阅 [CosmosDB 文档](https://docs.microsoft.com/azure/cosmos-db/nosql/time-to-live)。

## 生产环境的最佳实践

Azure Cosmos DB 在单个 Azure Cosmos DB 账户的所有数据库之间共享严格的可接受的元数据请求速率限制。与 Azure Cosmos DB 的新连接会占用可接受的请求速率限制的很大一部分。（请参阅 [Cosmos DB 文档](https://docs.microsoft.com/azure/cosmos-db/sql/troubleshoot-request-rate-too-large#recommended-solution-3)）

因此，必须应用多种策略来避免同时建立与 Azure Cosmos DB 的新连接：

- 确保应用程序的边车仅在需要时才加载 Azure Cosmos DB 组件，以避免不必要的数据库连接。这可以通过[将组件范围限定到特定应用程序]({{% ref component-scopes.md %}}#application-access-to-components-with-scopes)来实现。
- 选择顺序部署或启动应用程序的部署策略，以最大程度减少对 Azure Cosmos DB 账户的新连接突发。
- 避免为不相关的数据库或系统重用同一个 Azure Cosmos DB 账户（即使在 Dapr 之外）。不同的 Azure Cosmos DB 账户具有不同的速率限制。
- 增加 `initTimeout` 值以允许组件在边车初始化期间重试连接 Azure Cosmos DB，最多 5 分钟。默认值为 `5s`，应该增加。使用 Kubernetes 时，增加此值可能还需要更新您的 [Readiness 和 Liveness 探测](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)。

```yaml
spec:
  type: state.azure.cosmosdb
  version: v1
  initTimeout: 5m
  metadata:
```

## 数据格式

要使用 Cosmos DB 状态存储，您的数据必须以 JSON 序列化格式发送到 Dapr。仅具有 JSON *可序列化*是不够的。

如果您使用的是 Dapr SDK（例如 [.NET SDK](https://github.com/dapr/dotnet-sdk)），SDK 会自动将您的数据序列化为 JSON。

如果您想直接调用 Dapr 的 HTTP 端点，请查看下面 [分区键](#partition-keys) 部分中的示例（使用 curl）。

## 分区键

对于 **非 actor 状态**操作，Azure Cosmos DB 状态存储将使用对 Dapr API 的请求中提供的 `key` 属性来确定 Cosmos DB 分区键。可以通过在请求中指定元数据字段来覆盖此设置，该元数据字段的键为 `partitionKey`，值为所需的分区。

以下操作使用 `nihilus` 作为发送到 Cosmos DB 的分区键值：

```shell
curl -X POST http://localhost:3500/v1.0/state/<store_name> \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "nihilus",
          "value": "darth"
        }
      ]'
```

对于 **非 actor** 状态操作，如果您想控制 Cosmos DB 分区，可以在元数据中指定它。重用上面的示例，以下是如何将其放在 `mypartition` 分区下

```shell
curl -X POST http://localhost:3500/v1.0/state/<store_name> \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "nihilus",
          "value": "darth",
          "metadata": {
            "partitionKey": "mypartition"
          }
        }
      ]'
```

对于 **actor** 状态操作，分区键由 Dapr 使用 `appId`、actor 类型和 actor id 生成，使得同一 actor 的数据始终位于同一分区下（您无需指定它）。这是因为 actor 状态操作必须使用事务，而在 Cosmos DB 中，事务中的项目必须位于同一分区上。

## 为使用 Microsoft Entra ID 进行身份验证而设置 Cosmos DB

使用 Dapr Cosmos DB 状态存储并通过 Microsoft Entra ID 进行身份验证时，您需要执行一些额外步骤来设置环境。

先决条件：

- 您需要按照 [Azure 身份验证]({{% ref authenticating-azure.md %}}) 页面上的说明创建一个服务主体。以下命令需要服务主体的 ID（请注意，这与您的应用程序的客户端 ID 或您在元数据中用于 `azureClientId` 的值不同）。
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [jq](https://stedolan.github.io/jq/download/)
- 以下脚本针对 bash 或 zsh shell 进行了优化

### 授予您的 Microsoft Entra ID 应用程序对 Cosmos DB 的访问权限

> 您可以在[官方文档](https://docs.microsoft.com/azure/cosmos-db/how-to-setup-rbac)中找到更多信息，包括分配更细粒度权限的说明。

为了授予您的应用程序访问存储在 Cosmos DB 中的数据的权限，您需要为其分配 Cosmos DB 数据平面的自定义角色。在此示例中，您将使用内置角色"Cosmos DB 内置数据参与者"，该角色授予您的应用程序对数据的完全读写访问权限；您可以选择按照官方文档中的说明创建自定义的、精细的角色。

```sh
# 包含您的 Cosmos DB 的资源组名称
RESOURCE_GROUP="..."
# 您的 Cosmos DB 账户名称
ACCOUNT_NAME="..."
# 您的服务主体对象的 ID
PRINCIPAL_ID="..."
# "Cosmos DB 内置数据参与者"角色的 ID
# 您也可以使用自定义角色的 ID
ROLE_ID="00000000-0000-0000-0000-000000000002"

az cosmosdb sql role assignment create \
  --account-name "$ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --scope "/" \
  --principal-id "$PRINCIPAL_ID" \
  --role-definition-id "$ROLE_ID"
```

## 优化

### 优化 Cosmos DB 以实现批量操作写入性能

如果您构建的系统仅通过键 (`id`) 从 Cosmos DB 读取数据，这是使用状态管理 API 或 actor 时的默认 Dapr 行为，您可以通过一些方式优化 Cosmos DB 以提高写入速度。这是通过从索引中排除所有路径来实现的。默认情况下，Cosmos DB 对文档内的所有字段进行索引。在写入繁重的系统上，并且对文档内的值运行很少或没有查询的情况下，此索引策略会减慢在 Cosmos DB 中写入或更新文档的时间。这在大量系统中会更加严重。

例如，Cosmos SQL 容器索引的默认 Terraform 定义如下：

```tf
indexing_policy {
  indexing_mode = "consistent"

  included_path {
    path = "/*"
  }
}
```

可以通过从索引中排除所有其他字段来强制 Cosmos DB 仅索引 `id` 和 `partitionKey` 字段。这可以通过将上述内容更新为以下内容来实现：

```tf
indexing_policy {
  # 如果您纯粹将容器用作键值存储，这也可以设置为 "none"。如果您的容器仅用作分布式缓存，这可能适用。
  indexing_mode = "consistent" 

  # 请注意，included_path 已被替换为 excluded_path
  excluded_path {
    path = "/*"
  }
}
```

{{% alert title="注意" color="primary" %}}

此优化的代价是对状态存储中文档内的字段的查询。这可能会影响任何定义和执行的存储过程或 SQL 查询。仅建议在您使用 Dapr 状态管理 API 或 Dapr Actor 与 Cosmos DB 交互时才应用此优化。

{{% /alert %}}

### 优化 Cosmos DB 以节省成本

如果您打算仅将 Cosmos DB 用作键值对，可能会考虑将状态对象转换为 JSON 并在持久化到状态之前对其进行压缩，然后在从状态中读取时对其进行解压缩，这可能符合您的利益。这是因为 Cosmos DB 根据给定时间段（通常是每小时）内使用的最大 RU/s 数向您收费。此外，RU 使用量计算为每读取或写入 1 KB 数据 1 RU。压缩通过减少存储在 Cosmos DB 中的数据大小来帮助减少 RU 使用量。

这种节省对于 Dapr actor 来说特别重要。虽然 Dapr 状态管理 API 在保存之前对对象进行 base64 编码，但 Dapr actor 状态以原始格式化的 JSON 形式保存。这意味着多行带有缩进用于格式化。压缩可以显着减少 actor 状态对象的大小。例如，如果您有一个 actor 状态对象，在 actor 水合时大小为 75KB，您将使用 75 RU/s 从状态中读取该对象。如果您随后修改状态对象并将其增长到 100KB，您将使用 100 RU/s 将该对象写入 Cosmos DB，总共 175 RU/s 用于 I/O 操作。假设您的 actor 每秒并发处理 1000 个请求，您将至少需要 175,000 RU/s 才能满足该负载。通过有效的压缩，大小减少可以达到 90% 左右，这意味着您只需要大约 17,500 RU/s 就能满足负载。

{{% alert title="注意" color="primary" %}}

此特定优化仅在您将大型对象保存到状态时才有意义。在任一端执行压缩和解压缩的性能和内存权衡需要适合您的用例。此外，一旦数据保存到状态，它就不可读，也不可查询。仅当您将大型状态对象保存为键值对时，才应采用此优化。

{{% /alert %}}

## 工作流限制

{{% alert title="注意" color="primary" %}}

如 下所述，CosmosDB 具有限制，可能使其不适合生产环境。
目前没有将工作流数据从 CosmosDB 迁移到另一个状态存储的路径，这意味着在生产环境中超出这些限制将导致工作流失败，并且没有解决方法。

{{% /alert %}}

工作流越复杂，包含的活动数量、子工作流等越多，每个状态存储事务执行的 DB 状态操作就越多。
所有输入和输出值都保存到工作流历史记录中，并且是这些事务操作的一部分。
CosmosDB 的[最大文档大小为 2MB，最大事务大小为 100 个操作。](https://learn.microsoft.com/azure/cosmos-db/concepts-limits#per-request-limits)
尝试超出这些限制写入 CosmosDB 会导致错误代码 `413`。
这意味着工作流历史记录不得超过此大小，这意味着 CosmosDB 不适合具有大型输入/输出值或更复杂的工作流。
有关在工作流执行期间保存的记录数量的一般指南，可以在[此处]({{% ref "workflow-architecture.md#state-store-record-count" %}})找到。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
