---
type: docs
title: "AWS SNS/SQS"
linkTitle: "AWS SNS/SQS"
description: "AWS SNS/SQS 发布订阅组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-aws-snssqs/"
---

## 组件格式

要设置 AWS SNS/SQS 发布订阅，请创建类型为 `pubsub.aws.snssqs` 的组件。

默认情况下，AWS SNS/SQS 组件：

- 生成 SNS 主题
- 预配 SQS 队列
- 配置队列到主题的订阅

{{% alert title="注意" color="primary" %}}
如果你只有发布者而没有订阅者，则仅创建 SNS 主题。

但是，如果你有订阅者，则会生成 SNS、SQS 及其动态或静态订阅。
{{% /alert %}}

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: snssqs-pubsub
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
    - name: accessKey
      value: "AKIAIOSFODNN7EXAMPLE"
    - name: secretKey
      value: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    - name: region
      value: "us-east-1"
    # - name: consumerID # 可选。如果未提供，运行时将创建一个。
    #   value: "channel1"
    # - name: endpoint # 可选。 
    #   value: "http://localhost:4566"
    # - name: sessionToken  # 可选（如果使用 AssignedRole 则为必需；例如，临时 accessKey 和 secretKey）
    #   value: "TOKEN"
    # - name: messageVisibilityTimeout # 可选
    #   value: 10
    # - name: messageRetryLimit # 可选
    #   value: 10
    # - name: messageReceiveLimit # 可选
    #   value: 10
    # - name: sqsDeadLettersQueueName # 可选
    # - value: "myapp-dlq"
    # - name: messageWaitTimeSeconds # 可选
    #   value: 1
    # - name: messageMaxNumber # 可选
    #   value: 10
    # - name: fifo # 可选
    #   value: "true"
    # - name: fifoMessageGroupID # 可选
    #   value: "app1-mgi"
    # - name: disableEntityManagement # 可选
    #   value: "false"
    # - name: disableDeleteOnRetryLimit # 可选
    #   value: "false"
    # - name: assetsManagementTimeoutSeconds # 可选
    #   value: 5
    # - name: concurrencyMode # 可选
    #   value: "single"
    # - name: concurrencyLimit # 可选
    #   value: "0"

