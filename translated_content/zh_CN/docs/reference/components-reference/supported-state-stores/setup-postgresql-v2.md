---
type: docs
title: "PostgreSQL"
linkTitle: "PostgreSQL"
description: PostgreSQL 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-postgresql-v2/"
  - "/operations/components/setup-state-store/supported-state-stores/setup-postgres-v2/"
---

{{% alert title="注意" color="primary" %}}
这是 PostgreSQL 状态存储组件的 v2 版本，在性能和可靠性方面进行了一些改进。建议新应用使用 v2 版本。

PostgreSQL v2 状态存储组件与 [v1 组件]({{% ref setup-postgresql-v1.md %}}) 不兼容，且数据无法在两个组件之间迁移。v2 组件不支持状态存储查询 API。

目前没有计划弃用 v1 组件。
{{% /alert %}}

此组件允许使用 PostgreSQL (Postgres) 作为 Dapr 的状态存储，使用 "v2" 组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.postgresql
  # 注意：设置 "version" 为 "v2" 是使用组件 v2 的必需项
  version: v2
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
    # 数据库操作超时时间，作为 Go duration 或秒数（可选）
    #- name: timeout
    #  value: 20
    # 存储数据的表前缀（可选）
    #- name: tablePrefix
    #  value: ""
    # Dapr 用于存储元数据的表名称（可选）
    #- name: metadataTableName
    #  value: "dapr_metadata"
    # 清理过期行的时间间隔（秒）（可选）
    #- name: cleanupInterval
    #  value: "1h"
    # 此组件连接池的最大连接数（可选）
    #- name: maxConns
    #  value: 0
    # 连接的最大空闲时间，超过此时间后将关闭连接（可选）
    #- name: connectionMaxIdleTime
    #  value: 0
    # 控制执行查询的默认模式（可选）
    #- name: queryExecMode
    #  value: ""
    # 如果希望将 PostgreSQL 用作 actor 或工作流的状态存储，请取消注释（可选）
    #- name: actorStateStore
    #  value: "true"
