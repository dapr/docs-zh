---
type: docs
title: "Dapr 客户端 Go SDK 入门"
linkTitle: "Client"
weight: 20000
description: "如何开始使用 Dapr Go SDK"
no_list: true
---

Dapr 客户端包允许您从 Go 应用程序与其他 Dapr 应用程序进行交互。

## 前置条件

- 已安装 [Dapr CLI]({{% ref install-dapr-cli.md %}})
- 已初始化 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- 已安装 [Go](https://golang.org/doc/install)


## 导入客户端包
```go
import "github.com/dapr/go-sdk/client"
```
## 错误处理
Dapr 错误基于 [gRPC 的丰富错误模型](https://cloud.google.com/apis/design/errors#error_model)。
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
            // 为您期望的其他类型的详细信息添加 case
            fmt.Printf("Unhandled error detail type: %v\n", t)
        }
    }
}
```

## 构建块

Go SDK 允许您与所有 [Dapr 构建块]({{% ref building-blocks %}}) 进行交互。

### 服务调用

要在使用 Dapr 边车运行的另一个服务上调用特定方法，Dapr 客户端 Go SDK 提供了两种选项：

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

有关服务调用的完整指南，请访问[如何：调用服务]({{% ref howto-invoke-discover-services.md %}})。

### 工作流

可以使用 Dapr Go SDK 编写和管理工作流及其活动，示例如下：

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

	// 注册工作流
	r.AddWorkflow(ExampleWorkflow)

	// 注册活动
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

	// 启动新工作流
	id, err := client.ScheduleWorkflow(ctx, "ExampleWorkflow")
	if err != nil {
		log.Fatal(err)
	}

	// 等待工作流完成
	metadata, err := client.WaitForWorkflowCompletion(ctx, id)
	if err != nil {
		log.Fatal(err)
	}

	// 打印工作流完成后的状态
	fmt.Println(metadata.String())
}
```

#### 管理工作流

`dapr.NewWorkflowClient()` 返回的工作流客户端还提供以下管理操作：`SuspendWorkflow`、`ResumeWorkflow`、`TerminateWorkflow`、`PurgeWorkflowState`、`RaiseEvent` 和 `FetchWorkflowMetadata`，以及下面的高级操作。

##### 列出工作流实例

`ListInstanceIDs` 返回属于该应用的工作流实例 ID。结果是分页的：页大小是单页所包含 ID 数量的上限。您需要持续使用上一次响应中的延续令牌（continuation token）进行调用，直到它返回 `nil` 为止。

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

这需要一个支持 Actor 且能够列出键的状态存储。

##### 读取工作流历史记录

`GetInstanceHistory` 返回实例的完整执行历史，可用于审计某次运行，或查找可以从中重新运行的事件。

```go
hist, err := client.GetInstanceHistory(ctx, id)
if err != nil {
	log.Fatal(err)
}

var rerunFrom uint32
for _, event := range hist.Events {
	if ts := event.GetTaskScheduled(); ts != nil {
		fmt.Printf("event %d scheduled activity %s\n", event.GetEventId(), ts.GetName())

		// 历史事件 ID 为 int32，部分事件类型携带 -1，而 RerunWorkflowFromEvent 接受 uint32，
		// 因此在复用之前需要先进行类型收窄。
		if id := event.GetEventId(); id >= 0 {
			rerunFrom = uint32(id)
		}
	}
}
```

如果实例不存在或其状态已被清除，该调用会返回 `NotFound`。

##### 从事件重新运行工作流

`RerunWorkflowFromEvent` 会将一个已完成的工作流从其某个历史事件处重新运行（“回溯”）到一个**新**实例中。源实例保持不变。

