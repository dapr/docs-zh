---
type: docs
title: "OCI 对象存储"
linkTitle: "OCI 对象存储"
description: OCI 对象存储状态存储组件的详细信息
aliases:
  - "/zh-hans/operations/components/setup-state-store/supported-state-stores/setup-oci-objectstorage/"
---

## 组件格式

要设置 OCI 对象存储状态存储，请创建类型为 `state.oci.objectstorage` 的组件。有关如何创建和应用状态存储配置，请参阅[此指南]({{% ref "howto-get-save-state.md#step-1-setup-a-state-store" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: state.oci.objectstorage
  version: v1
  metadata:
 - name: instancePrincipalAuthentication
   value: <"true" or "false">  # 可选。默认值："false" 
 - name: configFileAuthentication
   value: <"true" or "false">  # 可选。默认值："false" 。当 instancePrincipalAuthentication == "true" 时不使用 
 - name: configFilePath
   value: <REPLACE-WITH-FULL-QUALIFIED-PATH-OF-CONFIG-FILE>  # 可选。无默认值。仅在 configFileAuthentication == "true" 时使用 
 - name: configFileProfile
   value: <REPLACE-WITH-NAME-OF-PROFILE-IN-CONFIG-FILE>  # 可选。默认值："DEFAULT" 。仅在 configFileAuthentication == "true" 时使用 
 - name: tenancyOCID
   value: <REPLACE-WITH-TENANCY-OCID>  # 当 configFileAuthentication == "true" 或 instancePrincipalAuthentication == "true" 时不使用 
 - name: userOCID
   value: <REPLACE-WITH-USER-OCID>  # 当 configFileAuthentication == "true" 或 instancePrincipalAuthentication == "true" 时不使用 
 - name: fingerPrint
   value: <REPLACE-WITH-FINGERPRINT>  # 当 configFileAuthentication == "true" 或 instancePrincipalAuthentication == "true" 时不使用 
 - name: privateKey  # 当 configFileAuthentication == "true" 或 instancePrincipalAuthentication == "true" 时不使用 
   value: |
          -----BEGIN RSA PRIVATE KEY-----
          REPLACE-WITH-PRIVATE-KEY-AS-IN-PEM-FILE
          -----END RSA PRIVATE KEY-----    
 - name: region
   value: <REPLACE-WITH-OCI-REGION>  # 当 configFileAuthentication == "true" 或 instancePrincipalAuthentication == "true" 时不使用 
 - name: bucketName
	 value: <REPLACE-WITH-BUCKET-NAME>
 - name: compartmentOCID
   value: <REPLACE-WITH-COMPARTMENT-OCID>

```

{{% alert title="警告" color="warning" %}}
上述示例将密钥作为纯文本字符串使用。建议使用密钥存储来管理密钥，具体说明参见[此处]({{% ref component-secrets.md %}})。
{{% /alert %}}

## 规范元数据字段

| 字段              | 必填 | 详情 | 示例 |
|--------------------|:--------:|---------|---------|
| instancePrincipalAuthentication        | N        | 布尔值，指示是否使用基于实例主体（instance principal）的身份验证。默认值：`"false"`  | `"true"` 或  `"false"` 。
| configFileAuthentication        | N        | 布尔值，指示是否通过配置文件提供身份凭据详细信息。默认值：`"false"` 当 instancePrincipalAuthentication 为 true 时不需要也不使用。  | `"true"` 或  `"false"` 。
| configFilePath        | N        | OCI 配置文件的完整路径名。不存在默认值。当 instancePrincipalAuthentication 为 true 时不使用。注意：不支持 ~/ 前缀。 | `"/home/apps/configuration-files/myOCIConfig.txt"`。
| configFileProfile        | N        | 配置文件中要使用的配置文件（profile）名称。默认值：`"DEFAULT"` 当 instancePrincipalAuthentication 为 true 时不使用。  | `"DEFAULT"` 或  `"PRODUCTION"` 。
| tenancyOCID        | Y        | OCI 租户标识符。当 instancePrincipalAuthentication 为 true 时不需要也不使用。 | `"ocid1.tenancy.oc1..aaaaaaaag7c7sljhsdjhsdyuwe723"`。
| userOCID           | Y        | OCI 账户的 OCID（此账户需要访问 OCI 对象存储的权限）。当 instancePrincipalAuthentication 为 true 时不需要也不使用。| `"ocid1.user.oc1..aaaaaaaaby4oyyyuqwy7623yuwe76"`
| fingerPrint        | Y        | 公钥的指纹。当 instancePrincipalAuthentication 为 true 时不需要也不使用。 | `"02:91:6c:49:e2:94:21:15:a7:6b:0e:a7:34:e1:3d:1b"`
| privateKey         | Y        | RSA 密钥对的私钥。当 instancePrincipalAuthentication 为 true 时不需要也不使用。 | `"MIIEoyuweHAFGFG2727as+7BTwQRAIW4V"`
| region             | Y        | OCI 区域。当 instancePrincipalAuthentication 为 true 时不需要也不使用。 | `"us-ashburn-1"`
| bucketName         | Y        | 写入和读取（并在必要时创建）的存储桶的名称 | `"application-state-store-bucket"`
| compartmentOCID    | Y        | 包含存储桶的区间（compartment）的 OCID | `"ocid1.compartment.oc1..aaaaaaaacsssekayyuq7asjh78"`

## 设置 OCI 对象存储
OCI 对象存储状态存储需要与 Oracle Cloud Infrastructure 进行交互。状态存储支持两种不同的身份验证方法。一种基于身份（用户或服务账户），另一种是利用授予运行应用程序工作负载的计算实例的权限的实例主体身份验证。注意：资源主体身份验证——用于非实例资源（如无服务器函数）——目前不支持。

在 Oracle Cloud Infrastructure 上运行的 Dapr 应用程序——在计算实例中或作为 Kubernetes 上的容器——可以利用实例主体身份验证。有关更多背景信息，请参阅 [OCI 文档关于从实例调用 OCI 服务](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/callingservicesfrominstances.htm)。简而言之：实例需要是动态组的成员，并且该动态组需要通过 IAM 策略获得与对象存储服务交互的权限。对于此类实例主体身份验证，将属性 instancePrincipalAuthentication 指定为 `"true"`。您不需要配置属性 tenancyOCID、userOCID、region、fingerPrint 和 privateKey——如果您为它们定义了值，这些将被忽略。

基于身份的身份验证通过一个 OCI 账户与 OCI 进行交互，该账户具有通过 OCI 对象存储在指定存储桶中创建、读取和删除对象的权限，并且如果未预先创建存储桶，则允许在指定区间中创建存储桶。OCI 文档[描述了如何创建 OCI 账户](https://docs.oracle.com/en-us/iaas/Content/GSG/Tasks/addingusers.htm#Adding_Users)。状态存储的交互使用公钥的指纹和为 OCI 账户生成的 RSA 密钥对的私钥进行。[生成密钥对并获取所需信息的说明](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/apisigningkey.htm)可在 OCI 文档中找到。

用于与 OCI 交互的身份和身份凭据的详细信息可以直接在 Dapr 组件属性文件中提供——使用属性 tenancyOCID、userOCID、fingerPrint、privateKey 和 region——或者可以从配置文件中提供，这是许多 OCI 相关工具（如 CLI 和 Terraform）和 SDK 的常见做法。在后一种情况下，必须通过属性 configFilePath 提供确切的文件名和完整路径。注意：路径中不支持 ~/ 前缀。配置文件可以包含多个配置文件（profile）；所需的配置文件可以通过属性 configFileProfile 指定。如果未提供值，则使用 DEFAULT 作为要使用的配置文件的名称。注意：如果找不到指定的配置文件，则使用 DEFAULT 配置文件（如果存在）。OCI SDK 文档提供了[有关配置文件定义的详细信息](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm)。  

如果您希望为 Dapr 创建要使用的存储桶，可以预先执行此操作。但是，对象存储状态提供程序将自动在指定区间中为您创建一个（如果它不存在）。

为了将 OCI 对象存储设置为状态存储，您需要以下属性：
- **instancePrincipalAuthentication**：指示是否应使用基于实例主体的身份验证的标志。
- **configFileAuthentication**：指示是否通过配置文件提供 OCI 身份凭据详细信息的标志。当 **instancePrincipalAuthentication** 为 true 时不使用。
- **configFilePath**：OCI 配置文件的完整路径名。当 **instancePrincipalAuthentication** 为 true 或 **configFileAuthentication** 不为 true 时不使用。
- **configFileProfile**：配置文件中要使用的配置文件（profile）名称。默认值：`"DEFAULT"` 当 instancePrincipalAuthentication 为 true 或 **configFileAuthentication** 不为 true 时不需要也不使用。当在配置文件中找不到指定的配置文件时，如果存在 DEFAULT 配置文件，则使用它。
- **tenancyOCID**：OCI 云租户的标识符，状态将存储在其中。当 **instancePrincipalAuthentication** 为 true 或 **configFileAuthentication** 为 true 时不使用。
- **userOCID**：状态存储组件用于连接到 OCI 的账户的标识符；这必须是在指定区间和存储桶中对 OCI 对象存储服务具有适当权限的账户。当 **instancePrincipalAuthentication** 为 true 或 **configFileAuthentication** 为 true 时不使用。
- **fingerPrint**：为 **userOCID** 指示的账户生成的 RSA 密钥对中公钥的指纹。当 **instancePrincipalAuthentication** 为 true 或 **configFileAuthentication** 为 true 时不使用。
- **privateKey**：为 **userOCID** 指示的账户生成的 RSA 密钥对中的私钥。当 **instancePrincipalAuthentication** 为 true 或 **configFileAuthentication** 为 true 时不使用。 
- **region**：OCI 区域——例如 **us-ashburn-1**、**eu-amsterdam-1**、**ap-mumbai-1**。当 **instancePrincipalAuthentication** 为 true 时不使用
- **bucketName**：OCI 对象存储上将创建状态的存储桶名称。此存储桶在状态存储初始化时可能已存在，或将在状态存储初始化期间创建。请注意，存储桶名称在命名空间内是唯一的。
- **compartmentOCID**：租户中区间的标识符，存储桶在其中存在或将被创建。 


## 运行时会发生什么？

每个状态条目在 OCI 对象存储中都由一个对象表示。OCI 对象存储状态存储使用在对 Dapr API 的请求中提供的 `key` 属性来确定对象的名称。`value` 作为对象的（字面）内容存储。每个对象都被分配一个唯一的 ETag 值——每当它被创建或更新（即覆盖）时；这是 OCI 对象存储的本机行为。状态存储为它写入的每个对象分配一个元数据标签；该标签是 __category__，其值是 __dapr-state-store__。这允许识别为 Dapr 应用程序的状态而创建的对象。

例如，以下操作 

```shell
curl -X POST http://localhost:3500/v1.0/state \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "nihilus",
          "value": "darth"
        }
      ]'
```

创建以下对象：

| 存储桶 | 目录 | 对象名称  | 对象内容 | 元标签 |
| ------------ | ------- | ----- | ----- | ---- |
| components.yaml 中由 **bucketName** 指定 | -（根目录）  | nihilus | darth | category: dapr-state-store


Dapr 使用具有*复合键*的固定键方案在应用程序之间分区状态。对于一般状态，键格式为：
`App-ID||state key`
OCI 对象存储状态存储将第一个键段（用于 App-ID）映射到存储桶内的目录，使用 [OCI 对象存储文档中描述的用于模拟目录结构的前缀和层次结构](https://docs.oracle.com/en-us/iaas/Content/Object/Tasks/managingobjects.htm#nameprefix)。 

因此，以下操作（注意复合键）

```shell
curl -X POST http://localhost:3500/v1.0/state \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "myApplication||nihilus",
          "value": "darth"
        }
      ]'
