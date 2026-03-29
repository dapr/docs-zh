---
type: docs
title: "GCP"
linkTitle: "GCP"
description: "GCP Pub/Sub 组件的详细文档"
aliases:
  - "/operations/components/setup-pubsub/supported-pubsub/setup-gcp/"
  - "/operations/components/setup-pubsub/supported-pubsub/setup-gcp-pubsub/"
---

## 创建 Dapr 组件

要设置 GCP 发布订阅，需创建类型为 `pubsub.gcp.pubsub` 的组件。请参阅[发布订阅代理组件文件]({{% ref setup-pubsub.md %}})以了解 ConsumerID 如何自动生成。阅读[操作指南：发布和订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})了解如何创建和应用发布订阅配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcp-pubsub
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: type
    value: service_account
  - name: projectId
    value: <PROJECT_ID> # replace
  - name: endpoint # Optional.
    value: "http://localhost:8085"
  - name: consumerID # Optional - defaults to the app's own ID
    value: <CONSUMER_ID>
  - name: identityProjectId
    value: <IDENTITY_PROJECT_ID> # replace
  - name: privateKeyId
    value: <PRIVATE_KEY_ID> #replace
  - name: clientEmail
    value: <CLIENT_EMAIL> #replace
  - name: clientId
    value: <CLIENT_ID> # replace
  - name: authUri
    value: https://accounts.google.com/o/oauth2/auth
  - name: tokenUri
    value: https://oauth2.googleapis.com/token
  - name: authProviderX509CertUrl
    value: https://www.googleapis.com/oauth2/v1/certs
  - name: clientX509CertUrl
    value: https://www.googleapis.com/robot/v1/metadata/x509/<PROJECT_NAME>.iam.gserviceaccount.com #replace PROJECT_NAME
  - name: privateKey
    value: <PRIVATE_KEY> # replace x509 cert
  - name: disableEntityManagement
    value: "false"
  - name: enableMessageOrdering
    value: "false"
  - name: orderingKey # Optional
    value: <ORDERING_KEY>
  - name: maxReconnectionAttempts # Optional
    value: 30
  - name: connectionRecoveryInSec # Optional
    value: 2
  - name: deadLetterTopic # Optional
    value: <EXISTING_PUBSUB_TOPIC>
  - name: maxDeliveryAttempts # Optional
    value: 5
  - name: maxOutstandingMessages # Optional
    value: 1000
  - name: maxOutstandingBytes # Optional
    value: 1000000000
  - name: maxConcurrentConnections # Optional
    value: 10
