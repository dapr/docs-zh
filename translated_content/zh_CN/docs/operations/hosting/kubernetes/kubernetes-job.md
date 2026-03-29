---
type: docs
title: "在 Kubernetes Job 中运行 Dapr"
linkTitle: "Kubernetes Jobs"
weight: 80000
description: "在 Kubernetes Job 上下文中使用 Dapr API"
---

Dapr 边车被设计为一个长期运行的进程。在 [Kubernetes Job](https://kubernetes.io/docs/concepts/workloads/controllers/job/) 的上下文中，这种行为可能会阻止您的 Job 完成。

{{% alert title="原生边车" color="primary" %}}
在 Kubernetes 1.28+ 上，您可以启用[原生边车]({{% ref "sidecar.md#native-sidecars-kubernetes-128" %}})以确保 `daprd` 作为 [Kubernetes 原生边车](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)运行并遵循其关闭语义。
{{% /alert %}}

在运行基本的 [Kubernetes Job](https://kubernetes.io/docs/concepts/workloads/controllers/job/)时，您需要调用 `/shutdown` 端点以使边车优雅停止，并将 Job 视为 `Completed`。

当 Job 在未调用 `Shutdown` 的情况下结束时，您的 Job 将处于 `NotReady` 状态，只有 `daprd` 容器无休止地运行。

停止 Dapr 边车会导致其就绪探针和存活探针在您的容器中失败。

为了防止 Kubernetes 尝试重启您的 Job，请将 Job 的 `restartPolicy` 设置为 `Never`。

确保在调用 shutdown HTTP API 时使用 *POST* HTTP 方法。例如：

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: job-with-shutdown
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "with-shutdown"
    spec:
      containers:
      - name: job
        image: alpine
        command: ["/bin/sh", "-c", "apk --no-cache add curl && sleep 20 && curl -X POST localhost:3500/v1.0/shutdown"]
      restartPolicy: Never
```

您也可以从任何 Dapr SDK 调用 `Shutdown`。例如，对于 Go SDK：

```go
package main

import (
	"context"
	"log"
	"os"

	dapr "github.com/dapr/go-sdk/client"
)

func main() {
  client, err := dapr.NewClient()
  if err != nil {
    log.Panic(err)
  }
  defer client.Close()
  defer client.Shutdown()
  // Job
}
```

## 相关链接

- [在 Kubernetes 上部署 Dapr]({{% ref kubernetes-deploy.md %}})
- [在 Kubernetes 上升级 Dapr]({{% ref kubernetes-upgrade.md %}})
