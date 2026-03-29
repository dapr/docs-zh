---
type: docs
title: "操作指南：在自托管模式下不使用 Docker 运行 Dapr"
linkTitle: "不使用 Docker 运行"
weight: 30000
description: "如何在本地机器上未安装 Docker 的情况下部署和运行自托管模式的 Dapr"
---

## 前置条件

- [安装 Dapr CLI]({{% ref "install-dapr-selfhost.md#installing-dapr-cli" %}})

## 不使用容器初始化 Dapr

Dapr CLI 提供了一个使用 slim init 来初始化 Dapr 的选项，而不会默认创建依赖于 Docker 的开发环境。要在安装 Dapr CLI 后使用 slim init 初始化 Dapr，请使用以下命令：

```bash
dapr init --slim
```

会安装两个不同的二进制文件：
- `daprd`
- `placement`

`placement` 二进制文件是在 Dapr 自托管安装中启用 [Actor]({{% ref "actors-overview.md" %}}) 所必需的。

在 slim init 模式下，不会安装默认组件（如 Redis）用于状态管理或发布订阅。这意味着，除了[服务调用]({{% ref "service-invocation-overview.md" %}})之外，安装时"开箱即用"没有其他构建块功能可用。相反，你可以设置自己的环境和自定义组件。

如果配置了状态存储，基于 Actor 的服务调用是可行的，如以下章节所述。

## 执行服务调用

请参阅 [_Hello Dapr slim_ 示例](https://github.com/dapr/samples/tree/master/hello-dapr-slim)，了解如何在 slim init 模式下执行服务调用。

## 启用状态管理或发布订阅

请参阅有关[在不使用 Docker 的自托管模式下配置 Redis](https://redis.io/topics/quickstart) 的文档，以启用用于消息传递的本地状态存储或发布订阅代理。

## 启用 Actor

要启用 Actor 放置：
- 在本地运行 placement 服务。
- 启用[支持 ETags 的事务状态存储]({{% ref "supported-state-stores.md" %}})以使用 Actor。例如，[在自托管模式下配置的 Redis](https://redis.io/topics/quickstart)。

默认情况下，`placement` 二进制文件安装在：

- 对于 Linux/MacOS：`/$HOME/.dapr/bin`
- 对于 Windows：`%USERPROFILE%\.dapr\bin`

{{< tabpane text=true >}}

{{% tab "Linux/MacOS" %}}

```bash
$ $HOME/.dapr/bin/placement

INFO[0000] starting Dapr Placement Service -- version 1.0.0-rc.1 -- commit 13ae49d  instance=Nicoletaz-L10.redmond.corp.microsoft.com scope=dapr.placement type=log ver=1.0.0-rc.1
INFO[0000] log level set to: info                        instance=Nicoletaz-L10.redmond.corp.microsoft.com scope=dapr.placement type=log ver=1.0.0-rc.1
INFO[0000] metrics server started on :9090/              instance=Nicoletaz-L10.redmond.corp.microsoft.com scope=dapr.metrics type=log ver=1.0.0-rc.1
INFO[0000] Raft server is starting on 127.0.0.1:8201...  instance=Nicoletaz-L10.redmond.corp.microsoft.com scope=dapr.placement.raft type=log ver=1.0.0-rc.1
INFO[0000] placement service started on port 50005       instance=Nicoletaz-L10.redmond.corp.microsoft.com scope=dapr.placement type=log ver=1.0.0-rc.1
INFO[0000] Healthz server is listening on :8080          instance=Nicoletaz-L10.redmond.corp.microsoft.com scope=dapr.placement type=log ver=1.0.0-rc.1
INFO[0001] cluster leadership acquired                   instance=Nicoletaz-L10.redmond.corp.microsoft.com scope=dapr.placement type=log ver=1.0.0-rc.1
INFO[0001] leader is established.                        instance=Nicoletaz-L10.redmond.corp.microsoft.com scope=dapr.placement type=log ver=1.0.0-rc.1

```

{{% /tab %}}

{{% tab "Windows" %}}

在 Windows 上运行独立的 placement 时，请指定端口 6050：

```bash
%USERPROFILE%/.dapr/bin/placement.exe -port 6050

time="2022-10-17T14:56:55.4055836-05:00" level=info msg="starting Dapr Placement Service -- version 1.9.0 -- commit fdce5f1f1b76012291c888113169aee845f25ef8" instance=LAPTOP-OMK50S19 scope=dapr.placement type=log ver=1.9.0
time="2022-10-17T14:56:55.4066226-05:00" level=info msg="log level set to: info" instance=LAPTOP-OMK50S19 scope=dapr.placement type=log ver=1.9.0
time="2022-10-17T14:56:55.4067306-05:00" level=info msg="metrics server started on :9090/" instance=LAPTOP-OMK50S19 scope=dapr.metrics type=log ver=1.9.0
time="2022-10-17T14:56:55.4077529-05:00" level=info msg="Raft server is starting on 127.0.0.1:8201..." instance=LAPTOP-OMK50S19 scope=dapr.placement.raft type=log ver=1.9.0
time="2022-10-17T14:56:55.4077529-05:00" level=info msg="placement service started on port 6050" instance=LAPTOP-OMK50S19 scope=dapr.placement type=log ver=1.9.0
time="2022-10-17T14:56:55.4082772-05:00" level=info msg="Healthz server is listening on :8080" instance=LAPTOP-OMK50S19 scope=dapr.placement type=log ver=1.9.0
time="2022-10-17T14:56:56.8232286-05:00" level=info msg="cluster leadership acquired" instance=LAPTOP-OMK50S19 scope=dapr.placement type=log ver=1.9.0
time="2022-10-17T14:56:56.8232286-05:00" level=info msg="leader is established." instance=LAPTOP-OMK50S19 scope=dapr.placement type=log ver=1.9.0

```

{{% /tab %}}

{{< /tabpane >}}

现在，要运行启用了 Actor 的应用程序，你可以遵循为以下内容创建的示例：
- [java-sdk](https://github.com/dapr/java-sdk/tree/master/examples/src/main/java/io/dapr/examples/actors)
- [python-sdk](https://github.com/dapr/python-sdk/tree/master/examples/demo_actor)
- [dotnet-sdk]({{% ref "dotnet-actors-howto.md" %}})

更新状态存储配置文件以匹配你的设置的 Redis 主机和密码。

通过使元数据部分类似于[示例 Java Redis 组件](https://github.com/dapr/java-sdk/blob/master/examples/components/state/redis.yaml)定义，将其启用为 Actor 状态存储。

```yaml
  - name: actorStateStore
    value: "true"
```

## 清理

完成后，按照[在自托管环境中卸载 Dapr]({{% ref self-hosted-uninstall %}})删除二进制文件。

## 后续步骤
- 使用默认 [Docker]({{% ref install-dapr-selfhost.md %}}) 或在[隔离环境]({{% ref self-hosted-airgap.md %}})中使用 [Podman]({{% ref self-hosted-with-podman.md %}})运行 Dapr
- [在自托管模式下升级 Dapr]({{% ref self-hosted-upgrade %}})
