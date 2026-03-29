---
type: docs
title: "Oracle Database"
linkTitle: "Oracle Database"
description: Oracle Database 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-oracledatabase/"
---

## 组件格式

创建一个组件属性 yaml 文件，例如命名为 `oracle.yaml`（但可以命名为任何名称），粘贴以下内容并将 `<CONNECTION STRING>` 值替换为你的连接字符串。连接字符串是一个标准的 Oracle Database 连接字符串，格式为：`"oracle://user/password@host:port/servicename"`，例如 `"oracle://demo:demo@localhost:1521/xe"`。

如果你使用 Oracle Wallet 连接数据库，应该为 `oracleWalletLocation` 属性指定一个值，例如：`"/home/app/state/Wallet_daprDB/"`；这应该指向本地文件系统目录，该目录包含从 Oracle Wallet 归档文件中提取的 `cwallet.sso` 文件。

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
  # 如果你想将 Oracle Database 用作 actor 的状态存储，请取消注释（可选）
  #- name: actorStateStore
  #  value: "true"
```
{{% alert title="Warning" color="warning" %}}
上述示例将 secret 作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用 secret store 来管理 secret。
{{% /alert %}}

## 规范元数据字段

| Field              | Required | Details | Example |
|--------------------|:--------:|---------|---------|
| connectionString   | Y        | Oracle Database 的连接字符串 | 例如 `"oracle://user/password@host:port/servicename"` 即 `"oracle://demo:demo@localhost:1521/xe"`，对于 Autonomous Database 则为 `"oracle://states_schema:State12345pw@adb.us-ashburn-1.oraclecloud.com:1522/k8j2agsqjsw_daprdb_low.adb.oraclecloud.com"`
| oracleWalletLocation    | N         | Oracle Wallet 文件内容的位置（连接 OCI 上的 Autonomous Database 所需）| `"/home/app/state/Wallet_daprDB/"`
| tableName    | N         | 此状态存储实例记录数据的数据库表名称，默认为 `"STATE"`| `"MY_APP_STATE_STORE"`
| actorStateStore    | N        | 是否将此状态存储用于 actor。默认为 `"false"` | `"true"`, `"false"`

## 运行时会发生什么？
当状态存储组件初始化时，它会连接到 Oracle Database 并检查是否存在与 `tableName` 指定名称相同的表。如果不存在，它会创建此表（包含 Key、Value、Binary_YN、ETag、Creation_Time、Update_Time、Expiration_time 列）。

每个状态条目由数据库表中的一条记录表示。请求中提供的 `key` 属性用于确定存储在 KEY 列中的对象的名称。`value` 作为对象的内容存储。二进制内容以 Base64 编码文本的形式存储。每个对象在创建或更新时都会被分配一个唯一的 ETag 值。

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


Dapr 使用固定 key 方案和*组合键*在应用程序之间分区状态。对于一般状态，key 格式为：
`App-ID||state key`。Oracle Database 状态存储将此 key 完整映射到 KEY 列。

你可以轻松地使用 SQL 查询检查 `tableName` 表中存储的所有状态，例如 STATE 表。


## 生存时间和状态过期
Oracle Database 状态存储组件支持 Dapr 的生存时间逻辑，确保过期后无法检索状态。有关详细信息，请参阅[关于设置状态生存时间的 How To]({{% ref "state-store-ttl.md" %}})。

Oracle Database 没有对生存时间设置的内置支持。此组件中的实现使用名为 `EXPIRATION_TIME` 的列来保存记录被视为*过期*之后的时间。只有在 `Set` 请求中指定了 TTL 时，才会设置此列中的值。它被计算为当前 UTC 时间戳加上 TTL 周期。当通过 `Get` 调用检索状态时，此组件会检查是否设置了 `EXPIRATION_TIME`，如果设置了，它会检查该时间是否已过去。在这种情况下，不返回任何状态。

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

创建以下对象：

| KEY | VALUE | CREATION_TIME  |EXPIRATION_TIME  | BINARY_YN | ETAG |
| ------------ | ------- | ----- | ----- | ---- |---- |
| temporary | ephemeral | 2022-03-31T22:11:00 |2022-03-31T22:13:00 | N | 79dfb504-5b27-43f6-950f-d55d5ae0894f |

其中 EXPIRATION_TIME 被设置为比 CREATION_TIME 晚 2 分钟（120 秒）的时间戳

请注意，过期状态不会被此组件从状态存储中删除。应用程序操作员可能会决定运行一个定期作业来执行某种形式的垃圾回收，以显式删除所有 EXPIRATION_TIME 在过去的记录。用于收集过期垃圾记录的 SQL 语句：
   ```SQL
    delete dapr_state 
    where  expiration_time < SYS_EXTRACT_UTC(SYSTIMESTAMP);
   ```

## 并发

Oracle Database 状态存储中的并发是通过使用 `ETag` 实现的。在 Oracle Database 状态存储中记录的每条状态在创建或更新时都会被分配一个唯一的 ETag——一个存储在 ETag 列中的生成的唯一字符串。注意：当对现有记录执行 `Set` 操作时，UPDATE_TIME 列也会被更新。

只有当此状态存储的 `Set` 和 `Delete` 请求指定 *FirstWrite* 并发策略时，请求才需要提供要写入或删除的状态的实际 ETag 值，请求才能成功。如果指定了不同或没有并发策略，则不会对 ETag 值执行检查。

## 一致性

Oracle Database 状态存储支持事务。多个 `Set` 和 `Delete` 命令可以组合在一个请求中，该请求作为单个原子事务处理。

注意：简单的 `Set` 和 `Delete` 操作本身就是事务；当 `Set` 或 `Delete` 请求返回 HTTP-20X 结果时，数据库事务已成功提交。

## 查询

Oracle Database 状态存储目前不支持查询 API。



## 创建 Oracle Database 和用户模式

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}

1. 运行 Oracle Database 实例。你可以使用以下命令在 Docker CE 中运行 Oracle Database 的本地实例——或者当然使用现有的 Oracle Database：     
     ```bash
     docker run -d -p 1521:1521 -e ORACLE_PASSWORD=TheSuperSecret1509! gvenzl/oracle-xe
     ```
    此示例未描述生产配置，因为它以纯文本形式为用户 `SYS` 和 `SYSTEM` 设置密码。

     当命令的输出指示容器正在运行时，使用 `docker ps` 命令了解容器 id。然后使用以下命令启动 shell 会话：
     ```bash
     docker exec -it <container id> /bin/bash
     ```
     随后运行 SQL*Plus 客户端，以 SYS 用户身份连接到数据库：
     ```bash
     sqlplus sys/TheSuperSecret1509! as sysdba
     ```

2. 为状态数据创建数据库模式。创建一个新的用户模式——例如名为 *dapr*——用于存储状态数据。授予此用户（模式）创建表和在关联表空间中存储数据的权限。

    要在 Oracle Database 中创建新的用户模式，请运行以下 SQL 命令：

    ```SQL
    create user dapr identified by DaprPassword4239 default tablespace users quota unlimited on users;
    grant create session, create table to dapr;
    ```

3. （可选）创建用于存储状态记录的表。
Oracle Database 状态存储组件检查存储状态的表是否已存在于它连接的数据库用户模式中，如果不存在，它会创建该表。但是，除了让 Oracle Database 状态存储组件在运行时创建用于存储状态记录的表之外，你还可以提前创建表。这为你——或数据库的 DBA——提供对表的物理配置的更多控制。这也意味着你不必将*创建表*权限授予用户模式。

    运行以下 DDL 语句以在 *dapr* 数据库用户模式中创建用于存储状态的表：

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

{{% tab "Autonomous Database on OCI" %}}

1. 在 Oracle Cloud Infrastructure 上创建免费（或付费）的自治事务处理（ATP）或 ADW（自治数据仓库）实例，如 [OCI 永久免费自治数据库文档](https://docs.oracle.com/en/cloud/paas/autonomous-database/adbsa/autonomous-always-free.html#GUID-03F9F3E8-8A98-4792-AB9C-F0BACF02DC3E) 中所述。

    你需要提供用户 ADMIN 的密码。你使用此帐户（至少最初）用于数据库管理活动。你可以在基于 Web 的 SQL Developer 工具、其桌面对应工具或许多数据库开发工具中的任何一个中工作。

2. 为状态数据创建模式。
在 Oracle Database 中创建一个新的用户模式用于存储状态数据——例如使用 ADMIN 帐户。授予这个新用户（模式）创建表和在关联表空间中存储数据的权限。

    要在 Oracle Database 中创建新的用户模式，请运行以下 SQL 命令：

    ```SQL
    create user dapr identified by DaprPassword4239 default tablespace users quota unlimited on users;
    grant create session, create table to dapr;
    ```

3. （可选）创建用于存储状态记录的表。
Oracle Database 状态存储组件检查存储状态的表是否已存在于它连接的数据库用户模式中，如果不存在，它会创建该表。但是，除了让 Oracle Database 状态存储组件在运行时创建用于存储状态记录的表之外，你还可以提前创建表。这为你——或数据库的 DBA——提供对表的物理配置的更多控制。这也意味着你不必将*创建表*权限授予用户模式。

    运行以下 DDL 语句以在 *dapr* 数据库用户模式中创建用于存储状态的表：

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
- 阅读[本指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
