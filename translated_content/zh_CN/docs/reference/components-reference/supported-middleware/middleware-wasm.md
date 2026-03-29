---
type: docs
title: "Wasm"
linkTitle: "Wasm"
description: "在 HTTP 管道中使用 Wasm 中间件"
aliases:
- /developing-applications/middleware/supported-middleware/middleware-wasm/
---

WebAssembly 是一种安全执行跨语言编译代码的机制。运行时负责加载并运行 WebAssembly 模块（Wasm），这些模块通常以 `.wasm` 为扩展名的二进制文件形式存在。

通过 Wasm [HTTP 中间件]({{% ref middleware.md %}})，你可以使用自定义逻辑处理传入请求或构造响应，这些逻辑会被编译成 Wasm 二进制文件。换句话说，你可以使用外部文件扩展 Dapr，而无需将代码预编译到 `daprd` 二进制文件中。Dapr 内嵌了 [wazero](https://wazero.io) 来实现这一能力，且无需 CGO 依赖。

Wasm 二进制文件通过 URL 加载。例如，`file://rewrite.wasm` 会从进程当前目录加载 `rewrite.wasm`。在 Kubernetes 环境中，请参考[如何：将 Pod 卷挂载到 Dapr 边车]({{% ref kubernetes-volume-mounts.md %}})来配置包含 Wasm 模块的文件系统挂载。

也支持从远程 URL 获取 Wasm 二进制文件。这种情况下，URL 必须严格指向单个 Wasm 二进制文件。例如：
- `http://example.com/rewrite.wasm`，或 
- `https://example.com/rewrite.wasm`。

## 组件格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: wasm
spec:
  type: middleware.http.wasm
  version: v1
  metadata:
  - name: url
    value: "file://router.wasm"
  - name: guestConfig
    value: {"environment":"production"}
```

## 规格元数据字段

用户至少需要提供一个实现 [http-handler](https://http-wasm.io/http-handler/) 接口的 Wasm 二进制文件。具体编译方法将在后续说明。

| 字段 | 说明 | 是否必填 | 示例 |
|------|------|---------|------|
| url   | 用于实例化的 Wasm 二进制资源 URL。支持的协议方案包括 `file://`、`http://` 和 `https://`。`file://` URL 的路径是相对于 Dapr 进程的，除非以 `/` 开头表示绝对路径。 | 是 | `file://hello.wasm`, `https://example.com/hello.wasm` |
| guestConfig   | 传递给 Wasm 客户端的可选配置。用户可以传入任意字符串，由客户端代码自行解析。 | 否 | `environment=production`,`{"environment":"production"}` |

## Dapr 配置

要使中间件生效，必须在 [configuration]({{% ref configuration-concept.md %}}) 中引用它。请参阅[中间件管道]({{% ref "middleware.md#customize-processing-pipeline"%}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  httpPipeline:
    handlers:
    - name: wasm
      type: middleware.http.wasm
```

*注意*：与原生中间件相比，WebAssembly 中间件会消耗更多资源。这会导致资源约束比原生代码实现的相同逻辑更快出现。生产环境使用时应该[控制最大并发]({{% ref control-concurrency.md %}})。

### 生成 Wasm

此组件允许你使用自定义逻辑处理传入请求或生成响应，这些逻辑通过 [http-handler](https://http-wasm.io/http-handler/) 应用二进制接口（ABI）编译而成。`handle_request` 函数接收传入请求，可以根据需要操作该请求或生成响应。

要编译 Wasm，必须使用符合 http-handler 规范的客户端 SDK，例如 [TinyGo](https://github.com/http-wasm/http-wasm-guest-tinygo)。

以下是一个 TinyGo 示例：

```go
package main

import (
	"strings"

	"github.com/http-wasm/http-wasm-guest-tinygo/handler"
	"github.com/http-wasm/http-wasm-guest-tinygo/handler/api"
)

func main() {
	handler.HandleRequestFn = handleRequest
}

// handleRequest 实现了一个简单的 HTTP 路由器。
func handleRequest(req api.Request, resp api.Response) (next bool, reqCtx uint32) {
	// 如果 URI 以 /host 开头，则去掉该前缀并分发给下一个处理器。
	if uri := req.GetURI(); strings.HasPrefix(uri, "/host") {
		req.SetURI(uri[5:])
		next = true // 继续执行宿主机上的下一个处理器。
		return
	}

	// 返回静态响应
	resp.Headers().Set("Content-Type", "text/plain")
	resp.Body().WriteString("hello")
	return // 跳过下一个处理器，因为我们已经写入了响应。
}
```

如果使用 TinyGo，请按以下方式编译，并将 spec 元数据字段中的 `url` 设置为输出文件的位置（例如 `file://router.wasm`）：

```bash
tinygo build -o router.wasm -scheduler=none --no-debug -target=wasi router.go`
```

### Wasm `guestConfig` 示例

以下是如何使用 `guestConfig` 向 Wasm 传递配置的示例。在 Wasm 代码中，可以使用客户端 SDK 中定义的 `handler.Host.GetConfig` 函数来获取配置。在下面的示例中，Wasm 中间件解析了组件中定义的 JSON 配置里的 `environment` 字段。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: wasm
spec:
  type: middleware.http.wasm
  version: v1
  metadata:
  - name: url
    value: "file://router.wasm"
  - guestConfig
    value: {"environment":"production"}
```

下面是 TinyGo 的示例：

```go
package main

import (
	"encoding/json"
	"github.com/http-wasm/http-wasm-guest-tinygo/handler"
	"github.com/http-wasm/http-wasm-guest-tinygo/handler/api"
)

type Config struct {
	Environment string `json:"environment"`
}

func main() {
	// 获取配置字节，即组件中定义的 guestConfig 值。
	configBytes := handler.Host.GetConfig()
	
	config := Config{}
	json.Unmarshal(configBytes, &config)
	handler.Host.Log(api.LogLevelInfo, "Config environment: "+config.Environment)
}
```


## 相关链接

- [中间件]({{% ref middleware.md %}})
- [配置概念]({{% ref configuration-concept.md %}})
- [配置概述]({{% ref configuration-overview.md %}})
- [控制最大并发]({{% ref control-concurrency.md %}})
