---
type: docs
title: "KubeMQ 绑定规范"
linkTitle: "KubeMQ"
description: "KubeMQ 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/kubemq/"
---

## 组件格式

要设置 KubeMQ 绑定，请创建类型为 `bindings.kubemq` 的组件。请参阅[本指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: binding-topic
spec:
  type: bindings.kubemq
  version: v1
  metadata:
    - name: address
      value: "localhost:50000"
    - name: channel
      value: "queue1"
    - name: direction
      value: "input, output"
```

## 规范元数据字段

| 字段                | 必填   | 详情                                                                                                                         | 示例                                    |
|--------------------|:--------:|------------------------------------------------------------------------------------------------------------------------------|----------------------------------------|
| `address`            |    Y     | KubeMQ 服务器的地址                                                                                                           | `"localhost:50000"`                    |
| `channel`            |    Y     | 队列通道名称                                                                                                                   | `"queue1"`                               |
| `authToken`          |    N     | 用于连接的身份验证 JWT 令牌。查看 [KubeMQ Authentication](https://docs.kubemq.io/learn/access-control/authentication) | `"ew..."`                                |
| `autoAcknowledged`   |    N     | 设置接收到的队列消息是否自动确认                                                                                               | `"true"` 或 `"false"`（默认为 `"false"`） |
| `pollMaxItems`       |    N     | 设置每次连接时轮询的消息数量                                                                                                   | `"1"`                                    |
| `pollTimeoutSeconds` |    N     | 设置每次轮询间隔的时间（秒）                                                                                                   | `"3600"`                                 |
| `direction` |    N     | 绑定的方向                                                                                               | `"input"`、`"output"`、`"input, output"`                                 |

## 绑定支持

此组件同时支持 **输入和输出** 绑定接口。


## 创建 KubeMQ broker

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
1. [获取 KubeMQ Key](https://docs.kubemq.io/getting-started/quick-start#obtain-kubemq-license-key)。
2. 等待包含您的密钥的邮件确认

您可以使用 Docker 运行 KubeMQ broker：

```bash
docker run -d -p 8080:8080 -p 50000:50000 -p 9090:9090 -e KUBEMQ_TOKEN=<your-key> kubemq/kubemq
```
然后您可以使用客户端端口与服务器交互：`localhost:50000`

{{% /tab %}}

{{% tab "Kubernetes" %}}
1. [获取 KubeMQ Key](https://docs.kubemq.io/getting-started/quick-start#obtain-kubemq-license-key)。
2. 等待包含您的密钥的邮件确认

然后运行以下 kubectl 命令：

```bash
kubectl apply -f https://deploy.kubemq.io/init
```

```bash
kubectl apply -f https://deploy.kubemq.io/key/<your-key>
```
{{% /tab %}}

{{< /tabpane >}}

## 安装 KubeMQ CLI
访问 [KubeMQ CLI](https://github.com/kubemq-io/kubemqctl/releases) 并下载最新版本的 CLI。

## 浏览 KubeMQ Dashboard

{{< tabpane text=true >}}

{{% tab "Self-Hosted" %}}
<!-- IGNORE_LINKS -->
打开浏览器并导航到 [http://localhost:8080](http://localhost:8080)
<!-- END_IGNORE -->
{{% /tab %}}

{{% tab "Kubernetes" %}}
安装了 KubeMQCTL 后，运行以下命令：

```bash
kubemqctl get dashboard
```
或者，安装了 kubectl 后，运行 port-forward 命令：

```bash
kubectl port-forward svc/kubemq-cluster-api -n kubemq 8080:8080
```
{{% /tab %}}

{{< /tabpane >}}

## KubeMQ 文档
访问 [KubeMQ Documentation](https://docs.kubemq.io/) 获取更多信息。

## 相关链接

- [Dapr 组件的基本 schema]({{% ref component-schema %}})
- [Bindings 构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [Bindings API 参考]({{% ref bindings_api.md %}})
