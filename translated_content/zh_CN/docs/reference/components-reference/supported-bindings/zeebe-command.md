---
type: docs
title: "Zeebe command binding 规范"
linkTitle: "Zeebe command"
description: "Zeebe command binding component 的详细文档"
---

## component 格式

要设置 Zeebe command binding，请创建类型为 `bindings.zeebe.command` 的 component。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用 binding 配置。

请参阅[此处](https://docs.camunda.io/docs/components/zeebe/zeebe-overview/)获取 Zeebe 文档。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.zeebe.command
  version: v1
  metadata:
  - name: gatewayAddr
    value: "<host>:<port>"
  - name: gatewayKeepAlive
    value: "45s"
  - name: usePlainTextConnection
    value: "true"
  - name: caCertificatePath
    value: "/path/to/ca-cert"
  - name: clientId
    value: "zeebe-client"
  - name: clientSecret
    value: "zeebe-secret"
  - name: authorizationServerUrl
    value: "https://issuer.example.com/oauth/token"
  - name: tokenAudience
    value: "zeebe-api"
  - name: tokenScope
    value: "read write"
  - name: clientConfigPath
    value: "/tmp/zeebe-credentials.yaml"
```

## 规范 metadata 字段

| 字段                   | 必填 | binding 支持 |  详情 | 示例 |
|-------------------------|:--------:|------------|-----|---------|
| `gatewayAddr`             | Y | 输出 | Zeebe gateway 地址 | `"localhost:26500"` |
| `gatewayKeepAlive`        | N | 输出 | 设置向 gateway 发送保活消息的频率。默认为 45 秒 | `"45s"` |
| `usePlainTextConnection`  | N | 输出 | 是否使用纯文本连接 | `"true"`, `"false"` |
| `caCertificatePath`       | N | 输出 | CA 证书的路径 | `"/path/to/ca-cert"` |
| `clientId`                | N | 输出 | 用于请求访问令牌的 OAuth 客户端 ID。配置 OAuth 时，需与 `clientSecret`、`authorizationServerUrl` 和 `tokenAudience` 一同设置 | `"zeebe-client"` |
| `clientSecret`            | N | 输出 | 用于请求访问令牌的 OAuth client secret。配置 OAuth 时，需与 `clientId`、`authorizationServerUrl` 和 `tokenAudience` 一同设置 | `"zeebe-secret"` |
| `authorizationServerUrl`  | N | 输出 | 用于获取访问令牌的 OAuth 授权服务器 URL。配置 OAuth 时，需与 `clientId`、`clientSecret` 和 `tokenAudience` 一同设置 | `"https://issuer.example.com/oauth/token"` |
| `tokenAudience`           | N | 输出 | 访问 Zeebe API 的 OAuth 令牌受众。配置 OAuth 时，需与 `clientId`、`clientSecret` 和 `authorizationServerUrl` 一同设置 | `"zeebe-api"` |
| `tokenScope`              | N | 输出 | 配置 OAuth 时，可选地在访问令牌中请求的 OAuth 作用域 | `"read write"` |
| `clientConfigPath`        | N | 输出 | 配置 OAuth 时，OAuth 凭据缓存文件的可选路径 | `"/tmp/zeebe-credentials.yaml"` |

OAuth 是可选的。如果设置了任何 OAuth metadata 字段，则以下字段全部为必填：`clientId`、`clientSecret`、`authorizationServerUrl` 和 `tokenAudience`。

### OAuth 缓存路径说明

- `clientConfigPath` 指向 Zeebe 客户端使用的 OAuth 凭据缓存文件。
- Dapr sidecar 必须对该文件路径具有写权限。
- 若要在重启之间保留缓存的凭据，请使用持久化的挂载路径。

## binding 支持

此 component 支持以下操作的 **output binding**：

- `topology`
- `deploy-process`
- `deploy-resource`
- `create-instance`
- `cancel-instance`
- `set-variables`
- `resolve-incident`
- `publish-message`
- `activate-jobs`
- `complete-job`
- `fail-job`
- `update-job-retries`
- `throw-error`

### output binding

Zeebe 在底层使用 gRPC，作为本 binding 所使用的 Zeebe 客户端的基础。更多信息请参阅 [gRPC API 参考](https://docs.camunda.io/docs/apis-clients/grpc/)。

{{% alert title="时长格式" color="primary" %}}
Zeebe command binding 所有操作中的时长字段都必须以 Go 时长字符串（例如 `"30s"`、`"5m"`、`"1h30m"`）指定。不支持 ISO-8601 时长（例如 `"PT1M"`），使用此类值会导致时长解析错误。
{{% /alert %}}

#### topology

`topology` 操作获取 gateway 所属集群的当前拓扑结构。

要执行 `topology` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {},
  "operation": "topology"
}
```

##### 响应

binding 返回以下 JSON 响应：

```json
{
  "brokers": [
    {
      "nodeId": null,
      "host": "172.18.0.5",
      "port": 26501,
      "partitions": [
        {
          "partitionId": 1,
          "role": null,
          "health": null
        }
      ],
      "version": "0.26.0"
    }
  ],
  "clusterSize": 1,
  "partitionsCount": 1,
  "replicationFactor": 1,
  "gatewayVersion": "0.26.0"
}
```

响应值如下：

- `brokers` - 此集群中的 broker 列表
    - `nodeId` - broker 在集群内唯一的节点 ID
    - `host` - broker 的主机名
    - `port` - broker 的端口
    - `port` - broker 的端口
    - `partitions` - 在此 broker 上管理或复制的分区列表
        - `partitionId` - 此分区的唯一 ID
        - `role` - broker 在此分区中的角色
        - `health` - 此分区的健康状态
  - `version` - broker 版本
- `clusterSize` - 集群中的节点数量
- `partitionsCount` - 分布在集群中的分区数量
- `replicationFactor` - 此集群配置的复制因子
- `gatewayVersion` - gateway 版本

#### deploy-process

'deploy-resource' 的已弃用别名。

#### deploy-resource

`deploy-resource` 操作向 Zeebe 部署单个资源。资源可以是流程（BPMN），也可以是决策和决策需求（DMN）。

要执行 `deploy-resource` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": "YOUR_FILE_CONTENT",
  "metadata": {
    "fileName": "products-process.bpmn"
  },
  "operation": "deploy-resource"
}
```

metadata 参数如下：

- `fileName` - 资源文件的名称

##### 响应

binding 返回以下 JSON 响应：

{{< tabpane text=true >}}

{{% tab "BPMN" %}}

```json
{
  "key": 2251799813685252,
  "deployments": [
    {
      "Metadata": {
        "Process": {
          "bpmnProcessId": "products-process",
          "version": 2,
          "processDefinitionKey": 2251799813685251,
          "resourceName": "products-process.bpmn"
        }
      }
    }
  ]
}
```

{{% /tab %}}

{{% tab "DMN" %}}

```json
{
  "key": 2251799813685253,
  "deployments": [
    {
      "Metadata": {
        "Decision": {
          "dmnDecisionId": "products-approval",
          "dmnDecisionName": "Products approval",
          "version": 1,
          "decisionKey": 2251799813685252,
          "dmnDecisionRequirementsId": "Definitions_0c98xne",
          "decisionRequirementsKey": 2251799813685251
        }
      }
    },
    {
      "Metadata": {
        "DecisionRequirements": {
          "dmnDecisionRequirementsId": "Definitions_0c98xne",
          "dmnDecisionRequirementsName": "DRD",
          "version": 1,
          "decisionRequirementsKey": 2251799813685251,
          "resourceName": "products-approval.dmn"
        }
      }
    }
  ]
}
```

{{% /tab %}}

{{< /tabpane >}}

响应值如下：

- `key` - 标识此部署的唯一键
- `deployments` - 已部署资源的列表，例如流程
    - `metadata` - 部署 metadata，每个部署只有一个 metadata
        - `process` - 已部署流程的 metadata
            - `bpmnProcessId` - BPMN 流程 ID，在部署时解析；与版本一起构成特定
              流程定义的唯一标识符
            - `version` - 分配的流程版本
            - `processDefinitionKey` - 分配的键，作为此流程的唯一标识符
            - `resourceName` - 解析此流程所用的资源名称
        - `decision` - 已部署决策的 metadata
            - `dmnDecisionId` - DMN 决策 ID，在部署时解析；与版本一起构成特定
              决策的唯一标识符
            - `dmnDecisionName` - 决策的 DMN 名称，在部署时解析
            - `version` - 分配的决策版本
            - `decisionKey` - 分配的决策键，作为此决策的唯一标识符
            - `dmnDecisionRequirementsId` - 此决策所属决策需求图的 DMN ID，在部署时解析
            - `decisionRequirementsKey` - 此决策所属决策需求图的分配键
        - `decisionRequirements` - 已部署决策需求的 metadata
            - `dmnDecisionRequirementsId` - DMN 决策需求 ID，在部署时解析；与版本一起构成特定
              决策需求的唯一标识符
            - `dmnDecisionRequirementsName` - 决策需求的 DMN 名称，在部署时解析
            - `version` - 分配的决策需求版本
            - `decisionRequirementsKey` - 分配的决策需求键，作为此决策需求的唯一标识符
            - `resourceName` - 解析此决策需求所用的资源名称

#### create-instance

`create-instance` 操作创建并启动指定流程的一个实例。用于创建实例的流程定义可以通过其唯一键（由 `deploy-process` 操作返回）指定，
也可以通过 BPMN 流程 ID 和版本指定。

请注意，只有没有启动事件的流程才能通过此命令启动。

通常，流程的创建与执行是解耦的。这意味着该命令会创建一个新的流程实例，并立即以流程实例 ID 作出响应。
流程的执行在响应发送之后才进行。然而，某些用例需要在流程执行完成后收集其结果。
通过定义 `withResult` 属性，该命令可以“同步”执行流程，并通过一组变量接收结果。
响应会在流程执行完成时发送。

更多信息请访问[官方文档](https://docs.camunda.io/docs/components/concepts/process-instance-creation/)。

要执行 `create-instance` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

{{< tabpane text=true >}}

{{% tab "按 BPMN 流程 ID" %}}

```json
{
  "data": {
    "bpmnProcessId": "products-process",
    "variables": {
      "productId": "some-product-id",
      "productName": "some-product-name",
      "productKey": "some-product-key"
    }
  },
  "operation": "create-instance"
}
```

{{% /tab %}}

{{% tab "按流程定义键" %}}

```json
{
  "data": {
    "processDefinitionKey": 2251799813685895,
    "variables": {
      "productId": "some-product-id",
      "productName": "some-product-name",
      "productKey": "some-product-key"
    }
  },
  "operation": "create-instance"
}
```

{{% /tab %}}

{{% tab "同步执行" %}}

```json
{
  "data": {
    "bpmnProcessId": "products-process",
    "variables": {
      "productId": "some-product-id",
      "productName": "some-product-name",
      "productKey": "some-product-key"
    },
    "withResult": true,
    "requestTimeout": "30s",
    "fetchVariables": ["productId"]
  },
  "operation": "create-instance"
}
```

{{% /tab %}}

{{< /tabpane >}}

数据参数如下：

- `bpmnProcessId` - 要实例化的流程定义的 BPMN 流程 ID
- `processDefinitionKey` - 唯一标识要实例化的流程定义的键
- `version` - （可选，默认：最新版本）要实例化的流程版本
- `variables` - （可选）JSON 文档，用于为流程实例的根变量作用域实例化变量；它必须是 JSON 对象，因为变量以键值方式映射。例如，{ "a": 1, "b": 2 } 会创建两个变量，分别命名为 "a" 和 "b"，并带有对应的值。[{ "a": 1, "b": 2 }] 则不是有效参数，因为 JSON 文档的根是数组而不是对象
- `withResult` - （可选，默认：false）如果设置为 true，流程将被同步实例化并执行
- `requestTimeout` - （可选，仅在 `withResult` 为 `true` 时使用）超时时间。若流程在该时间内未完成，请求将被关闭。必须为 Go 时长字符串（例如 `"30s"`、`"5m"`、`"1h30m"`）。若 `requestTimeout` 为 `"0"`，则使用 gateway 中配置的通用 `requestTimeout`
- `fetchVariables` - （可选，仅在 withResult=true 时使用）要包含在响应 `variables` 属性中的变量名称列表。
	若为空，则返回根作用域中的所有可见变量。

##### 响应

binding 返回以下 JSON 响应：

```json
{
  "processDefinitionKey": 2251799813685895,
  "bpmnProcessId": "products-process",
  "version": 3,
  "processInstanceKey": 2251799813687851,
  "variables": "{\"productId\":\"some-product-id\"}"
}
```

响应值如下：

- `processDefinitionKey` - 用于创建流程实例的流程定义的键
- `bpmnProcessId` - 用于创建流程实例的流程定义的 BPMN 流程 ID
- `version` - 用于创建流程实例的流程定义的版本
- `processInstanceKey` - 所创建的流程实例的唯一标识符
- `variables` - （可选，仅在请求中使用了 withResult=true 时返回）由根作用域中的可见变量组成的 JSON 文档；以序列化的 JSON 文档形式返回

#### cancel-instance

`cancel-instance` 操作取消正在运行的流程实例。

要执行 `cancel-instance` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "processInstanceKey": 2251799813687851
  },
  "operation": "cancel-instance"
}
```

