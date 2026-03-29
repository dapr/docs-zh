---
type: docs
title: "InfluxDB 绑定规范"
linkTitle: "InfluxDB"
description: "InfluxDB 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/influxdb/"
---

## 组件格式

要设置 InfluxDB 绑定，请创建一个类型为 `bindings.influx` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


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
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|------------|-----|---------|
| `url`  | Y | Output | InfluxDB 实例的 URL| `"http://localhost:8086"` |
| `token` | Y | Output | InfluxDB 的授权令牌 | `"mytoken"` |
| `org` | Y | Output | InfluxDB 组织 | `"myorg"` |
| `bucket` | Y | Output | 要写入的 Bucket 名称 | `"mybucket"` |

## 绑定支持

此组件支持**输出绑定**，包含以下操作：

- `create`
- `query`

### 查询

要查询 InfluxDB，请使用 `query` 操作，并在调用元数据中提供一个 `raw` 键，其值为查询语句：

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

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [如何操作：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [如何操作：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