```
{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储，如[此处]({{% ref component-secrets.md %}})所述。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| projectId     | Y | GCP 项目 ID | `myproject-123`
| endpoint       | N  | 组件使用的 GCP 端点。仅用于本地开发（例如）与 [GCP Pub/Sub 模拟器](https://cloud.google.com/pubsub/docs/emulator)配合使用。当针对 GCP 生产 API 运行时，不需要 `endpoint`。 | `"http://localhost:8085"`
| `consumerID`         | N        | Consumer ID 将一个或多个消费者组织成一个组。具有相同 consumer ID 的消费者作为一个虚拟消费者工作；例如，一条消息仅被组中的一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用程序 ID (`appID`) 值。`consumerID` 与请求的一部分提供的 `topic` 一起用于构建发布订阅订阅 ID | 可以设置为字符串值（如 `"channel1"`）或字符串格式值（如 `"{podName}"` 等）。[请参阅您可以在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| identityProjectId | N | 如果 GCP 发布订阅项目与身份项目不同，请使用此属性指定身份项目  | `"myproject-123"`
| privateKeyId | N | 如果使用显式凭据，此字段应包含服务账户 json 文档中的 `private_key_id` 字段 | `"my-private-key"`
| privateKey    | N |  如果使用显式凭据，此字段应包含服务账户 json 中的 `private_key` 字段 | `-----BEGIN PRIVATE KEY-----MIIBVgIBADANBgkqhkiG9w0B`
| clientEmail   | N | 如果使用显式凭据，此字段应包含服务账户 json 中的 `client_email` 字段  | `"myservice@myproject-123.iam.gserviceaccount.com"`
| clientId      | N |  如果使用显式凭据，此字段应包含服务账户 json 中的 `client_id` 字段 | `106234234234`
| authUri       | N | 如果使用显式凭据，此字段应包含服务账户 json 中的 `auth_uri` 字段 | `https://accounts.google.com/o/oauth2/auth`
| tokenUri      | N | 如果使用显式凭据，此字段应包含服务账户 json 中的 `token_uri` 字段 | `https://oauth2.googleapis.com/token`
| authProviderX509CertUrl | N | 如果使用显式凭据，此字段应包含服务账户 json 中的 `auth_provider_x509_cert_url` 字段 | `https://www.googleapis.com/oauth2/v1/certs`
| clientX509CertUrl | N | 如果使用显式凭据，此字段应包含服务账户 json 中的 `client_x509_cert_url` 字段 | `https://www.googleapis.com/robot/v1/metadata/x509/myserviceaccount%40myproject.iam.gserviceaccount.com`
| disableEntityManagement | N | 当设置为 `"true"` 时，主题和订阅不会自动创建。默认值：`"false"` | `"true"`, `"false"`
| enableMessageOrdering | N | 当设置为 `"true"` 时，订阅的消息将按顺序接收，具体取决于发布和权限配置。 | `"true"`, `"false"`
| orderingKey |N | 请求中提供的键。当 `enableMessageOrdering` 设置为 `true` 时使用，用于根据该键对消息进行排序。 | "my-orderingkey"
| maxReconnectionAttempts | N  |定义最大重连尝试次数。默认值：`30` | `30`
| connectionRecoveryInSec | N  |连接恢复尝试之间等待的秒数。默认值：`2` | `2`
| deadLetterTopic | N  | GCP Pub/Sub 主题的名称。使用此组件前，此主题**必须**存在。  | `"myapp-dlq"`
| maxDeliveryAttempts | N  | 尝试传递消息的最大次数。如果指定了 `deadLetterTopic`，`maxDeliveryAttempts` 是消息处理失败的最大尝试次数。达到该次数后，消息将被移动到死信主题。默认值：`5` | `5`
| type           | N | **已弃用** GCP 凭据类型。仅支持 `service_account`。默认值为 `service_account`  | `service_account`
| maxOutstandingMessages | N | 给定[流式拉取](https://cloud.google.com/pubsub/docs/pull#streamingpull_api)连接可以拥有的最大未完成消息数。默认值：`1000` | `50`
| maxOutstandingBytes | N | 给定[流式拉取](https://cloud.google.com/pubsub/docs/pull#streamingpull_api)连接可以拥有的最大未完成字节数。默认值：`1000000000` | `1000000000`
| maxConcurrentConnections | N | 要维护的最大并发[流式拉取](https://cloud.google.com/pubsub/docs/pull#streamingpull_api)连接数。默认值：`10` | `2`
| ackDeadline | N |  消息确认持续时间截止时间。默认值：`20s` | `1m`



{{% alert title="警告" color="warning" %}}
如果 `enableMessageOrdering` 设置为 "true"，则服务账户需要 roles/viewer 或 roles/pubsub.viewer 角色，以便在消息中未嵌入顺序令牌的情况下保证顺序。如果未授予此角色，或由于任何其他原因对 Subscription.Config() 的调用失败，按嵌入顺序令牌排序仍将正常工作。
{{% /alert %}}

## GCP 凭据

由于 GCP Pub/Sub 组件使用 GCP Go 客户端库，默认情况下它使用**应用程序默认凭据**进行身份验证。这在[使用客户端库向 GCP Cloud 服务进行身份验证](https://cloud.google.com/docs/authentication/client-libraries)指南中有进一步说明。

## 创建 GCP Pub/Sub

{{< tabpane text=true >}}

{{% tab="自托管" %}}
对于本地开发，使用 [GCP Pub/Sub 模拟器](https://cloud.google.com/pubsub/docs/emulator)来测试 GCP Pub/Sub 组件。按照[这些说明](https://cloud.google.com/pubsub/docs/emulator#start)运行 GCP Pub/Sub 模拟器。

要使用 Docker 在本地运行 GCP Pub/Sub 模拟器，请使用以下 `docker-compose.yaml`：

```yaml
version: '3'
services:
  pubsub:
    image: gcr.io/google.com/cloudsdktool/cloud-sdk:422.0.0-emulators
    ports:
      - "8085:8085"
    container_name: gcp-pubsub
    entrypoint: gcloud beta emulators pubsub start --project local-test-prj --host-port 0.0.0.0:8085

```

为了将 GCP Pub/Sub 模拟器与您的发布订阅绑定一起使用，您需要在组件元数据中提供 `endpoint` 配置。当针对 GCP 生产 API 运行时，不需要 `endpoint`。

**projectId** 属性必须与 `docker-compose.yaml` 或 Docker 命令中使用的 `--project` 匹配。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: gcp-pubsub
spec:
  type: pubsub.gcp.pubsub
  version: v1
  metadata:
  - name: projectId
    value: "local-test-prj"
  - name: consumerID
    value: "testConsumer"
  - name: endpoint
    value: "localhost:8085"
```

{{% /tab %}}


{{% tab="GCP" %}}

您可以使用"显式"或"隐式"凭据来配置对 GCP 发布订阅实例的访问。如果使用显式凭据，大多数字段都是必填的。隐式凭据依赖于在 Kubernetes 服务账户（KSA）下运行的 dapr，该账户映射到具有访问发布订阅所需权限的 Google 服务账户（GSA）。在隐式模式下，只需要 `projectId` 属性，所有其他属性都是可选的。

按照[此处](https://cloud.google.com/pubsub/docs/quickstart-console)的说明设置 Google Cloud Pub/Sub 系统。

{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})以获取有关配置发布订阅组件的说明
- [发布订阅构建块]({{% ref pubsub %}})
