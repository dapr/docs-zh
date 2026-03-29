---
type: docs
title: "Cloudflare Workers KV"
linkTitle: "Cloudflare Workers KV"
description: Cloudflare Workers KV 状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-cloudflare-workerskv/"
---

## 创建 Dapr 组件

要设置 [Cloudflare Workers KV](https://developers.cloudflare.com/workers/learning/how-kv-works/) 状态存储，请创建一个类型为 `state.cloudflare.workerskv` 的组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.cloudflare.workerskv
  version: v1
  # 如果 Dapr 为您管理 Worker，请增加 initTimeout
  initTimeout: "120s"
  metadata:
    # Workers KV 命名空间的 ID（必需）
    - name: kvNamespaceID
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
    # Cloudflare 账户 ID（让 Dapr 管理 Worker 时必需）
    - name: cfAccountID
      value: ""
    # Cloudflare 的 API 令牌（让 Dapr 管理 Worker 时必需）
    - name: cfAPIToken
      value: ""
    # Worker 的 URL（如果在 Dapr 外部预先创建了 Worker 则必需）
    - name: workerUrl
      value: ""
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议按照[此处]({{% ref component-secrets.md %}})的说明使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `kvNamespaceID` | Y | 预先创建的 Workers KV 命名空间的 ID | `"123456789abcdef8b5588f3d134f74ac"`
| `workerName` | Y | 要连接的 Worker 的名称 | `"mydaprkv"`
| `key` | Y | Ed25519 私钥，PEM 编码 | *参见上文示例*
| `cfAccountID` | Y/N | Cloudflare 账户 ID。让 Dapr 管理 Worker 时必需。 | `"456789abcdef8b5588f3d134f74ac"def`
| `cfAPIToken` | Y/N | Cloudflare 的 API 令牌。让 Dapr 管理 Worker 时必需。 | `"secret-key"`
| `workerUrl` | Y/N | Worker 的 URL。如果在 Dapr 外部预先预配了 Worker 则必需。 | `"https://mydaprkv.mydomain.workers.dev"`

> 当您配置 Dapr 为您创建 Worker 时，可能需要为组件的 `initTimeout` 属性设置更长的值，以留出足够的时间来部署 Worker 脚本。例如：`initTimeout: "120s"`

## 创建 Workers KV 命名空间

要使用此组件，您必须在您的 Cloudflare 账户中创建一个 Workers KV 命名空间。

您可以通过以下两种方式之一创建新的 Workers KV 命名空间：

<!-- IGNORE_LINKS -->
- 使用 [Cloudflare 控制面板](https://dash.cloudflare.com/)  
  记下您在控制面板中可以看到的 Workers KV 命名空间的 "ID"。这是一个十六进制字符串（例如 `123456789abcdef8b5588f3d134f74ac`）——不是您创建时使用的名称！
- 使用 [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)：
  
  ```sh
  # 如需身份验证，首先运行 `npx wrangler login`
  wrangler kv:namespace create <NAME>
  ```

  输出包含命名空间的 ID，例如：

  ```text
  { binding = "<NAME>", id = "123456789abcdef8b5588f3d134f74ac" }
  ```
<!-- END_IGNORE -->

## 配置 Worker

由于 Cloudflare Workers KV 命名空间只能由在 Workers 上运行的脚本访问，Dapr 需要维护一个 Worker 来与 Workers KV 存储进行通信。

Dapr 可以自动为您管理 Worker，或者您可以自己预先预配一个 Worker。在 [workerd](https://github.com/cloudflare/workerd) 上运行时，预先预配 Worker 是唯一支持的选项。

{{% alert title="重要" color="warning" %}} 
为每个 Dapr 组件使用单独的 Worker。不要为不同的 Cloudflare Workers KV 状态存储组件使用同一个 Worker 脚本，也不要为 Dapr 中不同的 Cloudflare 组件使用同一个 Worker 脚本（例如，Workers KV 状态存储和 Queues 绑定）。
{{% /alert %}}

{{< tabpane text=true >}}

{{% tab "让 Dapr 管理 Worker" %}}
<!-- Let Dapr manage the Worker -->

如果您想让 Dapr 为您管理 Worker，您需要提供以下 3 个元数据选项：

<!-- IGNORE_LINKS -->
- **`workerName`**：Worker 脚本的名称。这将是您的 Worker URL 的第一部分。例如，如果为您的 Cloudflare 账户配置的 "workers.dev" 域是 `mydomain.workers.dev`，并且您将 `workerName` 设置为 `mydaprkv`，Dapr 部署的 Worker 将在 `https://mydaprkv.mydomain.workers.dev` 访问。
- **`cfAccountID`**：您的 Cloudflare 账户的 ID。登录 [Cloudflare 控制面板](https://dash.cloudflare.com/)后，您可以在浏览器地址栏中找到它，ID 是 `dash.cloudflare.com` 右侧的十六进制字符串。例如，如果 URL 是 `https://dash.cloudflare.com/456789abcdef8b5588f3d134f74acdef`，则 `cfAccountID` 的值是 `456789abcdef8b5588f3d134f74acdef`。
- **`cfAPIToken`**：具有创建和编辑 Workers 及 Workers KV 命名空间权限的 API 令牌。您可以在 Cloudflare 控制面板的 "My Profile" 部分的 ["API Tokens" 页面](https://dash.cloudflare.com/profile/api-tokens)中创建它：
   1. 点击 **"Create token"**。
   1. 选择 **"Edit Cloudflare Workers"** 模板。
   1. 按照屏幕上的说明生成新的 API 令牌。
<!-- END_IGNORE -->

当 Dapr 配置为为您管理 Worker 时，当 Dapr 运行时启动时，它会检查 Worker 是否存在且是最新的。如果 Worker 不存在，或者使用的是过时的版本，Dapr 将自动为您创建或升级它。

{{% /tab %}}

{{% tab "手动预配 Worker 脚本" %}}
<!-- Manually provision the Worker script -->

如果您不想授予 Dapr 为您部署 Worker 脚本的权限，可以手动预配一个 Worker 供 Dapr 使用。请注意，如果您有多个 Dapr 组件通过 Worker 与 Cloudflare 服务交互，您需要为每个组件创建一个单独的 Worker。

要手动预配 Worker 脚本，您需要在本地机器上安装 Node.js。

1. 创建一个新文件夹来放置 Worker 的源代码，例如：`daprworker`。
2. 如果尚未完成，请使用以下命令通过 Wrangler（Cloudflare Workers CLI）进行身份验证：`npx wrangler login`。
3. 在新创建的文件夹中，创建一个新的 `wrangler.toml` 文件，内容如下，并根据需要填写缺失的信息：  
  
  ```toml
  # 您的 Worker 的名称，例如 "mydaprkv"
  name = ""

  # 不要更改这些选项
  main = "worker.js"
  compatibility_date = "2022-12-09"
  usage_model = "bundled"

  [vars]
  # 将此设置为 Ed25519 密钥的**公钥**部分，PEM 编码（换行符替换为 `\n`）。
  # 示例：
  # PUBLIC_KEY = "-----BEGIN PUBLIC KEY-----\nMCowB...=\n-----END PUBLIC KEY-----
  PUBLIC_KEY = ""
  # 将此设置为您的 Worker 的名称（与上方的 "name" 属性值相同），例如 "mydaprkv"。
  TOKEN_AUDIENCE = ""

  [[kv_namespaces]]
  # 将以下两个值设置为您的 KV 命名空间的 ID（而不是名称），例如 "123456789abcdef8b5588f3d134f74ac"。
  # 请注意，它们将被设置为相同的值。
  binding = ""
  id = ""
  ```
  
  > 注意：有关如何生成 Ed25519 密钥对，请参阅下一节。确保在部署 Worker 时使用密钥的**公钥**部分！

4. 将 Worker 的（预编译和压缩的）代码复制到 `worker.js` 文件中。您可以使用以下命令执行此操作：  
  
  ```sh
  # 将此设置为您正在使用的 Dapr 版本
  DAPR_VERSION="release-{{% dapr-latest-version short="true" %}}"
  curl -LfO "https://raw.githubusercontent.com/dapr/components-contrib/${DAPR_VERSION}/internal/component/cloudflare/workers/code/worker.js"
  ```

5. 使用 Wrangler 部署 Worker：
  
  ```sh
  npx wrangler publish
  ```

Worker 部署完成后，您需要使用以下两个元数据选项来初始化组件：

- **`workerName`**：Worker 脚本的名称。这是您在 `wrangler.toml` 文件的 `name` 属性中设置的值。
- **`workerUrl`**：已部署的 Worker 的 URL。`npx wrangler command` 将显示完整的 URL，例如 `https://mydaprkv.mydomain.workers.dev`。

{{% /tab %}}

{{< /tabpane >}}

## 生成 Ed25519 密钥对

所有 Cloudflare Workers 都监听公共 Internet，因此 Dapr 需要使用额外的身份验证和数据保护措施来确保没有其他人员或应用程序可以与您的 Worker 通信（进而与您的 Worker KV 命名空间通信）。这些措施包括行业标准措施，例如：

- Dapr 向 Worker 发出的所有请求都通过不记名令牌（技术上是 JWT）进行身份验证，该令牌使用 Ed25519 密钥签名。
- Dapr 与您的 Worker 之间的所有通信都通过加密连接进行，使用 TLS (HTTPS)。
- 不记名令牌在每个请求上生成，仅在很短的时间内有效（目前为一分钟）。

要让 Dapr 颁发不记名令牌并让您的 Worker 验证它们，您需要生成一个新的 Ed25519 密钥对。以下是使用 OpenSSL 或 step CLI 生成密钥对的示例。

{{< tabpane text=true >}}

{{% tab "使用 OpenSSL 生成" %}}
<!-- Generate with OpenSSL -->

> 自 OpenSSL 1.1.0 起支持生成 Ed25519 密钥，因此如果您使用的是旧版本的 OpenSSL，以下命令将不起作用。

> Mac 用户注意：在 macOS 上，Apple 附带的 "openssl" 二进制文件实际上基于 LibreSSL，截至撰写本文时，它不支持 Ed25519 密钥。如果您使用的是 macOS，请使用 step CLI，或使用 `brew install openssl@3` 从 Homebrew 安装 OpenSSL 3.0，然后将以下命令中的 `openssl` 替换为 `$(brew --prefix)/opt/openssl@3/bin/openssl`。

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
<!-- Generate with the step CLI -->

如果您还没有 step CLI，请按照[官方说明](https://smallstep.com/docs/step-cli/installation)安装它。

接下来，您可以使用 step CLI 生成新的 Ed25519 密钥对：

```sh
step crypto keypair \
  public.pem private.pem \
  --kty OKP --curve Ed25519 \
  --insecure --no-password
```

{{% /tab %}}

{{< /tabpane >}}

无论您如何生成密钥对，按照上述说明，您将拥有两个文件：

- `private.pem` 包含密钥的私钥部分；使用此文件的内容作为组件元数据的 **`key`** 属性。
- `public.pem` 包含密钥的公钥部分，仅当您手动部署 Worker 时才需要（按照上一节的说明）。

{{% alert title="警告" color="warning" %}}
保护您密钥的私钥部分，并将其视为机密值！
{{% /alert %}}

## 其他注意事项

- 请注意，Cloudflare Workers KV 不保证强数据一致性。虽然对同一 Cloudflare 数据中心发出的请求的更改通常是立即可见的，但更改复制到所有 Cloudflare 区域可能需要一定的时间（通常长达一分钟）。
- 此状态存储支持 Dapr 的 TTL，但 TTL 的最小值为 1 分钟。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读此指南，了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
- [Cloudflare Workers KV](https://developers.cloudflare.com/workers/learning/how-kv-works/) 的文档
