---
type: docs
title: "阿里云对象存储服务绑定规范"
linkTitle: "阿里云对象存储"
description: "阿里云对象存储绑定组件的详细文档"
aliases:
  - "/operations/components/setup-bindings/supported-bindings/alicloudoss/"
---

## 组件格式

要设置阿里云对象存储绑定，需创建一个类型为 `bindings.alicloud.oss` 的组件。有关如何创建和应用 secretstore 配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。有关如何检索和使用 Dapr 组件的密钥，请参阅[引用密钥]({{% ref component-secrets.md %}})指南。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: alicloudobjectstorage
spec:
  type: bindings.alicloud.oss
  version: v1
  metadata:
  - name: endpoint
    value: "[endpoint]"
  - name: accessKeyID
    value: "[key-id]"
  - name: accessKey
    value: "[access-key]"
  - name: bucket
    value: "[bucket]"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体说明请参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段         | 必填   | 绑定支持  | 详情 | 示例 |
|---------------|----------|---------|---------|---------|
| `endpoint`    | Y | Output | 阿里云 OSS 端点。 | https://oss-cn-hangzhou.aliyuncs.com
| `accessKeyID` | Y | Output | 访问密钥 ID 凭据。 |
| `accessKey`   | Y | Output | 访问密钥凭据。 |
| `bucket`      | Y | Output | 存储桶的名称。 |

## 绑定支持

此组件支持**输出绑定**，支持以下操作：

- `create`：[创建对象](#create-object)

### Create object

要执行创建对象操作，请使用 `POST` 方法调用绑定，并传入以下 JSON 请求体：

```json
{
  "operation": "create",
  "data": "YOUR_CONTENT"
}
```

{{% alert title="注意" color="primary" %}}
默认情况下，会自动生成一个随机 UUID 作为对象键。有关如何为对象设置键，请参阅下面的元数据支持说明。
{{% /alert %}}

#### 示例

**保存到随机生成的 UUID 文件**

{{< tabpane text=true >}}

{{% tab "Windows" %}}

```bash
curl -d "{ \"operation\": \"create\", \"data\": \"Hello World\" }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
```

{{% /tab %}}

{{% tab "Linux/MacOS" %}}

```bash
curl -d '{ "operation": "create", "data": "Hello World" }' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
```

{{% /tab %}}

{{< /tabpane >}}

<br />

**保存到指定文件**
{{< tabpane text=true >}}

{{% tab "Windows" %}}

```bash
curl -d "{ \"operation\": \"create\", \"data\": \"Hello World\", \"metadata\": { \"key\": \"my-key\" } }" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
```

{{% /tab %}}

{{% tab "Linux/MacOS" %}}

```bash
curl -d '{ "operation": "create", "data": "Hello World", "metadata": { "key": "my-key" } }' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
```

{{% /tab %}}

{{< /tabpane >}}

{{% alert title="注意" color="primary" %}}
在 Windows CMD 中需要对 `"` 字符进行转义。
{{% /alert %}}

## 元数据信息

### 对象键

默认情况下，阿里云 OSS 输出绑定会自动生成一个 UUID 作为对象键。
您可以使用以下元数据设置键：

```json
{
    "data": "file content",
    "metadata": {
        "key": "my-key"
    },
    "operation": "create"
}
```

## 相关链接

- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
