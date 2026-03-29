---
type: docs
title: "阿里云 OOS Parameter Store"
linkTitle: "阿里云 OOS Parameter Store"
description: 关于阿里云 OOS Parameter Store secret store 组件的详细信息
aliases:
  - "/operations/components/setup-secret-store/supported-secret-stores/alibabacloud-oos-parameter-store/"
---

## 组件格式

若要设置阿里云 OOS Parameter Store secret store，需创建一个类型为 `secretstores.alicloud.parameterstore` 的组件。有关如何创建和应用 secretstore 配置，请参阅[此指南]({{% ref "setup-secret-store.md#apply-the-configuration" %}})。有关检索和使用 secret 与 Dapr 组件的指南，请参阅此[引用 secret]({{% ref component-secrets.md %}}) 指南。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: alibabacloudparameterstore
spec:
  type: secretstores.alicloud.parameterstore
  version: v1
  metadata:
  - name: regionId
    value: "[alicloud_region_id]"
  - name: accessKeyId 
    value: "[alicloud_access_key_id]"
  - name: accessKeySecret
    value: "[alicloud_access_key_secret]"
  - name: securityToken
    value: "[alicloud_security_token]"
```

{{% alert title="Warning" color="warning" %}}
上述示例使用明文字符串作为 secret。建议使用本地 secret store（如 [Kubernetes secret store]({{% ref kubernetes-secret-store.md %}}) 或[本地文件]({{% ref file-secret-store.md %}})）来引导安全的密钥存储。
{{% /alert %}}

## 规范元数据字段

| Field              | Required | Details                                                                 | Example             |
|--------------------|:--------:|-------------------------------------------------------------------------|---------------------|
| regionId           | Y        | AlibabaCloud OOS Parameter Store 实例部署的特定区域              | `"cn-hangzhou"`     |
| accessKeyId        | Y        | 用于访问此资源的阿里云 Access Key ID                     | `"accessKeyId"`      |
| accessKeySecret    | Y        | 用于访问此资源的阿里云 Access Key Secret                 | `"accessKeySecret"`  |
| securityToken      | N        | 要使用的阿里云 Security Token                           | `"securityToken"`    |

## 可选的每请求元数据属性

从此 secret store 检索 secret 时，可以提供以下[可选查询参数]({{% ref "secrets_api.md#query-parameters" %}})：

查询参数 | 描述
--------- | -----------
`metadata.version_id` | 给定 secret 密钥的版本
`metadata.path` | （仅用于批量请求）元数据中的路径。如果未设置，默认为根路径（所有 secret）。

## 创建阿里云 OOS Parameter Store 实例

使用阿里云文档设置阿里云 OOS Parameter Store：https://www.alibabacloud.com/help/en/doc-detail/186828.html。

## 相关链接

- [Secrets 构建块]({{% ref secrets %}})
- [操作指南：检索 secret]({{% ref "howto-secrets.md" %}})
- [操作指南：在 Dapr 组件中引用 secret]({{% ref component-secrets.md %}})
- [Secrets API 参考]({{% ref secrets_api.md %}})