数据参数如下：

- `processInstanceKey` - 流程实例键

##### 响应

binding 不返回响应正文。

#### set-variables

`set-variables` 操作为元素实例（例如流程实例、流元素实例）创建或更新变量。

要执行 `set-variables` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "elementInstanceKey": 2251799813687880,
    "variables": {
      "productId": "some-product-id",
      "productName": "some-product-name",
      "productKey": "some-product-key"
    }
  },
  "operation": "set-variables"
}
```

数据参数如下：

- `elementInstanceKey` - 特定元素的唯一标识符；可以是流程实例键（在创建实例时获得），也可以是某个给定元素的键，例如服务任务（参见 job 消息上的 elementInstanceKey）
- `local` - （可选，默认：`false`）如果为 true，变量将严格合并到本地作用域（由 elementInstanceKey 指示）；这意味着变量不会传播到上层作用域。例如，假设我们有两个作用域“1”和“2”，其有效变量分别为：1 => `{ "foo" : 2 }`，2 => `{ "bar" : 1 }`。如果我们发送一个更新请求，其中 elementInstanceKey = 2，变量为 `{ "foo" : 5 }`，并且 local 为 true，那么作用域 1 保持不变，作用域 2 将变为 `{ "bar" : 1, "foo" 5 }`。但如果 local 为 false，那么作用域 1 将变为 `{ "foo": 5 }`，作用域 2 将保持为 `{ "bar" : 1 }`
- `variables` - 以键值对形式描述变量的 JSON 序列化文档；文档的根必须是对象

##### 响应

binding 返回以下 JSON 响应：

```json
{
  "key": 2251799813687896
}
```

响应值如下：

- `key` - set-variables 命令的唯一键

#### resolve-incident

`resolve-incident` 操作解决一个事件（incident）。

要执行 `resolve-incident` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "incidentKey": 2251799813686123
  },
  "operation": "resolve-incident"
}
```

