---
type: docs
title: "PostgreSQL v1"
linkTitle: "PostgreSQL v1"
description: 关于 PostgreSQL v1 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-postgresql/"
  - "/operations/components/setup-state-store/supported-state-stores/setup-postgres/"
  - "/operations/components/setup-state-store/supported-state-stores/setup-postgresql-v1/"
  - "/operations/components/setup-state-store/supported-state-stores/setup-postgres-v1/"
---

{{% alert title="注意" color="primary" %}}
从 Dapr 1.13 开始，您可以使用 [PostgreSQL v2]({{% ref setup-postgresql-v2.md %}}) 状态存储组件，它在性能和可靠性方面进行了一些改进。
v2 组件与 v1 不兼容，并且数据无法在两个组件之间迁移。v2 组件不支持状态存储查询 API。

目前没有弃用 v1 组件的计划。
{{% /alert %}}

该组件允许使用 PostgreSQL (Postgres) 作为 Dapr 的状态存储，使用 "v1" 组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.postgresql
  version: v1
  metadata:
    # 连接字符串
    - name: connectionString
      value: "<CONNECTION STRING>"
    # 单独的连接参数 - 可用于覆盖 connectionString 参数
    #- name: host
    #  value: "localhost"
    #- name: hostaddr
    #  value: "127.0.0.1"
    #- name: port
    #  value: "5432"
    #- name: database
    #  value: "my_db"
    #- name: user
    #  value: "postgres"
    #- name: password
    #  value: "example"
    #- name: sslRootCert
    #  value: "/path/to/ca.crt"
    # 数据库操作超时时间，以 Go duration 或秒数表示（可选）
    #- name: timeout
    #  value: 20
    # 用于存储状态的表名（可选）
    #- name: tableName
    #  value: "state"
    # 用于存储 Dapr 元数据的表名（可选）
    #- name: metadataTableName
    #  value: "dapr_metadata"
    # 清理间隔（秒），用于删除过期的行（可选）
    #- name: cleanupInterval
    #  value: "1h"
    # 该组件池化的最大连接数（可选）
    #- name: maxConns
    #  value: 0
    # 连接关闭前的最大空闲时间（可选）
    #- name: connectionMaxIdleTime
    #  value: 0
    # 控制执行查询的默认模式（可选）
    #- name: queryExecMode
    #  value: ""
    # 如果您希望将 PostgreSQL 用作 actor 或工作流的状态存储，请取消注释（可选）
    #- name: actorStateStore
    #  value: "true"
