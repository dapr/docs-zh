---
type: docs
title: "Oracle Database"
linkTitle: "Oracle Database"
description: Oracle Database 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-oracledatabase/"
---

## 组件格式

创建一个组件属性 yaml 文件，例如命名为 `oracle.yaml`（名称可以任意），粘贴以下内容，并将 `<CONNECTION STRING>` 的值替换为你的连接字符串。连接字符串是标准的 Oracle Database 连接字符串，格式为：`"oracle://user/password@host:port/servicename"`，例如 `"oracle://demo:demo@localhost:1521/xe"`。 

如果你使用 Oracle Wallet 连接数据库，应为 `oracleWalletLocation` 属性指定一个值，例如：`"/home/app/state/Wallet_daprDB/"`。该值应指向本地文件系统中的一个目录，此目录需包含从 Oracle Wallet 归档文件中解压出的 `cwallet.sso` 文件。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.oracledatabase
  version: v1
  metadata:
  - name: connectionString
    value: "<CONNECTION STRING>"
  - name: oracleWalletLocation
    value: "<FULL PATH TO DIRECTORY WITH ORACLE WALLET CONTENTS >"  # 可选，无默认值
  - name: tableName
    value: "<NAME OF DATABASE TABLE TO STORE STATE IN >" # 可选，默认为 STATE
  - name: bulkGetChunkSize
    value: "1000" # 可选，默认为 1000（上限受 Oracle 的 IN 列表表达式限制）
  # 如果你希望将 Oracle Database 用作 Actor 的状态存储，请取消注释（可选）
  #- name: actorStateStore
  #  value: "true"
```
{{% alert title="Warning" color="warning" %}}
上述示例将机密以纯字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})的说明，使用机密存储来管理机密。
{{% /alert %}}

## 规范元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| connectionString   | Y        | Oracle Database 的连接字符串 | `"oracle://user/password@host:port/servicename"`，例如 `"oracle://demo:demo@localhost:1521/xe"`，或 Autonomous Database 的 `"oracle://states_schema:State12345pw@adb.us-ashburn-1.oraclecloud.com:1522/k8j2agsqjsw_daprdb_low.adb.oraclecloud.com"`
| oracleWalletLocation    | N         | Oracle Wallet 文件内容的位置（连接 OCI 上的 Autonomous Database 时必需）| `"/home/app/state/Wallet_daprDB/"`
| tableName    | N         | 此状态存储实例记录数据所使用的数据库表名称，默认为 `"STATE"`| `"MY_APP_STATE_STORE"`
| bulkGetChunkSize    | N         | BulkGet 时每次内部 SQL 查询所使用的最大键数。当请求的键总数超过此值时，将依次执行多次分块查询。有效值为 1 到 1000（[Oracle 的 IN 列表表达式限制](https://docs.oracle.com/en/database/oracle/oracle-database/21/sqlrf/IN-Condition.html)）。小于或等于 0 的值使用默认值。大于 1000 的值会被分块，并记录一条警告日志。默认为 `"1000"` | `"100"`
| actorStateStore    | N        | 是否将此状态存储用于 Actor。默认为 `"false"` | `"true"`, `"false"`
| maxOpenConns     | N        | 与数据库的最大打开连接数。默认无限制（Go 默认值：`0`） | `"10"`
| maxIdleConns     | N        | 连接池中的最大空闲连接数。默认为 Go 的默认值（`2`） | `"5"`
| connMaxLifetime  | N        | 连接的最长存活时间，格式为 [Go duration](https://pkg.go.dev/time#ParseDuration)。默认情况下连接会被永久复用 | `"30s"`, `"5m"`
| connMaxIdleTime  | N        | 连接在被关闭前的最长空闲时间，格式为 [Go duration](https://pkg.go.dev/time#ParseDuration)。默认无限制 | `"5m"`

## 运行时会发生什么？
当状态存储组件初始化时，它会连接到 Oracle Database，并检查是否存在名称为 `tableName` 所指定的表。如果不存在，它会创建该表（包含 Key、Value、Binary_YN、ETag、Creation_Time、Update_Time、Expiration_time 列）。

每个状态条目都由数据库表中的一条记录表示。请求中提供的 `key` 属性用于确定字面存储在 KEY 列中的对象名称。`value` 作为对象的内容存储。二进制内容以 Base64 编码文本的形式存储。每个对象在创建或更新时都会被分配一个唯一的 ETag 值。

例如，以下操作

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

会在表 STATE 中创建以下记录：

| KEY | VALUE | CREATION_TIME  | BINARY_YN | ETAG |
| ------------ | ------- | ----- | ----- | ---- |
| nihilus | darth | 2022-02-14T22:11:00 | N | 79dfb504-5b27-43f6-950f-d55d5ae0894f |


Dapr 使用固定的键方案和*组合键*在应用程序之间对状态进行分区。对于一般状态，键的格式为：
`App-ID||state key`。Oracle Database 状态存储会将该键的完整内容映射到 KEY 列。

你可以使用针对 `tableName` 表（例如 STATE 表）的 SQL 查询，轻松检查所有已存储的状态。


## 生存时间与状态过期
Oracle Database 状态存储组件支持 Dapr 的生存时间（Time To Live）逻辑，确保过期的状态无法被检索。详情请参阅[有关设置状态生存时间的操作指南]({{% ref "state-store-ttl.md" %}})。

Oracle Database 没有原生的生存时间设置支持。本组件通过名为 `EXPIRATION_TIME` 的列来保存记录被视为*已过期*的时间点。仅当 `Set` 请求中指定了 TTL 时，才会设置该列的值。其值为当前 UTC 时间戳加上 TTL 时长。通过 `Get` 调用检索状态时，本组件会检查是否设置了 `EXPIRATION_TIME`，若已设置，则判断该时间是否已经过去。若已过去，则不返回任何状态。

以下操作：

```shell
curl -X POST http://localhost:3500/v1.0/state \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "temporary",
          "value": "ephemeral",
          "metadata": {"ttlInSeconds": "120"}}
        }
      ]'
