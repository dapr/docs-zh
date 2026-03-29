---
type: docs
title: "如何：在 Dapr 中启用和使用 Actor 重入"
linkTitle: "如何操作：Actor 重入"
weight: 80
description: 了解有关 Actor 重入的更多信息
---

[虚拟 Actor 模式](https://www.microsoft.com/research/project/orleans-virtual-actors/) 的一个核心原则是 Actor 执行的单线程特性。在没有重入的情况下，Dapr 运行时会对所有 Actor 请求进行加锁。第二个请求无法在第一个请求完成之前开始。这意味着 Actor 无法调用自身，或者让另一个 Actor 调用它，即使它是同一调用链的一部分。

重入通过允许来自同一链或上下文的请求重新进入已锁定的 Actor 来解决这个问题。这在以下场景中非常有用：
- Actor 想要调用自身的方法
- Actor 在工作流中用于执行工作，然后回调到协调 Actor。

重入所允许的调用链示例如下：

```
Actor A -> Actor A
ActorA -> Actor B -> Actor A
```

通过重入，你可以执行更复杂的 Actor 调用，而不会牺牲虚拟 Actor 的单线程行为。

<img src="/images/actor-reentrancy.png" width=1000 height=500 alt="显示协调工作流 Actor 调用工作 Actor 或 Actor 调用自身方法的重入图表">

`maxStackDepth` 参数设置一个值，用于控制可以对同一 Actor 进行多少次重入调用。默认情况下，此值设置为 **32**，这在大多数情况下绰绰有余。

## 配置 Actor 运行时以启用重入

可重入的 Actor 必须提供适当的配置。这是通过 Actor 的端点 `GET /dapr/config` 完成的，类似于其他 Actor 配置元素。

{{< tabpane text=true >}}

{{% tab ".NET" %}}
<!--dotnet-->

```csharp
public class Startup
{
	public void ConfigureServices(IServiceCollection services)
	{
		services.AddSingleton<BankService>();
		services.AddActors(options =>
		{
		options.Actors.RegisterActor<DemoActor>();
		options.ReentrancyConfig = new Dapr.Actors.ActorReentrancyConfig()
			{
			Enabled = true,
			MaxStackDepth = 32,
			};
		});
	}
}
```

{{% /tab %}}

{{% tab "JavaScript" %}}
<!--javascript-->

```js
import { CommunicationProtocolEnum, DaprClient, DaprServer } from "@dapr/dapr";

// 使用 DaprClientOptions 配置 actor 运行时。
const clientOptions = {
  actor: {
    reentrancy: {
      enabled: true,
      maxStackDepth: 32,
    },
  },
};
```

{{% /tab %}}

{{% tab "Python" %}}
<!--python-->

```python
from fastapi import FastAPI
from dapr.ext.fastapi import DaprActor
from dapr.actor.runtime.config import ActorRuntimeConfig, ActorReentrancyConfig
from dapr.actor.runtime.runtime import ActorRuntime
from demo_actor import DemoActor

reentrancyConfig = ActorReentrancyConfig(enabled=True)
config = ActorRuntimeConfig(reentrancy=reentrancyConfig)
ActorRuntime.set_actor_config(config)
app = FastAPI(title=f'{DemoActor.__name__}Service')
actor = DaprActor(app)

@app.on_event("startup")
async def startup_event():
	# 注册 DemoActor
	await actor.register_actor(DemoActor)

@app.get("/MakeExampleReentrantCall")
def do_something_reentrant():
	# 在此处调用另一个 actor，重入将自动处理
	return
```
{{% /tab %}}

{{% tab "Java" %}}
<!--java-->

```java

```

{{% /tab %}}

{{% tab "Go" %}}

下面是用 Golang 编写的 Actor 片段，它通过 HTTP API 提供重入配置。Go SDK 尚未包含重入功能。

```go
type daprConfig struct {
	Entities                []string                `json:"entities,omitempty"`
	ActorIdleTimeout        string                  `json:"actorIdleTimeout,omitempty"`
	ActorScanInterval       string                  `json:"actorScanInterval,omitempty"`
	DrainOngoingCallTimeout string                  `json:"drainOngoingCallTimeout,omitempty"`
	DrainRebalancedActors   bool                    `json:"drainRebalancedActors,omitempty"`
	Reentrancy              config.ReentrancyConfig `json:"reentrancy,omitempty"`
}

var daprConfigResponse = daprConfig{
	[]string{defaultActorType},
	actorIdleTimeout,
	actorScanInterval,
	drainOngoingCallTimeout,
	drainRebalancedActors,
	config.ReentrancyConfig{Enabled: true, MaxStackDepth: &maxStackDepth},
}

func configHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(daprConfigResponse)
}
```

### 处理重入请求

重入请求的关键是 `Dapr-Reentrancy-Id` 请求头。此请求头的值用于将请求与其调用链进行匹配，并允许它们绕过 Actor 的锁。

此请求头由 Dapr 运行时为任何指定了重入配置的 Actor 请求生成。一旦生成，它就会被用来锁定 Actor，并且必须传递给所有后续请求。下面是 Actor 处理重入请求的示例：

```go
func reentrantCallHandler(w http.ResponseWriter, r *http.Request) {
    /*
     * 省略。
     */

	req, _ := http.NewRequest("PUT", url, bytes.NewReader(nextBody))

	reentrancyID := r.Header.Get("Dapr-Reentrancy-Id")
	req.Header.Add("Dapr-Reentrancy-Id", reentrancyID)

	client := http.Client{}
	resp, err := client.Do(req)

    /*
     * 省略。
     */
}
```

{{% /tab %}}

{{< /tabpane >}}

## 演示

观看此[视频](https://www.youtube.com/watch?v=QADHQ5v-gww&list=PLcip_LgkYwzuF-OV6zKRADoiBvUvGhkao&t=674s)，了解如何使用 Actor 重入。

{{< youtube id=QADHQ5v-gww start=674 >}}

## 后续步骤

{{< button text="Dapr SDK 中的 Actors" page="developing-applications/sdks/_index.md#sdk-languages" >}}

## 相关链接

- [Actors API 参考]({{% ref actors_api %}})
- [Actors 概述]({{% ref actors-overview %}})
