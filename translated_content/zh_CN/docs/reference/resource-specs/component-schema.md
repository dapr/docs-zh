---
type: docs
title: "组件规范"
linkTitle: "组件"
weight: 1000
description: "Dapr 组件的基础规范"
---

Dapr 使用[资源规范](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/)来定义和注册组件。所有组件都被定义为资源，可以应用于运行 Dapr 的任何托管环境，而不仅仅是 Kubernetes。

通常，组件被限制在特定的[命名空间]({{% ref isolation-concept.md %}})中，并通过作用域限制对特定应用程序集合的访问。命名空间要么在组件清单本身上显式设置，要么由 API 服务器设置，后者通过在应用时从 Kubernetes 上下文派生命名空间。

{{% alert title="注意" color="primary" %}}
此规则的例外情况是在自托管模式下，当省略命名空间字段时，daprd 会摄取组件资源。然而，安全配置文件是静默的，因为 daprd 无论如何都可以访问清单，这与在 Kubernetes 中不同。
{{% /alert %}}

## 格式

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
auth: 
 secretstore: <REPLACE-WITH-SECRET-STORE-NAME>
metadata:
  name: <REPLACE-WITH-COMPONENT-NAME>
  namespace: <REPLACE-WITH-COMPONENT-NAMESPACE>
spec:
  type: <REPLACE-WITH-COMPONENT-TYPE>
  version: v1
  initTimeout: <REPLACE-WITH-TIMEOUT-DURATION>
  ignoreErrors: <REPLACE-WITH-BOOLEAN>
  metadata:
  - name: <REPLACE-WITH-METADATA-NAME>
    value: <REPLACE-WITH-METADATA-VALUE>
scopes:
  - <REPLACE-WITH-APPID>
  - <REPLACE-WITH-APPID>
```

## 规范字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| apiVersion         | Y        | 您正在调用的 Dapr（以及适用时的 Kubernetes）API 的版本 | `dapr.io/v1alpha1`
| kind               | Y        | 资源类型。对于组件，必须始终为 `Component` | `Component`
| auth               | N        | secret store 的名称，元数据中的 `secretKeyRef` 在此处查找组件中使用的密钥名称 | 参见[操作指南：在组件中引用密钥]({{% ref component-secrets %}})
| scopes             | N        | 组件限制的应用程序，由其应用 ID 指定 | `order-processor`、`checkout`  
| **metadata**       | -        | **关于组件注册的信息** |
| metadata.name      | Y        | 组件的名称 | `prod-statestore`
| metadata.namespace | N        | 组件的命名空间，适用于具有命名空间的托管环境 | `myapp-namespace`
| **spec**           | -        | **关于组件资源的详细信息**
| spec.type          | Y        | 组件的类型 | `state.redis`
| spec.version       | Y        | 组件的版本 | `v1`
| spec.initTimeout   | N        | 组件初始化的超时时长。默认为 5s  | `5m`、`1h`、`20s`
| spec.ignoreErrors  | N        | 告诉 Dapr 边车如果组件加载失败则继续初始化。默认为 false  | `false`
| **spec.metadata**  | -        | **组件特定配置的键/值对。有关字段，请参阅您的组件定义**|
| spec.metadata.name | Y        | 组件特定属性的名称及其值 | `- name: secretsFile` <br>   `value: secrets.json`

### 模板化元数据值

元数据值可以包含在 Dapr 边车启动时解析的模板标记。下表显示了可在组件中使用的当前模板标记。

| 标记         | 详情                                                            | 示例用例                                                                                                                                                       |
|-------------|--------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| {uuid}      | 随机生成的 UUIDv4                                          | 当您在自托管模式下需要唯一标识符时；例如，多个应用实例消费[共享的 MQTT 订阅]({{% ref "setup-mqtt3.md" %}}) |
| {podName}   | 包含 Dapr 边车的 Pod 的名称                        | 用于实现持久化行为，即在 Kubernetes 中使用 StatefulSets 时，ConsumerID 在重启时不会更改                                                |
| {namespace} | Dapr 边车所在的命名空间与其 appId 组合   | 当多个应用实例在 Kubernetes 中消费 Kafka 主题时，使用共享的 `clientId`                                                                      |
| {appID}     | 包含 Dapr 边车的资源的已配置 `appID` | 当多个应用实例在自托管模式下消费 Kafka 主题时，拥有共享的 `clientId`                                                              |

下面是在 MQTT 发布订阅组件中使用 `{uuid}` 标记的示例。请注意，可以在单个元数据值中使用多个模板标记。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: messagebus
spec:
  type: pubsub.mqtt3
  version: v1
  metadata:
    - name: consumerID
      value: "{uuid}"
    - name: url
      value: "tcp://admin:public@localhost:1883"
    - name: qos
      value: 1
    - name: retain
      value: "false"
    - name: cleanSession
      value: "false"
```

## 相关链接
- [组件概念]({{% ref components-concept.md %}})
- [在组件定义中引用密钥]({{% ref component-secrets.md %}})
- [支持的状态存储]({{% ref supported-state-stores %}})
- [支持的发布订阅代理]({{% ref supported-pubsub %}})
- [支持的密钥存储]({{% ref supported-secret-stores %}})
- [支持的绑定]({{% ref supported-bindings %}})
- [设置组件作用域]({{% ref component-scopes.md %}})
