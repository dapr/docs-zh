---
type: docs
title: "Dapr 可插拔组件 Go SDK 入门"
linkTitle: "Go"
weight: 1000
description: 如何开始使用 Dapr 可插拔组件 Go SDK
no_list: true
is_preview: true
cascade:
  github_repo: https://github.com/dapr-sandbox/components-go-sdk
  github_subdir: daprdocs/content/en/go-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/develop-components/pluggable-components/pluggable-components-sdks/pluggable-components-go/
  github_branch: main
---

Dapr 提供了用于帮助开发 Go 可插拔组件的软件包。

## 前置条件

- [Go 1.20](https://go.dev/dl/) 或更高版本
- [Dapr 1.9 CLI]({{% ref install-dapr-cli.md %}}) 或更高版本
- 已初始化的 [Dapr 环境]({{% ref install-dapr-selfhost.md %}})
- Linux、Mac 或 Windows（需使用 WSL）

{{% alert title="注意" color="primary" %}}
在 Windows 上开发 Dapr 可插拔组件需要 WSL。并非所有语言和 SDK 在"原生"Windows 上都支持 Unix 域套接字。
{{% /alert %}}

## 应用程序创建

创建可插拔组件首先需要创建一个空的 Go 应用程序。

```bash
mkdir example
cd example
go mod init example
```

## 导入 Dapr 软件包

导入 Dapr 可插拔组件 SDK 软件包。

```bash
go get github.com/dapr-sandbox/components-go-sdk@v0.1.0
```

## 创建 main 包

在 `main.go` 中，导入 Dapr 可插拔组件软件包并运行应用程序。

```go
package main

import (
	dapr "github.com/dapr-sandbox/components-go-sdk"
)

func main() {
	dapr.MustRun()
}
```

这将创建一个不包含任何组件的应用程序。你需要实现并注册一个或多个组件。

## 实现并注册组件

 - [实现输入/输出绑定组件]({{% ref go-bindings %}})
 - [实现发布订阅组件]({{% ref go-pub-sub %}})
 - [实现状态存储组件]({{% ref go-state-store %}})

{{% alert title="注意" color="primary" %}}
单个服务只能注册每种类型的一个组件。但是，[可以跨多个服务分发同类型的多个组件]({{% ref go-advanced %}})。
{{% /alert %}}

## 本地测试组件

### 创建 Dapr 组件套接字目录

Dapr 通过公共目录中的 Unix 域套接字文件与可插拔组件通信。默认情况下，Dapr 和可插拔组件都使用 `/tmp/dapr-components-sockets` 目录。如果该目录尚不存在，你应该创建它。

```bash
mkdir /tmp/dapr-components-sockets
```

### 启动可插拔组件

可以通过在命令行启动应用程序来测试可插拔组件。

要启动组件，在应用程序目录中：

```bash
go run main.go
```

### 配置 Dapr 以使用可插拔组件

要配置 Dapr 使用该组件，请在 resources 目录中创建一个组件 YAML 文件。例如，对于状态存储组件：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <component name>
spec:
  type: state.<socket name>
  version: v1
  metadata:
  - name: key1
    value: value1
  - name: key2
    value: value2
```

当组件实例化时，任何 `metadata` 属性都将通过组件的 `Store.Init(metadata state.Metadata)` 方法传递给组件。

### 启动 Dapr

要启动 Dapr（以及可选的，使用该服务的服务）：

```bash
dapr run --app-id <app id> --resources-path <resources path> ...
```

此时，Dapr 边车将启动并通过 Unix 域套接字连接到组件。然后你可以通过以下方式与组件交互：
- 通过使用该组件的服务（如果已启动），或
- 直接使用 Dapr HTTP 或 gRPC API

## 创建容器

可插拔组件作为容器部署，作为应用程序的边车运行（就像 Dapr 本身一样）。用于为 Go 应用程序创建 Docker 镜像的典型 `Dockerfile` 可能如下所示：

```dockerfile
FROM golang:1.20-alpine AS builder

WORKDIR /usr/src/app

# 下载依赖
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# 构建应用程序
COPY . .
RUN go build -v -o /usr/src/bin/app .

FROM alpine:latest

# 设置非 root 用户和权限
RUN addgroup -S app && adduser -S app -G app
RUN mkdir /tmp/dapr-components-sockets && chown app /tmp/dapr-components-sockets

# 将应用程序复制到运行时镜像
COPY --from=builder --chown=app /usr/src/bin/app /app

USER app

CMD ["/app"]
```

构建镜像：

```bash
docker build -f Dockerfile -t <image name>:<tag> .
```

{{% alert title="注意" color="primary" %}}
`Dockerfile` 中 `COPY` 操作的路径是相对于构建镜像时传递的 Docker 上下文而言的，而 Docker 上下文本身将根据所构建应用程序的需求而变化。在上面的示例中，假设 Docker 上下文是组件应用程序目录。
{{% /alert %}}

## 后续步骤
- [可插拔组件 Go SDK 的高级技巧]({{% ref go-advanced %}})
- 了解有关实现的更多信息：
  - [绑定]({{% ref go-bindings %}})
  - [状态]({{% ref go-state-store %}})
  - [发布订阅]({{% ref go-pub-sub %}})
