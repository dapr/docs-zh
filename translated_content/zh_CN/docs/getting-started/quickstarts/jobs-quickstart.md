---
type: docs
title: "Quickstart：Jobs"
linkTitle: Jobs
weight: 80
description: 开始使用 Dapr jobs building block
---

让我们来看看 [Dapr jobs building block]({{% ref jobs-overview %}})，它可以在特定时间或按固定间隔调度并运行 job。在本 Quickstart 中，你将使用 Dapr 的 Job API 调度、获取和删除一个 job。

你可以通过以下任一方式尝试此 Jobs Quickstart：

- [使用 Multi-App Run 模板文件同时运行此示例中的所有应用程序]({{% ref "#run-using-multi-app-run" %}})，或
- [一次运行一个应用程序]({{% ref "#run-one-job-application-at-a-time" %}})

## 使用 Multi-App Run 运行

在继续 Quickstart 之前，请选择你偏好的特定语言 Dapr SDK。目前，你可以使用 Go SDK 试用 Jobs API。

{{< tabpane text=true >}}

 <!-- Go -->
{{% tab "Go" %}}

本 Quickstart 包含两个应用程序：

- **`job-scheduler.go`：** 调度、获取和删除 job。
- **`job-service.go`：** 处理已调度的 job。

### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/jobs/go/sdk)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 jobs 目录：

```bash
cd jobs/go/sdk/job-service
```

### 步骤 3：调度 job

运行应用程序，并通过一条命令调度 job：

```bash
dapr run -f .
```

**预期输出**

```text
== APP - job-service == dapr client initializing for: 127.0.0.1:6281
== APP - job-service == Registered job handler for:  R2-D2
== APP - job-service == Registered job handler for:  C-3PO
== APP - job-service == Registered job handler for:  BB-8
== APP - job-service == Starting server on port: 6200
== APP - job-service == Job scheduled:  R2-D2
== APP - job-service == Job scheduled:  C-3PO
== APP - job-service == 2024/07/17 18:09:59 job:{name:"C-3PO"  due_time:"10s"  data:{value:"{\"droid\":\"C-3PO\",\"Task\":\"Memory Wipe\"}"}}
== APP - job-scheduler == Get job response:  {"droid":"C-3PO","Task":"Memory Wipe"}
== APP - job-service == Job scheduled:  BB-8
== APP - job-service == 2024/07/17 18:09:59 job:{name:"BB-8"  due_time:"15s"  data:{value:"{\"droid\":\"BB-8\",\"Task\":\"Internal Gyroscope Check\"}"}}
== APP - job-scheduler == Get job response:  {"droid":"BB-8","Task":"Internal Gyroscope Check"}
== APP - job-scheduler == Deleted job:  BB-8
```

你最终应该能在 Scheduler 中看到 job 被调度：

```bash
$ dapr scheduler list
NAME   TARGET  BEGIN    COUNT  LAST TRIGGER
C-3PO  job     +13.40s  0
R2-D2  job     +3.40s   0
```

5 秒后，终端输出应显示 `R2-D2` job 正在被处理：

```text
== APP - job-service == Starting droid: R2-D2
== APP - job-service == Executing maintenance job: Oil Change
```

10 秒后，终端输出应显示 `C3-PO` job 正在被处理：

```text
== APP - job-service == Starting droid: C-3PO
== APP - job-service == Executing maintenance job: Memory Wipe
```

job 将不再出现在 Scheduler 中：

```bash
$ dapr scheduler list
NAME  TARGET  BEGIN  COUNT  LAST TRIGGER
```

进程完成后，你可以使用一条命令停止并清理应用程序进程。

```bash
dapr stop -f .
```

### 发生了什么？

在 Dapr 安装期间运行 `dapr init` 时：

- `dapr_scheduler` control plane 与其他 Dapr 服务一同启动。
- [`dapr.yaml` Multi-App Run 模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}}) 已在 `.dapr/components` 目录中生成。

在本 Quickstart 中运行 `dapr run -f .` 会同时启动 `job-scheduler` 和 `job-service`。在终端输出中，你可以看到以下 job 被调度、获取和删除。

