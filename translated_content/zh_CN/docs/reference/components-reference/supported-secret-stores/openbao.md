---
type: docs
title: 'OpenBao'
linkTitle: 'OpenBao'
description: 'OpenBao 密钥存储组件的详细信息。'
aliases:
  - '/zh-hans/operations/components/setup-secret-store/supported-secret-stores/openbao/'
---

## 用法

目前没有专门的 OpenBao 密钥存储。不过，你可以使用 `secretstores.hashicorp.vault` 组件，该组件已经过测试并被确认可以正常工作。

有关如何设置和配置密钥存储的说明，请参阅 [HashiCorp Vault 指南]({{% ref "hashicorp-vault.md" %}})。相同的 metadata 字段与 OpenBao 兼容。

## 组件示例

```
---
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: openbao
spec:
  # 使用来自 vault 的
  # 密钥存储提供者
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: http://openbao.openbao.svc.cluster.local:8200
    - name: skipVerify # 可选。默认值：false
      value: true
    - name: vaultToken
      secretKeyRef:
        name: roottoken
        key: token
    - name: enginePath # 可选。默认值："secret"
      value: "secrets"
    - name: vaultValueType # 可选。默认值："map"
      value: "map"
```

## 更多信息

- [OpenBao 官网](https://openbao.org)
- [OpenBao 文档](https://openbao.org/docs)