```

将创建以下对象：

| 存储桶 | 目录 | 对象名称  | 对象内容 | 元标签 |
| ------------ | ------- | ----- | ----- | ---- |
| components.yaml 中由 **bucketName** 指定 | myApplication  | nihilus | darth | category: dapr-state-store


您将能够通过控制台、API、CLI 或 SDK 检查存储桶的内容来检查通过 OCI 对象存储状态存储存储的所有状态。通过直接访问存储桶，您可以准备在运行时作为状态提供给您的应用程序的状态。

## 生存时间和状态过期
OCI 对象存储状态存储支持 Dapr 的生存时间（TTL）逻辑，确保过期后无法检索状态。有关详细信息，请参阅[有关设置状态生存时间的操作指南]({{% ref "state-store-ttl.md" %}})。

OCI 对象存储本身不支持生存时间设置。此组件中的实现使用放在为其指定了 TTL 的每个对象上的元数据标签。该标签称为 **expiry-time-from-ttl**，它包含 ISO 日期时间格式的字符串，带有基于 UTC 的过期时间。当通过调用 Get 检索状态时，此组件检查是否设置了 **expiry-time-from-ttl**，如果设置了，则检查它是否已过期。在这种情况下，不返回状态。 

因此，以下操作（注意复合键） 

```shell
curl -X POST http://localhost:3500/v1.0/state \
  -H "Content-Type: application/json"
  -d '[
        {
          "key": "temporary",
          "value": "ephemeral",
          "metadata": {"ttlInSeconds": "120"}}
        }
      ]'