数据参数如下：

- `incidentKey` - 要解决的事件的唯一 ID

##### 响应

binding 不返回响应正文。

#### publish-message

`publish-message` 操作发布单个消息。消息会发布到根据其关联键计算出的特定分区。

要执行 `publish-message` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "messageName": "product-message",
    "correlationKey": "2",
    "timeToLive": "1m",
    "variables": {
      "productId": "some-product-id",
      "productName": "some-product-name",
      "productKey": "some-product-key"
    },
  },  
  "operation": "publish-message"
}
```

数据参数如下：

- `messageName` - 消息的名称
- `correlationKey` - （可选）消息的关联键
- `timeToLive` - （可选）消息在 broker 上缓冲的时长。必须为 Go 时长字符串（例如 `"30s"`、`"5m"`、`"1h30m"`）
- `messageId` - （可选）消息的唯一 ID；可以省略。仅用于确保在其生命周期内，只会发布一条具有给定 ID 的消息
- `variables` - （可选）以 JSON 文档表示的消息变量；要使其有效，文档的根必须是对象，例如 { "a": "foo" }。[ "foo" ] 则无效

##### 响应

binding 返回以下 JSON 响应：

```json
{
  "key": 2251799813688225
}
```

响应值如下：

- `key` - 所发布消息的唯一 ID

#### activate-jobs

`activate-jobs` 操作以轮询方式遍历所有已知分区，激活至多达到请求最大数量的 job，并在 job 被激活时将其流式返回给客户端。

要执行 `activate-jobs` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "jobType": "fetch-products",
    "maxJobsToActivate": 5,
    "timeout": "5m",
    "workerName": "products-worker",
    "fetchVariables": [
      "productId",
      "productName",
      "productKey"
    ],
    "requestTimeout": "30s"
  },
  "operation": "activate-jobs"
}
```

