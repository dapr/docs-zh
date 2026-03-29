---
type: docs
title: "如何查询状态"
linkTitle: "如何查询状态"
weight: 250
description: "使用查询 API 查询状态存储"
---

{{% alert title="alpha" color="warning" %}}
状态查询 API 处于 **alpha** 阶段。
{{% /alert %}}


通过状态查询 API，您可以检索、筛选和排序存储在状态存储组件中的键/值数据。查询 API 不能替代完整的查询语言。

尽管状态存储是键/值存储，但 `value` 可能是包含自身层级、键和值的 JSON 文档。查询 API 允许您使用这些键/值来检索相应的文档。

## 查询状态

通过 HTTP POST/PUT 或 gRPC 提交查询请求。请求体是一个包含 3 个条目的 JSON map：

- `filter`
- `sort`
- `page`

### `filter`

`filter` 以树的形式指定查询条件，其中每个节点表示一元或多操作数运算。

支持以下运算符：

| 运算符 | 操作数 | 描述 |
|----------|-------------|--------------------------------------------------------------|
| `EQ`     | key:value   | key == value                                                 |
| `NEQ`    | key:value   | key != value                                                 |
| `GT`     | key:value   | key > value                                                  |
| `GTE`    | key:value   | key >= value                                                 |
| `LT`     | key:value   | key < value                                                  |
| `LTE`    | key:value   | key <= value                                                 |
| `IN`     | key:[]value | key == value[0] OR key == value[1] OR ... OR key == value[n] |
| `AND`    | []operation |  operation[0] AND operation[1] AND ... AND operation[n] |
| `OR`     | []operation |  operation[0] OR operation[1] OR ... OR operation[n] |

操作数中的 `key` 类似于 JSONPath 表示法。key 中的每个点表示嵌套的 JSON 结构。例如，考虑以下结构：

```json
{
  "shape": {
    "name": "rectangle",
    "dimensions": {
      "height": 24,
      "width": 10
    },
    "color": {
      "name": "red",
      "code": "#FF0000"
    }
  }
}
```

要比较颜色代码的值，key 将是 `shape.color.code`。

如果省略 `filter` 部分，查询将返回所有条目。

### `sort`

`sort` 是一个有序的 `key:order` 对数组，其中：

- `key` 是状态存储中的键
- `order` 是一个可选的字符串，表示排序顺序：
  - `"ASC"` 表示升序
  - `"DESC"` 表示降序
  如果省略，默认升序。

### `page`

`page` 包含 `limit` 和 `token` 参数。

- `limit` 设置页面大小。
- `token` 是组件返回的迭代令牌，用于后续查询。

在后台，此查询请求被转换为原生查询语言并由状态存储组件执行。

## 示例数据和查询

让我们看一些从简单到复杂的真实示例。

作为数据集，请考虑包含员工 ID、组织、州和城市的[员工记录集合](../query-api-examples/dataset.json)。请注意，此数据集是键/值对数组，其中：

- `key` 是唯一 ID
- `value` 是包含员工记录的 JSON 对象。

为了更好地说明功能，组织名称（org）和员工 ID（id）是嵌套的 JSON person 对象。

首先创建一个 MongoDB 实例，作为您的状态存储。

```bash
docker run -d --rm -p 27017:27017 --name mongodb mongo:5
```

接下来，启动一个 Dapr 应用程序。请参考[组件配置文件](../query-api-examples/components/mongodb/mongodb.yml)，该文件指示 Dapr 使用 MongoDB 作为其状态存储。

```bash
dapr run --app-id demo --dapr-http-port 3500 --resources-path query-api-examples/components/mongodb
```

使用员工数据集填充状态存储，以便稍后查询。

```bash
curl -X POST -H "Content-Type: application/json" -d @query-api-examples/dataset.json http://localhost:3500/v1.0/state/statestore
```

填充后，您可以检查状态存储中的数据。下图中，MongoDB UI 的一部分显示了员工记录。

<img src="/images/state-management-query-mongodb-dataset.png" width=500 alt="Sample dataset" class="center">

每个条目都有 `_id` 成员作为连接的对象键，以及包含 JSON 记录的 `value` 成员。

查询 API 允许您从这个 JSON 结构中选择记录。

现在您可以运行示例查询了。

### 示例 1

首先，找到所有在加利福尼亚州的员工，并按员工 ID 降序排列。

这是[查询](../query-api-examples/query1.json)：
```json
{
    "filter": {
        "EQ": { "state": "CA" }
    },
    "sort": [
        {
            "key": "person.id",
            "order": "DESC"
        }
    ]
}
```

此查询在 SQL 中的等价形式为：

```sql
SELECT * FROM c WHERE
  state = "CA"
ORDER BY
  person.id DESC
```

使用以下命令执行查询：

{{< tabpane text=true >}}

{{% tab "HTTP API (Bash)" %}}

```bash
curl -s -X POST -H "Content-Type: application/json" -d @query-api-examples/query1.json http://localhost:3500/v1.0-alpha1/state/statestore/query | jq .
```

{{% /tab %}}

{{% tab "HTTP API (PowerShell)")}}

```powershell
Invoke-RestMethod -Method Post -ContentType 'application/json' -InFile query-api-examples/query1.json -Uri 'http://localhost:3500/v1.0-alpha1/state/statestore/query'
```

{{% /tab %}}
</parameter>
</invoke>
</minimax:tool_call>
