---
type: docs
title: "RocketMQ"
linkTitle: "RocketMQ"
description: "RocketMQ pubsub component 的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-pubsub/supported-pubsub/setup-rocketmq/"
---

## Component 格式
要设置 RocketMQ pub/sub，请创建一个类型为 `pubsub.rocketmq` 的 component。请参阅[pub/sub broker component 文件]({{% ref setup-pubsub.md %}})，了解 ConsumerID 如何自动生成。阅读[如何操作：发布和订阅指南]({{% ref "howto-publish-subscribe.md#step-1-setup-the-pubsub-component" %}})，了解如何创建和应用 pub/sub 配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: rocketmq-pubsub
spec:
  type: pubsub.rocketmq
  version: v1
  metadata:
    - name: instanceName
      value: dapr-rocketmq-test
    - name: consumerGroup
      value: dapr-rocketmq-test-g-c
    - name: producerGroup 
      value: dapr-rocketmq-test-g-p
    - name: consumerID
      value: channel1
    - name: nameSpace
      value: dapr-test
    - name: nameServer
      value: "127.0.0.1:9876,127.0.0.2:9876"
    - name: retries
      value: 3
    - name: consumerModel
      value: "clustering"
    - name: consumeOrderly
      value: false
```

{{% alert title="警告" color="warning" %}}
上述示例以纯字符串形式使用 secrets。建议按照[此处]({{% ref component-secrets.md %}})所述，为 secrets 使用 secret store。
{{% /alert %}}

## 规范元数据字段
| Field                                 | Required | Details                                                      | default                                                     | Example                                                      |
| ------------------------------------- | :------: | ------------------------------------------------------------ | ----------------------------------------------------------- | ------------------------------------------------------------ |
| instanceName                          |    N     | 实例名称                                                     | `time.Now().String()`                                       | `dapr-rocketmq-test`                                         |
| consumerGroup                         |    N     | 消费者组名称。推荐设置。如果 `producerGroup` 为 `null`，则使用 `groupName`。 |                                                             | `dapr-rocketmq-test-g-c `                                    |
| producerGroup (consumerID)            |    N     | 生产者组名称。推荐设置。如果 `producerGroup` 为 `null`，则使用 `consumerID`。如果 `consumerID` 也为 null，则使用 `groupName`。 |                                                             | `dapr-rocketmq-test-g-p`                                     |
| consumerID        |    N     | 消费者 ID（consumer tag）将一个或多个消费者组织为一组。具有相同消费者 ID 的消费者作为一个虚拟消费者工作；例如，一条消息只会被组内的某一个消费者处理一次。如果未提供 `consumerID`，Dapr 运行时会将其设置为 Dapr 应用 ID（`appID`）的值。 | 可以设置为字符串值（如上例中的 `"channel1"`），也可以设置为字符串格式的值（如 `"{podName}"` 等）。[查看 component 元数据中可用的所有模板标签。]({{% ref "component-schema.md#templated-metadata-values" %}})
| groupName                             |    N     | 消费者/生产者组名称。**已弃用**。                            |                                                             | `dapr-rocketmq-test-g`                                       |
| nameSpace                             |    N     | RocketMQ namespace                                           |                                                             | `dapr-rocketmq`                                              |
| nameServerDomain                      |    N     | RocketMQ 名称服务器域名                                      |                                                             | `https://my-app.net:8080/nsaddr`                             |
| nameServer                            |    N     | RocketMQ 名称服务器，多个地址以 "," 或 ";" 分隔                |                                                             | `127.0.0.1:9876;127.0.0.2:9877,127.0.0.3:9877`               |
| accessKey                             |    N     | 访问密钥（用户名）                                           |                                                             | `"admin"`                                                    |
| secretKey                             |    N     | Secret Key（密码）                                           |                                                             | `"password"`                                                 |
| securityToken                         |    N     | 安全令牌                                                     |                                                             |                                                              |
| retries                               |    N     | 向 broker 发送消息的重试次数                                 | `3`                                                         | `3`                                                          |
| producerQueueSelector (queueSelector) |    N     | 生产者队列选择器。共有五种队列选择器实现：`hash`、`random`、`manual`、`roundRobin`、`dapr`。 | `dapr`                                                      | `hash`                                                       |
| consumerModel                         |    N     | 消息模型，定义消息如何投递到每个消费者客户端。RocketMQ 支持两种消息模型：`clustering` 和 `broadcasting`。 | `clustering`                                                | `broadcasting` , `clustering`                                |
| fromWhere (consumeFromWhere)          |    N     | 消费者启动时的消费起点。共有三个消费起点：`CONSUME_FROM_LAST_OFFSET`、`CONSUME_FROM_FIRST_OFFSET`、`CONSUME_FROM_TIMESTAMP`。 | `CONSUME_FROM_LAST_OFFSET`                                  | `CONSUME_FROM_LAST_OFFSET`                                   |
| consumeTimestamp |    N     | 以秒为精度回溯消费时间。时间格式为 `yyyymmddhhmmss`。例如，`20131223171201` 表示 2013 年 12 月 23 日 17:12:01。 | ` time.Now().Add(time.Minute * (-30)).Format("20060102150405")` | `20131223171201`                   |
| consumeOrderly                        |    N     | 确定是否为使用 FIFO 顺序的有序消息。                         | `false`                                                     | `false`                                                      |
| consumeMessageBatchMaxSize            |    N     | 批量消费大小，取值范围为 `[1, 1024]`                         | `512`                                                       | `10`                                                         |
| consumeConcurrentlyMaxSpan            |    N     | 并发消费的最大跨度偏移量。对顺序消费不产生效果。范围：`[1, 65535]` | `1000`                                                    | `1000`                                             |
| maxReconsumeTimes                     |    N     | 最大重新消费次数。`-1` 表示 16 次。如果消息在成功前被重新消费的次数超过 {@link maxReconsumeTimes}，则会被转入删除队列。 | 有序消息为 `MaxInt32`；并发消息为 `16` | `16`                                                         |
| autoCommit                            |    N     | 启用自动提交                                                 | `true`                                                      | `false`                                                      |
| consumeTimeout                            |    N     | 消息可阻塞消费线程的最长时间。时间单位：分钟                 | `15`                                      | `15`                                                   |
| consumerPullTimeout                           |    N     | Socket 超时时间，单位为毫秒                                  |                                                       |                                                       |
| pullInterval                          |    N     | 消息拉取间隔                                                 | `100`                                                       | `100`                                                        |
| pullBatchSize                         |    N     | 每次从 broker 拉取的消息数量。如果 `pullBatchSize` 为 `null`，则使用 `ConsumerBatchSize`。`pullBatchSize` 取值范围为 `[1, 1024]` | `32`                                                        | `10`                                                         |
| pullThresholdForQueue |    N     | 队列级别的流控阈值。每个消息队列默认最多缓存 1000 条消息。请考虑 `PullBatchSize`，瞬时值可能超过该限制。范围：`[1, 65535]` | `1024`                                     | `1000`                                                       |
| pullThresholdForTopic    |    N     | Topic 级别的流控阈值。若不为无限制，则 `pullThresholdForQueue` 的值会被覆盖，并根据 `pullThresholdForTopic` 计算。例如，若 `pullThresholdForTopic` 为 1000，且该消费者分配到 10 个消息队列，则 `pullThresholdForQueue` 将被设置为 100。范围：`[1, 6553500]` | `-1(Unlimited)`                                           | `10`                                                         |
| pullThresholdSizeForQueue                        |    N     | 队列级别的缓存消息大小限制。请考虑 `pullBatchSize`，瞬时值可能超过该限制。消息大小仅按消息体计算，因此并不精确。范围：`[1, 1024]` | `100`                                                     | `100`                                                        |
| pullThresholdSizeForTopic                        |    N     | Topic 级别的缓存消息大小限制。若不为无限制，则 `pullThresholdSizeForQueue` 的值会被覆盖，并根据 `pullThresholdSizeForTopic` 计算。例如，若 `pullThresholdSizeForTopic` 为 1000 MiB，且该消费者分配到 10 个消息队列，则 `pullThresholdSizeForQueue` 将被设置为 100 MiB。范围：`[1, 102400]` | `-1`                                                     | `100`                                                        |
| content-type                          |    N     | 消息内容类型。                                               | `"text/plain"`                                              | `"application/cloudevents+json; charset=utf-8"`, `"application/octet-stream"` |
| logLevel                              |    N     | 日志级别                                                     | `warn`                                                      | `info`                                                       |
| sendTimeOut                           |    N     | 连接 RocketMQ broker 时发送消息的超时时间，单位为纳秒。**已弃用**。 | 3 秒                                                   | `10000000000`                                                |
| sendTimeOutSec                        |    N     | 发布消息的超时时间，单位为秒。若 `sendTimeOutSec` 为 `null`，则使用 `sendTimeOut`。 | 3 秒                                                   | `3`                                                          |
| mspProperties                         |    N     | 传递给应用的 RocketMQ 消息属性集合。多个属性以 "," 分隔        |                                                             | `key,mkey`                                                   |

