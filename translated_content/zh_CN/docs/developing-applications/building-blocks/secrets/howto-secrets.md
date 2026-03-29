---
type: docs
title: "操作指南：获取密钥"
linkTitle: "操作指南：获取密钥"
weight: 2000
description: "使用密钥存储构建块安全地获取密钥"
---

既然您已经了解了 [Dapr 密钥构建块提供什么功能]({{% ref secrets-overview %}})，了解它如何在您的服务中工作。本指南演示如何调用密钥 API 并从配置的密钥存储中检索应用代码中的密钥。

<img src="/images/howto-secrets/secrets-mgmt-overview.png" width=1000 alt="Diagram showing secrets management of example service.">

{{% alert title="Note" color="primary" %}}
 如果您还没有尝试过，[请试用密钥管理快速入门]({{% ref secrets-quickstart %}})以快速了解如何使用密钥 API。

{{% /alert %}}
## 设置密钥存储

在应用的代码中检索密钥之前，您必须配置一个密钥存储组件。本示例配置了一个使用本地 JSON 文件存储密钥的密钥存储。

{{% alert title="Warning" color="warning" %}}
在生产级应用中，不推荐使用本地密钥存储。请[查找替代方案]({{% ref supported-secret-stores %}})来安全地管理您的密钥。
{{% /alert٪}}

在项目目录中，创建一个名为 `secrets.json` 的文件，包含以下内容：

```json
{
   "secret": "Order Processing pass key"
}
```

创建一个名为 `components` 的新目录。导航到该目录并创建一个名为 `local-secret-store.yaml` 的组件文件，包含以下内容：

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
    value: secrets.json  #path to secrets file
  - name: nestedSeparator
    value: ":"
```

{{% alert title="Warning" color="warning" %}}
密钥存储 JSON 的路径是相对于您调用 `dapr run` 的位置。
{{% /alert٪}}

更多信息：

- 了解如何[配置不同类型的密钥存储]({{% ref setup-secret-store %}})。
- 查看[支持的密钥存储]({{% ref supported-secret-stores %}})以获取不同密钥存储解决方案的具体详情。

## 获取密钥

通过使用密钥 API 调用 Dapr 边车来获取密钥：

```bash
curl http://localhost:3601/v1.0/secrets/localsecretstore/secret
```

查看[完整 API 参考]({{% ref secrets_api %}})。

## 从代码中调用密钥 API

现在您已经设置了本地密钥存储，调用 Dapr 从应用代码中获取密钥。以下是利用 Dapr SDK 获取密钥的代码示例。

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

//Resolve a DaprClient from DI
var daprClient = app.Services.GetRequiredService<DaprClient>();

//Use the Dapr SDK to get a secret
var secret = await daprClient.GetSecretAsync(SECRET_STORE_NAME, "secret");

Console.WriteLine($"Result: {string.Join(", ", secret)}");
```
{{% /tab %}}
{{% tab "Java" %}}
```java
//dependencies
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Map;


//code
@SpringBootApplication
public class OrderProcessingServiceApplication {

    private static final Logger log = LoggerFactory.getLogger(OrderProcessingServiceApplication.class);
    private static final ObjectMapper JSON_SERIALIZER = new ObjectMapper();

    private static final String SECRET_STORE_NAME = "localsecretstore";

    public static void main(String[] args) throws InterruptedException, JsonProcessingException {
        DaprClient client = new DaprClientBuilder().build();
        //Using Dapr SDK to get a secret
        Map<String, String> secret = client.getSecret(SECRET_STORE_NAME, "secret").block();
        log.info("Result: " + JSON_SERIALIZER.writeValueAsString(secret));
    }
}
```
{{% /tab %}}
{{% tab "Python" %}}
```python
#dependencies 
import random
from time import sleep    
import requests
import logging
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateItem
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

#code
logging.basicConfig(level = logging.INFO)
DAPR_STORE_NAME = "localsecretstore"
key = 'secret'

with DaprClient() as client:
    #Using Dapr SDK to get a secret
    secret = client.get_secret(store_name=DAPR_STORE_NAME, key=key)
    logging.info('Result: ')
    logging.info(secret.secret)
    #Using Dapr SDK to get bulk secrets
    secret = client.get_bulk_secret(store_name=DAPR_STORE_NAME)
    logging.info('Result for bulk secret: ')
    logging.info(sorted(secret.secrets.items()))
```
{{% /tab %}}
{{% tab "Go" %}}
```go
//dependencies 
import (
	"context"
	"log"

	dapr "github.com/dapr/go-sdk/client"
)

//code
func main() {
	client, err := dapr.NewClient()
	SECRET_STORE_NAME := "localsecretstore"
	if err != nil {
		panic(err)
	}
	defer client.Close()
	ctx := context.Background()
     //Using Dapr SDK to get a secret
	secret, err := client.GetSecret(ctx, SECRET_STORE_NAME, "secret", nil)
	if secret != nil {
		log.Println("Result : ")
		log.Println(secret)
	}
    //Using Dapr SDK to get bulk secrets
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
//dependencies 
import { DaprClient, HttpMethod, CommunicationProtocolEnum } from '@dapr/dapr'; 

//code
const daprHost = "127.0.0.1"; 

async function main() {
    const client = new DaprClient({
        daprHost,
        daprPort: process.env.DAPR_HTTP_PORT,
        communicationProtocol: CommunicationProtocolEnum.HTTP,
    });
    const SECRET_STORE_NAME = "localsecretstore";
    //Using Dapr SDK to get a secret
    var secret = await client.secret.get(SECRET_STORE_NAME, "secret");
    console.log("Result: " + secret);
    //Using Dapr SDK to get bulk secrets
    secret = await client.secret.getBulk(SECRET_STORE_NAME);
    console.log("Result for bulk: " + secret);
}

main();
```
{{% /tab %}}
{{< /tabpane >}}

## 相关链接

- 查看 [Dapr 密钥 API 功能]({{% ref secrets-overview %}})。
- 了解如何[使用密钥作用域]({{% ref secrets-scope %}})。
- 阅读[密钥 API 参考]({{% ref secrets_api %}})并查看[支持的密钥]({{% ref supported-secret-stores %}})。
- 了解如何[设置不同的密钥存储组件]({{% ref setup-secret-store %}})以及如何在[组件中引用密钥]({{% ref component-secrets %}})。

</parameter>
</invoke>
</minimax:tool_call>