```

会创建以下对象：

| KEY | VALUE | CREATION_TIME  |EXPIRATION_TIME  | BINARY_YN | ETAG |
| ------------ | ------- | ----- | ----- | ---- |---- |
| temporary | ephemeral | 2022-03-31T22:11:00 |2022-03-31T22:13:00 | N | 79dfb504-5b27-43f6-950f-d55d5ae0894f |

其中 EXPIRATION_TIME 被设置为比 CREATION_TIME 晚 2 分钟（120 秒）的时间点

请注意，过期的状态不会被本组件从状态存储中删除。应用程序运维人员可以选择定期运行一个作业，执行某种形式的垃圾回收，以显式删除所有 EXPIRATION_TIME 已过去的记录。用于收集过期垃圾记录的 SQL 语句如下：
   ```SQL
    delete dapr_state 
    where  expiration_time < SYS_EXTRACT_UTC(SYSTIMESTAMP);
   ```

## 并发

Oracle Database 状态存储中的并发通过使用 `ETag` 实现。在 Oracle Database 状态存储中记录的每个状态，在创建或更新时都会被分配一个唯一的 ETag，即存储在 ETag 列中的生成的唯一字符串。注意：对现有记录执行 `Set` 操作时，UPDATE_TIME 列也会被更新。

只有当此状态存储的 `Set` 和 `Delete` 请求指定了 *FirstWrite* 并发策略时，请求才必须提供要写入或删除的状态的实际 ETag 值，请求才能成功。如果指定了其他并发策略，或未指定并发策略，则不会对 ETag 值进行检查。

## 一致性

Oracle Database 状态存储支持事务。多个 `Set` 和 `Delete` 命令可以组合在同一个请求中，作为单个原子事务进行处理。

注意：单独的 `Set` 和 `Delete` 操作本身即为一个事务；当 `Set` 或 `Delete` 请求返回 HTTP-20X 结果时，数据库事务已成功提交。

## 查询

Oracle Database 状态存储目前不支持查询 API。



## 创建 Oracle Database 和用户模式

{{< tabpane text=true >}}

{{% tab "自托管" %}}

1. 运行一个 Oracle Database 实例。你可以使用以下命令在 Docker CE 中运行本地 Oracle Database 实例，当然也可以使用现有的 Oracle Database：     
     ```bash
     docker run -d -p 1521:1521 -e ORACLE_PASSWORD=TheSuperSecret1509! gvenzl/oracle-xe
     ```
    此示例不代表生产环境配置，因为它以明文形式为用户 `SYS` 和 `SYSTEM` 设置了密码。

     当命令输出表明容器正在运行后，使用 `docker ps` 命令获取容器 ID。然后使用以下命令启动一个 shell 会话：
     ```bash
     docker exec -it <container id> /bin/bash
     ```
     接着运行 SQL*Plus 客户端，以 SYS 用户身份连接到数据库：
     ```bash
     sqlplus sys/TheSuperSecret1509! as sysdba
     ```

2. 为状态数据创建数据库模式。创建一个新的用户模式（例如名为 *dapr*）用于存储状态数据。授予此用户（模式）在关联表空间中创建表和存储数据的权限。

    要在 Oracle Database 中创建新的用户模式，请运行以下 SQL 命令：

    ```SQL
    create user dapr identified by DaprPassword4239 default tablespace users quota unlimited on users;
    grant create session, create table to dapr;
    ```

3. （可选）创建用于存储状态记录的表。
Oracle Database 状态存储组件会检查用于存储状态的表是否已存在于其所连接的数据库用户模式中，如果不存在，它会创建该表。不过，除了让 Oracle Database 状态存储组件在运行时创建用于存储状态记录的表之外，你也可以提前创建该表。这样你（或数据库的 DBA）就能更好地控制表的物理配置。同时，你也无需向该用户模式授予*创建表*的权限。

    运行以下 DDL 语句，在 *dapr* 数据库用户模式中创建用于存储状态的表：

    ```SQL
    CREATE TABLE dapr_state (
			key varchar2(2000) NOT NULL PRIMARY KEY,
			value clob NOT NULL,
			binary_yn varchar2(1) NOT NULL,
			etag varchar2(50)  NOT NULL,
			creation_time TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL ,
			expiration_time TIMESTAMP WITH TIME ZONE NULL,
			update_time TIMESTAMP WITH TIME ZONE NULL
      )
    ```
{{% /tab %}}

{{% tab "OCI 上的 Autonomous Database" %}}

1. 在 Oracle Cloud Infrastructure 上创建一个免费（或付费）的 Autonomous Transaction Processing（ATP）或 ADW（Autonomous Data Warehouse）实例，具体步骤见 [OCI 文档中关于永久免费 Autonomous Database 的说明](https://docs.oracle.com/en/cloud/paas/autonomous-database/adbsa/autonomous-always-free.html#GUID-03F9F3E8-8A98-4792-AB9C-F0BACF02DC3E)。

    你需要为用户 ADMIN 提供密码。你（至少在最初阶段）会使用此账户进行数据库管理活动。你可以在基于 Web 的 SQL Developer 工具、其桌面版本，或众多数据库开发工具中的任意一种里进行操作。

2. 为状态数据创建模式。
在 Oracle Database 中创建一个新的用户模式用于存储状态数据，例如使用 ADMIN 账户创建。授予该新用户（模式）在关联表空间中创建表和存储数据的权限。

    要在 Oracle Database 中创建新的用户模式，请运行以下 SQL 命令：

    ```SQL
    create user dapr identified by DaprPassword4239 default tablespace users quota unlimited on users;
    grant create session, create table to dapr;
    ```

3. （可选）创建用于存储状态记录的表。
Oracle Database 状态存储组件会检查用于存储状态的表是否已存在于其所连接的数据库用户模式中，如果不存在，它会创建该表。不过，除了让 Oracle Database 状态存储组件在运行时创建用于存储状态记录的表之外，你也可以提前创建该表。这样你（或数据库的 DBA）就能更好地控制表的物理配置。同时，你也无需向该用户模式授予*创建表*的权限。

    运行以下 DDL 语句，在 *dapr* 数据库用户模式中创建用于存储状态的表：

    ```SQL
    CREATE TABLE dapr_state (
			key varchar2(2000) NOT NULL PRIMARY KEY,
			value clob NOT NULL,
			binary_yn varchar2(1) NOT NULL,
			etag varchar2(50)  NOT NULL,
			creation_time TIMESTAMP WITH TIME ZONE DEFAULT SYSTIMESTAMP NOT NULL ,
			expiration_time TIMESTAMP WITH TIME ZONE NULL,
			update_time TIMESTAMP WITH TIME ZONE NULL
      )
    ```

{{% /tab %}}


{{< /tabpane >}}

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})，了解如何配置状态存储组件
- [状态管理构建块]({{% ref state-management %}})