数据参数如下：

- `jobType` - job 类型，在 BPMN 流程中定义（例如 `<zeebe:taskDefinition type="fetch-products" />`）
- `maxJobsToActivate` - 此请求最多激活的 job 数
- `timeout` - （可选，默认：5 分钟）此调用返回的 job 在超时之前不会被其他调用激活。必须为 Go 时长字符串（例如 `"5m"`、`"30s"`、`"1h30m"`）
- `workerName` - （可选，默认：`default`）激活 job 的工作进程名称，主要用于日志记录
- `fetchVariables` - （可选）要作为 job 变量获取的变量列表；若为空，则返回激活时 job 所在作用域的所有可见变量
- `requestTimeout` - （可选）请求会在至少激活一个 job 时完成，或在 `requestTimeout` 到期后完成。必须为 Go 时长字符串（例如 `"30s"`、`"5m"`、`"1h30m"`）。若 `requestTimeout` 为 `"0"`，则使用默认超时。若 `requestTimeout` 为负的时长（例如 `"-1s"`），则禁用长轮询，请求会立即完成，即使没有激活任何 job

##### 响应

binding 返回以下 JSON 响应：

```json
[
  {
    "key": 2251799813685267,
    "type": "fetch-products",
    "processInstanceKey": 2251799813685260,
    "bpmnProcessId": "products",
    "processDefinitionVersion": 1,
    "processDefinitionKey": 2251799813685249,
    "elementId": "Activity_test",
    "elementInstanceKey": 2251799813685266,
    "customHeaders": "{\"process-header-1\":\"1\",\"process-header-2\":\"2\"}",
    "worker": "test", 
    "retries": 1,
    "deadline": 1694091934039,
    "variables":"{\"productId\":\"some-product-id\"}"
  }
]
```

