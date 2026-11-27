---
type: docs
title: "Getting started with the Dapr client Go SDK"
linkTitle: "Client"
weight: 20000
description: "如何开始使用 Dapr Go SDK"
no_list: true
---

Dapr 客户端包允许你从 Go 应用程序与其他 Dapr 应用程序进行交互。

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr environment]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Go](https://golang.org/doc/install)


## 导入客户端包
```go
import "github.com/dapr/go-sdk/client"
```
## 错误处理
Dapr 错误基于 [gRPC 的 Richer Error Model](https://cloud.google.com/apis/design/errors#error_model)。
以下代码展示了如何解析和处理错误详细信息的示例：

```go
if err != nil {
    st := status.Convert(err)

    fmt.Printf("Code: %s\n", st.Code().String())
    fmt.Printf("Message: %s\n", st.Message())

    for _, detail := range st.Details() {
        switch t := detail.(type) {
        case *errdetails.ErrorInfo:
            // 处理 ErrorInfo 详细信息
            fmt.Printf("ErrorInfo:\n- Domain: %s\n- Reason: %s\n- Metadata: %v\n", t.GetDomain(), t.GetReason(), t.GetMetadata())
        case *errdetails.BadRequest:
            // 处理 BadRequest 详细信息
            fmt.Println("BadRequest:")
            for _, violation := range t.GetFieldViolations() {
                fmt.Printf("- Key: %s\n", violation.GetField())
                fmt.Printf("- The %q field was wrong: %s\n", violation.GetField(), violation.GetDescription())
            }
        case *errdetails.ResourceInfo:
            // 处理 ResourceInfo 详细信息
            fmt.Printf("ResourceInfo:\n- Resource type: %s\n- Resource name: %s\n- Owner: %s\n- Description: %s\n",
                t.GetResourceType(), t.GetResourceName(), t.GetOwner(), t.GetDescription())
        case *errdetails.Help:
            // 处理 ResourceInfo 详细信息
            fmt.Println("HelpInfo:")
            for _, link := range t.GetLinks() {
                fmt.Printf("- Url: %s\n", link.Url)
                fmt.Printf("- Description: %s\n", link.Description)
            }

        default:
            // 为你期望的其他类型的详细信息添加 case
            fmt.Printf("Unhandled error detail type: %v\n", t)
        }
    }
}
```

## Building blocks

Go SDK 允许你与所有 [Dapr building blocks]({{% ref building-blocks %}}) 进行交互。

### Service Invocation

要在使用 Dapr sidecar 运行的另一个服务上调用特定方法，Dapr 客户端 Go SDK 提供了两种选项：

不带数据调用服务：
```go
resp, err := client.InvokeMethod(ctx, "app-id", "method-name", "post")
```

带数据调用服务：
```go
content := &dapr.DataContent{
    ContentType: "application/json",
    Data:        []byte(`{ "id": "a123", "value": "demo", "valid": true }`),
}

resp, err = client.InvokeMethodWithContent(ctx, "app-id", "method-name", "post", content)
```

有关 service invocation 的完整指南，请访问[如何：调用服务]({{% ref howto-invoke-discover-services.md %}})。

### Workflows

可以像下面这样使用 Dapr Go SDK 编写和管理 workflow 及其 activity：

```go
import (
	"context"
	"fmt"
	"log"

	"github.com/dapr/durabletask-go/workflow"
	dapr "github.com/dapr/go-sdk/client"
)

func ExampleWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var output string
	input := "world"

	if err := ctx.CallActivity(ExampleActivity, workflow.WithActivityInput(input)).Await(&output); err != nil {
		return nil, err
	}

	// 打印输出 - "hello world"
	fmt.Println(output)

	return nil, nil
}

func ExampleActivity(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}

	return fmt.Sprintf("hello %s", input), nil
}

func main() {
	r := workflow.NewRegistry()

	// 注册 workflow
	r.AddWorkflow(ExampleWorkflow)

	// 注册 activity
	r.AddActivity(ExampleActivity)

	client, err := dapr.NewWorkflowClient()
	if err != nil {
		log.Fatal(err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := client.StartWorker(ctx, r); err != nil {
		log.Fatal(err)
	}

	// 启动一个新的 workflow
	id, err := client.ScheduleWorkflow(ctx, "ExampleWorkflow")
	if err != nil {
		log.Fatal(err)
	}

	// 等待 workflow 完成
	metadata, err := client.WaitForWorkflowCompletion(ctx, id)
	if err != nil {
		log.Fatal(err)
	}

	// 打印 workflow 完成后的状态
	fmt.Println(metadata.String())
}
```

#### 管理 workflow

`dapr.NewWorkflowClient()` 返回的 workflow 客户端还提供管理操作：`SuspendWorkflow`、`ResumeWorkflow`、`TerminateWorkflow`、`PurgeWorkflowState`、`RaiseEvent` 和 `FetchWorkflowMetadata`，以及下面的高级操作。

##### 列出 workflow instance

`ListInstanceIDs` 返回属于该应用的 workflow instance 的实例 ID。结果是分页的：页大小是每页所含 ID 数量的上限，你需要持续使用上一次响应中的延续令牌进行调用，直到其返回 `nil`。

```go
var token string
for {
	opts := []workflow.ListInstanceIDsOptions{
		workflow.WithListInstanceIDsPageSize(100),
	}
	if token != "" {
		opts = append(opts, workflow.WithListInstanceIDsContinuationToken(token))
	}

	resp, err := client.ListInstanceIDs(ctx, opts...)
	if err != nil {
		log.Fatal(err)
	}

	for _, id := range resp.InstanceIds {
		fmt.Println(id)
	}

	if resp.ContinuationToken == nil {
		break
	}
	token = *resp.ContinuationToken
}
```

这需要一个支持 Actor 且能够列出键的 state store。

##### 读取 workflow 的历史记录

`GetInstanceHistory` 返回某个实例的完整执行历史，可用于审计一次运行，或查找可从其重新运行的事件。

```go
hist, err := client.GetInstanceHistory(ctx, id)
if err != nil {
	log.Fatal(err)
}

var rerunFrom uint32
for _, event := range hist.Events {
	if ts := event.GetTaskScheduled(); ts != nil {
		fmt.Printf("event %d scheduled activity %s\n", event.GetEventId(), ts.GetName())

		// history event 的 ID 为 int32，部分事件类型携带 -1，而 RerunWorkflowFromEvent 接受 uint32，
		// 因此复用前需要先做收窄转换。
		if id := event.GetEventId(); id >= 0 {
			rerunFrom = uint32(id)
		}
	}
}
```

如果实例不存在或其状态已被清除，该调用会返回 `NotFound`。

##### 从事件重新运行 workflow

`RerunWorkflowFromEvent` 从某个 history event 开始，将一个已完成的 workflow 重新运行（“回退”）到一个**新**实例中。源实例保持不变。

在目标事件之前尚未完成的 activity 会在新实例中再次执行。关于哪些内容会被重放、哪些会被重新执行，以及适用于每次重新运行的限制，请参阅 [重新运行 workflow]({{% ref "workflow-features-concepts.md#rerunning-workflows" %}})。

```go
newID, err := client.RerunWorkflowFromEvent(ctx, id, eventID,
	workflow.WithRerunNewInstanceID("my-rerun"),
	workflow.WithRerunInput(newInput),
)
if err != nil {
	log.Fatal(err)
}

metadata, err := client.WaitForWorkflowCompletion(ctx, newID)
if err != nil {
	log.Fatal(err)
}
fmt.Println(metadata.String())
```

Go 相关说明：

- `eventID` 是 `uint32` 类型，表示事件自身的 ID，而不是它在历史切片中的索引。
- `WithRerunInput` 替换目标事件的输入。
- `WithRerunNewChildInstanceID` 设置重新运行出的 child workflow 的实例 ID。
- `WithRerunNewInstanceID` 设置新的实例 ID。若省略，运行时会自动生成一个。
- 违反任一[重新运行限制]({{% ref "workflow-features-concepts.md#rerun-limitations" %}})的请求会失败，返回 `InvalidArgument`、`NotFound`（源实例或事件不存在，或该事件类型不能被重新运行），或 `AlreadyExists`（新实例 ID 已被占用）。

- 如需更全面地了解 workflow，请访问以下 How-To 指南：
  - [如何：编写 workflow]({{% ref howto-author-workflow.md %}})。
  - [如何：管理 workflow]({{% ref howto-manage-workflow.md %}})。
- 访问 Go SDK 示例，查看完整示例：
  - [Workflow 示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow)
  - [Workflow - 并行化](https://github.com/dapr/go-sdk/tree/main/examples/workflow-parallel)

### State Management

对于简单的使用场景，Dapr 客户端提供了易于使用的 `Save`、`Get`、`Delete` 方法：

```go
ctx := context.Background()
data := []byte("hello")
store := "my-store" // 在组件 YAML 中定义

// 使用键 key1 保存状态，默认选项：strong、last-write
if err := client.SaveState(ctx, store, "key1", data, nil); err != nil {
    panic(err)
}

// 获取键 key1 的状态
item, err := client.GetState(ctx, store, "key1", nil)
if err != nil {
    panic(err)
}
fmt.Printf("data [key:%s etag:%s]: %s", item.Key, item.Etag, string(item.Value))

// 删除键 key1 的状态
if err := client.DeleteState(ctx, store, "key1", nil); err != nil {
    panic(err)
}
```

如需更细粒度的控制，Dapr Go 客户端提供了 `SetStateItem` 类型，可用于更精细地控制状态操作，并支持一次保存多个项：

```go
item1 := &dapr.SetStateItem{
    Key:  "key1",
    Etag: &ETag{
        Value: "1",
    },
    Metadata: map[string]string{
        "created-on": time.Now().UTC().String(),
    },
    Value: []byte("hello"),
    Options: &dapr.StateOptions{
        Concurrency: dapr.StateConcurrencyLastWrite,
        Consistency: dapr.StateConsistencyStrong,
    },
}

item2 := &dapr.SetStateItem{
    Key:  "key2",
    Metadata: map[string]string{
        "created-on": time.Now().UTC().String(),
    },
    Value: []byte("hello again"),
}

item3 := &dapr.SetStateItem{
    Key:  "key3",
    Etag: &dapr.ETag{
	Value: "1",
    },
    Value: []byte("hello again"),
}

if err := client.SaveBulkState(ctx, store, item1, item2, item3); err != nil {
    panic(err)
}
```

同样，`GetBulkState` 方法提供了在一次操作中检索多个状态项的方式：

```go
keys := []string{"key1", "key2", "key3"}
items, err := client.GetBulkState(ctx, store, keys, nil,100)
```

`ExecuteStateTransaction` 方法则可以以事务方式执行多个 upsert 或 delete 操作。

```go
ops := make([]*dapr.StateOperation, 0)

op1 := &dapr.StateOperation{
    Type: dapr.StateOperationTypeUpsert,
    Item: &dapr.SetStateItem{
        Key:   "key1",
        Value: []byte(data),
    },
}
op2 := &dapr.StateOperation{
    Type: dapr.StateOperationTypeDelete,
    Item: &dapr.SetStateItem{
        Key:   "key2",
    },
}
ops = append(ops, op1, op2)
meta := map[string]string{}
err := testClient.ExecuteStateTransaction(ctx, store, meta, ops)
```

使用 `QueryState` 检索、过滤和排序存储在 statestore 中的键/值数据。

```go
// 定义查询字符串
query := `{
	"filter": {
		"EQ": { "value.Id": "1" }
	},
	"sort": [
		{
			"key": "value.Balance",
			"order": "DESC"
		}
	]
}`

// 使用客户端查询状态
queryResponse, err := c.QueryState(ctx, "querystore", query)
if err != nil {
	log.Fatal(err)
}

fmt.Printf("Got %d\n", len(queryResponse))

for _, account := range queryResponse {
	var data Account
	err := account.Unmarshal(&data)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Account: %s has %f\n", data.ID, data.Balance)
}
```

> **注意：** Query state API 目前处于 alpha 阶段

有关 State Management 的完整指南，请访问[如何：保存与获取状态]({{% ref howto-get-save-state.md %}})。

### 发布消息
要将数据发布到某个 topic，Dapr Go 客户端提供了一个简单的方法：

```go
data := []byte(`{ "id": "a123", "value": "abcdefg", "valid": true }`)
if err := client.PublishEvent(ctx, "component-name", "topic-name", data); err != nil {
    panic(err)
}
```

要一次发布多条消息，可以使用 `PublishEvents` 方法：

```go
events := []string{"event1", "event2", "event3"}
res := client.PublishEvents(ctx, "component-name", "topic-name", events)
if res.Error != nil {
    panic(res.Error)
}
```

有关 pub/sub 的完整指南，请访问[如何：发布与订阅]({{% ref howto-publish-subscribe.md %}})。

### Workflow

你可以使用 Go SDK 创建 [workflow]({{% ref workflow-overview.md %}})。例如，先从一个简单的 workflow activity 开始：

```go
func TestActivity(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}

	// 在此执行一些操作
	return "result", nil
}
```

编写一个简单的 workflow 函数：

```go
func TestWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return nil, err
	}
	var output string
	if err := ctx.CallActivity(TestActivity, workflow.ActivityInput(input)).Await(&output); err != nil {
		return nil, err
	}
	if err := ctx.WaitForExternalEvent("testEvent", time.Second*60).Await(&output); err != nil {
		return nil, err
	}

	if err := ctx.CreateTimer(time.Second).Await(nil); err != nil {
		return nil, nil
	}
	return output, nil
}
```

若要等待多个任务中最先完成的那个，请使用 `ctx.Select`。它会返回最先完成的任务的索引。例如，审批闸门会等待 `Approve` 事件、`Reject` 事件或超时，以先到者为准：

```go
func ApprovalWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	// 负的超时时间表示无限期等待事件
	approve := ctx.WaitForExternalEvent("Approve", -1)
	reject := ctx.WaitForExternalEvent("Reject", -1)
	timeout := ctx.CreateTimer(24 * time.Hour)

	winner, err := ctx.Select(approve, reject, timeout)
	if err != nil {
		return nil, err
	}

	switch winner {
	case 0:
		var approver string
		if err := approve.Await(&approver); err != nil {
			return nil, err
		}
		return "approved by " + approver, nil
	case 1:
		return "rejected", nil
	default:
		return "timed out", nil
	}
}
```

如果不使用 `Select`，workflow 就必须以较短的 `WaitForExternalEvent` 超时轮询每个事件，而每次轮询都会增加一个 timer 和一条历史记录条目。`Select` 本身不会增加 timer 或历史记录条目，因此在闸门处等待的 workflow 不会使历史记录增长。落选的任务会保持挂起，你可以等待它们，也可以将其传给之后的 `Select`。在循环中对同一事件名称做 select 时，应将挂起的任务传给下一次 `Select`，而不是再次为该名称调用 `WaitForExternalEvent`。`Select` 需要 Go SDK v1.16.0 或更高版本，该版本使用 durabletask-go v0.15.0 或更高版本。

接着编写使用你所创建的 workflow 的应用程序。完整的演练请参阅 [如何：编写 workflow 指南]({{% ref howto-author-workflow.md %}})。

试试 [Go SDK workflow 示例。](https://github.com/dapr/go-sdk/blob/main/examples/workflow)

### Jobs

Dapr 客户端 Go SDK 允许你调度、获取和删除 job。Job 让你能够调度工作，使其在特定时间或以特定间隔执行。

#### 调度 Job

要调度一个新的 job，请使用 `ScheduleJob` 方法：

```go
import (
    "google.golang.org/protobuf/types/known/anypb"
)

// 创建 job 数据
data, err := anypb.New(&YourDataStruct{Message: "Hello, Job!"})
if err != nil {
    panic(err)
}

// 使用构建器模式创建一个简单的 job
job := client.NewJob("my-scheduled-job",
    client.WithJobData(data),
    client.WithJobDueTime("10s"), // 10 秒后执行
)

// 调度该 job
err = client.ScheduleJob(ctx, job)
if err != nil {
    panic(err)
}
```

#### 带调度与重复的 Job

你可以使用 `Schedule` 字段并配合 cron 表达式创建周期性 job：

```go
job := client.NewJob("recurring-job",
    client.WithJobData(data),
    client.WithJobSchedule("0 9 * * *"), // 每天上午 9 点运行
    client.WithJobRepeats(10),            // 重复 10 次
    client.WithJobTTL("1h"),              // Job 在 1 小时后过期
)

err = client.ScheduleJob(ctx, job)
```

#### 带失败策略的 Job

使用失败策略配置 job 应如何处理失败：

```go
// 固定间隔的重试策略，指定最大重试次数和间隔
job := client.NewJob("resilient-job",
    client.WithJobData(data),
    client.WithJobDueTime("2024-01-01T10:00:00Z"),
    client.WithJobConstantFailurePolicy(),
    client.WithJobConstantFailurePolicyMaxRetries(3),
    client.WithJobConstantFailurePolicyInterval(30*time.Second),
)

err = client.ScheduleJob(ctx, job)
```

对于失败后不应重试的 job，请使用丢弃策略（drop policy）：

```go
job := client.NewJob("one-shot-job",
    client.WithJobData(data),
    client.WithJobDueTime("2024-01-01T10:00:00Z"),
    client.WithJobDropFailurePolicy(),
)

err = client.ScheduleJob(ctx, job)
```

#### 获取 Job

要获取已调度 job 的信息：

```go
job, err := client.GetJob(ctx, "my-scheduled-job")
if err != nil {
    panic(err)
}

fmt.Printf("Job: %s, Schedule: %s, Repeats: %d\n",
    job.Name, job.Schedule, job.Repeats)
```

#### 删除 Job

要取消已调度的 job：

```go
err = client.DeleteJob(ctx, "my-scheduled-job")
if err != nil {
    panic(err)
}
```

有关 job 的完整指南，请访问[如何：调度和管理 job]({{< ref howto-schedule-and-handle-triggered-jobs.md >}})。

### Output Bindings


Dapr Go 客户端 SDK 提供了两种方法，用于调用 Dapr 定义的 binding 上的操作。Dapr 支持 input、output 和双向 binding。

对于简单的、仅输出的 binding：

```go
in := &dapr.InvokeBindingRequest{ Name: "binding-name", Operation: "operation-name" }
err = client.InvokeOutputBinding(ctx, in)
```

要使用内容和 metadata 调用该方法：

```go
in := &dapr.InvokeBindingRequest{
    Name:      "binding-name",
    Operation: "operation-name",
    Data: []byte("hello"),
    Metadata: map[string]string{"k1": "v1", "k2": "v2"},
}

out, err := client.InvokeBinding(ctx, in)
```

有关 output binding 的完整指南，请访问[如何：使用 binding]({{% ref howto-bindings.md %}})。

### Actors

使用 Dapr Go 客户端 SDK 编写 Actor。

```go
// MyActor 表示一个示例 Actor 类型。
type MyActor struct {
	actors.Actor
}

// MyActorMethod 是可以在 MyActor 上调用的方法。
func (a *MyActor) MyActorMethod(ctx context.Context, req *actors.Message) (string, error) {
	log.Printf("Received message: %s", req.Data)
	return "Hello from MyActor!", nil
}

func main() {
	// 创建 Dapr 客户端
	daprClient, err := client.NewClient()
	if err != nil {
		log.Fatal("Error creating Dapr client: ", err)
	}

	// 向 Dapr 注册 Actor 类型
	actors.RegisterActor(&MyActor{})

	// 创建 Actor 客户端
	actorClient := actors.NewClient(daprClient)

	// 创建 Actor ID
	actorID := actors.NewActorID("myactor")

	// 获取或创建 Actor
	err = actorClient.SaveActorState(context.Background(), "myactorstore", actorID, map[string]interface{}{"data": "initial state"})
	if err != nil {
		log.Fatal("Error saving actor state: ", err)
	}

	// 调用 Actor 上的方法
	resp, err := actorClient.InvokeActorMethod(context.Background(), "myactorstore", actorID, "MyActorMethod", &actors.Message{Data: []byte("Hello from client!")})
	if err != nil {
		log.Fatal("Error invoking actor method: ", err)
	}

	log.Printf("Response from actor: %s", resp.Data)

	// 终止前等待几秒
	time.Sleep(5 * time.Second)

	// 删除 Actor
	err = actorClient.DeleteActor(context.Background(), "myactorstore", actorID)
	if err != nil {
		log.Fatal("Error deleting actor: ", err)
	}

	// 关闭 Dapr 客户端
	daprClient.Close()
}
```

有关 Actor 的完整指南，请访问 [Actors building block 文档]({{% ref actors %}})。

#### 通过 gRPC 托管 Actor（Alpha）

自 Go SDK v1.16.0 起，应用可以通过 gRPC 托管 Actor，而无需使用 HTTP 回调服务器。`SubscribeActorEvents` 会向 Dapr sidecar 注册 Actor runtime 的 Actor 类型，并通过一条双向流（`SubscribeActorEventsAlpha1`）接收 Actor 方法调用、reminder、timer 和停用事件。流失败时，它会重新连接并再次注册 Actor 类型。当应用不应为 Actor 回调暴露 HTTP 端点时，请使用这种方式。如果 sidecar 配置了应用端口，请使用 `--app-protocol grpc` 运行：当 app channel 为 HTTP 时，sidecar 会拒绝该流。

```go
// MyActor 嵌入了 actor.ServerImplBaseCtx 并实现了 Type()。
// 与 HTTP 托管一样，在 Actor runtime 上注册 Actor 类型。
rt := runtime.GetActorRuntimeInstanceContext()
rt.RegisterActorFactory(func() actor.ServerContext { return &MyActor{} })

// 通过 Actor 事件流接收 Actor 回调。
stop, err := daprClient.SubscribeActorEvents(ctx, rt, client.ActorEventSubscriptionOptions{
	ActorIdleTimeout: time.Hour,
})
if err != nil {
	log.Fatal("Error subscribing to actor events: ", err)
}
defer stop()
```

更多信息请参阅 [Actor 应用发起的 gRPC 流]({{% ref actors-app-initiated-streams.md %}})，并尝试 [Go SDK gRPC Actor 示例](https://github.com/dapr/go-sdk/tree/main/examples/actor-grpc)。

### Secret Management

Dapr 客户端还提供对运行时 secrets 的访问，这些 secrets 可由任意数量的 secret store 支撑（例如 Kubernetes Secrets、HashiCorp Vault 或 Azure KeyVault）：

```go
opt := map[string]string{
    "version": "2",
}

secret, err := client.GetSecret(ctx, "store-name", "secret-name", opt)
```

### 身份验证

默认情况下，Dapr 依赖网络边界来限制对其 API 的访问。但如果目标 Dapr API 配置了基于令牌的身份验证，你可以通过两种方式在 Go Dapr 客户端中配置该令牌：

**环境变量**

如果定义了 DAPR_API_TOKEN 环境变量，Dapr 会自动使用它为 Dapr API 调用附加身份验证信息。

**显式方法**

此外，你还可以在任意 Dapr 客户端实例上显式设置 API 令牌。当你的代码需要为不同的 Dapr API 端点创建多个客户端时，这种方式很有帮助。

```go
func main() {
    client, err := dapr.NewClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()
    client.WithAuthToken("your-Dapr-API-token-here")
}
```


有关 secrets 的完整指南，请访问[如何：检索 secrets]({{% ref howto-secrets.md %}})。

### 分布式锁

Dapr 客户端使用锁对资源提供互斥访问。借助锁，你可以：

- 对数据库的某一行、某张表或整个数据库进行互斥访问
- 按顺序锁定对队列消息的读取

```go
package main

import (
    "fmt"

    dapr "github.com/dapr/go-sdk/client"
)

func main() {
    client, err := dapr.NewClient()
    if err != nil {
        panic(err)
    }
    defer client.Close()

    resp, err := client.TryLockAlpha1(ctx, "lockstore", &dapr.LockRequest{
			LockOwner:         "random_id_abc123",
			ResourceID:      "my_file_name",
			ExpiryInSeconds: 60,
		})

    fmt.Println(resp.Success)
}
```

有关分布式锁的完整指南，请访问[如何：使用锁]({{% ref howto-use-distributed-lock.md %}})。

### 配置

借助 Dapr 客户端 Go SDK，你可以读取以只读键/值对形式返回的配置项，并订阅配置项的变更。

#### 配置获取

```go
	items, err := client.GetConfigurationItem(ctx, "example-config", "mykey")
	if err != nil {
		panic(err)
	}
	fmt.Printf("get config = %s\n", (*items).Value)
```

#### 配置订阅

```go
go func() {
	if err := client.SubscribeConfigurationItems(ctx, "example-config", []string{"mySubscribeKey1", "mySubscribeKey2", "mySubscribeKey3"}, func(id string, items map[string]*dapr.ConfigurationItem) {
		for k, v := range items {
			fmt.Printf("get updated config key = %s, value = %s \n", k, v.Value)
		}
		subscribeID = id
	}); err != nil {
		panic(err)
	}
}()
```

有关配置的完整指南，请访问[如何：从存储中管理配置]({{% ref howto-manage-configuration.md %}})。

### 加密

借助 Dapr 客户端 Go SDK，你可以使用高层级的 `Encrypt` 和 `Decrypt` 加密 API，在处理数据流的同时加密和解密文件。

加密：

```go
// 使用 Dapr 加密数据
out, err := client.Encrypt(context.Background(), rf, dapr.EncryptOptions{
	// 以下是 3 个必需参数
	ComponentName: "mycryptocomponent",
	KeyName:        "mykey",
	Algorithm:     "RSA",
})
if err != nil {
	panic(err)
}
```

解密：

```go
// 使用 Dapr 解密数据
out, err := client.Decrypt(context.Background(), rf, dapr.EncryptOptions{
	// 唯一必需的选项是组件名称
	ComponentName: "mycryptocomponent",
})
```

有关加密的完整指南，请访问[如何：使用加密 API]({{% ref howto-cryptography.md %}})。

## 相关链接
[Go SDK 示例](https://github.com/dapr/go-sdk/tree/main/examples)
