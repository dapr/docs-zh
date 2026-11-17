---
type: docs
title: "Zeebe JobWorker binding 规范"
linkTitle: "Zeebe JobWorker"
description: "Zeebe JobWorker binding 组件的详细文档"
---

## 组件格式

要设置 Zeebe JobWorker binding，需创建一个类型为 `bindings.zeebe.jobworker` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用 binding 配置。

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

| 字段                     | 必填  | binding 支持 |  详情  | 示例 |
|-------------------------|:--------:|------------|-----|---------|
| `gatewayAddr`             | Y | Input | Zeebe 网关地址                                                                                                            | `"localhost:26500"` |
| `gatewayKeepAlive`        | N | Input | 设置向网关发送保活消息的频率。默认为 45 秒                                         | `"45s"` |
| `usePlainTextConnection`  | N | Input | 是否使用纯文本连接                                                                                    | `"true"`, `"false"` |
| `caCertificatePath`       | N | Input | CA 证书的路径                                                                                                          | `"/path/to/ca-cert"` |
| `clientId`                | N | Input | 用于请求访问令牌的 OAuth 客户端 ID。配置 OAuth 时，需与 `clientSecret`、`authorizationServerUrl` 和 `tokenAudience` 一同设置 | `"zeebe-client"` |
| `clientSecret`            | N | Input | 用于请求访问令牌的 OAuth 客户端机密。配置 OAuth 时，需与 `clientId`、`authorizationServerUrl` 和 `tokenAudience` 一同设置 | `"zeebe-secret"` |
| `authorizationServerUrl`  | N | Input | 用于获取访问令牌的 OAuth 授权服务器 URL。配置 OAuth 时，需与 `clientId`、`clientSecret` 和 `tokenAudience` 一同设置 | `"https://issuer.example.com/oauth/token"` |
| `tokenAudience`           | N | Input | 用于访问 Zeebe API 的 OAuth 令牌受众。配置 OAuth 时，需与 `clientId`、`clientSecret` 和 `authorizationServerUrl` 一同设置 | `"zeebe-api"` |
| `tokenScope`              | N | Input | 可选。配置 OAuth 时，在访问令牌中请求的 OAuth 作用域 | `"read write"` |
| `clientConfigPath`        | N | Input | 可选。配置 OAuth 时，OAuth 凭据缓存文件的路径 | `"/tmp/zeebe-credentials.yaml"` |
| `workerName`              | N | Input | 激活作业的 worker 名称，主要用于日志记录                                                     | `"products-worker"` |
| `workerTimeout`           | N | Input | 在此次调用后返回的作业，在超时到达之前不会被另一次调用激活；默认为 5 分钟   | `"5m"` |
| `requestTimeout`          | N | Input | 当至少有一个作业被激活或超过 requestTimeout 后，请求将完成。如果 requestTimeout = 0，则使用默认超时。如果 requestTimeout < 0，则禁用长轮询，即使没有作业被激活，请求也会立即完成。默认为 10 秒  | `"30s"` |
| `jobType`                 | Y | Input | 作业类型，在 BPMN 流程中定义（例如 `<zeebe:taskDefinition type="fetch-products" />`）                             | `"fetch-products"` |
| `maxJobsActive`           | N | Input | 设置此 worker 同时激活的作业最大数量。默认为 32                          | `"32"` |
| `concurrency`             | N | Input | 用于完成作业的 goroutine 最大并发数量。默认为 4                                              | `"4"` |
| `pollInterval`            | N | Input | 设置轮询新作业的最大间隔。默认为 100 毫秒                                              | `"100ms"` |
| `pollThreshold`           | N | Input | 设置在轮询新作业之前，缓冲的已激活作业的阈值，即 threshold * maxJobsActive。默认为 0.3        | `"0.3"` |
| `fetchVariables`          | N | Input | 要作为作业变量获取的变量列表；如果为空，则返回作业范围内在激活时所有可见的变量 | `"productId"`, `"productName"`, `"productKey"` |
| `autocomplete`            | N | Input | 指示作业是否应自动完成。如果未设置，默认所有作业都会自动完成。如果 worker 应通过业务错误或事件手动完成或使作业失败，则将其禁用 | `"true"`, `"false"` |
| `retryBackOff`            | N | Input | 作业失败时下一次重试的退避超时时间                                                                           | `15s` |
| `direction`            | N | Input | binding 的方向 | `"input"` |

