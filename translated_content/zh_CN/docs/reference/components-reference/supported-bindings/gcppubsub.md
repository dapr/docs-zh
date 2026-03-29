---
type: docs
title: "GCP Pub/Sub 绑定规范"
linkTitle: "GCP Pub/Sub"
description: "GCP Pub/Sub 绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/gcppubsub/"
---

## 组件格式

要设置 GCP Pub/Sub 绑定，请创建类型为 `bindings.gcp.pubsub` 的组件。有关如何创建和应用绑定配置，请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.gcp.pubsub
  version: v1
  metadata:
  - name: topic
    value: "topic1"
  - name: subscription
    value: "subscription1"
  - name: type
    value: "service_account"
  - name: project_id
    value: "project_111"
  - name: private_key_id
    value: "*************"
  - name: client_email
    value: "name@domain.com"
  - name: client_id
    value: "1111111111111111"
  - name: auth_uri
    value: "https://accounts.google.com/o/oauth2/auth"
  - name: token_uri
    value: "https://oauth2.googleapis.com/token"
  - name: auth_provider_x509_cert_url
    value: "https://www.googleapis.com/oauth2/v1/certs"
  - name: client_x509_cert_url
    value: "https://www.googleapis.com/robot/v1/metadata/x509/<project-name>.iam.gserviceaccount.com"
  - name: private_key
    value: "PRIVATE KEY"
  - name: direction
    value: "input, output"
```
{{% alert title="Warning" color="warning" %}}
上面的示例将密钥作为纯字符串使用。建议使用 secret store 来管理密钥，具体说明请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填  | 绑定支持 | 详情 | 示例 |
|--------------------|:--------:|-----------| -----|---------|
| `topic` | Y | Output | GCP Pub/Sub topic 名称 | `"topic1"` |
| `subscription` | N | GCP Pub/Sub subscription 名称 | `"name1"` |
| `type`           | Y | Output | GCP 凭据类型  | `service_account`
| `project_id`     | Y | Output | GCP 项目 id| `projectId`
| `private_key_id` | N | Output | GCP 私钥 id | `"privateKeyId"`
| `private_key`    | Y | Output | GCP 凭据私钥。替换为 x509 证书 | `12345-12345`
| `client_email`   | Y | Output | GCP 客户端邮箱  | `"client@email.com"`
| `client_id`      | N | Output | GCP 客户端 id | `0123456789-0123456789`
| `auth_uri`       | N | Output | Google 账户 OAuth 端点 | `https://accounts.google.com/o/oauth2/auth`
| `token_uri`      | N | Output | Google 账户 token uri | `https://oauth2.googleapis.com/token`
| `auth_provider_x509_cert_url` | N | Output |GCP 凭据证书 url | `https://www.googleapis.com/oauth2/v1/certs`
| `client_x509_cert_url` | N | Output | GCP 凭据项目 x509 证书 url | `https://www.googleapis.com/robot/v1/metadata/x509/<PROJECT_NAME>.iam.gserviceaccount.com`
| `direction` | N |Input/Output | 绑定的方向。 | `"input"`、`"output"`、`"input, output"`

## 绑定支持

此组件支持 **input 和 output** 绑定接口。

此组件支持 **output 绑定**，并具有以下操作：

- `create`

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：通过输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
