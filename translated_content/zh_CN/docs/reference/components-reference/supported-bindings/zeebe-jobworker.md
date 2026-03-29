---
type: docs
title: "Zeebe JobWorker 绑定规范"
linkTitle: "Zeebe JobWorker"
description: "Zeebe JobWorker 绑定组件的详细文档"
---

## 组件格式

要设置 Zeebe JobWorker 绑定，需创建一个类型为 `bindings.zeebe.jobworker` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。

有关 Zeebe JobWorker 的文档，请参阅[此文档](https://docs.camunda.io/docs/components/concepts/job-workers/)。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.zeebe.jobworker
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
  - name: workerName
    value: "products-worker"
  - name: workerTimeout
    value: "5m"
  - name: requestTimeout
    value: "15s"
  - name: jobType
    value: "fetch-products"
  - name: maxJobsActive
    value: "32"
  - name: concurrency
    value: "4"
  - name: pollInterval
    value: "100ms"
  - name: pollThreshold
    value: "0.3"
  - name: fetchVariables
    value: "productId, productName, productKey"
  - name: autocomplete
    value: "true"
  - name: retryBackOff
    value: "30s"
  - name: direction
    value: "input"
```

## 规范元数据字段

| 字段                     | 必填  | 绑定支持 |  详情  | 示例 |
|-------------------------|:--------:|------------|-----|---------|
| `gatewayAddr`             | Y | Input | Zeebe 网关地址                                                                                                            | `"localhost:26500"` |
| `gatewayKeepAlive`        | N | Input | 设置向网关发送保活消息的频率。默认为 45 秒                                         | `"45s"` |
| `usePlainTextConnection`  | N | Input | 是否使用纯文本连接                                                                                    | `"true"`, `"false"` |
| `caCertificatePath`       | N | Input | CA 证书的路径                                                                                                          | `"/path/to/ca-cert"` |
| `workerName`              | N | Input | 激活任务的 worker 名称，主要用于日志记录目的                                                     | `"products-worker"` |
| `workerTimeout`           | N | Input | 在此调用后返回的任务在超时到达前不会被另一个调用激活；默认为 5 分钟   | `"5m"` |
| `requestTimeout`          | N | Input | 当至少有一个任务被激活或在 requestTimeout 之后，请求将完成。如果 requestTimeout = 0，则使用默认超时。如果 requestTimeout < 0，则禁用长轮询，即使没有任务被激活，请求也会立即完成。默认为 10 秒  | `"30s"` |
| `jobType`                 | Y | Input | 任务类型，在 BPMN 流程中定义（例如 `<zeebe:taskDefinition type="fetch-products" />`)                             | `"fetch-products"` |
| `maxJobsActive`           | N | Input | 设置此 worker 同时激活的最大任务数量。默认为 32                          | `"32"` |
| `concurrency`             | N | Input | 完成任务的最大并发 spawned goroutine 数量。默认为 4                                              | `"4"` |
| `pollInterval`            | N | Input | 设置轮询新任务的最大间隔。默认为 100 毫秒                                              | `"100ms"` |
| `pollThreshold`           | N | Input | 设置轮询新任务前缓冲激活任务的阈值，即 threshold * maxJobsActive。默认为 0.3        | `"0.3"` |
| `fetchVariables`          | N | Input | 要获取作为任务变量的变量列表；如果为空，则将返回激活时任务范围内所有可见的变量 | `"productId"`, `"productName"`, `"productKey"` |
| `autocomplete`            | N | Input | 指示任务是否应自动完成。如果未设置，默认情况下所有任务都将自动完成。如果 worker 应通过业务错误或事件手动完成或使任务失败，则禁用它 | `"true"`, `"false"` |
| `retryBackOff`            | N | Input | 任务失败时下次重试的退避超时时间                                                                           | `15s` |
| `direction`            | N | Input | 绑定的方向 | `"input"` |

## 绑定支持

此组件支持**输入**绑定接口。

### 输入绑定

#### 变量

Zeebe 流程引擎将流程状态以及流程变量作为可传递的内容处理，这些变量可以在流程实例化时传递，也可以在流程执行期间更新或创建。通过在 `fetchVariables` 元数据字段中将变量名称定义为逗号分隔的列表，这些变量可以传递给已注册的 job worker。然后，流程引擎会将这些变量及其当前值传递给 job worker 实现。

如果绑定注册了三个变量 `productId`、`productName` 和 `productKey`，则 worker 将使用以下 JSON 主体调用：

```json
{
  "productId": "some-product-id",
  "productName": "some-product-name",
  "productKey": "some-product-key"
}
```

注意：如果不传递 `fetchVariables` 元数据字段，所有流程变量都将传递给 worker。

#### 标头

Zeebe 流程引擎能够将自定义任务标头传递给 job worker。这些标头可以为每个[服务任务](https://docs.camunda.io/docs/components/best-practices/development/service-integration-patterns/#service-task)定义。
任务标头将由绑定作为元数据（HTTP 标头）传递给 job worker。

绑定还将传递以下与任务相关的变量作为元数据。值将作为字符串传递。该表还包含原始数据类型，以便可以将其转换回 worker 使用的编程语言中的等效数据类型。

| 元数据                           | 数据类型 | 描述                                                                                     |
|------------------------------------|-----------|-------------------------------------------------------------------------------------------------|
| X-Zeebe-Job-Key                    | int64     | 任务的键，是任务的唯一标识符                                                        |
| X-Zeebe-Job-Type                   | string    | 任务的类型（应与请求的类型匹配）                                           |
| X-Zeebe-Process-Instance-Key       | int64     | 任务的流程实例键                                                                  |
| X-Zeebe-Bpmn-Process-Id            | string    | 任务流程定义的 bpmn 流程 ID                                               |
| X-Zeebe-Process-Definition-Version | int32     | 任务流程定义的版本                                                       |
| X-Zeebe-Process-Definition-Key     | int64     | 任务流程定义的键                                                           |
| X-Zeebe-Element-Id                 | string    | 关联的任务元素 ID                                                                  |
| X-Zeebe-Element-Instance-Key       | int64     | 识别关联任务的唯一键，在流程实例范围内唯一 |
| X-Zeebe-Worker                     | string    | 激活此任务的 worker 名称                                                 |
| X-Zeebe-Retries                    | int32     | 此任务剩余的重试次数（应始终为正数）                              |
| X-Zeebe-Deadline                   | int64     | 任务可以再次激活的时间，作为 UNIX epoch 时间戳发送                             |
| X-Zeebe-Autocomplete               | bool      | 在绑定元数据中定义的自动完成状态                                 |

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作方法：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作方法：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
