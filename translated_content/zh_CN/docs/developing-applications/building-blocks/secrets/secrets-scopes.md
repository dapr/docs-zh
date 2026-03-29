---
type: docs
title: "如何使用：密钥作用域"
linkTitle: "如何使用：密钥作用域"
weight: 3000
description: "使用作用域限制可从密钥存储中读取的密钥"
---

一旦你[为应用配置了密钥存储]({{% ref setup-secret-store %}})，该存储中定义的*任何*密钥默认都可从 Dapr 应用访问。

你可以通过定义密钥作用域来限制 Dapr 应用对特定密钥的访问。只需向[应用配置]({{% ref configuration-concept %}})添加具有限制性权限的密钥作用域策略。

密钥作用域策略适用于任何[密钥存储]({{% ref supported-secret-stores %}})，包括：

- 本地密钥存储
- Kubernetes 密钥存储
- 公有云密钥存储

有关如何设置[密钥存储]({{% ref setup-secret-store %}})的详细信息，请阅读[如何获取密钥]({{% ref howto-secrets %}})。

观看[此视频](https://youtu.be/j99RN_nxExA?start=2272)了解如何将密钥作用域与应用结合使用的演示。

{{< youtube id=j99RN_nxExA start=2272 >}}

## 场景1：拒绝对某个密钥存储的所有密钥的访问

在此示例中，将拒绝在 Kubernetes 集群上运行的应用访问所有密钥，该集群已配置名为 `mycustomsecretstore` 的[Kubernetes 密钥存储]({{% ref kubernetes-secret-store %}})。除了用户定义的自定义存储外，该示例还配置 Kubernetes 默认存储（名为 `kubernetes`）以确保拒绝所有密钥的访问。[了解更多关于 Kubernetes 默认密钥存储的信息]({{% ref "kubernetes-secret-store#default-kubernetes-secret-store-component" %}})。

定义以下 `appconfig.yaml` 配置并使用命令 `kubectl apply -f appconfig.yaml` 将其应用到 Kubernetes 集群。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
      - storeName: kubernetes
        defaultAccess: deny
      - storeName: mycustomsecreststore
        defaultAccess: deny
```

对于需要被拒绝访问 Kubernetes 密钥存储的应用，遵循[这些说明]({{% ref kubernetes-overview %}})，并向应用 Pod 添加以下注解：

```yaml
dapr.io/config: appconfig
```

定义后，应用将无法再访问 Kubernetes 密钥存储中的任何密钥。

## 场景2：仅允许访问某个密钥存储中的特定密钥

此示例使用名为 `vault` 的密钥存储。这可以是为应用设置的 Hashicorp 密钥存储组件。要允许 Dapr 应用仅访问 `vault` 密钥存储中的 `secret1` 和 `secret2`，定义以下 `appconfig.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
      - storeName: vault
        defaultAccess: deny
        allowedSecrets: ["secret1", "secret2"]
```

对 `vault` 密钥存储的默认访问权限为 `deny`，而基于 `allowedSecrets` 列表，应用可以访问某些密钥。[了解如何将配置应用到边车]({{% ref configuration-concept %}})。

## 场景3：拒绝对某个密钥存储中某些敏感密钥的访问

定义以下 `config.yaml`：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  secrets:
    scopes:
      - storeName: vault
        defaultAccess: allow # 此为默认值，可省略该行
        deniedSecrets: ["secret1", "secret2"]
```

此示例配置明确拒绝访问名为 `vault` 的密钥存储中的 `secret1` 和 `secret2`，同时允许访问所有其他密钥。[了解如何将配置应用到边车]({{% ref configuration-concept %}})。

## 权限优先级

`allowedSecrets` 和 `deniedSecrets` 列表值优先于 `defaultAccess` 策略。

场景 | defaultAccess | allowedSecrets | deniedSecrets | 权限
---- | ------- | -----------| ----------| ------------
1 - 仅默认访问  | deny/allow | 空 | 空 | deny/allow
2 - 默认拒绝，包含允许列表 | deny | ["s1"] | 空 | 仅能访问 "s1"
3 - 默认允许，包含拒绝列表 | allow | 空 | ["s1"] | 仅不能访问 "s1"
4 - 默认允许，包含允许列表  | allow | ["s1"] | 空 | 仅能访问 "s1"
5 - 默认拒绝，包含拒绝列表  | deny | 空 | ["s1"] | deny
6 - 默认拒绝/允许，包含两个列表  | deny/allow | ["s1"] | ["s2"] | 仅能访问 "s1"

## 相关链接

- [密钥存储]({{% ref supported-secret-stores %}})列表
- [密钥存储]({{% ref setup-secret-store %}})概述
