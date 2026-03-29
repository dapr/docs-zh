---
type: docs
title: "MySQL & MariaDB"
linkTitle: "MySQL & MariaDB"
description: MySQL 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-mysql/"
---

## 组件格式

MySQL 状态存储组件允许连接到 MySQL 和 MariaDB 数据库。在本文档中，我们使用 "MySQL" 来指代这两种数据库。

要设置 MySQL 状态存储，请创建一个类型为 `state.mysql` 的组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.mysql
  version: v1
  metadata:
  - name: connectionString
    value: "<CONNECTION STRING>"
  - name: schemaName
    value: "<SCHEMA NAME>"
  - name: tableName
    value: "<TABLE NAME>"
  - name: timeoutInSeconds
    value: "30"
  - name: pemPath # 如果未提供 pemContents 则必需。Pem 文件的路径。
    value: "<PEM PATH>"
  - name: pemContents # 如果未提供 pemPath 则必需。Pem 值。
    value: "<PEM CONTENTS>"    
# 如果您希望将 MySQL & MariaDB 用作 actor 的状态存储，请取消此注释（可选）
  #- name: actorStateStore
  #  value: "true"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

如果您希望将 MySQL 用作 actor 存储，请在 yaml 中添加以下内容。

```yaml
  - name: actorStateStore
    value: "true"
```

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `connectionString`   | Y        | 连接到 MySQL 的连接字符串。不要将 schema 添加到连接字符串中 | [非 SSL 连接](#non-ssl-connection)：`"<user>:<password>@tcp(<server>:3306)/?allowNativePasswords=true"`，[强制 SSL 连接](#enforced-ssl-connection)：  `"<user>:<password>@tcp(<server>:3306)/?allowNativePasswords=true&tls=custom"`|
| `schemaName`         | N        | 要使用的 schema 名称。如果 schema 不存在将创建。默认为 `"dapr_state_store"`  | `"custom_schema"`，`"dapr_schema"` |
| `tableName`          | N        | 要使用的表名称。如果表不存在将创建。默认为 `"state"` | `"table_name"`，`"dapr_state"` |
| `timeoutInSeconds`   | N        | 所有数据库操作的超时时间。默认为 `20` | `30` |
| `pemPath`            | N        | 用于[强制 SSL 连接](#enforced-ssl-connection)的 PEM 文件的完整路径，如果未提供 pemContents 则必需。不能在 K8s 环境中使用 | `"/path/to/file.pem"`，`"C:\path\to\file.pem"` |
| `pemContents`        | N        | 用于[强制 SSL 连接](#enforced-ssl-connection)的 PEM 文件内容，如果未提供 pemPath 则必需。可在 K8s 环境中使用 | `"pem value"` |
| `cleanupIntervalInSeconds` | N | 清理过期 TTL 行的间隔（秒）。默认：`3600`（即 1 小时）。将此值设置为 <=0 将禁用定期清理。 | `1800`，`-1`
| `actorStateStore`    | N        | 将此状态存储用于 actor。默认为 `"false"` | `"true"`，`"false"`

## 设置 MySQL

Dapr 可以使用任何 MySQL 实例——容器化的、在本地开发机器上运行的，或托管云服务。

{{< tabpane text=true >}}

{{% tab "自托管" %}}
<!-- Self-Hosted -->

运行一个 MySQL 实例。您可以使用以下命令在 Docker CE 中运行本地 MySQL 实例：

此示例未描述生产配置，因为它以纯文本形式设置密码，并且用户名保留为 MySQL 默认值 "root"。

```bash
docker run --name dapr-mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=my-secret-pw -d mysql:latest
```

{{% /tab %}}

{{% tab "Kubernetes" %}}
<!-- Kubernetes -->

我们可以使用 [Helm](https://helm.sh/) 在 Kubernetes 集群中快速创建 MySQL 实例。此方法需要[安装 Helm](https://github.com/helm/helm#install)。

1. 将 MySQL 安装到您的集群中。

    ```bash
    helm repo add bitnami https://charts.bitnami.com/bitnami
    helm install dapr-mysql bitnami/mysql
    ```

1. 运行 `kubectl get pods` 查看集群中现在正在运行的 MySQL 容器。

1. 接下来，我们将获取密码，根据我们使用的操作系统，密码的获取方式略有不同：
    - **Windows**：运行 `[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($(kubectl get secret --namespace default dapr-mysql -o jsonpath="{.data.mysql-root-password}")))` 并复制输出的密码。

    - **Linux/MacOS**：运行 `kubectl get secret --namespace default dapr-mysql -o jsonpath="{.data.mysql-root-password}" | base64 --decode` 并复制输出的密码。

1. 使用密码您可以构建连接字符串。

{{% /tab %}}

{{% tab "Azure" %}}
<!-- Azure -->

[Azure MySQL](http://bit.ly/AzureMySQL)

如果您使用 [Azure 上的 MySQL](http://bit.ly/AzureMySQLSSL)，请参阅 Azure 关于 SSL 数据库连接的[文档](http://bit.ly/MySQLSSL)，了解如何下载所需证书的信息。

{{% /tab %}}

{{% tab "AWS" %}}
<!-- AWS -->

[AWS MySQL](https://aws.amazon.com/rds/mysql/)

{{% /tab %}}

{{% tab "GCP" %}}
<!-- GCP -->

[GCP MySQL](https://cloud.google.com/sql/docs/mysql/features)

{{% /tab %}}

{{< /tabpane >}}

### 非 SSL 连接

将 `<CONNECTION STRING>` 值替换为您的连接字符串。连接字符串是标准的 MySQL 连接字符串。例如，`"<user>:<password>@tcp(<server>:3306)/?allowNativePasswords=true"`。

### 强制 SSL 连接

如果您的服务器需要 SSL，连接字符串必须以 `&tls=custom` 结尾，例如，`"<user>:<password>@tcp(<server>:3306)/?allowNativePasswords=true&tls=custom"`。您必须将 `<PEM PATH>` 替换为 PEM 文件的完整路径。与 MySQL 的连接需要最低 1.2 版本的 TLS。

### TTL 和清理

此状态存储支持 Dapr 存储记录的 [Time-To-Live (TTL)]({{% ref state-store-ttl.md %}})。使用 Dapr 存储数据时，您可以设置 `ttlInSeconds` 元数据属性以指示何时应将数据视为"过期"。

由于 MySQL 没有对 TTL 的内置支持，这是通过在状态表中添加一列来实现的，该列指示数据何时被视为"过期"。被视为"过期"的记录不会返回给调用者，即使它们仍然物理存储在数据库中。后台"垃圾收集器"会定期扫描状态表中的过期行并将其删除。

删除过期记录的间隔是通过 `cleanupIntervalInSeconds` 元数据属性设置的，默认为 3600 秒（即 1 小时）。

- 较长的间隔需要较少频率地扫描过期行，但可能需要存储过期记录更长的时间，可能需要更多的存储空间。如果您计划在状态表中存储许多具有短 TTL 的记录，请考虑将 `cleanupIntervalInSeconds` 设置为较小的值，例如 `300`（300 秒，或 5 分钟）。
- 如果您不计划对 Dapr 和 MySQL 状态存储使用 TTL，您应该考虑将 `cleanupIntervalInSeconds` 设置为 <= 0 的值（例如 `0` 或 `-1`）以禁用定期清理并减少数据库的负载。

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读此[指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