OAuth 为可选配置。如果设置了任一 OAuth 元数据字段，则以下字段均为必需：`clientId`、`clientSecret`、`authorizationServerUrl` 和 `tokenAudience`。

### OAuth 缓存路径说明

- `clientConfigPath` 指向 Zeebe 客户端使用的 OAuth 凭据缓存文件。
- Dapr 边车必须对该文件路径具有写入权限。
- 若要在重启后保留缓存的凭据，请使用持久化的挂载路径。

## binding 支持

此组件支持**输入** binding 接口。

### input binding

#### 变量

Zeebe 流程引擎将流程状态以及流程变量作为可传递的内容处理，这些变量可以在流程实例化时传递，也可以在流程执行期间更新或创建。通过在 `fetchVariables` 元数据字段中将变量名称定义为逗号分隔的列表，这些变量可以传递给已注册的作业 worker。然后，流程引擎会将这些变量及其当前值传递给作业 worker 实现。

如果 binding 注册了三个变量 `productId`、`productName` 和 `productKey`，则 worker 将使用以下 JSON 主体调用：

```json
{
  "productId": "some-product-id",
  "productName": "some-product-name",
  "productKey": "some-product-key"
}
```

注意：如果不传递 `fetchVariables` 元数据字段，所有流程变量都将传递给 worker。

#### 标头

Zeebe 流程引擎能够将自定义任务标头传递给作业 worker。这些标头可以为每个[服务任务](https://docs.camunda.io/docs/components/best-practices/development/service-integration-patterns/#service-task)定义。
任务标头将由 binding 作为元数据（HTTP 标头）传递给作业 worker。

binding 还将传递以下与作业相关的变量作为元数据。值将作为字符串传递。该表还包含原始数据类型，以便可以将其转换回 worker 使用的编程语言中的等效数据类型。

| 元数据                           | 数据类型 | 描述                                                                                     |
|------------------------------------|-----------|-------------------------------------------------------------------------------------------------|
| X-Zeebe-Job-Key                    | int64     | 作业的键，是作业的唯一标识符                                                        |
| X-Zeebe-Job-Type                   | string    | 作业的类型（应与请求的类型匹配）                                           |
| X-Zeebe-Process-Instance-Key       | int64     | 作业的流程实例键                                                                  |
| X-Zeebe-Bpmn-Process-Id            | string    | 作业流程定义的 bpmn 流程 ID                                               |
| X-Zeebe-Process-Definition-Version | int32     | 作业流程定义的版本                                                       |
| X-Zeebe-Process-Definition-Key     | int64     | 作业流程定义的键                                                           |
| X-Zeebe-Element-Id                 | string    | 关联的任务元素 ID                                                                  |
| X-Zeebe-Element-Instance-Key       | int64     | 识别关联任务的唯一键，在流程实例范围内唯一 |
| X-Zeebe-Worker                     | string    | 激活此作业的 worker 名称                                                 |
| X-Zeebe-Retries                    | int32     | 此作业剩余的重试次数（应始终为正数）                              |
| X-Zeebe-Deadline                   | int64     | 作业可以再次被激活的时间，以 UNIX epoch 时间戳发送                             |
| X-Zeebe-Autocomplete               | bool      | 在 binding 元数据中定义的自动完成状态                                 |

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [binding 构建块]({{% ref bindings %}})
- [操作方法：使用 input binding 触发应用]({{% ref howto-triggers.md %}})
- [操作方法：使用 binding 与外部资源交互]({{% ref howto-bindings.md %}})
- [binding API 参考]({{% ref bindings_api.md %}})