```

{{% alert title="警告" color="warning" %}}
上述示例使用纯文本字符串作为密钥。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

### 使用连接字符串进行身份验证

使用 PostgreSQL 连接字符串进行身份验证时，以下元数据选项是**必需的**。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。有关如何定义连接字符串的信息，请参阅 PostgreSQL [数据库连接文档](https://www.postgresql.org/docs/current/libpq-connect.html)。 | `"host=localhost user=postgres password=example port=5432 connect_timeout=10 database=my_db"` |

#### 使用单独的连接参数进行身份验证

除了使用连接字符串外，您还可以选择指定单独的连接参数。这些参数等同于标准 PostgreSQL 连接参数。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `host` | Y | PostgreSQL 服务器的主机名或 IP 地址 | `"localhost"` |
| `hostaddr` | N | PostgreSQL 服务器的 IP 地址（host 的替代方案） | `"127.0.0.1"` |
| `port` | Y | PostgreSQL 服务器的端口号 | `"5432"` |
| `database` | Y | 要连接的数据库名称 | `"my_db"` |
| `user` | Y | 要连接的 PostgreSQL 用户 | `"postgres"` |
| `password` | Y | PostgreSQL 用户的密码 | `"example"` |
| `sslRootCert` | N | SSL 根证书文件的路径 | `"/path/to/ca.crt"` |

{{% alert title="注意" color="primary" %}}
使用单独的连接参数时，这些参数将覆盖 `connectionString` 中存在的参数。
{{% /alert %}}

### 使用 Microsoft Entra ID 进行身份验证

支持使用 Microsoft Entra ID 进行身份验证，适用于 Azure Database for PostgreSQL。Dapr 支持的所有身份验证方法都可以使用，包括客户端凭据（"服务主体"）和托管标识。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `useAzureAD` | Y | 必须设置为 `true` 以启用组件从 Microsoft Entra ID 获取访问令牌。 | `"true"` |
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。<br>这必须包含用户，对应于在 PostgreSQL 中创建的映射到 Microsoft Entra ID 标识的用户名称；这通常是相应主体的名称（例如 Microsoft Entra ID 应用程序的名称）。此连接字符串不应包含任何密码。 | `"host=mydb.postgres.database.azure.com user=myapplication port=5432 database=my_db sslmode=require"` |
| `azureTenantId` | N | Microsoft Entra ID 租户的 ID | `"cd4b2887-304c-…"` |
| `azureClientId` | N | 客户端 ID（应用程序 ID） | `"c7dd251f-811f-…"` |
| `azureClientSecret` | N | 客户端密钥（应用程序密码） | `"Ecy3X…"` |

### 使用 AWS IAM 进行身份验证

支持使用 AWS IAM 进行身份验证，适用于所有版本的 PostgreSQL 类型组件。
连接字符串中指定的用户必须是数据库中已存在的用户，并且是被授予 `rds_iam` 数据库角色的 AWS IAM 启用用户。
身份验证基于 AWS 身份验证配置文件，或提供的 AccessKey/SecretKey。
AWS 身份验证令牌将在其过期时间之前由 AWS 动态轮换。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `useAWSIAM` | Y | 必须设置为 `true` 以启用组件从 AWS IAM 获取访问令牌。此身份验证方法仅适用于 AWS Relational Database Service for PostgreSQL 数据库。 | `"true"` |
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。<br>这必须包含已存在的用户，对应于在 PostgreSQL 中创建的映射到 AWS IAM 策略的用户名称。此连接字符串不应包含任何密码。请注意，使用 AWS 时数据库名称字段表示为 dbname。 | `"host=mydb.postgres.database.aws.com user=myapplication port=5432 dbname=my_db sslmode=require"`|
| `awsRegion` | N | 部署 AWS Relational Database Service 的 AWS 区域。 | `"us-east-1"` |
| `awsAccessKey` | N | 与 IAM 账户关联的 AWS 访问密钥 | `"AKIAIOSFODNN7EXAMPLE"` |
| `awsSecretKey` | N | 与访问密钥关联的密钥 | `"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"` |
| `awsSessionToken` | N | 要使用的 AWS 会话令牌。仅在使用临时安全凭证时才需要会话令牌。 | `"TOKEN"` |

### 其他元数据选项

| 字段 | 必需 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `tableName` | N | 存储数据的表的名称。默认为 `state`。可以选择性地将架构名称作为前缀，例如 `public.state` | `"state"`, `"public.state"`
| `metadataTableName` | N | Dapr 用于存储少量元数据属性的表的名称。默认为 `dapr_metadata`。可以选择性地将架构名称作为前缀，例如 `public.dapr_metadata` | `"dapr_metadata"`, `"public.dapr_metadata"`
| `timeout` | N | 数据库操作的超时时间，以 [Go duration](https://pkg.go.dev/time#ParseDuration) 表示。整数被解释为秒数。默认为 `20s` | `"30s"`, `30` |
| `cleanupInterval` | N | 清理 TTL 过期的行的时间间隔，以 Go duration 或秒数表示。默认值：`1h`（1 小时）。将此值设置为 <= 0 会禁用定期清理。 | `"30m"`, `1800`, `-1`
| `maxConns` | N | 该组件池化的最大连接数。设置为 0 或更低以使用默认值，即 4 或 CPU 数量中的较大者。 | `"4"`
| `connectionMaxIdleTime` | N | 未使用的连接在连接池中自动关闭前的最大空闲时间。默认情况下，没有值，这留给数据库驱动程序选择。 | `"5m"`
| `queryExecMode` | N | 控制执行查询的默认模式。默认情况下，Dapr 使用扩展协议并自动准备和缓存预处理语句。但是，这可能与 PGBouncer 等代理不兼容。在这种情况下，使用 `exec` 或 `simple_protocol` 可能更可取。 | `"simple_protocol"`
| `actorStateStore` | N | 将此状态存储用于 Actor。默认为 `"false"` | `"true"`, `"false"`

## 设置 PostgreSQL

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

1. 运行一个 PostgreSQL 实例。您可以使用以下命令在 Docker CE 中运行本地 PostgreSQL 实例：

     ```bash
     docker run -p 5432:5432 -e POSTGRES_PASSWORD=example postgres
     ```

     > 此示例未描述生产配置，因为它以纯文本设置密码，并且用户名保留为 PostgreSQL 默认值 "postgres"。

1. 为状态数据创建一个数据库。  
    可以使用默认的 "postgres" 数据库，也可以创建一个新数据库来存储状态数据。

    要在 PostgreSQL 中创建新数据库，请运行以下 SQL 命令：

    ```sql
    CREATE DATABASE my_dapr;
    ```
  
{{% /tab %}}

{{< /tabpane >}}

## 高级

### TTL 和清理

该状态存储支持使用 Dapr 存储的记录的 [Time-To-Live (TTL)]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，您可以设置 `ttlInSeconds` 元数据属性来指示数据应在多少秒后被视为"过期"。

由于 PostgreSQL 没有内置的 TTL 支持，这是在 Dapr 中通过在状态表中添加一个列来实现的，该列指示数据何时被视为"过期"。即使"过期"记录仍物理存储在数据库中，也不会返回给调用者。后台"垃圾收集器"定期扫描状态表中的过期行并删除它们。

您可以使用 `cleanupInterval` 元数据属性设置过期记录的删除间隔，默认为 3600 秒（即 1 小时）。

- 较长的间隔需要较少的过期行扫描频率，但可能需要存储过期记录更长时间，可能需要更多存储空间。如果您计划在状态表中存储许多具有短 TTL 的记录，请考虑将 `cleanupInterval` 设置为更小的值；例如，`5m`（5 分钟）。
- 如果您不打算将 TTL 与 Dapr 和 PostgreSQL 状态存储一起使用，应考虑将 `cleanupInterval` 设置为 <= 0 的值（例如 `0` 或 `-1`）以禁用定期清理并减少数据库负载。

状态表中存储记录过期日期的列 `expiredate` **默认没有索引**，因此每次定期清理都必须执行全表扫描。如果您的表中有大量记录，并且只有其中一些使用 TTL，您可能会发现在该列上创建索引很有用。假设您的状态表名称是 `state`（默认值），您可以使用此查询：

```sql
CREATE INDEX expiredate_idx
    ON state
    USING btree (expiredate ASC NULLS LAST);
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[此指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})获取配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
