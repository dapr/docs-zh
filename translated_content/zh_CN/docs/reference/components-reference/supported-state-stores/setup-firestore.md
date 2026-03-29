---
type: docs
title: "GCP Firestore (Datastore 模式)"
linkTitle: "GCP Firestore"
description: GCP Firestore 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-firestore/"
---

## 组件格式

要设置 GCP Firestore 状态存储，请创建一个类型为 `state.gcp.firestore` 的组件。有关如何创建和应用状态存储配置，请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.gcp.firestore
  version: v1
  metadata:
  - name: project_id
    value: <REPLACE-WITH-PROJECT-ID> # 必填。
  - name: type 
    value: <REPLACE-WITH-CREDENTIALS-TYPE> # 必填。
  - name: endpoint # 可选。
    value: "http://localhost:8432"
  - name: private_key_id
    value: <REPLACE-WITH-PRIVATE-KEY-ID> # 可选。
  - name: private_key
    value: <REPLACE-WITH-PRIVATE-KEY> # 可选，但如果指定了 `private_key_id` 则为必填。
  - name: client_email
    value: <REPLACE-WITH-CLIENT-EMAIL> # 可选，但如果指定了 `private_key_id` 则为必填。
  - name: client_id
    value: <REPLACE-WITH-CLIENT-ID> # 可选，但如果指定了 `private_key_id` 则为必填。
  - name: auth_uri
    value: <REPLACE-WITH-AUTH-URI> # 可选。
  - name: token_uri
    value: <REPLACE-WITH-TOKEN-URI> # 可选。
  - name: auth_provider_x509_cert_url
    value: <REPLACE-WITH-AUTH-X509-CERT-URL> # 可选。
  - name: client_x509_cert_url
    value: <REPLACE-WITH-CLIENT-x509-CERT-URL> # 可选。
  - name: entity_kind
    value: <REPLACE-WITH-ENTITY-KIND> # 可选。默认值："DaprState"
  - name: noindex
    value: <REPLACE-WITH-BOOLEAN> # 可选。默认值："false"
```

{{% alert title="警告" color="warning" %}}
上面的示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})所述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| project_id         | Y        | 要使用的 GCP 项目 ID | `"project-id"`
| type                 | Y      | 凭证类型 | `"service_account"`
| endpoint       | N  | 组件要使用的 GCP 端点。仅用于本地开发（例如配合 [GCP Datastore Emulator](https://cloud.google.com/datastore/docs/tools/datastore-emulator) 使用）。针对 GCP 生产 API 运行时不需要 `endpoint`。 | `"localhost:8432"`
| private_key_id     | N        | 要使用的私钥 ID  | `"private-key-id"`
| privateKey         | N |  如果使用显式凭证，此字段应包含服务账号 json 中的 `private_key` 字段 | `-----BEGIN PRIVATE KEY-----MIIBVgIBADANBgkqhkiG9w0B`
| client_email       | N        | 客户端的电子邮件地址 | `"eample@example.com"`
| client_id          | N        | 用于身份验证的客户端 ID 值 | `"client-id"`
| auth_uri           | N        | 要使用的身份验证 URI | `"https://accounts.google.com/o/oauth2/auth"`
| token_uri          | N        | 用于查询 Auth token 的令牌 URI | `"https://oauth2.googleapis.com/token"`
| auth_provider_x509_cert_url | N | 身份验证提供者证书 URL | `"https://www.googleapis.com/oauth2/v1/certs"`
| client_x509_cert_url | N      | 客户端证书 URL | `"https://www.googleapis.com/robot/v1/metadata/x509/x"`
| entity_kind          | N      | Firestore 中的实体名称。默认为 `"DaprState"` | `"DaprState"`
| noindex              | N      | 是否禁用状态实体的索引。如果遇到 Firestore 索引大小限制，请使用此设置。默认为 `"false"` | `"true"`


## GCP 凭证
由于 GCP Firestore 组件使用 GCP Go 客户端库，默认情况下它使用 **Application Default Credentials** 进行身份验证。这在 [使用客户端库向 GCP Cloud 服务进行身份验证](https://cloud.google.com/docs/authentication/client-libraries) 指南中有详细说明。

## 设置 GCP Firestore

{{< tabpane text=true >}}

{{% tab "自托管" %}}
您可以使用 GCP Datastore 模拟器在本地运行，说明请参见[此处](https://cloud.google.com/datastore/docs/tools/datastore-emulator)。

然后您可以使用 `http://localhost:8432` 与服务器交互。
{{% /tab %}}

{{% tab "Google Cloud" %}}
按照[此处](https://cloud.google.com/datastore/docs/quickstart)的说明在 Google Cloud 中开始设置 Firestore。
{{% /tab %}}

{{< /tabpane >}}


## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[此指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
