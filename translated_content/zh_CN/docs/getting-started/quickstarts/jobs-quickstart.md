---
type: docs
title: "快速入门：Jobs"
linkTitle: Jobs
weight: 80
description: 开始使用 Dapr Jobs 构建块
---

{{% alert title="Alpha" color="warning" %}}
Jobs 构建块目前处于 **alpha** 阶段。
{{% /alert %}}

让我们来看看 [Dapr Jobs 构建块]({{% ref jobs-overview %}})，它可以安排作业在特定时间或间隔运行。在本快速入门中，您将使用 Dapr 的 Job API 来调度、获取和删除作业。

您可以通过以下方式尝试此 Jobs 快速入门：

- [使用 Multi-App Run 模板文件同时运行此示例中的所有应用程序]({{% ref "#run-using-multi-app-run" %}})，或
- [一次运行一个应用程序]({{% ref "#run-one-job-application-at-a-time" %}})

## 使用 Multi-App Run 运行

在继续快速入门之前，选择您首选的特定语言的 Dapr SDK。目前，您可以使用 Go SDK 来试验 Jobs API。

{{< tabpane text=true >}}

 <!-- Go -->
{{% tab "Go" %}}

此快速入门包含两个应用程序：

- **`job-scheduler.go`**：调度、检索和删除作业。
- **`job-service.go`**：处理已调度的作业。

### 步骤 1：先决条件

对于此示例，您需要：

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

从 Quickstarts 目录的根目录，导航到 jobs 目录：

```bash
cd jobs/go/sdk
```

### 步骤 3：调度作业

使用一个命令运行应用程序并调度作业：

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

您最终应该会看到在调度器中调度的作业：

```bash
$ dapr scheduler list
NAME   TARGET  BEGIN    COUNT  LAST TRIGGER
C-3PO  job     +13.40s  0
R2-D2  job     +3.40s   0
```

5 秒后，终端输出应该显示正在处理的 `R2-D2` 作业：

```text
== APP - job-service == Starting droid: R2-D2
== APP - job-service == Executing maintenance job: Oil Change
```

10 秒后，终端输出应该显示正在处理的 `C3-PO` 作业：

```text
== APP - job-service == Starting droid: C-3PO
== APP - job-service == Executing maintenance job: Memory Wipe
```

作业将不再在调度器中列出：

```bash
$ dapr scheduler list
NAME  TARGET  BEGIN  COUNT  LAST TRIGGER
```

流程完成后，您可以使用单个命令停止并清理应用程序进程。

```bash
dapr stop -f .
```

### 发生了什么？

当您在 Dapr 安装期间运行 `dapr init` 时：

- `dapr_scheduler` 控制平面与其他 Dapr 服务一起启动。
- [ `dapr.yaml` Multi-App Run 模板文件]({{% ref "#dapryaml-multi-app-run-template-file" %}}) 在 `.dapr/components` 目录中生成。

在此快速入门中运行 `dapr run -f .` 会同时启动 `job-scheduler` 和 `job-service`。在终端输出中，您可以看到以下作业被调度、检索和删除。

- `R2-D2` 作业正在被调度。
- `C-3PO` 作业正在被调度。
- `C-3PO` 作业正在被检索。
- `BB-8` 作业正在被调度。
- `BB-8` 作业正在被检索。
- `BB-8` 作业正在被删除。
- `R2-D2` 作业在 5 秒后被执行。
- `R2-D2` 作业在 10 秒后被执行。

#### `dapr.yaml` Multi-App Run 模板文件

使用 `dapr run -f .` 运行 [Multi-App Run 模板文件]({{% ref multi-app-dapr-run %}}) 会启动项目中的所有应用程序。在此快速入门中，`dapr.yaml` 文件包含以下内容：

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

`job-service` 应用程序创建服务调用处理程序来管理作业的生命周期（`scheduleJob`、`getJob` 和 `deleteJob`）。

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

接下来，为所有机器人注册作业事件处理程序：

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

然后 `job-service` 调用处理调度、获取、删除和处理作业事件的函数。

```go
// Handler that schedules a DroidJob
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

	// schedule job
	job := daprc.Job{
		Name:    droidJob.Name,
		DueTime: droidJob.DueTime,
		Data: &anypb.Any{
			Value: content,
		},
	}

	err = app.daprClient.ScheduleJobAlpha1(ctx, &job)
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

// Handler that gets a job by name
func getJob(ctx context.Context, in *common.InvocationEvent) (out *common.Content, err error) {

	if in == nil {
		err = errors.New("no invocation parameter")
		return nil, err
	}

	job, err := app.daprClient.GetJobAlpha1(ctx, string(in.Data))
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

// Handler that deletes a job by name
func deleteJob(ctx context.Context, in *common.InvocationEvent) (out *common.Content, err error) {
	if in == nil {
		err = errors.New("no invocation parameter")
		return nil, err
	}

	err = app.daprClient.DeleteJobAlpha1(ctx, string(in.Data))
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

// Handler that handles job events
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

在 `job-scheduler` 应用程序中，R2D2、C3PO 和 BB8 作业首先被定义为 `[]DroidJob`：

```go
droidJobs := []DroidJob{
	{Name: "R2-D2", Job: "Oil Change", DueTime: "5s"},
	{Name: "C-3PO", Job: "Memory Wipe", DueTime: "15s"},
	{Name: "BB-8", Job: "Internal Gyroscope Check", DueTime: "30s"},
}
```


然后使用 Jobs API 调度、检索和删除作业。正如您从终端输出中看到的那样，首先调度 R2D2 作业：

```go
// Schedule R2D2 job
err = schedule(droidJobs[0])
if err != nil {
	log.Fatalln("Error scheduling job: ", err)
}
```

然后调度 C3PO 作业并返回作业数据：

```go
// Schedule C-3PO job
err = schedule(droidJobs[1])
if err != nil {
	log.Fatalln("Error scheduling job: ", err)
}

