---
type: docs
title: "Cloudflare Queues bindings spec"
linkTitle: "Cloudflare Queues"
description: "Cloudflare Queues component 的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/cloudflare-queues/"
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/cfqueues/"
---

## Component 格式

用于 Dapr 的此 output binding 允许与 [Cloudflare Queues](https://developers.cloudflare.com/queues/) 交互以**发布**新消息。目前无法使用 Dapr 从队列消费消息。

要设置 Cloudflare Queues binding，请创建类型为 `bindings.cloudflare.queues` 的 component。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用 binding 配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.cloudflare.queues
  version: v1
  # 如果 Dapr 正在为您管理 Worker，请增加 initTimeout
  initTimeout: "120s"
  metadata:
    # 现有 Cloudflare Queue 的名称（必需）
    - name: queueName
      value: ""
    # Worker 的名称（必需）
    - name: workerName
      value: ""
    # PEM 编码的 Ed25519 私钥（必需）
    - name: key
      value: |
        -----BEGIN PRIVATE KEY-----
        MC4CAQ...
        -----END PRIVATE KEY-----
    # Cloudflare 账户 ID（让 Dapr 管理 Worker 所需）
    - name: cfAccountID
      value: ""
    # Cloudflare 的 API 令牌（让 Dapr 管理 Worker 所需）
    - name: cfAPIToken
      value: ""
    # Worker 的 URL（如果在 Dapr 之外预创建 Worker 则必需）
    - name: workerUrl
      value: ""
```

{{% alert title="警告" color="warning" %}}
上面的示例将 secrets 以纯字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})的描述，使用 secret store 来管理 secrets。
{{% /alert %}}

## 规范 metadata 字段

| 字段              | 必填 | Binding 支持 |  详细信息 | 示例 |
|--------------------|:--------:|-------|--------|---------|
| `queueName` | Y | Output | 现有 Cloudflare Queue 的名称 | `"mydaprqueue"`
| `key` | Y | Output | Ed25519 私钥，PEM 编码 | *见上方示例*
| `cfAccountID` | Y/N | Output | Cloudflare 账户 ID。让 Dapr 管理 Worker 时必需。 | `"456789abcdef8b5588f3d134f74ac"def`
| `cfAPIToken` | Y/N | Output | Cloudflare 的 API 令牌。让 Dapr 管理 Worker 时必需。 | `"secret-key"`
| `workerUrl` | Y/N | Output | Worker 的 URL。如果在 Dapr 之外预先配置 Worker 则必需。 | `"https://mydaprqueue.mydomain.workers.dev"`

> 当您配置 Dapr 为您创建 Worker 时，您可能需要为 component 的 `initTimeout` 属性设置更长的值，以便为部署 Worker 脚本预留足够的时间。例如：`initTimeout: "120s"`

## Binding 支持

此 component 支持具有以下操作的 **output binding**：

- `publish`（别名：`create`）：向队列发布消息。  
  传递给 binding 的数据将按原样用作发布到队列的消息正文。  
  此操作不接受任何 metadata 属性。

## 创建 Cloudflare Queue

要使用此 component，您必须在 Cloudflare 账户中创建一个 Cloudflare Queue。

您可以通过以下两种方式之一创建新队列：

<!-- IGNORE_LINKS -->
- 使用 [Cloudflare 控制面板](https://dash.cloudflare.com/)  
- 使用 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)：
  
  ```sh
  # 如需身份验证，请先执行 `npx wrangler login`
  npx wrangler queues create <NAME>
  # 例如：`npx wrangler queues create myqueue`
  ```
<!-- END_IGNORE -->

## 配置 Worker

由于 Cloudflare Queues 只能由在 Workers 上运行的脚本访问，Dapr 需要维护一个 Worker 来与队列通信。

Dapr 可以自动为您管理 Worker，或者您可以自行预先配置 Worker。在 [workerd](https://github.com/cloudflare/workerd) 上运行时，预先配置 Worker 是唯一支持的选项。

{{% alert title="重要" color="warning" %}}
为每个 Dapr component 使用单独的 Worker。不要为不同的 Cloudflare Queues binding 使用相同的 Worker 脚本，也不要为 Dapr 中不同的 Cloudflare component（例如，Workers KV state store 和 Queues binding）使用相同的 Worker 脚本。
{{% /alert %}}

{{< tabpane text=true >}}

{{% tab "让 Dapr 管理 Worker" %}}
<!-- 让 Dapr 管理 Worker -->

如果您想让 Dapr 为您管理 Worker，您需要提供这 3 个 metadata 选项：

<!-- IGNORE_LINKS -->
- **`workerName`**：Worker 脚本的名称。这将是您 Worker URL 的第一部分。例如，如果为您的 Cloudflare 账户配置的“workers.dev”域是 `mydomain.workers.dev`，并且您将 `workerName` 设置为 `mydaprqueue`，则 Dapr 部署的 Worker 将在 `https://mydaprqueue.mydomain.workers.dev` 上可用。
- **`cfAccountID`**：您的 Cloudflare 账户的 ID。登录到 [Cloudflare 控制面板](https://dash.cloudflare.com/)后，您可以在浏览器的 URL 栏中找到它，ID 即紧跟在 `dash.cloudflare.com` 之后的十六进制字符串。例如，如果 URL 是 `https://dash.cloudflare.com/456789abcdef8b5588f3d134f74acdef`，则 `cfAccountID` 的值是 `456789abcdef8b5588f3d134f74acdef`。
- **`cfAPIToken`**：具有创建和编辑 Workers 权限的 API 令牌。您可以在 Cloudflare 控制面板的 "My Profile" 部分中，通过 ["API Tokens" 页面](https://dash.cloudflare.com/profile/api-tokens)创建它：
   1. 点击 **"Create token"**。
   1. 选择 **"Edit Cloudflare Workers"** 模板。
   1. 按照屏幕上的说明生成新的 API 令牌。
<!-- END_IGNORE -->

当 Dapr 配置为替您管理 Worker 时，Dapr runtime 启动时会检查 Worker 是否存在且为最新版本。如果 Worker 不存在，或者使用的是过时的版本，Dapr 会自动为您创建或升级它。

{{% /tab %}}

{{% tab "手动配置 Worker 脚本" %}}
<!-- 手动配置 Worker 脚本 -->

如果您不想授予 Dapr 部署 Worker 脚本的权限，您可以手动配置一个 Worker 供 Dapr 使用。请注意，如果您有多个 Dapr component 通过 Worker 与 Cloudflare 服务交互，则需要为每个 component 创建一个单独的 Worker。

要手动配置 Worker 脚本，您需要在本地计算机上安装 Node.js。

1. 创建一个新文件夹用于放置 Worker 的源代码，例如：`daprworker`。
2. 如果您尚未完成此操作，请使用以下命令通过 Wrangler（Cloudflare Workers CLI）进行身份验证：`npx wrangler login`。
3. 在新建的文件夹中创建一个新的 `wrangler.toml` 文件，内容如下，并填写其中缺失的信息：  
  
  ```toml
  # Worker 的名称，例如 "mydaprqueue"
  name = ""

  # 请勿更改这些选项
  main = "worker.js"
  compatibility_date = "2022-12-09"
  usage_model = "bundled"

  [vars]
  # 将此项设置为 Ed25519 密钥的**公钥**部分，PEM 编码（换行符替换为 `\n`）。
  # 示例：
  # PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowB...=\n-----END PUBLIC KEY-----
  PUBLIC_KEY = ""
  # 将此项设置为您的 Worker 名称（与上面 "name" 属性的值相同），例如 "mydaprqueue"。
  TOKEN_AUDIENCE = ""

  # 将接下来的两个值设置为您的 Queue 名称，例如 "myqueue"。
  # 注意它们将被设置为相同的值。
  [[queues.producers]]
  queue = ""
  binding = ""
  ```
  
  > 注意：有关如何生成 Ed25519 密钥对，请参阅下一节。部署 Worker 时，请务必使用密钥的**公钥**部分！

4. 将 Worker 的（预编译和压缩的）代码复制到 `worker.js` 文件中。您可以使用以下命令完成此操作：  
  
  ```sh
  # 将此设置为您正在使用的 Dapr 版本
  DAPR_VERSION="release-{{% dapr-latest-version short="true" %}}"
  curl -LfO "https://raw.githubusercontent.com/dapr/components-contrib/${DAPR_VERSION}/internal/component/cloudflare/workers/code/worker.js"
  ```

5. 使用 Wrangler 部署 Worker：
  
  ```sh
  npx wrangler publish
  ```

部署 Worker 后，您需要使用这两个 metadata 选项来初始化 component：

- **`workerName`**：Worker 脚本的名称。这是您在 `wrangler.toml` 文件的 `name` 属性中设置的值。
- **`workerUrl`**：已部署 Worker 的 URL。`npx wrangler command` 命令会向您显示完整的 URL，例如 `https://mydaprqueue.mydomain.workers.dev`。

{{% /tab %}}

{{< /tabpane >}}

## 生成 Ed25519 密钥对

所有 Cloudflare Workers 都在公共 Internet 上监听，因此 Dapr 需要使用额外的身份验证和数据保护措施，以确保没有其他人员或应用程序可以与您的 Worker 通信（进而与您的 Cloudflare Queue 通信）。这些措施包括业界标准的做法，例如：

- Dapr 向 Worker 发出的所有请求都通过 Bearer 令牌（技术上是 JWT）进行身份验证，该令牌使用 Ed25519 密钥签名。
- Dapr 与您的 Worker 之间的所有通信都通过加密连接进行，使用 TLS (HTTPS)。
- Bearer 令牌在每次请求时生成，且仅在很短的时间内有效（目前为一分钟）。

要让 Dapr 颁发 Bearer 令牌，并让您的 Worker 验证这些令牌，您需要生成一个新的 Ed25519 密钥对。以下是使用 OpenSSL 或 step CLI 生成密钥对的示例。

{{< tabpane text=true >}}

{{% tab "使用 OpenSSL 生成" %}}
<!-- 使用 OpenSSL 生成 -->

> 自 OpenSSL 1.1.0 起支持生成 Ed25519 密钥，因此如果您使用的是更早的版本，以下命令将无法工作。

> Mac 用户注意：在 macOS 上，Apple 自带的 "openssl" 二进制文件实际上基于 LibreSSL，截至撰写本文时它不支持 Ed25519 密钥。如果您使用的是 macOS，请使用 step CLI，或使用 `brew install openssl@3` 从 Homebrew 安装 OpenSSL 3.0，然后将以下命令中的 `openssl` 替换为 `$(brew --prefix)/opt/openssl@3/bin/openssl`。

您可以使用 OpenSSL 生成新的 Ed25519 密钥对：

```sh
openssl genpkey -algorithm ed25519 -out private.pem
openssl pkey -in private.pem -pubout -out public.pem
```

> 在 macOS 上，使用来自 Homebrew 的 openssl@3：
> 
> ```sh
> $(brew --prefix)/opt/openssl@3/bin/openssl genpkey -algorithm ed25519 -out private.pem
> $(brew --prefix)/opt/openssl@3/bin/openssl pkey -in private.pem -pubout -out public.pem
> ```

{{% /tab %}}

{{% tab "使用 step CLI 生成" %}}
<!-- 使用 step CLI 生成 -->

如果您还没有 step CLI，请按照[官方说明](https://smallstep.com/docs/step-cli/installation)进行安装。

接下来，您可以使用 step CLI 生成新的 Ed25519 密钥对：

```sh
step crypto keypair \
  public.pem private.pem \
  --kty OKP --curve Ed25519 \
  --insecure --no-password
```

{{% /tab %}}

{{< /tabpane >}}

无论您使用哪种方式生成密钥对，按照上述说明，您都会得到两个文件：

- `private.pem` 包含密钥的私钥部分；将此文件的内容用于 component metadata 的 **`key`** 属性。
- `public.pem` 包含密钥的公钥部分，仅当您手动部署 Worker 时才需要（参见上一节中的说明）。

{{% alert title="警告" color="warning" %}}
请妥善保护密钥的私钥部分，并将其视为 secret 值！
{{% /alert %}}

## 相关链接

- [Dapr component 的基本架构]({{% ref component-schema %}})
- [Bindings building block]({{% ref bindings %}})
- [操作指南：使用 binding 与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
- [Cloudflare Queues 文档](https://developers.cloudflare.com/queues/)
