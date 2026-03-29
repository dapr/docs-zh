---
type: docs
title: "Local storage"
linkTitle: "Local storage"
description: 本地存储密码学组件的详细信息
---

## 组件格式

此组件的目的是从本地目录加载密钥。

该组件接受文件夹名称作为输入，并从该文件夹加载密钥。每个密钥都在其自己的文件中，当用户请求给定名称的密钥时，Dapr 将加载具有该名称的文件。

支持的文件格式：

- PEM 格式的公钥和私钥（支持：PKCS#1、PKCS#8、PKIX）
- JSON Web Key (JWK)，包含公钥、私钥或对称密钥
- 对称密钥的原始密钥数据

{{% alert title="注意" color="primary" %}}
此组件使用 Dapr 中的密码学引擎执行操作。尽管密钥永远不会暴露给您的应用程序，但 Dapr 可以访问原始密钥材料。

{{% /alert %}}


Dapr `crypto.yaml` 组件文件具有以下结构：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: mycrypto
spec:
  type: crypto.dapr.localstorage
  version: v1
  metadata:
    - name: path
      value: /path/to/folder/
```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯字符串使用。建议使用密钥存储来管理密钥，具体说明请参阅[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| `path`             | Y        | 包含要加载的密钥的文件夹。加载密钥时，密钥名称将用作该文件夹中的文件名。  | `/path/to/folder` |

**示例**

假设您已设置 `path=/mnt/keys`，其中包含以下文件：

- `/mnt/keys/mykey1.pem`
- `/mnt/keys/mykey2`

使用该组件时，您可以将密钥引用为 `mykey1.pm` 和 `mykey2`。

## 相关链接
[密码学构建块]({{% ref cryptography %}})
