---
type: docs
title: "操作指南：获取密钥"
linkTitle: "操作指南：获取密钥"
weight: 2000
description: "使用 secret store 构建块安全地获取密钥"
---

既然你已经了解了 [Dapr 密钥构建块提供的功能]({{% ref secrets-overview %}})，接下来让我们学习它如何在你的服务中工作。本指南演示如何调用 secrets API，并在应用代码中从已配置的 secret store 获取密钥。

{{< diagram name="secrets-mgmt-overview" width="80" >}}

{{% alert title="Note" color="primary" %}}
 如果你还没有尝试过，请先[试用 Secrets Management 快速入门]({{% ref secrets-quickstart %}})，快速了解如何使用 secrets API。

{{% /alert %}}

## 设置 secret store

在应用代码中获取密钥之前，你必须先配置一个 secret store 组件。本示例配置了一个使用本地 JSON 文件存储密钥的 secret store。

{{% alert title="Warning" color="warning" %}}
在生产级应用中，不推荐使用本地 secret store。请[查找替代方案]({{% ref supported-secret-stores %}})，以安全地管理你的密钥。
{{% /alert %}}

在项目目录中，创建一个名为 `secrets.json` 的文件，内容如下：

```json
{
   "secret": "Order Processing pass key"
}
```

创建一个名为 `components` 的目录。进入该目录，并创建一个名为 `local-secret-store.yaml` 的组件文件，内容如下：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localsecretstore
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: secrets.json  #密钥文件的路径
  - name: nestedSeparator
    value: ":"
```

{{% alert title="Warning" color="warning" %}}
secret store JSON 文件的路径，相对于你调用 `dapr run` 的位置。
{{% /alert %}}

更多信息：

- 了解如何[配置其他类型的 secret store]({{% ref setup-secret-store %}})。
- 查阅[支持的 secret store]({{% ref supported-secret-stores %}})，了解不同 secret store 解决方案的具体细节。

## 获取密钥

通过 secrets API 调用 Dapr 边车来获取密钥：

```bash
curl http://localhost:3601/v1.0/secrets/localsecretstore/secret
```

查阅[完整的 API 参考]({{% ref secrets_api %}})。

## 从代码中调用 secrets API

既然你已经设置好了本地 secret store，接下来就可以在应用代码中调用 Dapr 获取密钥。以下代码示例利用 Dapr SDK 获取密钥。

{{< tabpane text=true >}}

{{% tab ".NET" %}}

```csharp
using System;
using System.Threading.Tasks;
using Dapr.Client;

namespace EventService;

const string SECRET_STORE_NAME = "localsecretstore";

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDaprClient();
var app = builder.Build();

//从 DI 中解析 DaprClient
var daprClient = app.Services.GetRequiredService<DaprClient>();

//使用 Dapr SDK 获取密钥
var secret = await daprClient.GetSecretAsync(SECRET_STORE_NAME, "secret");

Console.WriteLine($"Result: {string.Join(", ", secret)}");
```

{{% /tab %}}

{{% tab "Java" %}}

```java
//依赖项
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;


//代码
@SpringBootApplication
public class OrderProcessingServiceApplication {

    private static final Logger log = LoggerFactory.getLogger(OrderProcessingServiceApplication.class);
    private static final ObjectMapper JSON_SERIALIZER = new ObjectMapper();

    private static final String SECRET_STORE_NAME = "localsecretstore";

    public static void main(String[] args) throws InterruptedException, JsonProcessingException {
        DaprClient client = new DaprClientBuilder().build();
        //使用 Dapr SDK 获取密钥
        Map<String, String> secret = client.getSecret(SECRET_STORE_NAME, "secret").block();
        log.info("Result: " + JSON_SERIALIZER.writeValueAsString(secret));
    }
}
```

{{% /tab %}}

{{% tab "Python" %}}

```python
#依赖项 
import random
from time import sleep    
import requests
import logging
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateItem
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

#代码
logging.basicConfig(level = logging.INFO)
DAPR_STORE_NAME = "localsecretstore"
key = 'secret'

with DaprClient() as client:
    #使用 Dapr SDK 获取密钥
    secret = client.get_secret(store_name=DAPR_STORE_NAME, key=key)
    logging.info('Result: ')
    logging.info(secret.secret)
    #使用 Dapr SDK 批量获取密钥
    secret = client.get_bulk_secret(store_name=DAPR_STORE_NAME)
    logging.info('Result for bulk secret: ')
    logging.info(sorted(secret.secrets.items()))
```

{{% /tab %}}

{{% tab "Go" %}}

```go
//依赖项 
import (
	"context"
	"log"

	dapr "github.com/dapr/go-sdk/client"
)

//代码
func main() {
	client, err := dapr.NewClient()
	SECRET_STORE_NAME := "localsecretstore"
	if err != nil {
		panic(err)
	}
	defer client.Close()
	ctx := context.Background()
     //使用 Dapr SDK 获取密钥
	secret, err := client.GetSecret(ctx, SECRET_STORE_NAME, "secret", nil)
	if secret != nil {
		log.Println("Result : ")
		log.Println(secret)
	}
    //使用 Dapr SDK 批量获取密钥
	secretBulk, err := client.GetBulkSecret(ctx, SECRET_STORE_NAME, nil)

	if secret != nil {
		log.Println("Result for bulk: ")
		log.Println(secretBulk)
	}
}
```

{{% /tab %}}

{{% tab "JavaScript" %}}

```javascript
//依赖项 
import { DaprClient, HttpMethod, CommunicationProtocolEnum } from '@dapr/dapr'; 

//代码
const daprHost = "127.0.0.1"; 

async function main() {
    const client = new DaprClient({
        daprHost,
        daprPort: process.env.DAPR_HTTP_PORT,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
    });
    const SECRET_STORE_NAME = "localsecretstore";
    //使用 Dapr SDK 获取密钥
    var secret = await client.secret.get(SECRET_STORE_NAME, "secret");
    console.log("Result: " + secret);
    //使用 Dapr SDK 批量获取密钥
    secret = await client.secret.getBulk(SECRET_STORE_NAME);
    console.log("Result for bulk: " + secret);
}

main();
```

{{% /tab %}}

{{< /tabpane >}}

## 相关链接

- 查阅 [Dapr secrets API 功能]({{% ref secrets-overview %}})。
- 了解如何[使用密钥作用域]({{% ref secrets-scopes %}})。
- 阅读[secrets API 参考]({{% ref secrets_api %}})，并查阅[支持的密钥]({{% ref supported-secret-stores %}})。
- 了解如何[设置不同的 secret store 组件]({{% ref setup-secret-store %}})，以及如何[在组件中引用密钥]({{% ref component-secrets %}})。