在目标事件之前已完成并已记录的工作，会从历史中重放，而不会再次执行。目标事件之前的其他所有内容，都会在新实例中被**重新执行**：仍在进行中的活动、尚未触发的定时器，以及尚未完成的子工作流。请注意，在并行工作流中，这还包括一个已成功、但其完成记录位于目标事件**之后**的活动，因此扇出（fan-out）的重新运行范围可能比您预期的更大。如果您的活动不是幂等的，请做好重新执行的准备。

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

需要注意的事项：

- 源实例必须处于终止状态。对运行中的实例进行重新运行会失败，并返回 `InvalidArgument`。
- 源本身不能是子工作流，否则同样会因 `InvalidArgument` 而失败。
- 只有三种事件类型可以重新运行：`TaskScheduled`（已调度的活动）、`TimerCreated` 和 `ChildWorkflowInstanceCreated`。其他任何事件都会被拒绝，并返回 `NotFound`。
- `eventID` 是事件自身的 ID，而不是它在历史切片中的索引。
- `WithRerunInput` 只替换目标事件的输入。对定时器事件使用它是无效的。
- `WithRerunNewChildInstanceID` 仅对子工作流事件有效。
- 如果省略 `WithRerunNewInstanceID`，运行时会生成一个新的实例 ID。如果提供了该参数，则它必须与源 ID 不同，且不能已有状态，否则调用会失败，并返回 `InvalidArgument` 或 `AlreadyExists`。

- 有关工作流的更全面指南，请访问这些如何指南：
  - [如何：编写工作流]({{% ref howto-author-workflow.md %}})。
  - [如何：管理工作流]({{% ref howto-manage-workflow.md %}})。