- `R2-D2` job 正在被调度。
- `C-3PO` job 正在被调度。
- `C-3PO` job 正在被获取。
- `BB-8` job 正在被调度。
- `BB-8` job 正在被获取。
- `BB-8` job 正在被删除。
- `R2-D2` job 在 5 秒后被执行。
- `R2-D2` job 在 10 秒后被执行。

#### `dapr.yaml` Multi-App Run 模板文件

使用 `dapr run -f .` 运行 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}}) 会启动项目中的所有应用程序。在本 Quickstart 中，`dapr.yaml` 文件包含以下内容：

```yml
version: 1
apps:
  - appDirPath: ./job-service/
    appID: job-service
    appPort: 6200
    daprGRPCPort: 6281
    appProtocol: grpc
    command: ["go", "run", "."]
  - appDirPath: ./job-scheduler/
    appID: job-scheduler
    appPort: 6300
    command: ["go", "run", "."]
```

#### `job-service` 应用程序

`job-service` 应用程序创建 service invocation 调用处理程序，用于管理 job 的生命周期（`scheduleJob`、`getJob` 和 `deleteJob`）。

```go
if err := server.AddServiceInvocationHandler("scheduleJob", scheduleJob); err != nil {
	log.Fatalf("error adding invocation handler: %v", err)
}

if err := server.AddServiceInvocationHandler("getJob", getJob); err != nil {
	log.Fatalf("error adding invocation handler: %v", err)
}

if err := server.AddServiceInvocationHandler("deleteJob", deleteJob); err != nil {
	log.Fatalf("error adding invocation handler: %v", err)
}
```

接着，为所有 droid 注册 job 事件 handler：

```go
for _, jobName := range jobNames {
	if err := server.AddJobEventHandler(jobName, handleJob); err != nil {
		log.Fatalf("failed to register job event handler: %v", err)
	}
	fmt.Println("Registered job handler for: ", jobName)
}

fmt.Println("Starting server on port: " + appPort)
if err = server.Start(); err != nil {
	log.Fatalf("failed to start server: %v", err)
}
```

`job-service` 随后调用用于处理调度、获取、删除以及 job 事件的函数。

```go
// 调度 DroidJob 的处理程序
func scheduleJob(ctx context.Context, in *common.InvocationEvent) (out *common.Content, err error) {

	if in == nil {
		err = errors.New("no invocation parameter")
		return
	}

	droidJob := DroidJob{}
	err = json.Unmarshal(in.Data, &droidJob)
	if err != nil {
		fmt.Println("failed to unmarshal job: ", err)
		return nil, err
	}

	jobData := JobData{
		Droid: droidJob.Name,
		Task:  droidJob.Job,
	}

	content, err := json.Marshal(jobData)
	if err != nil {
		fmt.Printf("Error marshalling job content")
		return nil, err
	}

	// 调度 job
	job := daprc.Job{
		Name:    droidJob.Name,
		DueTime: droidJob.DueTime,
		Data: &anypb.Any{
			Value: content,
		},
	}

	err = app.daprClient.ScheduleJob(ctx, &job)
	if err != nil {
		fmt.Println("failed to schedule job. err: ", err)
		return nil, err
	}

	fmt.Println("Job scheduled: ", droidJob.Name)

	out = &common.Content{
		Data:        in.Data,
		ContentType: in.ContentType,
		DataTypeURL: in.DataTypeURL,
	}

	return out, err

}

// 按名称获取 job 的处理程序
func getJob(ctx context.Context, in *common.InvocationEvent) (out *common.Content, err error) {

	if in == nil {
		err = errors.New("no invocation parameter")
		return nil, err
	}

	job, err := app.daprClient.GetJob(ctx, string(in.Data))
	if err != nil {
		fmt.Println("failed to get job. err: ", err)
	}

	out = &common.Content{
		Data:        job.Data.Value,
		ContentType: in.ContentType,
		DataTypeURL: in.DataTypeURL,
	}

	return out, err
}

// 按名称删除 job 的处理程序
func deleteJob(ctx context.Context, in *common.InvocationEvent) (out *common.Content, err error) {
	if in == nil {
		err = errors.New("no invocation parameter")
		return nil, err
	}

	err = app.daprClient.DeleteJob(ctx, string(in.Data))
	if err != nil {
		fmt.Println("failed to delete job. err: ", err)
	}

	out = &common.Content{
		Data:        in.Data,
		ContentType: in.ContentType,
		DataTypeURL: in.DataTypeURL,
	}

	return out, err
}

// 处理 job 事件的处理程序
func handleJob(ctx context.Context, job *common.JobEvent) error {
    var jobData common.Job
    if err := json.Unmarshal(job.Data, &jobData); err != nil {
        return fmt.Errorf("failed to unmarshal job: %v", err)
    }

    var jobPayload JobData
    if err := json.Unmarshal(job.Data, &jobPayload); err != nil {
        return fmt.Errorf("failed to unmarshal payload: %v", err)
    }

    fmt.Println("Starting droid:", jobPayload.Droid)
    fmt.Println("Executing maintenance job:", jobPayload.Task)

    return nil
}
```