```

{{% alert title="警告" color="warning" %}}
上述示例使用纯文本字符串作为密钥。建议使用[密钥存储来管理密钥]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| accessKey          | Y  | 具有对 SNS 和 SQS 适当权限的 AWS 账户/角色的 ID（见下文） | `"AKIAIOSFODNN7EXAMPLE"`
| secretKey          | Y  | AWS 用户/角色的密钥。如果使用 `AssumeRole` 访问，你还需要提供 `sessionToken` |`"wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"`
| region             | Y  | SNS/SQS 资源所在或将要创建的 AWS 区域。有关有效区域，请参阅[此页面](https://aws.amazon.com/about-aws/global-infrastructure/regional-product-services/?p=ugi&l=na)。确保 SNS 和 SQS 在该区域可用 | `"us-east-1"`
| consumerID       | N | 消费者 ID（消费者标签）将一个或多个消费者组织到一个组中。具有相同消费者 ID 的消费者作为一个虚拟消费者工作；例如，一条消息仅由组中的一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用程序 ID（`appID`）的值。请参阅[发布订阅代理组件文件]({{% ref setup-pubsub.md %}})以了解 ConsumerID 如何自动生成。 | 可以设置为字符串值（如上面示例中的 `"channel1"`）或字符串格式值（如 `"{podName}"` 等）。[查看你可以在组件元数据中使用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| endpoint          | N  | 组件要使用的 AWS 端点。仅用于本地开发，例如使用 [localstack](https://github.com/localstack/localstack)。当针对生产环境 AWS 运行时，不需要 `endpoint` | `"http://localhost:4566"`
| sessionToken      | N  | 要使用的 AWS 会话令牌。仅当你使用临时安全凭证时才需要会话令牌 | `"TOKEN"`
| messageReceiveLimit | N  | 在处理消息失败后，接收消息的次数，达到该次数后，会将该消息从队列中移除。如果指定了 `sqsDeadLettersQueueName`，`messageReceiveLimit` 是在处理消息失败后接收消息的次数，达到该次数后，会将该消息移动到 SQS 死信队列。默认值：`10` | `10`
| sqsDeadLettersQueueName | N  | 此应用程序的死信队列名称 | `"myapp-dlq"`
| messageVisibilityTimeout | N  | 消息发送给订阅者后，从接收请求中隐藏的时间（秒）。默认值：`10` | `10`
| messageRetryLimit        | N  | 在处理消息失败后，从队列中移除该消息之前，重新发送该消息的次数。默认值：`10` | `10`
| messageWaitTimeSeconds   | N  | 调用在返回之前等待消息到达队列的持续时间（秒）。如果有消息可用，则调用会早于 `messageWaitTimeSeconds` 返回。如果没有可用的消息且等待时间到期，则调用成功返回并返回空消息列表。默认值：`1` | `1`
| messageMaxNumber         | N  | 一次从队列接收的最大消息数。默认值：`10`，最大值：`10` | `10`
| fifo | N  | 使用 SQS FIFO 队列提供消息排序和去重。默认值：`"false"`。有关 [SQS FIFO](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html) 的更多详情 | `"true"`, `"false"`
| fifoMessageGroupID | N | 如果启用了 `fifo`，指示 Dapr 为发布订阅部署使用自定义[消息组 ID](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/using-messagegroupid-property.html)。这不是必需的，因为 Dapr 会为每个生产者创建自定义消息组 ID，从而确保每个 Dapr 生产者的消息排序。默认值：`""` | `"app1-mgi"`
| disableEntityManagement | N  | 当设置为 true 时，SNS 主题、SQS 队列以及 SNS 的 SQS 订阅不会自动创建。默认值：`"false"` | `"true"`, `"false"`
| disableDeleteOnRetryLimit | N  | 当设置为 true 时，在重试和处理消息失败 `messageRetryLimit` 次后，重置消息可见性超时，以便其他消费者可以尝试处理，而不是从 SQS 中删除该消息（默认行为）。默认值：`"false"` | `"true"`, `"false"`
| assetsManagementTimeoutSeconds | N  | AWS 资源管理操作的超时时间（秒），超时后将取消操作。资源管理操作是在 STS、SNS 和 SQS 上执行的任何操作，除了实现默认 Dapr 组件重试行为的消息发布和消费操作。该值可以设置为任何非负浮点数/整数。默认值：`5` | `0.5`, `10`
| concurrencyMode | N | 当从 SQS 批量接收消息时，按顺序（一次"单条"消息）或并发（"并行"）调用订阅者。默认值：`"parallel"` | `"single"`, `"parallel"`
| concurrencyLimit | N | 定义处理消息的最大并发工作线程数。当 concurrencyMode 设置为 `"single"` 时，将忽略此值。要避免限制并发工作线程数，请将其设置为 `0`。默认值：`0` | `100`

### 附加信息

#### 符合 AWS 规范

Dapr 创建的 SNS 主题和 SQS 队列名称符合 [AWS 规范](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/quotas-queues.html)。默认情况下，Dapr 根据消费者的 `app-id` 创建 SQS 队列名称，因此 Dapr 可能会执行名称标准化以符合 AWS 规范。

#### SNS/SQS 组件行为

当发布订阅 SNS/SQS 组件预配 SNS 主题时，SQS 队列和订阅在组件代表消息生产者（未部署订阅者应用程序）运行的情况下的行为，与存在订阅者应用程序（未部署发布者）的情况下的行为不同。

由于 SNS 在仅发布者设置中没有 SQS 订阅的工作方式，SQS 队列和订阅的行为类似于依赖于监听主题消息的订阅者的"经典"发布订阅系统。如果没有这些订阅者，消息：

- 无法继续传递并会被有效丢弃
- 对于未来的订阅者不可用（订阅者最终订阅时不会重放消息）

#### SQS FIFO

根据 AWS 规范，使用 SQS FIFO（`fifo` 元数据字段设置为 `"true"`）提供消息排序和去重，但会降低 SQS 处理吞吐量，以及其他限制。

指定 `fifoMessageGroupID` 将所使用的 FIFO 队列的并发消费者数量限制为仅一个，但保证应用程序 Dapr 边车发布的消息的全局排序。请参阅[此 AWS 博客文章](https://aws.amazon.com/blogs/compute/solving-complex-ordering-challenges-with-amazon-sqs-fifo-queues/)以更好地了解消息组 ID 和 FIFO 队列的主题。

为避免丢失传递给消费者的消息顺序，SQS 组件的 FIFO 配置需要将 `concurrencyMode` 元数据字段设置为 `"single"`。

#### 默认并行 `concurrencyMode`

自 v1.8.0 起，该组件支持 `"parallel"` `concurrencyMode` 作为其默认模式。在以前的版本中，组件的默认行为是一次调用订阅者一条消息并等待其响应。

#### SQS 死信队列

在使用 SQS 死信队列配置发布订阅组件时，元数据字段 `messageReceiveLimit` 和 `sqsDeadLettersQueueName` 必须同时设置为某个值。对于 `messageReceiveLimit`，该值必须大于 `0`，并且 `sqsDeadLettersQueueName` 不能为空字符串。

{{% alert title="重要" color="warning" %}}
当在 EKS (AWS Kubernetes) 节点/Pod 上运行 Dapr 边车（`daprd`）与你的应用程序，并且已附加定义对 AWS 资源访问权限的 IAM 策略时，你**不得**在组件规范定义中提供 AWS access-key、secret-key 和令牌。
{{% /alert %}}

#### SNS/SQS 与 Dapr 的争用

从根本上说，SNS 通过创建对这些主题的 SQS 订阅，将来自多个发布者主题的消息聚合到单个 SQS 队列中。作为订阅者，SNS/SQS 发布订阅组件从该唯一的 SQS 队列消费消息。

然而，像任何 SQS 消费者一样，该组件无法有选择地检索发布到其特定订阅的 SNS 主题的消息。这可能导致组件接收来自没有关联处理程序的主题的消息。通常，这发生在：

- **组件初始化：** 如果基础设施订阅在组件订阅处理程序之前准备就绪，或
- **关闭：** 如果组件处理程序在基础设施订阅之前被移除。

由于此问题会影响多个 SNS 主题的任何 SQS 消费者，因此该组件无法防止消费来自缺少处理程序的主题的消息。当发生这种情况时，组件会记录一条错误，指示此类消息被错误地检索。

在这些情况下，未处理的消息将在每次拉取后在其[接收计数](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html#sqs-receive-count)递减的情况下重新出现在 SQS 中。因此，存在未处理的消息可能超过其 `messageReceiveLimit` 并丢失的风险。

{{% alert title="重要" color="warning" %}}
在将 SNS/SQS 与 Dapr 一起使用时，请考虑潜在的争用情况，并适当配置 `messageReceiveLimit`。强烈建议通过设置 `sqsDeadLettersQueueName` 来使用 SQS 死信队列，以防止消息丢失。
{{% /alert %}}

## 创建 SNS/SQS 实例

{{< tabpane text=true >}}

{{% tab "自托管" %}}
对于本地开发，[localstack 项目](https://github.com/localstack/localstack)用于集成 AWS SNS/SQS。按照[这些说明](https://github.com/localstack/localstack#running)运行 localstack。

要使用 Docker 在本地从命令行运行 localstack，请应用以下命令：

```shell
docker run --rm -it -p 4566:4566 -p 4571:4571 -e SERVICES="sts,sns,sqs" -e AWS_DEFAULT_REGION="us-east-1" localstack/localstack
```

为了将 localstack 与你的发布订阅绑定一起使用，你需要在组件元数据中提供 `endpoint` 配置。当针对生产环境 AWS 运行时，不需要 `endpoint`。

有关身份验证相关属性的信息，请参阅[向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: snssqs-pubsub
spec:
  type: pubsub.aws.snssqs
  version: v1
  metadata:
    - name: accessKey
      value: "anyString"
    - name: secretKey
      value: "anyString"
    - name: endpoint
      value: http://localhost:4566
    # 如果提供给了 localstack，则使用 us-east-1 或任何其他区域，如 "AWS_DEFAULT_REGION" 环境变量所定义
    - name: region
      value: us-east-1
```

