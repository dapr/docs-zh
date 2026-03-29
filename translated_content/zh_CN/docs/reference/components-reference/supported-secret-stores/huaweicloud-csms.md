---
type: docs
title: "HuaweiCloud Cloud Secret Management Service (CSMS)"
linkTitle: "HuaweiCloud Cloud Secret Management Service (CSMS)"
description: 关于 HuaweiCloud Cloud Secret Management Service (CSMS) 密钥存储组件的详细信息
aliases:
  - "/operations/components/setup-secret-store/supported-secret-stores/huaweicloud-csms/"
---

## 组件格式

要设置 HuaweiCloud Cloud Secret Management Service (CSMS) 密钥存储，请创建一个类型为 `secretstores.huaweicloud.csms` 的组件。有关如何创建和应用密钥存储配置，请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})。有关如何使用 Dapr 组件检索和使用密钥，请参阅此[引用密钥]({{% ref component-secrets.md %}})指南。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: huaweicloudcsms
spec:
  type: secretstores.huaweicloud.csms
  version: v1
  metadata:
  - name: region
    value: "[huaweicloud_region]"
  - name: accessKey
    value: "[huaweicloud_access_key]"
  - name: secretAccessKey
    value: "[huaweicloud_secret_access_key]"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用本地密钥存储（例如 [Kubernetes secret store]({{% ref kubernetes-secret-store.md %}}) 或[本地文件]({{% ref file-secret-store.md %}})）来引导安全的密钥存储。
{{% /alert %}}

## 规范元数据字段

| 字段            | 必填   | 详情                                                            | 示例                |
| --------------- | :----: | -------------------------------------------------------------- | ------------------- |
| region          |    Y    | HuaweiCloud CSMS 实例部署到的特定区域                        | `"cn-north-4"`      |
| accessKey       |    Y    | 用于访问此资源的 HuaweiCloud Access Key                         | `"accessKey"`       |
| secretAccessKey |    Y    | 用于访问此资源的 HuaweiCloud Secret Access Key                  | `"secretAccessKey"` |

## 可选的请求级别元数据属性

从此密钥存储检索密钥时，可以提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

查询参数 | 描述
--------- | -----------
`metadata.version_id` | 给定密钥的版本。


## 设置 HuaweiCloud Cloud Secret Management Service (CSMS) 实例

使用 HuaweiCloud 文档设置 HuaweiCloud Cloud Secret Management Service (CSMS)：https://support.huaweicloud.com/intl/en-us/usermanual-dew/dew_01_9993.html。

## 相关链接

- [密钥构建块]({{% ref secrets %}})
- [操作方法：检索密钥]({{% ref "howto-secrets.md" %}})
- [操作方法：在 Dapr 组件中引用密钥]({{% ref component-secrets.md %}})
- [密钥 API 参考]({{% ref secrets_api.md %}})