响应值如下：

- `key` - job 的唯一标识符
- `type` - job 类型（应与请求的类型一致）
- `processInstanceKey` - job 所属的流程实例键
- `bpmnProcessId` - job 所属流程定义的 BPMN 流程 ID
- `processDefinitionVersion` - job 所属流程定义的版本
- `processDefinitionKey` - job 所属流程定义的键
- `elementId` - 关联的任务元素 ID
- `elementInstanceKey` - 标识关联任务的唯一键，在流程实例作用域内唯一
- `customHeaders` - 建模时定义的一组自定义标头；以序列化的 JSON 文档形式返回
- `worker` - 激活此 job 的工作进程名称
- `retries` - 此 job 剩余的重试次数（应始终为正数）
- `deadline` - job 可以再次被激活的时间，以 UNIX 纪元时间戳形式发送
- `variables` - 在激活时计算得出，由任务作用域内的所有可见变量组成；以序列化的 JSON 文档形式返回

#### complete-job

`complete-job` 操作使用给定的负载完成一个 job，从而完成关联的服务任务。

要执行 `complete-job` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "jobKey": 2251799813686172,
    "variables": {
      "productId": "some-product-id",
      "productName": "some-product-name",
      "productKey": "some-product-key"
    }
  },
  "operation": "complete-job"
}
```

数据参数如下：

- `jobKey` - 唯一的 job 标识符，从 activate-jobs 响应中获得
- `variables` - （可选）表示当前任务作用域中变量的 JSON 文档

##### 响应

binding 不返回响应正文。

#### fail-job

`fail-job` 操作将 job 标记为失败。如果 retries 参数为正数，则 job 会立即可再次被激活，工作进程可以再次尝试处理它。但如果为零或负数，则会引发一个事件（incident），并以给定的 errorMessage 作为标记，并且在该事件解决之前，job 无法被激活。

要执行 `fail-job` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "jobKey": 2251799813685739,
    "retries": 5,
    "errorMessage": "some error occurred",
    "retryBackOff": "30s",
    "variables": {
      "productId": "some-product-id",
      "productName": "some-product-name",
      "productKey": "some-product-key"
    }
  },
  "operation": "fail-job"
}
```

