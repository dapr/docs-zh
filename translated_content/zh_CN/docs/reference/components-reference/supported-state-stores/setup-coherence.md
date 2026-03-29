---
type: docs
title: "Coherence"
linkTitle: "Coherence"
description: 关于 Coherence 状态存储组件的详细信息
aliases:
  - "/operations/components/setup-state-store/supported-state-stores/setup-coherence/"
---

## 组件格式

要设置 Coherence 状态存储，请创建一个类型为 `state.coherence` 的组件。有关如何创建和应用状态存储配置，请参阅[此指南]({{< ref "howto-get-save-state.md#step-1-setup-a-state-store" >}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.coherence
  version: v1
  metadata:
  - name: serverAddress
    value: <REPLACE-WITH-GRPC-PROXY-HOST-AND-PORT> # 必填。示例："my-cluster-grpc:1408"
  - name: tlsEnabled
    value: <REPLACE-WITH-BOOLEAN> # 可选
  - name: tlsClientCertPath
    value: <REPLACE-WITH-PATH> # 可选
  - name: tlsClientKey
    value: <REPLACE-WITH-PATH> # 可选
  - name: tlsCertsPath
    value: <REPLACE-WITH-PATH> # 可选
  - name: ignoreInvalidCerts
    value: <REPLACE-WITH-BOOLEAN> # 可选
  - name: scopeName
    value: <REPLACE-WITH-SCOPE> # 可选
  - name: requestTimeout
    value: <REPLACE-WITH-REQUEST-TIMEOUT> # 可选
  - name: nearCacheTTL
    value: <REPLACE-WITH-NEAR-CACHE-TTL> # 可选
  - name: nearCacheUnits
    value: <REPLACE-WITH-NEAR-CACHE-UNITS> # 可选
  - name: nearCacheMemory
    value: <REPLACE-WITH-NEAR-CACHE-MEMORY> # 可选
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体说明请参阅[此处]({{< ref component-secrets.md >}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情                                                                                                                                     | 示例                                           |
|--------------------|:--------:|---------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------|
| serverAddress      |    是     | 逗号分隔的端点                                                                                                                   | `"my-cluster-grpc:1408"`                      |
| tlsEnabled         |    否     | 指示是否应启用 TLS。默认为 false                                                                                       | `"true"`                                      |
| tlsClientCertPath  |    否     | Coherence 的客户端证书路径。默认为 ""。可以是 `secretKeyRef` 以使用[密钥引用]({{< ref component-secrets.md >}})。 | `"-----BEGIN CERTIFICATE-----\nMIIC9TCCA..."` |
| tlsClientKey       |    否     | Coherence 的客户端密钥。默认为 ""。可以是 `secretKeyRef` 以使用[密钥引用]({{< ref component-secrets.md >}})。              | `"-----BEGIN CERTIFICATE-----\nMIIC9TCCA..."` |
| tlsCertsPath       |    否     | Coherence 的附加证书。默认为 ""。可以是 `secretKeyRef` 以使用[密钥引用]({{< ref component-secrets.md >}})。 | `"-----BEGIN CERTIFICATE-----\nMIIC9TCCA..."` |
| ignoreInvalidCerts |    否     | 指示是否忽略自签名证书，仅用于测试，不应用于生产环境。默认为 false                           | `"false"`                                     |
| scopeName          |    否     | 用于内部缓存的作用域名称。默认为 ""                                                                                  | `"my-scope"`                                  |
| requestTimeout     |    否     | 调用集群的超时时间，默认为 "30s"                                                                                         | `"15s"`                                       |
| nearCacheTTL       |    否     | 如果非零，则使用近缓存，近缓存 的 TTL 为此值。默认为 0s                                                | `"60s"`                                       |
| nearCacheUnits     |    否     | 如果非零，则使用近缓存，近缓存的最大大小为此值（以单位计）。默认为 0                               | `"1000"`                                      |
| nearCacheMemory    |    否     | 如果非零，则使用近缓存，近缓存的最大大小为此值（以字节计）。默认为 0                               | `"4096"`                                      |

### 关于使用近缓存 TTL

Coherence 状态存储允许您指定近缓存来在使用 Dapr 客户端时缓存频繁访问的数据。
当您使用 `Get(ctx context.Context, req *GetRequest)` 访问数据时，返回的条目会存储在近缓存中，
并且对近缓存中键的后续数据访问几乎是即时的，而没有近缓存的每次 `Get()` 操作都会导致网络调用。

使用近缓存选项时，Coherence 会自动向内部缓存添加一个 MapListener，该监听器监听所有缓存事件，并更新或使近缓存中已在服务器上更改或删除的条目失效。

为了管理近缓存使用的内存量，在创建近缓存时支持以下选项：

- nearCacheTTL – 对象在近缓存中过期的时间，例如 5 分钟
- nearCacheUnits – 近缓存中缓存条目的最大数量
- nearCacheMemory – 缓存条目使用的最大内存量

您可以指定 High-Units 或 Memory，并在任一情况下可选择指定 TTL。

近缓存条目的最小过期时间为 1/4 秒。这是为了确保元素过期尽可能高效。如果您尝试将 TTL 设置为更低的值，将会收到错误。

## 设置 Coherence

{{< tabpane text=true >}}

{{% tab header="自托管" %}}
使用 Docker 在本地运行 Coherence：

```
docker run -d -p 1408:1408 -p 30000:30000 ghcr.io/oracle/coherence-ce:25.03.1
```

然后您可以使用 `localhost:1408` 与服务器交互。
{{% /tab %}}

{{% tab header="Kubernetes" %}}
在 Kubernetes 上安装 Coherence 的最简单方法是使用 [Coherence Operator](https://docs.coherence.community/coherence-operator/docs/latest/docs/about/03_quickstart)：

**安装 Operator：**

```
kubectl apply -f https://github.com/oracle/coherence-operator/releases/download/v3.5.2/coherence-operator.yaml
```

> 注意：将 v3.5.2 更改为最新版本。

这将把 Coherence operator 安装到 `coherence` 命名空间中。

**创建 Coherence 集群 yaml my-cluster.yaml**

```yaml
apiVersion: coherence.oracle.com/v1
kind: Coherence
metadata:
  name: my-cluster
spec:
  coherence:
    management:
      enabled: true
  ports:
    - name: management
    - name: grpc
      port: 1408
```

**应用 yaml**

```bash
kubectl apply -f my-cluster.yaml
```

要与 Coherence 交互，使用以下命令查找服务：`kubectl get svc` 并查找名为 '*grpc' 的服务。

```bash
NAME                    TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)                                               AGE
kubernetes              ClusterIP   10.96.0.1      <none>        443/TCP                                               9m
my-cluster-grpc         ClusterIP   10.96.225.43   <none>        1408/TCP                                              7m3s
my-cluster-management   ClusterIP   10.96.41.6     <none>        30000/TCP                                             7m3s
my-cluster-sts          ClusterIP   None           <none>        7/TCP,7575/TCP,7574/TCP,6676/TCP,30000/TCP,1408/TCP   7m3s
my-cluster-wka          ClusterIP   None           <none>        7/TCP,7575/TCP,7574/TCP,6676/TCP                      7m3s
```

例如，如果使用上述示例安装，Coherence 主机地址将是：

`my-cluster-grpc`
{{% /tab %}}

{{< /tabpane >}}

## 相关链接
- [Dapr 组件的基本架构]({{< ref component-schema >}})
- 阅读有关配置状态存储组件的说明，请参阅[此指南]({{< ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" >}})
- [状态管理构建块]({{< ref state-management >}})
- [GitHub 上的 Coherence CE](https://github.com/oracle/coherence)
- [Coherence 社区 - 关于 Coherence 的一切](https://coherence.community/)
