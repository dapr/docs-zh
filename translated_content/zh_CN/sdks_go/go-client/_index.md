---
type: docs
title: "Dapr 客户端 Go SDK 入门"
linkTitle: "Client"
weight: 20000
description: 如何开始使用 Dapr Go SDK
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

要在使用 Dapr 边车运行的另一个服务上调用特定方法，Dapr 客户端 Go SDK 提供了两个选项：

不使用数据调用服务：
```go
resp, err := client.InvokeMethod(ctx, "app-id", "method-name", "post")
```

使用数据调用服务：
```go
content := &dapr.DataContent{
    ContentType: "application/json",
    Data:        []byte(`{ "id": "a123", "value": "demo", "valid": true }`),
}

resp, err = client.InvokeMethodWithContent(ctx, "app-id", "method-name", "post", content)
```

有关服务调用的完整指南，请访问[如何：调用服务]({{% ref howto-invoke-discover-services.md %}})。

### 工作流

可以使用 Dapr Go SDK 编写和管理工作流及其活动，如下所示：

```go
import (
...
"github.com/dapr/go-sdk/workflow"
...

func ExampleWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var output string
    input := "world"

    if err := ctx.CallActivity(ExampleActivity, workflow.ActivityInput(input)).Await(&output); err != nil {
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
    // 创建工作流 worker
    w, err := workflow.NewWorker()
    if err != nil {
        log.Fatalf("error creating worker: %v", err)
    }

    // 注册工作流
    w.RegisterWorkflow(ExampleWorkflow)

    // 注册活动
    w.RegisterActivity(ExampleActivity)

    // 启动工作流运行器
    if err := w.Start(); err != nil {
        log.Fatal(err)
    }

    // 创建工作流客户端
    wfClient, err := workflow.NewClient()
    if err != nil {
        log.Fatal(err)
    }

    // 启动新工作流
    id, err := wfClient.ScheduleNewWorkflow(context.Background(), "ExampleWorkflow")
    if err != nil {
        log.Fatal(err)
    }

    // 等待工作流完成
    metadata, err := wfClient.WaitForWorkflowCompletion(ctx, id)
    if err != nil {
        log.Fatal(err)
    }

    // 打印完成后的工作流状态
    fmt.Println(metadata.RuntimeStatus)

    // 关闭 Worker
    w.Shutdown()
}
```

- 有关更全面的工作流指南，请访问这些如何指南：
  - [如何：编写工作流]({{% ref howto-author-workflow.md %}})。
  - [如何：管理工作流]({{% ref howto-manage-workflow.md %}})。
