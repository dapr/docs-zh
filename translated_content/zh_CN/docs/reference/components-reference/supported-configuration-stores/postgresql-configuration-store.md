---
type: docs
title: "PostgreSQL"
linkTitle: "PostgreSQL"
description: PostgreSQL 配置存储组件的详细信息
aliases:
  - "/operations/components/setup-configuration-store/supported-configuration-stores/setup-postgresql/"
  - "/operations/components/setup-configuration-store/supported-configuration-stores/setup-postgres/"
---

## 组件格式

要设置 PostgreSQL 配置存储，请创建类型为 `configuration.postgresql` 的组件

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: configuration.postgresql
  version: v1
  metadata:
    # Connection string
    - name: connectionString
      value: "host=localhost user=postgres password=example port=5432 connect_timeout=10 database=config"
    # Name of the table which holds configuration information
    - name: table
      value: "[your_configuration_table_name]" 
    # Individual connection parameters - can be used instead to override connectionString parameters
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
    # Timeout for database operations, in seconds (optional)
    #- name: timeoutInSeconds
    #  value: 20
    # Name of the table where to store the state (optional)
    #- name: tableName
    #  value: "state"
    # Name of the table where to store metadata used by Dapr (optional)
    #- name: metadataTableName
    #  value: "dapr_metadata"
    # Cleanup interval in seconds, to remove expired rows (optional)
    #- name: cleanupIntervalInSeconds
    #  value: 3600
    # Maximum number of connections pooled by this component (optional)
    #- name: maxConns
    #  value: 0
    # Max idle time for connections before they're closed (optional)
    #- name: connectionMaxIdleTime
    #  value: 0
    # Controls the default mode for executing queries. (optional)
    #- name: queryExecMode
    #  value: ""
    # Uncomment this if you wish to use PostgreSQL as a state store for actors (optional)
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
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。有关如何定义连接字符串的信息，请参阅 PostgreSQL [数据库连接文档](https://www.postgresql.org/docs/current/libpq-connect.html)。 | `"host=localhost user=postgres password=example port=5432 connect_timeout=10 database=my_db"`

#### 使用单独的连接参数进行身份验证

除了使用连接字符串外，您还可以选择指定单独的连接参数。这些参数等同于标准 PostgreSQL 连接参数。

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
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。<br>必须包含用户，该用户对应于在 PostgreSQL 内部创建的、映射到 Microsoft Entra ID 标识的用户名称；这通常是相应主体的名称（例如 Microsoft Entra ID 应用程序的名称）。此连接字符串不应包含任何密码。  | `"host=mydb.postgres.database.azure.com user=myapplication port=5432 database=my_db sslmode=require"` |
| `azureTenantId` | N | Microsoft Entra ID 租户的 ID | `"cd4b2887-304c-…"` |
| `azureClientId` | N | 客户端 ID（应用程序 ID） | `"c7dd251f-811f-…"` |
| `azureClientSecret` | N | 客户端密钥（应用程序密码） | `"Ecy3X…"` |

### 使用 AWS IAM 进行身份验证

支持使用 AWS IAM 对所有版本的 PostgreSQL 类型组件进行身份验证。
连接字符串中指定的用户必须是数据库中已存在的用户，并且是被授予 `rds_iam` 数据库角色的 AWS IAM 启用用户。
身份验证基于 AWS 身份验证配置文件，或提供的 AccessKey/SecretKey。
AWS 身份验证令牌将在其过期时间之前通过 AWS 动态轮换。

| 字段  | 必需 | 详情 | 示例 |
|--------|:--------:|---------|---------|
| `useAWSIAM` | Y | 必须设置为 `true` 以使组件能够从 AWS IAM 获取访问令牌。此身份验证方法仅适用于 AWS Relational Database Service 的 PostgreSQL 数据库。 | `"true"` |
| `connectionString` | Y | PostgreSQL 数据库的连接字符串。<br>必须包含已存在的用户，该用户对应于在 PostgreSQL 内部创建的、映射到 AWS IAM 策略的用户名称。此连接字符串不应包含任何密码。请注意，使用 AWS 时数据库名称字段由 dbname 表示。 | `"host=mydb.postgres.database.aws.com user=myapplication port=5432 dbname=my_db sslmode=require"`|
| `awsRegion` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 版本中弃用。请改用 'region'。AWS Relational Database Service 部署所在的 AWS 区域。 | `"us-east-1"` |
| `awsAccessKey` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 版本中弃用。请改用 'accessKey'。与 IAM 账户关联的 AWS 访问密钥 | `"AKIAIOSFODNN7EXAMPLE"` |
| `awsSecretKey` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 版本中弃用。请改用 'secretKey'。与访问密钥关联的密钥 | `"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"` |
| `awsSessionToken` | N | 这保持与现有字段的向后兼容性。它将在 Dapr 1.17 版本中弃用。请改用 'sessionToken'。要使用的 AWS 会话令牌。仅在使用临时安全凭证时才需要会话令牌。 | `"TOKEN"` |

### 其他元数据选项

| 字段 | 必需 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `table` | Y | 配置信息的表名，必须为小写。 | `configtable`
| `timeout` | N | 数据库操作的超时时间，格式为 [Go duration](https://pkg.go.dev/time#ParseDuration)。整数被解释为秒数。默认为 `20s` | `"30s"`, `30` |
| `maxConns` | N | 此组件池化的最大连接数。设置为 0 或更低以使用默认值，即 4 或 CPU 数量中的较大值。 | `"4"`
| `connectionMaxIdleTime` | N | 在连接池中自动关闭未使用连接之前的最大空闲时间。默认情况下，没有值，这由数据库驱动程序选择。 | `"5m"`
| `queryExecMode` | N | 控制执行查询的默认模式。默认情况下，Dapr 使用扩展协议并自动准备和缓存预备语句。但是，这可能与 PGBouncer 等代理不兼容。在这种情况下，最好使用 `exec` 或 `simple_protocol`。 | `"simple_protocol"`

## 设置 PostgreSQL 作为配置存储

1. 启动 PostgreSQL 数据库
1. 连接到 PostgreSQL 数据库并按照以下架构设置配置表：

    | 字段              | 数据类型 | 可为空 |详情 |
    |--------------------|:--------:|---------|---------|
    | KEY | VARCHAR | N |保存配置属性的 `"Key"` |
    | VALUE | VARCHAR | N |保存配置属性的 Value |
    | VERSION | VARCHAR | N | 保存配置属性的版本 |
    | METADATA | JSON | Y | 将 Metadata 保存为 JSON |

    ```sql
    CREATE TABLE IF NOT EXISTS table_name (
      KEY VARCHAR NOT NULL,
      VALUE VARCHAR NOT NULL,
      VERSION VARCHAR NOT NULL,
      METADATA JSON
    );
    ```

3. 在配置表上创建 TRIGGER。创建 TRIGGER 的示例函数如下：

   ```sh
   CREATE OR REPLACE FUNCTION notify_event() RETURNS TRIGGER AS $$
       DECLARE 
           data json;
           notification json;

       BEGIN

           IF (TG_OP = 'DELETE') THEN
               data = row_to_json(OLD);
           ELSE
               data = row_to_json(NEW);
           END IF;

           notification = json_build_object(
                             'table',TG_TABLE_NAME,
                             'action', TG_OP,
                             'data', data);
           PERFORM pg_notify('config',notification::text);
           RETURN NULL; 
       END;
   $$ LANGUAGE plpgsql;
   ```

4. 创建触发器，数据封装在标记为 `data` 的字段中：

   ```sql
   notification = json_build_object(
     'table',TG_TABLE_NAME,
     'action', TG_OP,
     'data', data
   );
   ```

5. 订阅配置通知时，应使用作为 `pg_notify` 属性提及的通道
6. 由于这是一个通用创建的触发器，请将此触发器映射到 `配置表`

   ```sql
   CREATE TRIGGER config
   AFTER INSERT OR UPDATE OR DELETE ON configtable
       FOR EACH ROW EXECUTE PROCEDURE notify_event();
   ```

7. 在订阅请求中添加一个额外的元数据字段，键为 `pgNotifyChannel`，值应设置为 `pg_notify` 中提及的相同 `通道名称`。根据上面的示例，应将其设置为 `config`

{{% alert title="注意" color="primary" %}}
调用 `subscribe` API 时，应使用 `metadata.pgNotifyChannel` 来指定要监听来自 PostgreSQL 配置存储的通知的通道名称。

可以向订阅请求添加任意数量的键。每个订阅使用一个独占的数据库连接。强烈建议在单个订阅中订阅多个键。这有助于优化到数据库的连接数。

订阅 HTTP API 示例：

```sh
curl -l 'http://<host>:<dapr-http-port>/configuration/mypostgresql/subscribe?key=<keyname1>&key=<keyname2>&metadata.pgNotifyChannel=<channel name>'
```
{{% /alert %}}

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [配置构建块]({{% ref configuration-api-overview %}})
