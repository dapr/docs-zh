---
type: docs
title: "Quickstart：加密"
linkTitle: 加密
weight: 79
description: Dapr Cryptography building block 入门
---

{{% alert title="Alpha" color="warning" %}}
cryptography building block 目前处于 **alpha** 阶段。
{{% /alert %}}

让我们来看看 Dapr [cryptography building block]({{% ref cryptography %}})。在本 Quickstart 中，你将创建一个应用程序，使用 Dapr 加密 API 加密和解密数据。你将：

- 使用 RSA 密钥加密然后解密一个短字符串，并在 Go 字节切片中以内存方式读取结果。
- 使用 AES 密钥加密然后解密一个大文件，使用流将加密和解密后的数据存储到文件中。

<img src="/images/crypto-quickstart.png" width=800 style="padding-bottom:15px;">

{{% alert title="注意" color="primary" %}}
此示例使用 Dapr SDK，它基于 gRPC。在使用加密 API 加密和解密消息时，**强烈推荐**使用它。
{{% /alert %}}

目前，你可以使用 Go SDK 体验加密 API。

{{< tabpane text=true >}}

 <!-- JavaScript -->
{{% tab "JavaScript" %}}

> 此 Quickstart 包含一个名为 `crypto-quickstart` 的 JavaScript 应用程序。

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [安装了最新的 Node.js](https://nodejs.org/download/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 系统上可用的 [OpenSSL](https://www.openssl.org/source/)

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/cryptography/javascript/sdk)

```bash
git clone https://github.com/dapr/quickstarts.git
```

在终端中，从根目录进入加密示例。

```bash
cd cryptography/javascript/sdk
```

进入包含源代码的文件夹：

```bash
cd ./crypto-quickstart
```

安装依赖项：

```bash
npm install
```

### 步骤 2：使用 Dapr 运行应用程序

应用程序代码定义了两个必需的密钥：

- 私有 RSA 密钥
- 一个 256 位对称（AES）密钥

使用 OpenSSL 生成两个密钥，即一个 RSA 密钥和一个 AES 密钥，并将它们写入两个文件：

```bash
mkdir -p keys
# 生成私有 RSA 密钥，4096 位密钥
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out keys/rsa-private-key.pem
# 为 AES 生成 256 位密钥
openssl rand -out keys/symmetric-key-256 32
```

使用 Dapr 运行 JavaScript 应用程序：

```bash
dapr run --app-id crypto-quickstart --resources-path ../../../components/ -- npm start
```

**预期输出**

```
== APP == 2023-10-25T14:30:50.435Z INFO [GRPCClient, GRPCClient] Opening connection to 127.0.0.1:58173
== APP == == Encrypting message using buffers
== APP == Encrypted the message, got 856 bytes
== APP == == Decrypting message using buffers
== APP == Decrypted the message, got 24 bytes
== APP == The secret is "passw0rd"
== APP == == Encrypting message using streams
== APP == Encrypting federico-di-dio-photography-Q4g0Q-eVVEg-unsplash.jpg to encrypted.out
== APP == Encrypted the message to encrypted.out
== APP == == Decrypting message using streams
== APP == Decrypting encrypted.out to decrypted.out.jpg
== APP == Decrypted the message to decrypted.out.jpg
```

### 发生了什么？

#### `local-storage.yaml`

