---
type: docs
title: "Nameformat"
linkTitle: "NameFormat"
description: NameFormat 名称解析组件的详细信息
---


名称格式名称解析器提供了一种使用带有占位符的可配置格式字符串来解析服务名称的灵活方式。这在需要将服务名称映射为遵循特定模式的可预测 DNS 名称的场景中非常有用。

如果您的服务注册表没有专用的名称解析器，但可以通过可预测的命名约定通过内部 DNS 名称公开服务，请考虑使用此名称解析器。

## 配置格式

名称解析通过 [Dapr Configuration]({{< ref configuration-overview.md >}}) 进行配置。

在配置 YAML 中，将 `spec.nameResolution.component` 属性设置为 `"nameformat"`，然后在 `spec.nameResolution.configuration` 字典中传递配置选项。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  nameResolution:
    component: "nameformat"
    configuration:
      format: "service-{appid}.default.svc.cluster.local"  # 替换为所需的格式模式
```

## 规格配置字段

| 字段   | 必填 | 详情 | 示例 |
|---------|----------|---------|---------|
| format  | Y | 用于名称解析的格式字符串。必须包含 `{appid}` 占位符，该占位符将被替换为实际的服务名称。 | `"service-{appid}.default.svc.cluster.local"` |

## 示例

配置为 `format: "service-{appid}.default.svc.cluster.local"` 时，解析器会将服务名称转换如下：

- 服务 ID "myapp" → "service-myapp.default.svc.cluster.local"
- 服务 ID "frontend" → "service-frontend.default.svc.cluster.local"


## 注意事项

- 不允许使用空服务 ID，否则会导致错误。
- 必须在配置中提供格式字符串
- 格式字符串必须至少包含一个 `{appid}` 占位符