#### `job-scheduler` 应用程序

在 `job-scheduler` 应用程序中，首先将 R2D2、C3PO 和 BB8 job 定义为 `[]DroidJob`：

```go
droidJobs := []DroidJob{
	{Name: "R2-D2", Job: "Oil Change", DueTime: "5s"},
	{Name: "C-3PO", Job: "Memory Wipe", DueTime: "15s"},
	{Name: "BB-8", Job: "Internal Gyroscope Check", DueTime: "30s"},
}
```


使用 jobs API 调度、获取和删除 job。正如终端输出所示，首先调度 R2D2 job：

```go
// 调度 R2D2 job
err = schedule(droidJobs[0])
if err != nil {
	log.Fatalln("Error scheduling job: ", err)
}
```

然后，调度 C3PO job，并返回 job 数据：

```go
// 调度 C-3PO job
err = schedule(droidJobs[1])
if err != nil {
	log.Fatalln("Error scheduling job: ", err)
}

// 获取 C-3PO job
resp, err := get(droidJobs[1])
if err != nil {
	log.Fatalln("Error retrieving job: ", err)
}
fmt.Println("Get job response: ", resp)
```

随后，调度、获取并删除 BB8 job：

```go
// 调度 BB-8 job
err = schedule(droidJobs[2])
if err != nil {
	log.Fatalln("Error scheduling job: ", err)
}

// 获取 BB-8 job
resp, err = get(droidJobs[2])
if err != nil {
	log.Fatalln("Error retrieving job: ", err)
}
fmt.Println("Get job response: ", resp)

// 删除 BB-8 job
err = delete(droidJobs[2])
if err != nil {
	log.Fatalln("Error deleting job: ", err)
}
fmt.Println("Job deleted: ", droidJobs[2].Name)
```

`job-scheduler.go` 还定义了 `schedule`、`get` 和 `delete` 函数，用于调用 `job-service.go` 中的服务。

```go
// 通过调用 job-service 的 gRPC 服务调度 job，传入 DroidJob 作为参数
func schedule(droidJob DroidJob) error {
	jobData, err := json.Marshal(droidJob)
	if err != nil {
		fmt.Println("Error marshalling job content")
		return err
	}

	content := &daprc.DataContent{
		ContentType: "application/json",
		Data:        []byte(jobData),
	}

	// 调度 Job
	_, err = app.daprClient.InvokeMethodWithContent(context.Background(), "job-service", "scheduleJob", "POST", content)
	if err != nil {
		fmt.Println("Error invoking method: ", err)
		return err
	}

	return nil
}

// 通过调用 job-service 的 gRPC 服务获取 job，传入 job 名称作为参数
func get(droidJob DroidJob) (string, error) {
	content := &daprc.DataContent{
		ContentType: "text/plain",
		Data:        []byte(droidJob.Name),
	}

	// 获取 job
	resp, err := app.daprClient.InvokeMethodWithContent(context.Background(), "job-service", "getJob", "GET", content)
	if err != nil {
		fmt.Println("Error invoking method: ", err)
		return "", err
	}

	return string(resp), nil
}

// 通过调用 job-service 的 gRPC 服务删除 job，传入 job 名称作为参数
func delete(droidJob DroidJob) error {
	content := &daprc.DataContent{
		ContentType: "text/plain",
		Data:        []byte(droidJob.Name),
	}

	_, err := app.daprClient.InvokeMethodWithContent(context.Background(), "job-service", "deleteJob", "DELETE", content)
	if err != nil {
		fmt.Println("Error invoking method: ", err)
		return err
	}

	return nil
}
```