{{% /tab %}}

{{% tab "Kubernetes" %}}
要在 Kubernetes 上运行 localstack，你可以应用以下配置。然后可以通过 DNS 名称 `http://localstack.default.svc.cluster.local:4566` 访问 Localstack（假设此配置应用于默认命名空间），该名称应作为 `endpoint` 使用。

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: localstack
spec:
  # 使用选择器，我们将暴露正在运行的部署
  # Kubernetes 知道给定的服务属于某个部署
  selector:
    matchLabels:
      app: localstack
  replicas: 1
  template:
    metadata:
      labels:
        app: localstack
    spec:
      containers:
      - name: localstack
        image: localstack/localstack:latest
        ports:
          # 暴露边缘端点
          - containerPort: 4566
---
kind: Service
apiVersion: v1
metadata:
  name: localstack
  labels:
    app: localstack
spec:
  selector:
    app: localstack
  ports:
  - protocol: TCP
    port: 4566
    targetPort: 4566
  type: LoadBalancer

```

{{% /tab %}}

{{% tab "AWS" %}}
为了在 AWS 中运行，请创建或分配具有对 SNS 和 SQS 服务权限的 IAM 用户，并使用类似以下的策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "YOUR_POLICY_NAME",
      "Effect": "Allow",
      "Action": [
        "sns:CreateTopic",
        "sns:GetTopicAttributes",
        "sns:ListSubscriptionsByTopic",
        "sns:Publish",
        "sns:Subscribe",
        "sns:TagResource",
        "sqs:ChangeMessageVisibility",
        "sqs:CreateQueue",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl",
        "sqs:ReceiveMessage",
        "sqs:SetQueueAttributes",
        "sqs:TagQueue"
      ],
      "Resource": [
        "arn:aws:sns:AWS_REGION:AWS_ACCOUNT_ID:*",
        "arn:aws:sqs:AWS_REGION:AWS_ACCOUNT_ID:*"
      ]
    }
  ]
}
```