出于向后兼容性的考虑，元数据中仍支持以下值，但不建议使用。

| Field (supported but deprecated) | Required | Details                                                  | Example                  |
| -------------------------------- | :------: | -------------------------------------------------------- | ------------------------ |
| groupName                        |    N     | RocketMQ 发布者的生产者组名称                            | `"my_unique_group_name"` |
| sendTimeOut                      |    N     | 发布消息的超时时间，单位为纳秒                           | `0`                      |
| consumerBatchSize                |    N     | 每次从 broker 拉取的消息数量                             | `32`                       |

## 设置 RocketMQ
请参阅 https://rocketmq.apache.org/docs/quick-start/ 以搭建本地 RocketMQ 实例。

## 每次调用的元数据字段

### 分区键

调用 RocketMQ pub/sub 时，可以通过在请求 URL 中使用 `metadata` 查询参数来提供可选的分区键。

你需要在 `metadata` 中指定 `rocketmq-tag` , `"rocketmq-key"` , `rocketmq-shardingkey` , `rocketmq-queue`。

示例：

```shell
curl -X POST http://localhost:3500/v1.0/publish/myRocketMQ/myTopic?metadata.rocketmq-tag=?&metadata.rocketmq-key=?&metadata.rocketmq-shardingkey=key&metadata.rocketmq-queue=1 \
  -H "Content-Type: application/json" \
  -d '{
        "data": {
          "message": "Hi"
        }
      }'
```