数据参数如下：

- `jobKey` - 唯一的 job 标识符，在激活 job 时获得
- `retries` - job 应剩余的重试次数
- `errorMessage` - （可选）描述 job 失败原因的消息。当 job 耗尽重试次数并引发事件时，这一消息尤其有用，因为它可以帮助解释事件被引发的原因
- `retryBackOff` - （可选）下一次重试之前的退避时长。必须为 Go 时长字符串（例如 `"30s"`、`"5m"`、`"1h30m"`）
- `variables` - （可选）JSON 文档，用于在 job 所关联任务的本地作用域中实例化变量；它必须是 JSON 对象，因为变量以键值方式映射。例如，{ "a": 1, "b": 2 } 会创建两个变量，分别命名为 "a" 和 "b"，并带有对应的值。[{ "a": 1, "b": 2 }] 则不是有效参数，因为 JSON 文档的根是数组而不是对象。

##### 响应

binding 不返回响应正文。

#### update-job-retries

`update-job-retries` 操作更新 job 剩余的重试次数。这对于已耗尽重试次数的 job 最为有用，前提是底层问题已经解决。

要执行 `update-job-retries` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "jobKey": 2251799813686172,
    "retries": 10
  },
  "operation": "update-job-retries"
}
```

数据参数如下：

- `jobKey` - 唯一的 job 标识符，通过 activate-jobs 操作获得
- `retries` - job 新的重试次数；必须为正数

##### 响应

binding 不返回响应正文。

#### throw-error

`throw-error` 操作抛出一个错误，表示在处理 job 时发生了业务错误。该错误由错误代码标识，并由流程中具有相同错误代码的错误捕获事件处理。

要执行 `throw-error` 操作，请使用 `POST` 方法调用 Zeebe command binding，并使用以下 JSON 请求体：

```json
{
  "data": {
    "jobKey": 2251799813686172,
    "errorCode": "product-fetch-error",
    "errorMessage": "The product could not be fetched",
    "variables": {
      "productId": "some-product-id",
      "productName": "some-product-name",
      "productKey": "some-product-key"
    }
  },
  "operation": "throw-error"
}
```

数据参数如下：

- `jobKey` - 唯一的 job 标识符，在激活 job 时获得
- `errorCode` - 将与错误捕获事件匹配的错误代码
- `errorMessage` - （可选）提供额外上下文的错误消息
- `variables` - （可选）JSON 文档，用于在 job 所关联任务的本地作用域中实例化变量；它必须是 JSON 对象，因为变量以键值方式映射。例如，{ "a": 1, "b": 2 } 会创建两个变量，分别命名为 "a" 和 "b"，并带有对应的值。[{ "a": 1, "b": 2 }] 则不是有效参数，因为 JSON 文档的根是数组而不是对象。

##### 响应

binding 不返回响应正文。

## 相关链接

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [Bindings building block]({{% ref bindings %}})
- [如何：使用 input binding 触发应用程序]({{% ref howto-triggers.md %}})
- [如何：使用 bindings 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
