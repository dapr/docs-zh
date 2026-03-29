---
type: docs
title: "JetStream KV"
linkTitle: "JetStream KV"
description: 关于 JetStream KV 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-nats-jetstream-kv/"
---

## 组件格式

要设置 JetStream KV 状态存储，需创建一个类型为 `state.jetstream` 的组件。请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})了解如何创建和应用状态存储配置。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.jetstream
  version: v1
  metadata:
  - name: natsURL
    value: "nats://localhost:4222"
  - name: jwt
    value: "eyJhbGciOiJ...6yJV_adQssw5c" # 可选。用于去中心化 JWT 认证
  - name: seedKey
    value: "SUACS34K232O...5Z3POU7BNIL4Y" # 可选。用于去中心化 JWT 认证
  - name: bucket
    value: "<bucketName>"
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥以纯字符串形式使用。建议按照[此处]({{% ref component-secrets.md %}})的描述使用密钥存储来管理密钥。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必需   | 详情                     | 示例                                  |
|--------------------|:--------:|-------------------------|---------------------------------------|
| natsURL            |        Y | NATS 服务器地址 URL      | "`nats://localhost:4222`"             |
| jwt                |        N | NATS 去中心化认证 JWT    | "`eyJhbGciOiJ...6yJV_adQssw5c`"       |
| seedKey            |        N | NATS 去中心化认证种子密钥 | "`SUACS34K232O...5Z3POU7BNIL4Y`"      |
| bucket             |        Y | JetStream KV 存储桶名称  | `"<bucketName>"`                      |

## 创建 NATS 服务器

{{< tabpane text=true >}}

{{% tab "自托管" %}}
你可以使用 Docker 在本地运行启用了 JetStream 的 NATS 服务器：

```bash
docker run -d -p 4222:4222 nats:latest -js
```

然后可以使用客户端端口与服务器交互：`localhost:4222`。
{{% /tab %}}

{{% tab "Kubernetes" %}}
使用 [helm](https://github.com/nats-io/k8s/tree/main/helm/charts/nats#jetstream) 在 Kubernetes 上安装 NATS JetStream：

```bash
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm install my-nats nats/nats
```

这会在 `default` 命名空间中安装一个单节点 NATS 服务器。要与 NATS 交互，可以使用以下命令查找服务：`kubectl get svc my-nats`。
{{% /tab %}}

{{< /tabpane >}}

## 创建 JetStream KV 存储桶

需要创建一个键值存储桶，这可以通过 NATS CLI 轻松完成。

```bash
nats kv add <bucketName>
```

## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读此[指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})了解配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
- [JetStream 文档](https://docs.nats.io/nats-concepts/jetstream)
- [键值存储文档](https://docs.nats.io/nats-concepts/jetstream/key-value-store)
- [NATS CLI](https://github.com/nats-io/natscli)
