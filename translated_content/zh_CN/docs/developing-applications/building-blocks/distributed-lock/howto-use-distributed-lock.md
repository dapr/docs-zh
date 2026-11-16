---
type: docs
title: "操作指南：使用锁"
linkTitle: "操作指南：使用锁"
weight: 2000
description: "了解如何使用分布式锁为资源提供独占访问"
---

既然你已经了解了 Dapr 分布式锁 API 构建块所提供的功能，接下来学习它如何在你的服务中发挥作用。在本指南中，示例应用程序使用 Redis 锁组件获取锁，以演示如何锁定资源。有关支持的 lock store 列表，请参阅[此参考页面](/reference/components-reference/supported-locks/)。

在下图中，同一应用程序的两个实例尝试获取锁，其中一个实例成功，另一个被拒绝。

{{< diagram name="lock-example" width="75" >}}

下图展示同一应用程序的两个实例：其中一个实例释放锁后，另一个实例即可获取该锁。

{{< diagram name="lock-unlock-example" width="75" >}}

下图展示两个不同应用程序的实例，它们在同一资源上获取不同的锁。

{{< diagram name="lock-multiple-example" width="75" >}}

锁的作用范围限定在 Dapr 应用 ID（app-id）内，因此这两把锁彼此独立：每把锁只会排斥其所属应用的其他实例，而不会排斥另一个应用。两个应用无法通过锁 API 互相排斥，以独占同一资源。

### 配置锁组件

将以下组件文件保存到你机器上的[默认组件文件夹]({{% ref "install-dapr-selfhost#step-5-verify-components-directory-has-been-initialized" %}})中。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: lockstore
spec:
  type: lock.redis
  version: v1
  metadata:
  - name: redisHost
    value: localhost:6379
  - name: redisPassword
    value: <PASSWORD>
```

### 获取锁

{{< tabpane text=true >}}

{{% tab "HTTP" %}}

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/lock/lockstore
   -H 'Content-Type: application/json'
   -d '{"resourceId":"my_file_name", "lockOwner":"random_id_abc123", "expiryInSeconds": 60}'
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
using System;
using Dapr.Client;

namespace LockService
{
    class Program
    {
        [Obsolete("Distributed Lock API is in Alpha, this can be removed once it is stable.")]
        static async Task Main(string[] args)
        {
            string DAPR_LOCK_NAME = "lockstore";
            string fileName = "my_file_name";
            var client = new DaprClientBuilder().Build();
    
            await using (var fileLock = await client.Lock(DAPR_LOCK_NAME, fileName, "random_id_abc123", 60))
            {
                if (fileLock.Success)
                {
                    Console.WriteLine("Success");
                }
                else
                {
                    Console.WriteLine($"Failed to lock {fileName}.");
                }
            }
        }
    }
}
```

{{% /tab %}}

{{% tab "Go" %}}

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

{{% /tab %}}

{{< /tabpane >}}

### 解锁现有锁

{{< tabpane text=true >}}

{{% tab "HTTP" %}}

```bash
curl -X POST http://localhost:3500/v1.0-alpha1/unlock/lockstore
   -H 'Content-Type: application/json'
   -d '{"resourceId":"my_file_name", "lockOwner":"random_id_abc123"}'
```

{{% /tab %}}

{{% tab ".NET" %}}

```csharp
using System;
using Dapr.Client;

namespace LockService
{
    class Program
    {
        static async Task Main(string[] args)
        {
            string DAPR_LOCK_NAME = "lockstore";
            var client = new DaprClientBuilder().Build();

            var response = await client.Unlock(DAPR_LOCK_NAME, "my_file_name", "random_id_abc123"));
            Console.WriteLine(response.status);
        }
    }
}
```

{{% /tab %}}

{{% tab "Go" %}}

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
    
    resp, err := client.UnlockAlpha1(ctx, "lockstore", &UnlockRequest{
			LockOwner:    "random_id_abc123",
			ResourceID: "my_file_name",
		})

    fmt.Println(resp.Status)
}
```

{{% /tab %}}

{{< /tabpane >}}

## 下一步

阅读[分布式锁 API 概述]({{% ref distributed-lock-api-overview %}})了解更多内容。
