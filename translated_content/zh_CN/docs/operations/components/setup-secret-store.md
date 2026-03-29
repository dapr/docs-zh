---
type: docs
title: "密钥存储组件"
linkTitle: "密钥存储"
description: "关于设置不同密钥存储组件的指导"
weight: 800
aliases:
  - "/zh-hans/operations/components/setup-state-store/secret-stores-overview/"
---

Dapr 与密钥存储集成，为应用程序和其他组件提供访问密钥（如访问密钥和密码）的安全存储和访问方式。每个密钥存储组件都有一个名称，在访问密钥时使用该名称。

与其他构建块组件一样，密钥存储组件是可扩展的，可以在 [components-contrib 仓库](https://github.com/dapr/components-contrib) 中找到。

Dapr 中的密钥存储使用 `Component` 文件描述，包含以下字段：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: secretstore
spec:
  type: secretstores.<NAME>
  version: v1
  metadata:
  - name: <KEY>
    value: <VALUE>
  - name: <KEY>
    value: <VALUE>
...
```

密钥存储的类型由 `type` 字段决定，连接字符串和其他元数据等内容放在 `.metadata` 部分中。

不同的[支持的密钥存储]({{% ref supported-secret-stores %}})将具有不同的需要配置的具体字段。例如，当配置使用 AWS Secrets Manager 的密钥存储时，文件将如下所示：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: awssecretmanager
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "[aws_region]"
  - name: accessKey
    value: "[aws_access_key]"
  - name: secretKey
    value: "[aws_secret_key]"
  - name: sessionToken
    value: "[aws_session_token]"
```

{{% alert title="重要" color="warning" %}}
在 EKS（AWS Kubernetes）上使用应用程序运行 Dapr 边车（daprd）时，如果您使用的节点/ Pod 已经附加了定义对 AWS 资源访问权限的 IAM 策略，则**不得**在您使用的组件规范定义中提供 AWS 访问密钥、秘密密钥和令牌。
{{% /alert %}}

## 应用配置

创建组件的 YAML 文件后，根据您的托管环境按照以下说明应用它：


{{< tabpane text=true >}}

{{% tab "自托管" %}}
要在本地运行，请创建一个包含 YAML 文件的 `components` 目录，并使用标志 `--resources-path` 向 `dapr run` 命令提供该路径。
{{% /tab %}}

{{% tab "Kubernetes" %}}
要在 Kubernetes 中部署，假设您的组件文件名为 `secret-store.yaml`，请运行：

```bash
kubectl apply -f secret-store.yaml
```
{{% /tab %}}

{{< /tabpane >}}

## 支持的密钥存储

访问[密钥存储参考]({{% ref supported-secret-stores %}})以获取支持的密钥存储的完整列表。


## 相关链接

- [支持的密钥存储组件]({{% ref supported-secret-stores %}})
- [密钥构建块]({{% ref secrets %}})