- 访问 Go SDK 示例以查看完整示例：
  - [工作流示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow)
  - [工作流 - 并行化](https://github.com/dapr/go-sdk/tree/main/examples/workflow-parallel)

### 状态管理

对于简单用例，Dapr 客户端提供了易于使用的 `Save`、`Get`、`Delete` 方法：

```go
ctx := context.Background()
data := []byte("hello")
store := "my-store" // 在组件 YAML 中定义

// 使用键 key1 保存状态，默认选项：强一致性、最后写入获胜
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

要进行更细粒度的控制，Dapr Go 客户端提供了 `SetStateItem` 类型，可用于更精细地控制状态操作，并允许一次保存多个项：

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

类似地，`GetBulkState` 方法提供了在单次操作中检索多个状态项的方法：

```go
keys := []string{"key1", "key2", "key3"}
items, err := client.GetBulkState(ctx, store, keys, nil,100)
```

以及用于以事务方式执行多个 upsert 或删除操作的 `ExecuteStateTransaction` 方法。

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

使用 `QueryState` 检索、过滤和排序存储在状态存储中的键/值数据。

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

> **注意：** 状态查询 API 目前处于 alpha 阶段

有关状态管理的完整指南，请访问[如何：保存和获取状态]({{% ref howto-get-save-state.md %}})。

### 发布消息
要将数据发布到某个主题，Dapr Go 客户端提供了一个简单的方法：

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

有关发布订阅（pub/sub）的完整指南，请访问[如何：发布和订阅]({{% ref howto-publish-subscribe.md %}})。

### 工作流

您可以使用 Go SDK 创建[工作流]({{% ref workflow-overview.md %}})。例如，先从一个简单的工作流活动开始：

```go
func TestActivity(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}

	// 在此处执行某些操作
	return "result", nil
}
```

编写一个简单的工作流函数：

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

要等待多个任务中的第一个完成，请使用 `ctx.Select`。它会返回最先完成的任务的索引。例如，审批闸门会等待 `Approve` 事件、`Reject` 事件或超时，以先发生者为准：

```go
func ApprovalWorkflow(ctx *workflow.WorkflowContext) (any, error) {
	// 负数超时表示无时间限制地等待该事件
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

如果不使用 `Select`，工作流就必须以较短的 `WaitForExternalEvent` 超时轮询每个事件，而每次轮询都会增加一个定时器和一条历史记录。`Select` 本身不会增加任何定时器或历史记录，因此在某个闸门处等待的工作流不会使其历史增长。落败的任务会保持挂起状态，您可以等待它们，也可以将其传给之后的 `Select`。当您在循环中对同一事件名称进行选择（select）时，应将挂起的任务传给下一次 `Select`，而不是再次为该名称调用 `WaitForExternalEvent`。`Select` 需要 Go SDK v1.16.0 或更高版本，该版本使用 durabletask-go v0.15.0 或更高版本。

然后编写使用您所创建工作流的应用程序。有关完整的演练，请参阅[如何：编写工作流指南]({{% ref howto-author-workflow.md %}})。

试试 [Go SDK 工作流示例](https://github.com/dapr/go-sdk/blob/main/examples/workflow)。

### 作业

Dapr 客户端 Go SDK 允许您调度、获取和删除作业。作业使您能够安排在特定时间或间隔执行的工作。

#### 调度作业

要调度新作业，请使用 `ScheduleJob` 方法：

```go
import (
    "google.golang.org/protobuf/types/known/anypb"
)

// 创建作业数据
data, err := anypb.New(&YourDataStruct{Message: "Hello, Job!"})
if err != nil {
    panic(err)
}

// 使用构建器模式创建一个简单作业
job := client.NewJob("my-scheduled-job",
    client.WithJobData(data),
    client.WithJobDueTime("10s"), // 10 秒后执行
)

// 调度作业
err = client.ScheduleJob(ctx, job)
if err != nil {
    panic(err)
}
```

#### 带调度与重复的作业

您可以使用带有 cron 表达式的 `Schedule` 字段创建重复作业：

```go
job := client.NewJob("recurring-job",
    client.WithJobData(data),
    client.WithJobSchedule("0 9 * * *"), // 每天上午 9 点运行
    client.WithJobRepeats(10),            // 重复 10 次
    client.WithJobTTL("1h"),              // 作业 1 小时后过期
)

err = client.ScheduleJob(ctx, job)
```

#### 带失败策略的作业

使用失败策略配置作业应如何处理失败：

```go
// 带最大重试次数和间隔的常量重试策略
job := client.NewJob("resilient-job",
    client.WithJobData(data),
    client.WithJobDueTime("2024-01-01T10:00:00Z"),
    client.WithJobConstantFailurePolicy(),
    client.WithJobConstantFailurePolicyMaxRetries(3),
    client.WithJobConstantFailurePolicyInterval(30*time.Second),
)

err = client.ScheduleJob(ctx, job)
```

对于失败后不应重试的作业，请使用丢弃策略（drop policy）：

```go
job := client.NewJob("one-shot-job",
    client.WithJobData(data),
    client.WithJobDueTime("2024-01-01T10:00:00Z"),
    client.WithJobDropFailurePolicy(),
)

err = client.ScheduleJob(ctx, job)
```

#### 获取作业

要获取有关已调度作业的信息：

```go
job, err := client.GetJob(ctx, "my-scheduled-job")
if err != nil {
    panic(err)
}

fmt.Printf("Job: %s, Schedule: %s, Repeats: %d\n",
    job.Name, job.Schedule, job.Repeats)
```

#### 删除作业

要取消已调度的作业：

```go
err = client.DeleteJob(ctx, "my-scheduled-job")
if err != nil {
    panic(err)
}
```

有关作业的完整指南，请访问[如何：调度和管理作业]({{< ref howto-schedule-and-handle-triggered-jobs.md >}})。

### 输出绑定


Dapr Go 客户端 SDK 提供了两种方法来调用 Dapr 定义的绑定上的操作。Dapr 支持输入、输出和双向绑定。

对于简单的仅输出绑定：

```go
in := &dapr.InvokeBindingRequest{ Name: "binding-name", Operation: "operation-name" }
err = client.InvokeOutputBinding(ctx, in)
```

要调用带内容和元数据的方法：

```go
in := &dapr.InvokeBindingRequest{
    Name:      "binding-name",
    Operation: "operation-name",
    Data: []byte("hello"),
    Metadata: map[string]string{"k1": "v1", "k2": "v2"},
}

out, err := client.InvokeBinding(ctx, in)
```

有关输出绑定的完整指南，请访问[如何：使用绑定]({{% ref howto-bindings.md %}})。

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

	// 使用 Dapr 注册 Actor 类型
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

	// 在 Actor 上调用方法
	resp, err := actorClient.InvokeActorMethod(context.Background(), "myactorstore", actorID, "MyActorMethod", &actors.Message{Data: []byte("Hello from client!")})
	if err != nil {
		log.Fatal("Error invoking actor method: ", err)
	}

	log.Printf("Response from actor: %s", resp.Data)

	// 在终止之前等待几秒钟
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

有关 Actor 的完整指南，请访问 [Actor 构建块文档]({{% ref actors %}})。

#### 通过 gRPC 托管 Actor（Alpha）

自 Go SDK v1.16.0 起，应用可以通过 gRPC 托管 Actor，而无需使用 HTTP 回调服务器。`SubscribeActorEvents` 会向 Dapr 边车注册 Actor 运行时的 Actor 类型，并通过一条双向流（`SubscribeActorEventsAlpha1`）接收 Actor 方法调用、提醒、定时器和停用事件。流失败时，它会重新连接并再次注册 Actor 类型。当应用不应为 Actor 回调暴露 HTTP 端点时，请使用此方式。如果边车配置了应用端口，请使用 `--app-protocol grpc` 运行它：当应用通道为 HTTP 时，边车会拒绝该流。

```go
// MyActor 嵌入 actor.ServerImplBaseCtx 并实现 Type()。
// 与 HTTP 托管方式一样，在 Actor 运行时上注册 Actor 类型。
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

了解更多信息，请参阅[应用发起的 Actor gRPC 事件流]({{% ref actors-app-initiated-streams.md %}})，并试用 [Go SDK gRPC Actor 示例](https://github.com/dapr/go-sdk/tree/main/examples/actor-grpc)。

### 机密管理

Dapr 客户端还提供对运行时机密的访问，这些机密可由任意数量的机密存储支持（例如 Kubernetes Secrets、HashiCorp Vault 或 Azure KeyVault）：

```go
opt := map[string]string{
    "version": "2",
}

secret, err := client.GetSecret(ctx, "store-name", "secret-name", opt)
```

### 身份验证

默认情况下，Dapr 依赖网络边界来限制对其 API 的访问。但是，如果目标 Dapr API 配置了基于令牌的身份验证，用户可以通过两种方式为 Go Dapr 客户端配置该令牌：

**环境变量**

如果定义了 DAPR_API_TOKEN 环境变量，Dapr 将自动使用它来增强其 Dapr API 调用，以确保身份验证。

**显式方法**

此外，用户还可以在任意 Dapr 客户端实例上显式设置 API 令牌。当用户代码需要为不同的 Dapr API 端点创建多个客户端时，此方法很有用。

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


有关机密的完整指南，请访问[如何：检索机密]({{% ref howto-secrets.md %}})。

### 分布式锁

Dapr 客户端使用锁为资源提供互斥访问。借助锁，您可以：

- 为数据库行、表或整个数据库提供访问
- 按顺序锁定读取队列中的消息

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

借助 Dapr 客户端 Go SDK，您可以使用作为只读键/值对返回的配置项，并订阅配置项的更改。

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

有关配置的完整指南，请访问[如何：从存储管理配置]({{% ref howto-manage-configuration.md %}})。

### 加密

借助 Dapr 客户端 Go SDK，您可以使用高级 `Encrypt` 和 `Decrypt` 加密 API，在处理数据流的同时加密和解密文件。

要加密：

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

要解密：

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
