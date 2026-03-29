---
type: docs
title: "本地环境变量（用于开发）"
linkTitle: "本地环境变量"
description: 本地环境变量 secret store 组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-secret-store/supported-secret-stores/envvar-secret-store/"
---

此 Dapr secret store 组件使用本地定义的环境变量，不使用身份验证。

{{% alert title="警告" color="warning" %}}
不建议在生产环境中使用这种 secret 管理方法。
{{% /alert %}}

## 组件格式

要设置本地环境变量 secret store，请创建一个类型为 `secretstores.local.env` 的组件。在 `./components` 目录中创建包含以下内容的文件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: envvar-secret-store
spec:
  type: secretstores.local.env
  version: v1
  metadata:
    # - name: prefix
    #   value: "MYAPP_"
```

## 规范元数据字段

| 字段 | 必填 | 详情 | 示例 |
|-------:|:--------:|---------|---------|
| `prefix` | 否  | 如果设置，则将操作限制为具有给定前缀的环境变量。前缀将从返回的 secret 名称中移除。<br>在 Windows 上匹配不区分大小写，在所有其他操作系统上匹配区分大小写。 | `"MYAPP_"` |

## 注意事项

出于安全原因，此组件不能用于访问以下环境变量：

- `APP_API_TOKEN`
- 任何名称以 `DAPR_` 前缀开头的变量

## 相关链接
- [Secrets 构建块]({{% ref secrets %}})
- [操作方法：检索 secret]({{% ref "howto-secrets.md" %}})
- [操作方法：在 Dapr 组件中引用 secret]({{% ref component-secrets.md %}})
- [Secrets API 参考]({{% ref secrets_api.md %}})
