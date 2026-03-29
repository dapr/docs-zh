---
type: docs
title: "Cron 绑定规范"
linkTitle: "Cron"
description: "Cron 绑定组件的详细文档"
aliases:
  - "/zh-hans/operations/components/setup-bindings/supported-bindings/cron/"
---

## 组件格式

要设置 Cron 绑定，需创建一个类型为 `bindings.cron` 的组件。请参阅[此指南]({{% ref "howto-bindings.md#1-create-a-binding" %}})了解如何创建和应用绑定配置。


```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: <NAME>
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "@every 15m" # 有效的 cron 调度
  - name: direction
    value: "input"
```

## 规范元数据字段

| 字段              | 必填 | 绑定支持 |  详情 | 示例 |
|--------------------|:--------:|-------|--------|---------|
| `schedule` | Y | Input|  要使用的有效 cron 调度。详见[此](#schedule-format) | `"@every 15m"`
| `direction` | N | Input|  绑定的方向 | `"input"`

### 调度格式

Dapr Cron 绑定支持以下格式：

| 字符 |	描述        | 可接受的值                             |
|:---------:|-------------------|-----------------------------------------------|
| 1	        | 秒	          | 0 到 59，或 *                                 |
| 2	        | 分钟	          | 0 到 59，或 *                                 |
| 3	        | 小时	            | 0 到 23，或 *（UTC）                           |
| 4	        | 日期	| 1 到 31，或 *                                 |
| 5	        | 月份	            | 1 到 12，或 *                                 |
| 6	        | 星期	  | 0 到 7（其中 0 和 7 代表星期日），或 * |

例如：

* `30 * * * * *` - 每 30 秒
* `0 */15 * * * *` - 每 15 分钟
* `0 30 3-6,20-23 * * *` - 在凌晨 3-6 点和晚上 8-11 点范围内，每小时的第 30 分钟
* `CRON_TZ=America/New_York 0 30 04 * * *` - 纽约时间每天凌晨 4:30

> 您可以[在此](https://en.wikipedia.org/wiki/Cron)了解更多关于 cron 及其支持格式的信息

为方便使用，Dapr Cron 绑定还支持一些快捷方式：

* `@every 15s`，其中 `s` 表示秒，`m` 表示分钟，`h` 表示小时
* `@daily` 或 `@hourly`，从绑定初始化的时间开始按该周期运行

## 监听 Cron 绑定

设置 Cron 绑定后，您只需监听与组件名称匹配的端点。假设 [NAME] 为 `scheduled`。这将通过 HTTP `POST` 请求发起。以下示例展示了一个简单的 Node.js Express 应用如何在 `/scheduled` 端点上接收调用并向控制台写入消息。
  
```js
app.post('/scheduled', async function(req, res){
    console.log("scheduled endpoint called", req.body)
    res.status(200).send()
});
```
  
运行此代码时，请注意 `/scheduled` 端点每 15 分钟会被 Dapr 边车调用一次。


## 绑定支持

此组件支持**输入**绑定接口。

## 相关链接

- [Dapr 组件的基本架构]({{% ref component-schema %}})
- [绑定构建块]({{% ref bindings %}})
- [操作指南：使用输入绑定触发应用]({{% ref howto-triggers.md %}})
- [操作指南：使用绑定与外部资源交互]({{% ref howto-bindings.md %}})
- [绑定 API 参考]({{% ref bindings_api.md %}})