早些时候，你在 `crypto-quickstarts` 中创建了一个名为 `keys` 的目录。在 [`local-storage` component YAML](https://github.com/dapr/quickstarts/blob/master/cryptography/components/local-storage.yaml) 中，`path` metadata 映射到新创建的 `keys` 目录。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localstorage
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
    - name: path
      # 路径相对于示例所在的文件夹
      value: ./keys
```

#### `index.mjs`

[应用程序文件](https://github.com/dapr/quickstarts/blob/master/cryptography/javascript/sdk/crypto-quickstart/index.mjs) 使用你生成的 RSA 和 AES 密钥加密和解密消息和文件。应用程序会创建一个新的 Dapr SDK 客户端：

```javascript
async function start() {
  const client = new DaprClient({
    daprHost,
    daprPort,
    communicationProtocol: CommunicationProtocolEnum.GRPC,
  });

  // 从缓冲区加密并解密消息
  await encryptDecryptBuffer(client);

  // 使用流加密并解密消息
  await encryptDecryptStream(client);
}
```

##### 使用 RSA 密钥加密和解密字符串

客户端创建后，应用程序会加密一条消息：

```javascript
async function encryptDecryptBuffer(client) {
  // 要加密的消息
  const plaintext = `The secret is "passw0rd"`

  // 首先，加密消息
  console.log("== Encrypting message using buffers");

  const encrypted = await client.crypto.encrypt(plaintext, {
    componentName: "localstorage",
    keyName: "rsa-private-key.pem",
    keyWrapAlgorithm: "RSA",
  });

  console.log("Encrypted the message, got", encrypted.length, "bytes");
```

然后，应用程序解密该消息：

```javascript
  // 解密消息
  console.log("== Decrypting message using buffers");
  const decrypted = await client.crypto.decrypt(encrypted, {
    componentName: "localstorage",
  });

  console.log("Decrypted the message, got", decrypted.length, "bytes");
  console.log(decrypted.toString("utf8"));

  // ...
}
``` 

##### 使用 AES 密钥加密和解密大文件

接下来，应用程序加密一个大图像文件：

```javascript
async function encryptDecryptStream(client) {
  // 首先，加密消息
  console.log("== Encrypting message using streams");
  console.log("Encrypting", testFileName, "to encrypted.out");

  await pipeline(
    createReadStream(testFileName),
    await client.crypto.encrypt({
      componentName: "localstorage",
      keyName: "symmetric-key-256",
      keyWrapAlgorithm: "A256KW",
    }),
    createWriteStream("encrypted.out"),
  );

  console.log("Encrypted the message to encrypted.out");
```

然后，应用程序解密这个大图像文件：

```javascript
  // 解密消息
  console.log("== Decrypting message using streams");
  console.log("Decrypting encrypted.out to decrypted.out.jpg");
  await pipeline(
    createReadStream("encrypted.out"),
    await client.crypto.decrypt({
      componentName: "localstorage",
    }),
    createWriteStream("decrypted.out.jpg"),
  );

  console.log("Decrypted the message to decrypted.out.jpg");
}
```

{{% /tab %}}

 <!-- Go -->
{{% tab "Go" %}}

> 此 Quickstart 包含一个名为 `crypto-quickstart` 的 Go 应用程序。

### 前置条件

对于此示例，你需要：

- [Dapr CLI 和已初始化的环境](https://docs.dapr.io/getting-started)。
- [最新版本的 Go](https://go.dev/dl/)。
<!-- IGNORE_LINKS -->
- [Docker Desktop](https://www.docker.com/products/docker-desktop)
<!-- END_IGNORE -->
- 系统上可用的 [OpenSSL](https://www.openssl.org/source/)

### 步骤 1：设置环境

克隆 [Quickstarts 仓库中提供的示例](https://github.com/dapr/quickstarts/tree/master/cryptography/go/sdk)

```bash
git clone https://github.com/dapr/quickstarts.git
```

在终端中，从根目录进入加密示例。

```bash
cd cryptography/go/sdk
```

### 步骤 2：使用 Dapr 运行应用程序

进入包含源代码的文件夹：

```bash
cd ./crypto-quickstart
```

应用程序代码定义了两个必需的密钥：

- 私有 RSA 密钥 
- 一个 256 位对称（AES）密钥

使用 OpenSSL 生成两个密钥，即一个 RSA 密钥和一个 AES 密钥，并将它们写入两个文件：

```bash
mkdir -p keys
# 生成私有 RSA 密钥，4096 位密钥
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:4096 -out keys/rsa-private-key.pem
# 为 AES 生成 256 位密钥
openssl rand -out keys/symmetric-key-256 32
```

使用 Dapr 运行 Go 服务应用程序：

```bash
dapr run --app-id crypto-quickstart --resources-path ../../../components/ -- go run .
```

**预期输出**

```
== APP == dapr client initializing for: 127.0.0.1:52407
== APP == Encrypted the message, got 856 bytes
== APP == Decrypted the message, got 24 bytes
== APP == The secret is "passw0rd"
== APP == Wrote decrypted data to encrypted.out
== APP == Wrote decrypted data to decrypted.out.jpg
```

### 发生了什么？

#### `local-storage.yaml`

早些时候，你在 `crypto-quickstarts` 中创建了一个名为 `keys` 的目录。在 [`local-storage` component YAML](https://github.com/dapr/quickstarts/blob/master/cryptography/components/local-storage.yaml) 中，`path` metadata 映射到新创建的 `keys` 目录。

```yml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: localstorage
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
    - name: path
      # 路径相对于示例所在的文件夹
      value: ./keys
```

#### `app.go`

[应用程序文件](https://github.com/dapr/quickstarts/blob/master/cryptography/go/sdk/crypto-quickstart/app.go) 使用你生成的 RSA 和 AES 密钥加密和解密消息和文件。应用程序会创建一个新的 Dapr SDK 客户端：

```go
func main() {
	// 创建新的 Dapr SDK 客户端
	client, err := dapr.NewClient()
    
    //...

	// 步骤 1：使用 RSA 密钥加密字符串，然后解密并在终端中显示输出
	encryptDecryptString(client)

	// 步骤 2：使用 AES 密钥加密大文件，然后解密
	encryptDecryptFile(client)
}
```

##### 使用 RSA 密钥加密和解密字符串

客户端创建后，应用程序会加密一条消息：

```go
func encryptDecryptString(client dapr.Client) {
    // ...

	// 加密消息
	encStream, err := client.Encrypt(context.Background(),
		strings.NewReader(message),
		dapr.EncryptOptions{
			ComponentName: CryptoComponentName,
			// 要使用的密钥名称
			// 由于这是 RSA 密钥，我们将其指定为密钥包装算法
			KeyName:          RSAKeyName,
			KeyWrapAlgorithm: "RSA",
		},
	)

    // ...

	// 该方法返回一个可读流，我们将其完整读入内存
	encBytes, err := io.ReadAll(encStream)
    // ...

	fmt.Printf("Encrypted the message, got %d bytes\n", len(encBytes))
```

然后，应用程序解密该消息：

```go
	// 现在，解密加密数据
	decStream, err := client.Decrypt(context.Background(),
		bytes.NewReader(encBytes),
		dapr.DecryptOptions{
			// 我们只需要传递组件名称
			ComponentName: CryptoComponentName,
			// 传递密钥名称是可选的
			KeyName: RSAKeyName,
		},
	)

    // ...

	// 该方法返回一个可读流，我们将其完整读入内存
	decBytes, err := io.ReadAll(decStream)

    // ...

	// 在控制台打印消息
	fmt.Printf("Decrypted the message, got %d bytes\n", len(decBytes))
	fmt.Println(string(decBytes))
}
``` 

##### 使用 AES 密钥加密和解密大文件

接下来，应用程序加密一个大图像文件：

```go
func encryptDecryptFile(client dapr.Client) {
	const fileName = "liuguangxi-66ouBTTs_x0-unsplash.jpg"

	// 获取输入文件的可读流
	plaintextF, err := os.Open(fileName)

    // ...

	defer plaintextF.Close()

	// 加密文件
	encStream, err := client.Encrypt(context.Background(),
		plaintextF,
		dapr.EncryptOptions{
			ComponentName: CryptoComponentName,
			// 要使用的密钥名称
			// 由于这是对称密钥，我们将 AES 指定为密钥包装算法
			KeyName:          SymmetricKeyName,
			KeyWrapAlgorithm: "AES",
		},
	)

    // ...

	// 将加密数据写入文件 "encrypted.out"
	encryptedF, err := os.Create("encrypted.out")

    // ...

	encryptedF.Close()

	fmt.Println("Wrote decrypted data to encrypted.out")
```

然后，应用程序解密这个大图像文件：

```go
	// 现在，解密加密数据
	// 首先，重新打开文件 "encrypted.out"，这次用于读取
	encryptedF, err = os.Open("encrypted.out")

    // ...

	defer encryptedF.Close()

	// 现在，解密加密数据
	decStream, err := client.Decrypt(context.Background(),
		encryptedF,
		dapr.DecryptOptions{
			// 我们只需要传递组件名称
			ComponentName: CryptoComponentName,
			// 传递密钥名称是可选的
			KeyName: SymmetricKeyName,
		},
	)

    // ...

	// 将解密数据写入文件 "decrypted.out.jpg"
	decryptedF, err := os.Create("decrypted.out.jpg")

    // ...

	decryptedF.Close()

	fmt.Println("Wrote decrypted data to decrypted.out.jpg")
}
```

{{% /tab %}}


{{< /tabpane >}}

## 观看演示

观看此 [Dapr Community Call #83 中的加密 API 演示视频](https://youtu.be/PRWYX4lb2Sg?t=1148)：

{{< youtube id=PRWYX4lb2Sg start=1148 >}}

## 告诉我们你的想法！

我们一直在努力改进 Quickstart 示例，并重视你的反馈。你觉得这个 Quickstart 有帮助吗？你对改进有什么建议？

加入我们的 [Discord 服务器](https://diagrid.ws/dapr-discord)，分享你的想法。

## 后续步骤

- 浏览[更多使用加密 API 加密和解密的示例]({{% ref howto-cryptography %}})
- 了解更多关于[作为 Dapr building block 的加密]({{% ref cryptography-overview %}})

{{< button text="探索 Dapr 教程  >>" page="getting-started/tutorials/_index.md" >}}