```

{{% alert title="警告" color="warning" %}}
上述示例使用明文字符串作为密钥。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

### 使用连接字符串进行身份验证

以下元数据选项是使用 PostgreSQL 连接字符串进行身份验证的**必需**项。

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
| `user` | Y | 用于连接的 PostgreSQL 用户 | `"postgres"` |
| `password` | Y | PostgreSQL 用户的密码 | `"example"` |
| `sslRootCert` | N | SSL 根证书文件的路径 | `"/path/to/ca.crt"` |

{{% alert title="注意" color="primary" %}}
使用单独的连接参数时，这些参数将覆盖 `connectionString` 中存在的参数。
{{% /alert %}}

### 使用 Microsoft Entra ID 进行身份验证

Azure Database for PostgreSQL 支持使用 Microsoft Entra ID 进行身份验证。可以使用 Dapr 支持的所有身份验证方法，包括客户端凭据（"服务主体"）和托管标识。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `useAzureAD` | Y | 必须设置为 `true` 以启用组件从 Microsoft Entra ID 获取访问令牌。 | `"true"` |
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。<br>必须包含用户，对应于在 PostgreSQL 内部创建的映射到 Microsoft Entra ID 标识的用户名称。这通常是对应主体的名称（例如，Microsoft Entra ID 应用程序的名称）。此连接字符串不应包含任何密码。 | `"host=mydb.postgres.database.azure.com user=myapplication port=5432 database=my_db sslmode=require"` |
| `azureTenantId` | N | Microsoft Entra ID 租户的 ID | `"cd4b2887-304c-…"` |
| `azureClientId` | N | 客户端 ID（应用程序 ID） | `"c7dd251f-811f-…"` |
| `azureClientSecret` | N | 客户端密钥（应用程序密码） | `"Ecy3X…"` |

### 使用 AWS IAM 进行身份验证

所有版本的 PostgreSQL 类型组件都支持使用 AWS IAM 进行身份验证。
连接字符串中指定的用户必须是数据库中已存在的用户，并且是已授予 `rds_iam` 数据库角色的 AWS IAM 启用用户。
身份验证基于 AWS 身份验证配置文件或提供的 AccessKey/SecretKey。
AWS 身份验证令牌将在其过期时间之前与 AWS 动态轮换。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `useAWSIAM` | Y | 必须设置为 `true` 以启用组件从 AWS IAM 获取访问令牌。此身份验证方法仅适用于 AWS Relational Database Service 的 PostgreSQL 数据库。 | `"true"` |
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。<br>必须包含已存在的用户，对应于在 PostgreSQL 内部创建的映射到 AWS IAM 策略的用户名称。此连接字符串不应包含任何密码。请注意，数据库名字段在 AWS 中表示为 dbname。 | `"host=mydb.postgres.database.aws.com user=myapplication port=5432 dbname=my_db sslmode=require"`|
| `awsRegion` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 起被弃用。请改用 'region'。部署 AWS Relational Database Service 的 AWS 区域。 | `"us-east-1"` |
| `awsAccessKey` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 起被弃用。请改用 'accessKey'。与 IAM 账户关联的 AWS 访问密钥 | `"AKIAIOSFODNN7EXAMPLE"` |
| `awsSecretKey` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 起被弃用。请改用 'secretKey'。与访问密钥关联的密钥 | `"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"` |
| `awsSessionToken` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 起被弃用。请改用 'sessionToken'。要使用的 AWS 会话令牌。仅当您使用临时安全凭证时才需要会话令牌。 | `"TOKEN"` |

### 其他元数据选项

| 字段 | 必需 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `tablePrefix` | N | 存储数据的表的前缀。可以选择性地将架构名称作为前缀，例如 `public.prefix_` | `"prefix_"`, `"public.prefix_"` |
| `metadataTableName` | N | Dapr 用于存储一些元数据属性的表的名称。默认为 `dapr_metadata`。可以选择性地将架构名称作为前缀，例如 `public.dapr_metadata` | `"dapr_metadata"`, `"public.dapr_metadata"` |
| `timeout` | N | 数据库操作的超时时间，作为 [Go duration](https://pkg.go.dev/time#ParseDuration)。整数被解释为秒数。默认为 `20s` | `"30s"`, `30` |
| `cleanupInterval` | N | 清理过期 TTL 行的时间间隔，作为 Go duration 或秒数。默认：`1h`（1 小时）。将此设置为 <= 0 的值将禁用定期清理。 | `"30m"`, `1800`, `-1` |
| `maxConns` | N | 此组件连接池的最大连接数。设置为 0 或更低以使用默认值，即 4 或 CPU 数量中的较大者。 | `"4"` |
| `connectionMaxIdleTime` | N | 未使用的连接在连接池中自动关闭前的最大空闲时间。默认情况下，没有值，这留给数据库驱动程序选择。 | `"5m"` |
| `queryExecMode` | N | 控制执行查询的默认模式。默认情况下，Dapr 使用扩展协议并自动准备和缓存预处理语句。然而，这可能与 PGBouncer 等代理不兼容。在这种情况下，最好使用 `exec` 或 `simple_protocol`。 | `"simple_protocol"` |
| `actorStateStore` | N | 将此状态存储用于 actor。默认为 `"false"` | `"true"`, `"false"` |

## 设置 PostgreSQL

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

1. 运行 PostgreSQL 实例。您可以使用以下命令在 Docker 中运行本地 PostgreSQL 实例：

     ```bash
     docker run -p 5432:5432 -e POSTGRES_PASSWORD=example postgres
     ```

     > 此示例未描述生产环境配置，因为它以纯文本设置密码，用户名保留为 PostgreSQL 默认的 "postgres"。

2. 为状态数据创建数据库。  
    可以使用默认的 "postgres" 数据库，也可以创建一个新数据库来存储状态数据。

    要在 PostgreSQL 中创建新数据库，请运行以下 SQL 命令：

    ```sql
    CREATE DATABASE my_dapr;
    ```
  
{{% /tab %}}

{{< /tabpane >}}

## 高级

### v1 和 v2 之间的差异

PostgreSQL 状态存储 v2 在 Dapr 1.13 中引入。[现有的 v1]({{% ref setup-postgresql-v1.md %}}) 仍然可用，并未被弃用。

在 v2 组件中，表架构已进行了重大更改，旨在提高性能和可靠性。最值得注意的是，Dapr 存储的值现在为 _BYTEA_ 类型，这允许更快的查询，并且在某些情况下比以前使用的 _JSONB_ 列更节省空间。  
然而，由于此更改，v2 组件不支持 [Dapr 状态存储查询 API]({{% ref howto-state-query-api.md %}})。

此外，在 v2 组件中，ETag 现在是随机 UUID，这确保了与其他 PostgreSQL 兼容数据库（如 CockroachDB）的更好兼容性。

由于这些更改，v1 和 v2 组件无法从同一个表读取或写入数据。在此阶段，也无法在两个版本的组件之间迁移数据。

### 以人类可读格式显示数据

PostgreSQL v2 组件将状态的值存储在 `value` 列中，该列的类型为 _BYTEA_。大多数 PostgreSQL 工具（包括 pgAdmin）将值视为二进制，默认情况下不会以人类可读的形式显示。

如果您想检查状态存储中的值，并且您知道它不是二进制数据（例如，JSON 数据），您可以使用如下查询以人类可读的形式显示值：

```sql
-- 将 "state" 替换为您环境中的状态表的名称
SELECT *, convert_from(value, 'utf-8') FROM state;
```

### TTL 和清理

此状态存储支持使用 Dapr 存储的记录的[生存时间（TTL）]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，您可以设置 `ttlInSeconds` 元数据属性来指示数据应在多少秒后被视为"过期"。

由于 PostgreSQL 没有内置的 TTL 支持，这是通过在状态表中添加一个列来实现的，该列指示数据何时应被视为"过期"。即使仍物理存储在数据库中，"过期"的记录也不会返回给调用方。后台"垃圾收集器"会定期扫描状态表中的过期行并删除它们。

您可以使用 `cleanupInterval` 元数据属性设置过期记录的删除时间间隔，默认为 3600 秒（即 1 小时）。

- 较长的间隔需要较少的过期行扫描频率，但可能需要存储过期记录更长时间，可能需要更多的存储空间。如果您计划在状态表中存储许多具有短 TTL 的记录，请考虑将 `cleanupInterval` 设置为较小的值；例如，`5m`（5 分钟）。
- 如果您不计划将 TTL 与 Dapr 和 PostgreSQL 状态存储一起使用，您应该考虑将 `cleanupInterval` 设置为 <= 0 的值（例如，`0` 或 `-1`）以禁用定期清理并减少数据库的负载。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[此指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
