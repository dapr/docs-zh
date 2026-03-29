---
type: docs
title: "GCP Secret Manager"
linkTitle: "GCP Secret Manager"
description: GCP Secret Manager 密钥存储组件的详细信息
aliases:
  - "/operations/components/setup-secret-store/supported-secret-stores/gcp-secret-manager/"
---

## 组件格式

要设置 GCP Secret Manager 密钥存储，需创建一个类型为 `secretstores.gcp.secretmanager` 的组件。请参阅[此指南]({{% ref "setup-secret-store#apply-the-configuration" %}})了解如何创建和应用密钥存储配置。请参阅关于[引用密钥]({{% ref component-secrets.md %}})的指南，以在 Dapr 组件中检索和使用密钥。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcpsecretmanager
spec:
  type: secretstores.gcp.secretmanager
  version: v1
  metadata:
  - name: type
    value: <replace-with-account-type>
  - name: project_id
    value: <replace-with-project-id>
  - name: private_key_id
    value: <replace-with-private-key-id>
  - name: client_email
    value: <replace-with-email>
  - name: client_id
    value: <replace-with-client-id>
  - name: auth_uri
    value: <replace-with-auth-uri>
  - name: token_uri
    value: <replace-with-token-uri>
  - name: auth_provider_x509_cert_url
    value: <replace-with-auth-provider-cert-url>
  - name: client_x509_cert_url
    value: <replace-with-client-cert-url>
  - name: private_key
    value: <replace-with-private-key>
```

{{% alert title="Warning" color="warning" %}}
以上示例使用明文字符串作为密钥。建议使用本地密钥存储（如 [Kubernetes secret store]({{% ref kubernetes-secret-store.md %}})）或[本地文件]({{% ref file-secret-store.md %}})来引导安全密钥存储。
{{% /alert %}}

## 规格元数据字段

| 字段              | 必填 | 详情                        | 示例             |
|--------------------|:--------:|--------------------------------|---------------------|
| `project_id`         | Y        | 与此组件关联的项目 ID。 | `"project_id"` |
| `type`              | N        | 账户类型。   | `"service_account"` |
| `private_key_id` | N | 如果使用显式凭据，此字段应包含服务账户 JSON 文档中的 `private_key_id` 字段 | `"privateKeyId"`|
| `private_key`    | N | 如果使用显式凭据，此字段应包含服务账户 JSON 中的 `private_key` 字段。替换为 x509 证书 | `12345-12345`|
| `client_email`   | N | 如果使用显式凭据，此字段应包含服务账户 JSON 中的 `client_email` 字段  | `"client@email.com"`|
| `client_id`      | N | 如果使用显式凭据，此字段应包含服务账户 JSON 中的 `client_id` 字段 | `0123456789-0123456789`|
| `auth_uri`       | N | 如果使用显式凭据，此字段应包含服务账户 JSON 中的 `auth_uri` 字段 | `https://accounts.google.com/o/oauth2/auth`|
| `token_uri`      | N | 如果使用显式凭据，此字段应包含服务账户 JSON 中的 `token_uri` 字段 | `https://oauth2.googleapis.com/token`|
| `auth_provider_x509_cert_url` | N | 如果使用显式凭据，此字段应包含服务账户 JSON 中的 `auth_provider_x509_cert_url` 字段 | `https://www.googleapis.com/oauth2/v1/certs`|
| `client_x509_cert_url` | N | 如果使用显式凭据，此字段应包含服务账户 JSON 中的 `client_x509_cert_url` 字段 | `https://www.googleapis.com/robot/v1/metadata/x509/<PROJECT_NAME>.iam.gserviceaccount.com`|


## GCP 凭据

由于 GCP Secret Manager 组件使用 GCP Go 客户端库，默认情况下它使用 **Application Default Credentials** 进行身份验证。这在 [Authenticate to GCP Cloud services using client libraries](https://cloud.google.com/docs/authentication/client-libraries) 指南中有进一步说明。
此外，请参阅如何 [设置 Application Default Credentials](https://cloud.google.com/docs/authentication/provide-credentials-adc)。

## 可选的每请求元数据属性

可以向 GCP Secret Manager 组件提供以下[可选查询参数]({{% ref "secrets_api#query-parameters" %}})：

查询参数 | 描述
--------- | -----------
`metadata.version_id` | 给定密钥的版本。

## 设置 GCP Secret Manager 实例

使用 GCP 文档设置 GCP Secret Manager：https://cloud.google.com/secret-manager/docs/quickstart。

## 相关链接
- [密钥构建块]({{% ref secrets %}})
- [操作方法：检索密钥]({{% ref "howto-secrets.md" %}})
- [操作方法：在 Dapr 组件中引用密钥]({{% ref component-secrets.md %}})
- [密钥 API 参考]({{% ref secrets_api.md %}})
