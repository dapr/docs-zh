---
type: docs
title: "如何：在 Dapr 中启用和使用 Actor 重入"
linkTitle: "如何操作：Actor 重入"
weight: 80
description: 了解有关 Actor 重入的更多信息
---

[虚拟 Actor 模式](https://www.microsoft.com/research/project/orleans-virtual-actors/) 的一个核心原则是 Actor 执行的单线程特性。在没有重入的情况下，Dapr 运行时会对所有 Actor 请求加锁。第二个请求必须等到第一个请求完成后才能开始。这意味着，即使属于同一调用链，Actor 也无法调用自身，或让另一个 Actor 调用它。

重入通过允许来自同一链或上下文的请求重新进入已被锁定的 Actor 来解决这一问题。这在以下场景中非常有用：
- Actor 想要调用自身的方法
- Actor 在工作流中用于执行工作，然后回调到协调 Actor。

重入所允许的调用链示例如下：

```
Actor A -> Actor A
Actor A -> Actor B -> Actor A
```

借助重入，你可以执行更复杂的 Actor 调用，同时不牺牲虚拟 Actor 的单线程行为。

{{< diagram name="actor-reentrancy" width="85" >}}

`maxStackDepth` 参数用于设置一个值，控制同一 Actor 可以接受多少次重入调用。默认情况下，该值为 **32**，在大多数情况下已绰绰有余。

## 配置 Actor 运行时以启用重入

可重入的 Actor 必须提供相应的配置。这通过 Actor 的端点 `GET /dapr/config` 完成，与其他 Actor 配置项类似。

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

下面是用 Golang 编写的 Actor 代码片段，它通过 HTTP API 提供重入配置。Go SDK 尚未支持重入功能。

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

重入请求的关键是 `Dapr-Reentrancy-Id` 请求头。该请求头的值用于将请求与其调用链匹配，并允许它们绕过 Actor 的锁。

对于任何配置了重入的 Actor 请求，Dapr 运行时都会生成此请求头。一旦生成，它就会用于锁定 Actor，并且必须传递给之后的所有请求。下面是 Actor 处理重入请求的示例：

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

## 提醒与计时器回调中的重入

提醒（Reminder）和计时器（Timer）回调与其他 Actor 请求一样，同样会获取 Actor 的锁。当该 Actor 类型启用了重入时，Dapr 会为回调生成 `Dapr-Reentrancy-Id`，并将其发送给你的应用：

- 通过 HTTP 发送：在 `PUT /actors/<actorType>/<actorId>/method/remind/<reminderName>` 上以 `Dapr-Reentrancy-Id` 请求头的形式传递，计时器对应的路由同样如此。
- 通过 gRPC Actor 事件流发送：放在提醒或计时器回调消息的 `metadata` 映射中。

从回调中传递该标识的方式，与从方法调用中传递的方式完全相同。未携带该标识的调用会开始一条新的调用链，因此，如果回调调用的是它自身所属的 Actor，就会一直等待回调本身持有的锁，直到调用超时。

{{% alert title="注意" color="primary" %}}
从 Dapr 1.19 开始，提醒和计时器回调会携带 `Dapr-Reentrancy-Id`。在此之前的版本并未始终在这些回调上发送该请求头，因此，从提醒或计时器回调内部发起的重入调用可能会阻塞，直至超时。Actor 方法调用不受影响，一直都携带该请求头。
{{% /alert %}}

## 演示

观看此[视频](https://www.youtube.com/watch?v=QADHQ5v-gww&list=PLcip_LgkYwzuF-OV6zKRADoiBvUvGhkao&t=674s)，了解如何使用 Actor 重入。

{{< youtube id=QADHQ5v-gww start=674 >}}

## 后续步骤

{{< button text="SDK 中的 Actor" page="developing-applications/sdks/_index.md#sdk-languages" >}}

## 相关链接

- [Actor API 参考]({{% ref actors_api %}})
- [Actor 概述]({{% ref actors-overview %}})