// Get C-3PO job
resp, err := get(droidJobs[1])
if err != nil {
	log.Fatalln("Error retrieving job: ", err)
}
fmt.Println("Get job response: ", resp)
```

然后调度、检索和删除 BB8 作业：

```go
// Schedule BB-8 job
err = schedule(droidJobs[2])
if err != nil {
	log.Fatalln("Error scheduling job: ", err)
}

// Get BB-8 job
resp, err = get(droidJobs[2])
if err != nil {
	log.Fatalln("Error retrieving job: ", err)
}
fmt.Println("Get job response: ", resp)

// Delete BB-8 job
err = delete(droidJobs[2])
if err != nil {
	log.Fatalln("Error deleting job: ", err)
}
fmt.Println("Job deleted: ", droidJobs[2].Name)
```

`job-scheduler.go` 还定义了 `schedule`、`get` 和 `delete` 函数，从 `job-service.go` 调用。

```go
// Schedules a job by invoking grpc service from job-service passing a DroidJob as an argument
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

	// Schedule Job
	_, err = app.daprClient.InvokeMethodWithContent(context.Background(), "job-service", "scheduleJob", "POST", content)
	if err != nil {
		fmt.Println("Error invoking method: ", err)
		return err
	}

	return nil
}

// Gets a job by invoking grpc service from job-service passing a job name as an argument
func get(droidJob DroidJob) (string, error) {
	content := &daprc.DataContent{
		ContentType: "text/plain",
		Data:        []byte(droidJob.Name),
	}

	//get job
	resp, err := app.daprClient.InvokeMethodWithContent(context.Background(), "job-service", "getJob", "GET", content)
	if err != nil {
		fmt.Println("Error invoking method: ", err)
		return "", err
	}

	return string(resp), nil
}

// Deletes a job by invoking grpc service from job-service passing a job name as an argument
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

## 一次运行一个作业应用程序

{{< tabpane text=true >}}

 <!-- Go -->
{{% tab "Go" %}}

此快速入门包含两个应用程序：

- **`job-scheduler.go`**：调度、检索和删除作业。
- **`job-service.go`**：处理已调度的作业。

### 步骤 1：先决条件

对于此示例，您需要：

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

从 Quickstarts 目录的根目录，导航到 jobs 目录：

```bash
cd jobs/go/sdk
```

### 步骤 3：调度作业

在终端中，运行 `job-service` 应用程序：

```bash
dapr run --app-id job-service --app-port 6200 --dapr-grpc-port 6281 --app-protocol grpc -- go run .
```

**预期输出**

```text
== APP == dapr client initializing for: 127.0.0.1:6281
== APP == Registered job handler for:  R2-D2
== APP == Registered job handler for:  C-3PO
== APP == Registered job handler for:  BB-8
== APP == Starting server on port: 6200
```

在新的终端窗口中，运行 `job-scheduler` 应用程序：

```bash
dapr run --app-id job-scheduler --app-port 6300 -- go run .
```

**预期输出**

```text
== APP == dapr client initializing for: 
== APP == Get job response:  {"droid":"C-3PO","Task":"Memory Wipe"}
== APP == Get job response:  {"droid":"BB-8","Task":"Internal Gyroscope Check"}
== APP == Job deleted:  BB-8
```

返回 `job-service` 应用程序终端窗口。输出应该是：

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

了解当您运行 `dapr run` 时 [`job-service`]({{% ref "#job-service-app" %}}) 和 [`job-scheduler`]({{% ref "#job-scheduler-app" %}}) 应用程序中发生了什么。

{{% /tab %}}

{{< /tabpane >}}


## 观看演示

观看使用 Go HTTP 示例演示 Jobs API 的实际操作，录制于 [Dapr Community Call #107](https://www.youtube.com/live/WHGOc7Ec_YQ?si=JlOlcJKkhRuhf5R1&t=849)。

{{< youtube id=WHGOc7Ec_YQ start=849 >}}

## 告诉我们您的想法！

我们正在不断努力改进我们的快速入门示例，并重视您的反馈。您是否觉得此快速入门有帮助？您有改进建议吗？

加入我们的 [Discord 频道](https://discord.com/channels/778680217417809931/953427615916638238) 进行讨论。

## 后续步骤

- 此快速入门的 HTTP 示例：
  - [Go](https://github.com/dapr/quickstarts/tree/master/jobs/go/http)
- 了解有关 [Jobs 构建块]({{% ref jobs-overview %}}) 的更多信息
- 了解有关 [Scheduler 控制平面]({{% ref scheduler %}}) 的更多信息

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
