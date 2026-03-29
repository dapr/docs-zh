---
type: docs
title: "Azure Cosmos DB (SQL API) 绑定规范"
linkTitle: "Azure Cosmos DB (SQL API)"
description: "Azure Cosmos DB (SQL API) 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/cosmosdb/"
---

## 组件格式

若要设置 Azure Cosmos DB 绑定，需创建一个类型为 `bindings.azure.cosmosdb` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.azure.cosmosdb
  version: v1
  metadata:
  - name: url
    value: "https://******.documents.azure.com:443/"
  - name: masterKey
    value: "*****"
  - name: database
    value: "OrderDb"
  - name: collection
    value: "Orders"
  - name: partitionKey
    value: "<message>"
```

{{% alert title="Warning" color="warning" %}}
以上示例将密钥作为明文字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段 | 必填 | 绑定支持 | 详情 | 示例 |
|--------------------|:--------:|--------|---------|---------|
| `url` | Y | 输出 | Cosmos DB URL | `"https://******.documents.azure.com:443/"` |
| `masterKey` | Y | 输出 | Cosmos DB 账户主密钥 | `"master-key"` |
| `database` | Y | 输出 | Cosmos DB 数据库名称 | `"OrderDb"` |
| `collection` | Y | 输出 | 数据库中容器的名称。  | `"Orders"` |
| `partitionKey` | Y | 输出 | 从载荷中提取的、用作分区键的键的名称（待创建的文档）。该名称必须与创建 Cosmos DB 容器时指定的分区键一致。 | `"OrderId"`、`"message"` |

更多信息请参见 [Azure Cosmos DB 资源模型](https://docs.microsoft.com/azure/cosmos-db/account-databases-containers-items)。

### Microsoft Entra ID 身份验证

Azure Cosmos DB 绑定组件支持使用所有 Microsoft Entra ID 机制进行身份验证。有关更多信息以及根据所选 Microsoft Entra ID 身份验证机制需提供的相应组件元数据字段，请参阅[对 Azure 进行身份验证的文档]({{% ref authenticating-azure.md %}})。

你可以在[以下部分](#setting-up-cosmos-db-for-authenticating-with-azure-ad)中阅读有关使用 Azure AD 身份验证设置 Cosmos DB 的更多信息。

## 绑定支持

该组件支持**输出绑定**，包含以下操作：

- `create`

## 生产环境最佳实践

Azure Cosmos DB 在单个 Azure Cosmos DB 账户的所有数据库之间共享严格的元数据请求速率限制。与 Azure Cosmos DB 的新连接会占用允许的请求速率限制的很大一部分。（参见 [Cosmos DB 文档](https://docs.microsoft.com/azure/cosmos-db/sql/troubleshoot-request-rate-too-large#recommended-solution-3)）

因此必须采取若干策略来避免与 Azure Cosmos DB 同时建立新连接：

- 确保应用程序的边车仅在需要时才加载 Azure Cosmos DB 组件，以避免不必要的数据库连接。这可以通过[将组件限定于特定应用程序]({{% ref component-scopes.md %}}#application-access-to-components-with-scopes)来实现。
- 选择顺序部署或启动应用程序的部署策略，以最大限度地减少到 Azure Cosmos DB 账户的新连接突增。
- 避免为不相关的数据库或系统复用同一个 Azure Cosmos DB 账户（即使在 Dapr 之外）。不同的 Azure Cosmos DB 账户具有不同的速率限制。
- 增加 `initTimeout` 值，允许组件在边车初始化期间重试连接到 Azure Cosmos DB，最长可达 5 分钟。默认值为 `5s`，应该增加。使用 Kubernetes 时，增加此值可能还需要更新[就绪和存活探针](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)。

```yaml
spec:
  type: bindings.azure.cosmosdb
  version: v1
  initTimeout: 5m
  metadata:
```

## 数据格式

**输出绑定**的 `create` 操作要求每个待创建文档的载荷中存在以下键：

- `id`：待创建文档的唯一 ID
- `<partitionKey>`：通过组件定义中的 `spec.partitionKey` 指定的分区键名称。这也必须与创建 Cosmos DB 容器时指定的分区键一致。

## 为使用 Azure AD 身份验证设置 Cosmos DB

使用 Dapr Cosmos DB 绑定并通过 Azure AD 进行身份验证时，你需要执行一些额外步骤来设置环境。

先决条件：

- 你需要根据[对 Azure 进行身份验证]({{% ref authenticating-azure.md %}})页面中的说明创建一个服务主体。下面的命令需要该服务主体的 ID（请注意，这与应用程序的客户端 ID 或你在元数据中用于 `azureClientId` 的值不同）。
- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli)
- [jq](https://stedolan.github.io/jq/download/)
- 以下脚本针对 bash 或 zsh shell 进行了优化

> 使用 Cosmos DB 绑定时，你**不需要**像使用 Cosmos DB 状态存储那样创建存储过程。

### 授予你的 Azure AD 应用程序访问 Cosmos DB 的权限

> 你可以在[官方文档](https://docs.microsoft.com/azure/cosmos-db/how-to-setup-rbac)中找到更多信息，包括分配更精细权限的说明。

为了授予你的应用程序访问存储在 Cosmos DB 中的数据的权限，你需要为 Cosmos DB 数据平面分配一个自定义角色。在本例中，你将使用内置角色 "Cosmos DB Built-in Data Contributor"，该角色授予你的应用程序对数据的完全读写访问权限；你也可以按照官方文档中的说明创建自定义的、精细调整的角色。

```sh
# 包含你的 Cosmos DB 的资源组名称
RESOURCE_GROUP="..."
# 你的 Cosmos DB 账户名称
ACCOUNT_NAME="..."
# 你的服务主体对象 ID
PRINCIPAL_ID="..."
# "Cosmos DB Built-in Data Contributor" 角色的 ID
# 你也可以使用自定义角色的 ID
ROLE_ID="00000000-0000-0000-0000-000000000002"

az cosmosdb sql role assignment create \
  --account-name "$ACCOUNT_NAME" \
  --resource-group "$RESOURCE_GROUP" \
  --scope "/" \
  --principal-id "$PRINCIPAL_ID" \
  --role-definition-id "$ROLE_ID"
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [如何操作：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [如何操作：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
