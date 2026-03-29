---
type: docs
title: "如何：使用 Java SDK 编写和管理 Dapr Jobs"
linkTitle: "如何：编写和管理 Jobs"
weight: 20000
description: 如何使用 Dapr Java SDK 快速上手 Jobs
---

在本演示中，我们将调度一个 Dapr Job。调度的 Job 将触发同一应用中注册的端点。使用[提供的 Jobs 示例](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/jobs)，你将：

- 调度一个 Job [Job 调度示例](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/jobs/DemoJobsClient.java)
- 注册一个端点，供 dapr sidecar 在触发时调用 [端点注册](https://github.com/dapr/java-sdk/blob/master/examples/src/main/java/io/dapr/examples/jobs/DemoJobsSpringApplication.java)

本示例使用[自托管模式](https://github.com/dapr/cli#install-dapr-on-your-local-machine-self-hosted)下 `dapr init` 的默认配置。

## 前置条件

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- Java JDK 11（或更高版本）：
  - [Oracle JDK](https://www.oracle.com/java/technologies/downloads)，或
  - OpenJDK
- [Apache Maven](https://maven.apache.org/install.html)，版本 3.x。
- [Docker Desktop](https://www.docker.com/products/docker-desktop)

## 设置环境

克隆 [Java SDK 仓库](https://github.com/dapr/java-sdk) 并进入该目录。

```bash
git clone https://github.com/dapr/java-sdk.git
cd java-sdk
```

运行以下命令以安装使用 Dapr Java SDK 运行 jobs 示例所需的要求。

```bash
mvn clean install -DskipTests
```

从 Java SDK 根目录进入示例目录。

```bash
cd examples
```

运行 Dapr sidecar。

```sh
dapr run --app-id jobsapp --dapr-grpc-port 51439 --dapr-http-port 3500 --app-port 8080
```

> 现在，Dapr 正在 `http://localhost:3500` 监听 HTTP 请求，在 `http://localhost:51439` 监听内部 Jobs gRPC 请求。

## 调度和获取 Job

在 `DemoJobsClient` 中有调度 Job 的步骤。使用 `DaprPreviewClient` 调用 `scheduleJob`
将向 Dapr Runtime 调度一个 Job。

```java
public class DemoJobsClient {

  /**
   * The main method of this app to schedule and get jobs.
   */
  public static void main(String[] args) throws Exception {
    try (DaprPreviewClient client = new DaprClientBuilder().withPropertyOverrides(overrides).buildPreviewClient()) {

      // Schedule a job.
      System.out.println("**** Scheduling a Job with name dapr-jobs-1 *****");
      ScheduleJobRequest scheduleJobRequest = new ScheduleJobRequest("dapr-job-1",
          JobSchedule.fromString("* * * * * *")).setData("Hello World!".getBytes());
      client.scheduleJob(scheduleJobRequest).block();

      System.out.println("**** Scheduling job dapr-jobs-1 completed *****");
    }
  }
}
```

调用 `getJob` 以检索先前创建并调度的 Job 详细信息。
```
client.getJob(new GetJobRequest("dapr-job-1")).block()
```

使用以下命令运行 `DemoJobsClient`。

```sh
java -jar target/dapr-java-sdk-examples-exec.jar io.dapr.examples.jobs.DemoJobsClient
```

### 示例输出
```
**** Scheduling a Job with name dapr-jobs-1 *****
**** Scheduling job dapr-jobs-1 completed *****
**** Retrieving a Job with name dapr-jobs-1 *****
```

## 设置一个在 Job 触发时被调用的端点

`DemoJobsSpringApplication` 类启动一个 Spring Boot 应用，该应用注册 `JobsController` 中指定的端点
该端点充当对调度的 Job 请求的回调。

```java
@RestController
public class JobsController {

  /**
   * Handles jobs callback from Dapr.
   *
   * @param jobName name of the job.
   * @param payload data from the job if payload exists.
   * @return Empty Mono.
   */
  @PostMapping("/job/{jobName}")
  public Mono<Void> handleJob(@PathVariable("jobName") String jobName,
                              @RequestBody(required = false) byte[] payload) {
    System.out.println("Job Name: " + jobName);
    System.out.println("Job Payload: " + new String(payload));

    return Mono.empty();
  }
}
```

参数：

* `jobName`：被触发的 Job 的名称。
* `payload`：与 Job 关联的可选负载数据（作为字节数组）。

使用以下命令运行 Spring Boot 应用。

```sh
java -jar target/dapr-java-sdk-examples-exec.jar io.dapr.examples.jobs.DemoJobsSpringApplication
```

### 示例输出
```
Job Name: dapr-job-1
Job Payload: Hello World!
```

## 删除一个调度的 Job

```java
public class DemoJobsClient {

  /**
   * The main method of this app deletes a job that was previously scheduled.
   */
  public static void main(String[] args) throws Exception {
    try (DaprPreviewClient client = new DaprClientBuilder().buildPreviewClient()) {

      // Delete a job.
      System.out.println("**** Delete a Job with name dapr-jobs-1 *****");
      client.deleteJob(new DeleteJobRequest("dapr-job-1")).block();
    }
  }
}
```

## 后续步骤
- [了解更多关于 Jobs]({{% ref jobs-overview.md %}})
- [Jobs API 参考]({{% ref jobs_api.md %}})
