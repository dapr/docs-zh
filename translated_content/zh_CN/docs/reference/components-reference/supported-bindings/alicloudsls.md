---
type: docs
title: "阿里云日志服务绑定规范"
linkTitle: "阿里云日志服务"
description: "阿里云日志服务绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/alicloudsls/"
---

## 组件格式

要设置阿里云 SLS 绑定，请创建类型为 `bindings.alicloud.sls` 的组件。有关如何创建和应用绑定配置，请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})。

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: alicloud.sls
spec:
  type: bindings.alicloud.sls
  version: v1
  metadata:
  - name: AccessKeyID
    value: "[accessKey-id]"
  - name: AccessKeySecret
    value: "[accessKey-secret]"
  - name: Endpoint
    value: "[endpoint]"
```

## 规范元数据字段

| 字段         | 必填 | 绑定支持  | 详情 | 示例 |
|---------------|----------|---------|---------|---------|
| `AccessKeyID`    | Y | Output |  Access key ID 凭证。 | 
| `AccessKeySecret` | Y | Output | Access key 凭证密钥 |
| `Endpoint`   | Y | Output | 阿里云 SLS 端点。  | 

## 绑定支持

此组件支持**输出绑定**，具有以下操作：

- `create`：[创建对象](#create-object)

### 请求格式

要执行日志存储操作，请使用 `POST` 方法调用绑定并传入以下 JSON 请求体：

```json
{
    "metadata":{
        "project":"your-sls-project-name",
        "logstore":"your-sls-logstore-name",
        "topic":"your-sls-topic-name",
        "source":"your-sls-source"
    },
    "data":{
        "custome-log-filed":"any other log info"
    },
    "operation":"create"
}
```

{{% alert title="注意" color="primary" %}}
注意，"project"、"logstore"、"topic" 和 "source" 属性的值应在元数据属性中提供。
{{% /alert %}}

#### 示例

{{< tabpane text=true >}}

{{% tab "Windows" %}}

```bash
curl -X POST -H "Content-Type: application/json" -d "{\"metadata\":{\"project\":\"project-name\",\"logstore\":\"logstore-name\",\"topic\":\"topic-name\",\"source\":\"source-name\"},\"data\":{\"log-filed\":\"log info\"}" http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
```

{{% /tab %}}

{{% tab "Linux/MacOS" %}}

```bash
curl -X POST -H "Content-Type: application/json" -d '{"metadata":{"project":"project-name","logstore":"logstore-name","topic":"topic-name","source":"source-name"},"data":{"log-filed":"log info"}' http://localhost:<dapr-port>/v1.0/bindings/<binding-name>
```

{{% /tab %}}

{{< /tabpane >}}

<br />

### 响应格式
由于阿里云 SLS producer API 是异步的，此绑定没有响应（没有回调接口来接收成功或失败的响应，仅在控制台日志中记录任何原因的失败）。

## 相关链接

- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用程序]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
