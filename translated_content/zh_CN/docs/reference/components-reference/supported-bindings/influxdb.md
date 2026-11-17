---
type: docs
title: "InfluxDB binding 规范"
linkTitle: "InfluxDB"
description: "InfluxDB binding component 的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/influxdb/"
---

## component 格式

要设置 InfluxDB binding，请创建一个类型为 `bindings.influx` 的 component。关于如何创建并应用 binding 配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.influx
  version: v1
  metadata:
  - name: url # 必填
    value: "<INFLUX-DB-URL>"
  - name: token # 必填
    value: "<TOKEN>"
  - name: org # 必填
    value: "<ORG>"
  - name: bucket # 必填
    value: "<BUCKET>"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述，使用 secret store 来管理密钥。
{{% /alert %}}

## 规范 metadata 字段

| 字段              | 必填 | binding 支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `url`  | Y | Output | InfluxDB 实例的 URL| `"http://localhost:8086"` |
| `token` | Y | Output | InfluxDB 的授权令牌 | `"mytoken"` |
| `org` | Y | Output | InfluxDB 组织 | `"myorg"` |
| `bucket` | Y | Output | 要写入的 Bucket 名称 | `"mybucket"` |

## binding 支持

此 component 支持**output binding**，包含以下操作：

- `create`
- `query`

### 创建

要向 InfluxDB 写入数据点，请在请求中使用 `create` 操作，并提供 `measurement`、`tags` 和 `values` 键。`tags` 与 `values` 的格式分别是 [InfluxDB 行协议](https://docs.influxdata.com/influxdb/v2/reference/syntax/line-protocol/)中的标签集和字段集，例如 `host=serverA,region=us-west` 和 `temperature=25.3`：

```shell
curl -X POST http://localhost:3500/v1.0/bindings/myInfluxBinding \
  -H "Content-Type: application/json" \
  -d "{
        \"data\": {
          \"measurement\": \"temperature\",
          \"tags\": \"host=serverA,region=us-west\",
          \"values\": \"value=25.3\"
        },
        \"operation\": \"create\"
      }"
```

### 查询

要查询 InfluxDB，请使用 `query` 操作，并在调用的 metadata 中提供一个 `raw` 键，其值为查询语句：

```
curl -X POST http://localhost:3500/v1.0/bindings/myInfluxBinding \
  -H "Content-Type: application/json" \
  -d "{
        \"metadata\": {
          \"raw\": "SELECT * FROM 'sith_lords'"
        },
        \"operation\": \"query\"
      }"
```

## 相关链接

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [binding building block]({{% ref bindings %}})
- [如何操作：使用 input binding 触发应用]({{% ref howto-triggers.md %}})
- [如何操作：使用 binding 与外部资源交互]({{% ref howto-bindings.md %}})
- [binding API 参考]({{% ref bindings_api.md %}})