## 队列选择器

RocketMQ component 共包含五种队列选择器。RocketMQ 客户端提供以下队列选择器：
- `HashQueueSelector`
- `RandomQueueSelector`
- `RoundRobinQueueSelector`
- `ManualQueueSelector`

要了解这些 RocketMQ 客户端队列选择器的更多信息，请阅读 [RocketMQ 文档](https://rocketmq.apache.org/docs)。

Dapr RocketMQ component 实现了以下队列选择器：
- `DaprQueueSelector`

 本文重点介绍 `DaprQueueSelector` 的设计。

### DaprQueueSelector

`DaprQueueSelector` 集成了三种队列选择器：
- `HashQueueSelector`
- `RoundRobinQueueSelector`
- `ManualQueueSelector`

`DaprQueueSelector` 从请求参数中获取队列 ID。你可以通过以下方式设置队列 ID：

```
http://localhost:3500/v1.0/publish/myRocketMQ/myTopic?metadata.rocketmq-queue=1
```

`ManualQueueSelector` 通过上述方法实现。

接下来，`DaprQueueSelector` 会尝试：
- 获取 `ShardingKey`
- 对 `ShardingKey` 进行哈希运算，以确定队列 ID。

你可以通过以下方式设置 `ShardingKey`：

```
http://localhost:3500/v1.0/publish/myRocketMQ/myTopic?metadata.rocketmq-shardingkey=key
```

如果 `ShardingKey` 不存在，则使用 `RoundRobin` 算法确定队列 ID。

## 相关链接

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [Pub/Sub building block]({{% ref pubsub %}})
- 阅读[本指南]({{% ref "howto-publish-subscribe.md#step-2-publish-a-topic" %}})，了解配置 pub/sub component 的说明