```

创建以下对象：

| 存储桶 | 目录 | 对象名称  | 对象内容 | 元标签 |
| ------------ | ------- | ----- | ----- | ---- |
| components.yaml 中由 **bucketName** 指定 | -  | nihilus | darth | category: dapr-state-store , expiry-time-from-ttl: 2022-01-06T08:34:32 

expiry-time-from-ttl 的确切值当然取决于状态创建的时间，并且将是该时间之后 120 秒。

请注意，此组件不会从状态存储中删除过期的状态。应用程序操作员可以决定运行定期作业以执行某种形式的垃圾回收，以显式删除所有具有时间戳已过去的 **expiry-time-from-ttl** 标签的状态。

## 并发性

OCI 对象存储状态并发性是通过使用 `ETag` 实现的。OCI 对象存储中的每个对象在创建或更新（即替换）时都会被分配一个唯一的 ETag。当此状态存储的 `Set` 和 `Delete` 请求指定 FirstWrite 并发策略时，请求需要提供要写入或删除的状态的实际 ETag 值，请求才能成功。 

## 一致性

OCI 对象存储状态不支持事务。

## 查询

OCI 对象存储状态不支持查询 API。


## 相关链接
- [Dapr 组件的基本架构]({{% ref component-schema %}})
- 阅读[此指南]({{% ref "howto-get-save-state.md#step-2-save-and-retrieve-a-single-state" %}})以获取有关配置状态存储组件的说明
- [状态管理构建块]({{% ref state-management %}})