{{% /tab %}}

{{< /tabpane >}}

## 一次运行一个应用程序

{{< tabpane text=true >}}

 <!-- Go -->
{{% tab "Go" %}}

本 Quickstart 包含两个应用程序：

- **`job-scheduler.go`：** 调度、获取和删除 job。
- **`job-service.go`：** 处理已调度的 job。

### 步骤 1：先决条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->

### 步骤 2：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/jobs)。

```bash
git clone https://github.com/dapr/quickstarts.git
```

从 Quickstarts 目录的根目录进入 jobs 目录：

```bash
cd jobs/go/sdk
```

### 步骤 3：调度 job

在终端中运行 `job-service` 应用程序：

```bash
dapr run --app-id job-service-sdk --app-port 6200 --dapr-grpc-port 6281 --app-protocol grpc -- go run .
```

**预期输出**

```text
== APP == dapr client initializing for: 127.0.0.1:6281
== APP == Registered job handler for:  R2-D2
== APP == Registered job handler for:  C-3PO
== APP == Registered job handler for:  BB-8
== APP == Starting server on port: 6200
```

在新的终端窗口中，从 Quickstarts 目录的根目录进入 `job-scheduler` 目录，并运行 `job-scheduler` 应用程序：

```bash
cd jobs/go/sdk/job-scheduler
dapr run --app-id job-scheduler-sdk --app-port 6300 -- go run .
```

**预期输出**

```text
== APP == dapr client initializing for: 
== APP == Get job response:  {"droid":"C-3PO","Task":"Memory Wipe"}
== APP == Get job response:  {"droid":"BB-8","Task":"Internal Gyroscope Check"}
== APP == Job deleted:  BB-8
```

返回 `job-service` 应用程序的终端窗口。输出应为：

```text
== APP == Job scheduled:  R2-D2
== APP == Job scheduled:  C-3PO
== APP == 2024/07/17 18:25:36 job:{name:"C-3PO"  due_time:"10s"  data:{value:"{\"droid\":\"C-3PO\",\"Task\":\"Memory Wipe\"}"}}
== APP == Job scheduled:  BB-8
== APP == 2024/07/17 18:25:36 job:{name:"BB-8"  due_time:"15s"  data:{value:"{\"droid\":\"BB-8\",\"Task\":\"Internal Gyroscope Check\"}"}}
== APP == Starting droid: R2-D2
== APP == Executing maintenance job: Oil Change
== APP == Starting droid: C-3PO
== APP == Executing maintenance job: Memory Wipe
```

梳理你运行 `dapr run` 时 [`job-service`]({{% ref "#job-service-app" %}}) 和 [`job-scheduler`]({{% ref "#job-scheduler-app" %}}) 应用程序中发生的事情。

{{% /tab %}}

{{< /tabpane >}}


## 观看演示

观看 Jobs API 的实际运行效果，演示使用 Go HTTP 示例，录制于 [Dapr Community Call #107](https://www.youtube.com/live/WHGOc7Ec_YQ?si=JlOlcJKkhRuhf5R1&t=849)。

{{< youtube id=WHGOc7Ec_YQ start=849 >}}

## 告诉我们你的想法！

我们一直在持续改进 Quickstart 示例，并重视你的反馈。你觉得这个 Quickstart 有帮助吗？你有什么改进建议吗？

欢迎加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的想法。

## 后续步骤

- 本 Quickstart 的 HTTP 示例：
  - [Go](https://github.com/dapr/quickstarts/tree/master/jobs/go/http)
- 了解更多关于 [jobs building block]({{% ref jobs-overview %}}) 的信息
- 了解更多关于 [scheduler control plane]({{% ref scheduler %}}) 的信息

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
