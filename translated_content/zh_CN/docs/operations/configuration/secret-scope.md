---
type: docs
title: "操作指南：限制可从 secret 存储读取的密钥"
linkTitle: "限制 secret 存储访问"
weight: 3000
description: "通过在现有配置资源上添加限制性权限来定义 secret 范围。"
---

除了[限定哪些应用可以访问给定组件]({{% ref "component-scopes.md"%}})外，你还可以为应用将命名的 secret 存储组件限定到一个或多个密钥。通过定义 `allowedSecrets` 和/或 `deniedSecrets` 列表，你可以限制应用仅访问特定的密钥。

有关配置 Configuration 资源的更多信息：
- [配置概述]({{% ref configuration-overview.md %}})
- [配置 schema]({{% ref configuration-schema.md %}})


## 配置密钥访问

`Configuration` 规范下的 `secrets` 部分包含以下属性：

```yml
secrets:
  scopes:
    - storeName: kubernetes
      defaultAccess: allow
      allowedSecrets: ["redis-password"]
    - storeName: localstore
      defaultAccess: allow
      deniedSecrets: ["redis-password"]
```

下表列出了 secret 范围的属性：

| 属性       | 类型   | 描述 |
|----------------|--------|-------------|
| storeName      | string | secret 存储组件的名称。storeName 在列表中必须唯一
| defaultAccess  | string | 访问修饰符。接受的值为 "allow"（默认）或 "deny"
| allowedSecrets | list   | 可访问的密钥列表
| deniedSecrets  | list   | 不可访问的密钥列表

当存在包含至少一个元素的 `allowedSecrets` 列表时，应用只能访问该列表中定义的密钥。

## 权限优先级

`allowedSecrets` 和 `deniedSecrets` 列表值优先于 `defaultAccess`。请参阅以下示例场景中的工作方式：

|  | 场景 | `defaultAccess` | `allowedSecrets` | `deniedSecrets` | `permission`
|--| ----- | ------- | -----------| ----------| ------------
| 1 | 仅默认访问  | `deny`/`allow` | 空 | 空 | `deny`/`allow`
| 2 | 默认拒绝且包含允许列表 | `deny` | [`"s1"`] | 空 | 仅 `"s1"` 可被访问
| 3 | 默认允许且包含拒绝列表 | `allow` | 空 | [`"s1"`] | 仅 `"s1"` 不可被访问
| 4 | 默认允许且包含允许列表  | `allow` | [`"s1"`] | 空 | 仅 `"s1"` 可被访问
| 5 | 默认拒绝且包含拒绝列表  | `deny` | 空 | [`"s1"`] | `deny`
| 6 | 默认拒绝/允许且同时包含两个列表  | `deny`/`allow` | [`"s1"`] | [`"s2"`] | 仅 `"s1"` 可被访问

## 示例

### 场景 1：拒绝访问 secret 存储的所有密钥

在 Kubernetes 集群中，默认会为你的 Dapr 应用添加原生的 Kubernetes secret 存储。在某些场景中，可能需要拒绝给定应用对 Dapr 密钥的访问。要添加此配置： 

1. 定义以下 `appconfig.yaml`。 

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
   ```

2. 使用以下命令将其应用到 Kubernetes 集群：

   ```bash
   kubectl apply -f appconfig.yaml`.
   ```

对于需要拒绝访问 Kubernetes secret 存储的应用，遵循 [Kubernetes 指南]({{% ref kubernetes-overview %}})，将以下注解添加到应用 pod。

```yaml
dapr.io/config: appconfig
```

定义后，应用将无法访问 Kubernetes secret 存储。

### 场景 2：仅允许访问 secret 存储中的某些密钥

要允许 Dapr 应用仅访问某些密钥，定义以下 `config.yaml`：

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

此示例为名为 `vault` 的 secret 存储定义了配置。对 secret 存储的默认访问为 `deny`。同时，根据 `allowedSecrets` 列表，应用可以访问某些密钥。遵循 [边车配置指南]({{% ref "configuration-overview.md#sidecar-configuration" %}}) 将配置应用到边车。

### 场景 3：拒绝访问 secret 存储中的某些敏感密钥

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
        defaultAccess: allow # 这是默认值，可以省略此行
        deniedSecrets: ["secret1", "secret2"]
```

此配置明确拒绝访问名为 `vault` 的 secret 存储中的 `secret1` 和 `secret2`，同时允许访问所有其他密钥。遵循 [边车配置指南]({{% ref "configuration-overview.md#sidecar-configuration" %}}) 将配置应用到边车。

## 后续步骤

{{< button text="服务调用访问控制" page="invoke-allowlist.md" >}}
