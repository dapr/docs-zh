---
type: docs
title: "OCI 对象存储"
linkTitle: "OCI 对象存储"
description: "OCI 对象存储 Binary Store 组件的配置"
aliases:
  - "/zh-hans/reference/components-reference/supported-binarystore/oci-objectstorage/"
---

OCI 对象存储 Binary Store 会将每个文件作为一个对象存储到已配置的存储桶中。该组件处于 Alpha 阶段。

## 组件格式

以下示例使用 OCI 配置文件进行身份验证：

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: oci-files
spec:
  type: binarystore.oci.objectstorage
  version: v1
  metadata:
  - name: configFileAuthentication
    value: "true"
  - name: configFilePath
    value: "/home/app/.oci/config"
  - name: configFileProfile
    value: "DEFAULT"
  - name: bucketName
    value: "binary-files"
  - name: compartmentOCID
    value: "<COMPARTMENT_OCID>"
  - name: namespace
    value: "<OBJECT_STORAGE_NAMESPACE>"
```

配置文件必须位于边车环境中的指定路径。请按照你的部署所采用的机密管理实践保护文件中的凭据。

## 身份验证

该组件支持三种身份验证方法：

- **API 密钥**：提供 `region`、`userOCID`、`fingerPrint`、`privateKey` 和 `tenancyOCID`。
- **实例主体**：将 `instancePrincipalAuthentication` 设置为 `"true"`，并为计算实例的动态组授予所需的对象存储权限。
- **配置文件**：将 `configFileAuthentication` 设置为 `"true"`，并提供 `configFilePath`。可以选择使用 `configFileProfile` 指定配置文件中的配置档（profile）。

每个组件只能配置一种身份验证方法。详细信息请参阅 OCI 文档中关于 [实例主体](https://docs.oracle.com/en-us/iaas/Content/Identity/Tasks/callingservicesfrominstances.htm) 和 [SDK 配置文件](https://docs.oracle.com/en-us/iaas/Content/API/Concepts/sdkconfig.htm) 的说明。

## 规范元数据字段

| 字段 | 必填 | 说明 | 示例 |
|-------|:--------:|---------|---------|
| `bucketName` | 是 | OCI 对象存储的存储桶名称。 | `"binary-files"` |
| `compartmentOCID` | 是 | 包含该存储桶的区间（compartment）的 OCID。 | `"ocid1.compartment.oc1..example"` |
| `namespace` | 否 | OCI 对象存储命名空间。如果省略，组件会从租户中解析该命名空间。 | `"my-namespace"` |
| `prefix` | 否 | 添加到每个文件名前的前缀。如果配置，则不能以 `/` 开头。 | `"uploads"` |
| `partSize` | 否 | 分块上传（multipart upload）的分块大小，可以用字节数或字节大小字符串指定。默认为 `16Mi`，必须介于 10 MiB 和 50 GiB 之间。OCI 限制每次上传最多 10,000 个分块；更大的分块可以提高最大上传大小（最高可达 10 TiB），但每个进行中的上传会占用更多内存。 | `"64Mi"` |
| `region` | 是（API 密钥认证） | 存储桶所在的 OCI 区域。 | `"us-ashburn-1"` |
| `userOCID` | 是（API 密钥认证） | OCI 用户的 OCID。 | `"ocid1.user.oc1..example"` |
| `fingerPrint` | 是（API 密钥认证） | API 密钥的指纹。 | `"xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx:xx"` |
| `privateKey` | 是（API 密钥认证） | 用于 API 身份验证的私钥。请将此值视为机密。 | `"<PRIVATE_KEY>"` |
| `tenancyOCID` | 是（API 密钥认证） | 租户的 OCID。 | `"ocid1.tenancy.oc1..example"` |
| `instancePrincipalAuthentication` | 是（实例主体认证） | 设置为 `"true"` 以使用实例主体身份验证。默认为 `"false"`。 | `"true"` |
| `configFileAuthentication` | 是（配置文件认证） | 设置为 `"true"` 以使用配置文件身份验证。默认为 `"false"`。 | `"true"` |
| `configFilePath` | 是（配置文件认证） | OCI 配置文件的绝对路径。 | `"/home/app/.oci/config"` |
| `configFileProfile` | 否 | 配置文件中可选的 profile 名称。元数据默认值为空；使用 `"DEFAULT"` 可显式选择该 profile。 | `"DEFAULT"` |

大小值可以提供为包含字节数的字符串（例如 `"16777216"`），也可以提供为带单位的大小（例如 `"16Mi"`）。

## 相关链接

- [OCI 对象存储文档](https://docs.oracle.com/en-us/iaas/Content/Object/Concepts/objectstorageoverview.htm)
- [Dapr 组件的基本架构]({{% ref "reference/resource-specs/component-schema.md" %}})
- [如何使用 Binary Store]({{% ref "developing-applications/building-blocks/binarystore/howto-use-binary-store.md" %}})