使用 Kubernetes 密钥和 `secretKeyRef` 将 `AWS 账户 ID` 和 `AWS 账户密钥`插入组件元数据中的 `accessKey` 和 `secretKey`。

或者，假设你想使用自己选择的工具（例如 Terraform）预配 SNS 和 SQS 资源，同时防止 Dapr 动态执行此操作。你需要启用 `disableEntityManagement` 并为你的使用 Dapr 的应用程序分配一个 IAM 角色，并使用类似以下的策略：

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "YOUR_POLICY_NAME",
      "Effect": "Allow",
      "Action": [
        "sqs:DeleteMessage",
        "sqs:ReceiveMessage",
        "sqs:ChangeMessageVisibility",
        "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes",
        "sns:Publish",
        "sns:ListSubscriptionsByTopic",
        "sns:GetTopicAttributes"

      ],
      "Resource": [
        "arn:aws:sns:AWS_REGION:AWS_ACCOUNT_ID:APP_TOPIC_NAME",
        "arn:aws:sqs:AWS_REGION:AWS_ACCOUNT_ID:APP_ID"
      ]
    }
  ]
}
```

在上面的示例中，你在 EKS 集群上运行应用程序，并启用了动态资源创建（默认的 Dapr 行为）。
{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [发布订阅构建块概述和操作指南]({{% ref pubsub %}})
- [向 AWS 进行身份验证]({{% ref authenticating-aws.md %}})
- AWS 文档：
  - [AWS SQS 作为 SNS 的订阅者](https://docs.aws.amazon.com/sns/latest/dg/sns-sqs-as-subscriber.html)
  - [AWS SNS API 参考](https://docs.aws.amazon.com/sns/latest/api/Welcome.html)
  - [AWS SQS API 参考](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/Welcome.html)
