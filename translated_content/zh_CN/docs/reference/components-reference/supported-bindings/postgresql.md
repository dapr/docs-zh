---
type: docs
title: "PostgreSQL 绑定规范"
linkTitle: "PostgreSQL"
description: "PostgreSQL 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/postgresql/"
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/postgres/"
---

## 组件格式

要设置 PostgreSQL 绑定，需创建一个类型为 `bindings.postgresql` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.postgresql
  version: v1
  metadata:
    # 连接字符串
    - name: connectionString
      value: "<CONNECTION STRING>"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

### 使用连接字符串进行身份验证

使用 PostgreSQL 连接字符串进行身份验证时，以下元数据选项是**必需的**。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。有关如何定义连接字符串的信息，请参阅 PostgreSQL [关于数据库连接的文档](https://www.postgresql.org/docs/current/libpq-connect.html)。 | `"host=localhost user=postgres password=example port=5432 connect_timeout=10 database=my_db"`

#### 使用单独的连接参数进行身份验证

除了使用连接字符串外，您还可以选择指定单独的连接参数。这些参数等同于标准的 PostgreSQL 连接参数。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `host` | Y | PostgreSQL 服务器的主机名或 IP 地址 | `"localhost"` |
| `hostaddr` | N | PostgreSQL 服务器的 IP 地址（host 的替代选项） | `"127.0.0.1"` |
| `port` | Y | PostgreSQL 服务器的端口号 | `"5432"` |
| `database` | Y | 要连接的数据库名称 | `"my_db"` |
| `user` | Y | 用于连接的 PostgreSQL 用户 | `"postgres"` |
| `password` | Y | PostgreSQL 用户的密码 | `"example"` |
| `sslRootCert` | N | SSL 根证书文件的路径 | `"/path/to/ca.crt"` |

{{% alert title="注意" color="primary" %}}
使用单独的连接参数时，这些参数将覆盖 `connectionString` 中存在的参数。
{{% /alert %}}

### 使用 Microsoft Entra ID 进行身份验证

支持使用 Microsoft Entra ID 对 Azure Database for PostgreSQL 进行身份验证。可以使用 Dapr 支持的所有身份验证方法，包括客户端凭据（"服务主体"）和托管标识。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `useAzureAD` | Y | 必须设置为 `true` 以使组件能够从 Microsoft Entra ID 获取访问令牌。 | `"true"` |
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。<br>必须包含用户，该用户对应于在 PostgreSQL 内部创建的映射到 Microsoft Entra ID 标识的用户名称；这通常是相应主体的名称（例如 Microsoft Entra ID 应用程序的名称）。此连接字符串不应包含任何密码。 | `"host=mydb.postgres.database.azure.com user=myapplication port=5432 database=my_db sslmode=require"` |
| `azureTenantId` | N | Microsoft Entra ID 租户的 ID | `"cd4b2887-304c-…"` |
| `azureClientId` | N | 客户端 ID（应用程序 ID） | `"c7dd251f-811f-…"` |
| `azureClientSecret` | N | 客户端密钥（应用程序密码） | `"Ecy3X…"` |

### 使用 AWS IAM 进行身份验证

支持使用 AWS IAM 对所有版本的 PostgreSQL 类型组件进行身份验证。
连接字符串中指定的用户必须是数据库中已存在的用户，并且是已授予 `rds_iam` 数据库角色的 AWS IAM 启用用户。
身份验证基于 AWS 身份验证配置文件，或提供的 AccessKey/SecretKey。
AWS 身份验证令牌将在其过期时间之前动态轮换。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `useAWSIAM` | Y | 必须设置为 `true` 以使组件能够从 AWS IAM 获取访问令牌。此身份验证方法仅适用于 AWS Relational Database Service for PostgreSQL 数据库。 | `"true"` |
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。<br>必须包含已存在的用户，该用户对应于在 PostgreSQL 内部创建的映射到 AWS IAM 策略的用户名称。此连接字符串不应包含任何密码。请注意，对于 AWS，数据库名称字段由 dbname 表示。 | `"host=mydb.postgres.database.aws.com user=myapplication port=5432 dbname=my_db sslmode=require"`|
| `awsRegion` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 中被弃用。请改用 'region'。部署 AWS Relational Database Service 的 AWS 区域。 | `"us-east-1"` |
| `awsAccessKey` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 中被弃用。请改用 'accessKey'。与 IAM 账户关联的 AWS 访问密钥 | `"AKIAIOSFODNN7EXAMPLE"` |
| `awsSecretKey` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 中被弃用。请改用 'secretKey'。与访问密钥关联的密钥 | `"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"` |
| `awsSessionToken` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 中被弃用。请改用 'sessionToken'。要使用的 AWS 会话令牌。仅当您使用临时安全凭证时才需要会话令牌。 | `"TOKEN"` |

### 其他元数据选项

| 字段 | 必需 | 绑定支持 | 详情 | 示例 |
|--------------------|:--------:|-----|---|---------|
| `timeout` | N | 输出 | 数据库操作的超时时间，格式为 [Go duration](https://pkg.go.dev/time#ParseDuration)。整数将被解释为秒数。默认为 `20s` | `"30s"`, `30` |
| `maxConns` | N | 输出 | 此组件池化的最大连接数。设置为 0 或更小以使用默认值，默认值为 4 或 CPU 数量中的较大者。 | `"4"` |
| `connectionMaxIdleTime` | N | 输出 | 在连接池中自动关闭未使用连接之前的最大空闲时间。默认情况下，没有此值，由数据库驱动程序选择。 | `"5m"` |
| `queryExecMode` | N | 输出 | 控制执行查询的默认模式。默认情况下，Dapr 使用扩展协议并自动准备和缓存预处理语句。但是，这可能与 PGBouncer 等代理不兼容。在这种情况下，使用 `exec` 或 `simple_protocol` 可能更合适。 | `"simple_protocol"` |

### URL 格式

PostgreSQL 绑定内部使用 [pgx connection pool](https://github.com/jackc/pgx)，因此 `connectionString` 参数可以是任何有效的连接字符串，格式为 `DSN` 或 `URL`：

**DSN 示例**

```shell
user=dapr password=secret host=dapr.example.com port=5432 dbname=my_dapr sslmode=verify-ca
```

**URL 示例**

```shell
postgres://dapr:secret@dapr.example.com:5432/my_dapr?sslmode=verify-ca
```

这两种方法也支持连接池配置变量：

- `pool_min_conns`: 整数 0 或更大
- `pool_max_conns`: 大于 0 的整数
- `pool_max_conn_lifetime`: 持续时间字符串
- `pool_max_conn_idle_time`: 持续时间字符串
- `pool_health_check_period`: 持续时间字符串


## 绑定支持

此组件支持**输出绑定**，具有以下操作：

- `exec`
- `query`
- `close`

### 参数化查询

此绑定支持参数化查询，允许将 SQL 查询本身与用户提供的值分开。出于安全原因，**强烈建议**使用参数化查询，因为它们可以防止 [SQL 注入攻击](https://owasp.org/www-community/attacks/SQL_Injection)。

例如：

```sql
-- ❌ 错误！在查询中包含值，并且容易受到 SQL 注入攻击。
SELECT * FROM mytable WHERE user_key = 'something';

-- ✅ 正确！使用参数化查询。
-- 这将使用参数 ["something"] 执行
SELECT * FROM mytable WHERE user_key = $1;
```

### exec

`exec` 操作可用于 DDL 操作（如表创建），以及仅返回元数据（例如受影响的行数）的 `INSERT`、`UPDATE`、`DELETE` 操作。

`params` 属性是一个包含 JSON 编码参数数组的字符串。

**请求**

```json
{
  "operation": "exec",
  "metadata": {
    "sql": "INSERT INTO foo (id, c1, ts) VALUES ($1, $2, $3)",
    "params": "[1, \"demo\", \"2020-09-24T11:45:05Z07:00\"]"
  }
}
```

**响应**

```json
{
  "metadata": {
    "operation": "exec",
    "duration": "294µs",
    "start-time": "2020-09-24T11:13:46.405097Z",
    "end-time": "2020-09-24T11:13:46.414519Z",
    "rows-affected": "1",
    "sql": "INSERT INTO foo (id, c1, ts) VALUES ($1, $2, $3)"
  }
}
```

### query

`query` 操作用于 `SELECT` 语句，它以行值数组的形式返回数据以及元数据。

`params` 属性是一个包含 JSON 编码参数数组的字符串。

**请求**

```json
{
  "operation": "query",
  "metadata": {
    "sql": "SELECT * FROM foo WHERE id < $1",
    "params": "[3]"
  }
}
```

**响应**

```json
{
  "metadata": {
    "operation": "query",
    "duration": "432µs",
    "start-time": "2020-09-24T11:13:46.405097Z",
    "end-time": "2020-09-24T11:13:46.420566Z",
    "sql": "SELECT * FROM foo WHERE id < $1"
  },
  "data": "[
    [0,\"test-0\",\"2020-09-24T04:13:46Z\"],
    [1,\"test-1\",\"2020-09-24T04:13:46Z\"],
    [2,\"test-2\",\"2020-09-24T04:13:46Z\"]
  ]"
}
```

### close

`close` 操作可用于显式关闭数据库连接并将其返回到池中。此操作没有任何响应。

**请求**

```json
{
  "operation": "close"
}
```

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