- 访问 Go SDK 示例以查看完整的示例：
  - [工作流示例](https://github.com/dapr/go-sdk/tree/main/examples/workflow)
  - [工作流 - 并行](https://github.com/dapr/go-sdk/tree/main/examples/workflow-parallel)

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

对于更细粒度的控制，Dapr Go 客户端暴露了 `SetStateItem` 类型，可以用于获得对状态操作的更多控制，并允许一次保存多个项目：

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

类似地，`GetBulkState` 方法提供了在单个操作中检索多个状态项目的方法：

```go
keys := []string{"key1", "key2", "key3"}
items, err := client.GetBulkState(ctx, store, keys, nil,100)
```

以及 `ExecuteStateTransaction` 方法以事务方式执行多个 upsert 或删除操作。

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

> **注意：** 查询状态 API 目前处于 alpha 阶段

有关状态管理的完整指南，请访问[如何：保存和获取状态]({{% ref howto-get-save-state.md %}})。

### 发布消息
要将数据发布到主题，Dapr Go 客户端提供了一个简单的方法：

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

有关发布订阅的完整指南，请访问[如何：发布和订阅]({{% ref howto-publish-subscribe.md %}})。

### 工作流

您可以使用 Go SDK 创建[工作流]({{% ref workflow-overview.md %}})。例如，从一个简单的工作流活动开始：

```go
func TestActivity(ctx workflow.ActivityContext) (any, error) {
	var input int
	if err := ctx.GetInput(&input); err != nil {
		return "", err
	}

	// 在这里做些事情
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

然后组合您的应用程序，使用您创建的工作流。[请参阅如何：编写工作流指南]({{% ref howto-author-workflow.md %}})以获取完整的演练。

尝试 [Go SDK 工作流示例](https://github.com/dapr/go-sdk/blob/main/examples/workflow)。

### 作业

Dapr 客户端 Go SDK 允许您调度、获取和删除作业。作业使您能够安排在特定时间或间隔执行工作。

#### 调度作业

要调度新作业，使用 `ScheduleJobAlpha1` 方法：

```go
import (
    "google.golang.org/protobuf/types/known/anypb"
)

// 创建作业数据
data, err := anypb.New(&YourDataStruct{Message: "Hello, Job!"})
if err != nil {
    panic(err)
}

// 使用构建器模式创建简单作业
job := client.NewJob("my-scheduled-job",
    client.WithJobData(data),
    client.WithJobDueTime("10s"), // 10 秒后执行
)

// 调度作业
err = client.ScheduleJobAlpha1(ctx, job)
if err != nil {
    panic(err)
}
```

#### 带调度和重复的作业

您可以使用带有 cron 表达式的 `Schedule` 字段创建重复作业：

```go
job := client.NewJob("recurring-job",
    client.WithJobData(data),
    client.WithJobSchedule("0 9 * * *"), // 每天上午 9 点运行
    client.WithJobRepeats(10),            // 重复 10 次
    client.WithJobTTL("1h"),              // 作业在 1 小时后过期
)

err = client.ScheduleJobAlpha1(ctx, job)
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

err = client.ScheduleJobAlpha1(ctx, job)
```

对于失败时不应重试的作业，使用 drop 策略：

```go
job := client.NewJob("one-shot-job",
    client.WithJobData(data),
    client.WithJobDueTime("2024-01-01T10:00:00Z"),
    client.WithJobDropFailurePolicy(),
)

err = client.ScheduleJobAlpha1(ctx, job)
```

#### 获取作业

要获取有关调度作业的信息：

```go
job, err := client.GetJobAlpha1(ctx, "my-scheduled-job")
if err != nil {
    panic(err)
}

fmt.Printf("Job: %s, Schedule: %s, Repeats: %d\n",
    job.Name, job.Schedule, job.Repeats)
```

#### 删除作业

要取消调度作业：

```go
err = client.DeleteJobAlpha1(ctx, "my-scheduled-job")
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

要使用内容和元数据调用方法：

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

使用 Dapr Go 客户端 SDK 编写 actors。

```go
// MyActor 表示一个示例 actor 类型。
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

	// 使用 Dapr 注册 actor 类型
	actors.RegisterActor(&MyActor{})

	// 创建 actor 客户端
	actorClient := actors.NewClient(daprClient)

	// 创建 actor ID
	actorID := actors.NewActorID("myactor")

	// 获取或创建 actor
	err = actorClient.SaveActorState(context.Background(), "myactorstore", actorID, map[string]interface{}{"data": "initial state"})
	if err != nil {
		log.Fatal("Error saving actor state: ", err)
	}

	// 在 actor 上调用方法
	resp, err := actorClient.InvokeActorMethod(context.Background(), "myactorstore", actorID, "MyActorMethod", &actors.Message{Data: []byte("Hello from client!")})
	if err != nil {
		log.Fatal("Error invoking actor method: ", err)
	}

	log.Printf("Response from actor: %s", resp.Data)

	// 在终止之前等待几秒钟
	time.Sleep(5 * time.Second)

	// 删除 actor
	err = actorClient.DeleteActor(context.Background(), "myactorstore", actorID)
	if err != nil {
		log.Fatal("Error deleting actor: ", err)
	}

	// 关闭 Dapr 客户端
	daprClient.Close()
}
```

有关 actors 的完整指南，请访问 [Actors 构建块文档]({{% ref actors %}})。

### 密钥管理

Dapr 客户端还提供对运行时密钥的访问，这些密钥可以由任意数量的密钥存储支持（例如 Kubernetes Secrets、HashiCorp Vault 或 Azure KeyVault）：

```go
opt := map[string]string{
    "version": "2",
}

secret, err := client.GetSecret(ctx, "store-name", "secret-name", opt)
```

### 身份验证

默认情况下，Dapr 依赖网络边界来限制对其 API 的访问。但是，如果目标 Dapr API 配置了基于令牌的身份验证，用户可以通过两种方式使用该令牌配置 Go Dapr 客户端：

**环境变量**

如果定义了 DAPR_API_TOKEN 环境变量，Dapr 将自动使用它来增强其 Dapr API 调用以确保身份验证。

**显式方法**

此外，用户还可以在任何 Dapr 客户端实例上显式设置 API 令牌。当用户代码需要为不同的 Dapr API 端点创建多个客户端时，此方法很有用。

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


有关密钥的完整指南，请访问[如何：检索密钥]({{% ref howto-secrets.md %}})。

### 分布式锁

Dapr 客户端使用锁提供对资源的互斥访问。使用锁，您可以：

- 提供对数据库行、表或整个数据库的访问
- 按顺序锁定从队列读取消息

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

使用 Dapr 客户端 Go SDK，您可以消费作为只读键/值对返回的配置项，并订阅配置项更改。

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

### 密码学

使用 Dapr 客户端 Go SDK，您可以使用高级别 `Encrypt` 和 `Decrypt` 密码学 API 在处理数据流时加密和解密文件。

要加密：

```go
// 使用 Dapr 加密数据
out, err := client.Encrypt(context.Background(), rf, dapr.EncryptOptions{
	// 这是 3 个必需参数
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

有关密码学的完整指南，请访问[如何：使用密码学 API]({{% ref howto-cryptography.md %}})。

## 相关链接
[Go SDK 示例](https://github.com/dapr/go-sdk/tree/main/examples)
