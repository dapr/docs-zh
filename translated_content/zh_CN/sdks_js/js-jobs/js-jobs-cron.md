---
type: docs
title: "使用 JavaScript SDK 构建 Cron 调度"
linkTitle: "Cron 调度"
weight: 52000
description: "使用原始 Cron 表达式、描述符、时区以及 CronExpressionBuilder 来调度 Dapr Jobs"
---

对于基于日历的 job（例如每个工作日 09:30 生成的报表），请使用 Cron 调度。JavaScript SDK 在 `JobOptions.schedule` 中可以直接接受原始的调度字符串或 `CronExpressionBuilder`。这些示例面向 **`@dapr/dapr` 3.19.0 或更高版本**。

## 提供调度字符串

Dapr 的 Cron 表达式使用 **六个字段（包含秒）**，而不是许多 Unix Cron 工具所使用的五个字段：

```text
second minute hour dayOfMonth month dayOfWeek
```

例如，`"0 30 9 * * 1-5"` 表示在工作日的 09:30 运行。星期日为 `0`，星期六为 `6`。

```javascript
await client.jobs.schedule("weekday-report", {
  schedule: "0 30 9 * * 1-5",
  data: { report: "daily" },
});
```

该代码片段假设已配置好 `DaprClient`。请参照[操作指南]({{% ref js-jobs-howto.md %}})，在接收方应用中注册相应的 handler。

你也可以直接传入运行时支持的描述符：

| 描述符 | 调度 |
| --- | --- |
| `@every 5m` | 固定的五分钟间隔。 |
| `@hourly` | 每小时的开始时刻。 |
| `@daily` 或 `@midnight` | 每天午夜。 |
| `@weekly` | 每周日午夜。 |
| `@monthly` | 每月第一天的午夜。 |
| `@yearly` 或 `@annually` | 每年 1 月 1 日午夜。 |

若要创建一次性 job，请使用 `dueTime` 而不设置 `schedule`。调度字符串由运行时进行校验；SDK 不在本地解析它们。

## 使用 CronExpressionBuilder

这个链式构建器沿用了 .NET SDK 的 `on`、`through`、`each` 和 `every` 模型，但使用字符串形式的周期名称，而不是 .NET 枚举：

```javascript
import { CronExpressionBuilder } from "@dapr/dapr";

const schedule = new CronExpressionBuilder()
  .on("second", 0)
  .on("minute", 30)
  .on("hour", 9)
  .through("dayOfWeek", 1, 5)
  .withTimeZone("America/New_York");

console.log(schedule.toString());
// CRON_TZ=America/New_York 0 30 9 * * 1-5

await client.jobs.schedule("weekday-report", {
  schedule,
  data: { report: "daily" },
});
```

所有字段初始都包含 `*`。未做任何修改的构建器会生成 `"* * * * * *"`，它匹配的是每一秒，而不是每分钟。若希望以分钟级或更低的频率执行，请显式设置秒字段。

### 周期与取值范围

导出的 TypeScript 类型 `CronPeriod` 接受以下名称：

| 周期 | 整数取值 |
| --- | --- |
| `second` | 0-59 |
| `minute` | 0-59 |
| `hour` | 0-23 |
| `dayOfMonth` | 1-31 |
| `month` | 1-12 |
| `dayOfWeek` | 0-6，从星期日开始 |

### 构建器操作

| 方法 | 结果 |
| --- | --- |
| `on(period, ...values)` | 选择指定的值，例如 `on("hour", 9, 17)`。值会被排序并去重。至少需要一个值。 |
| `through(period, from, to)` | 选择一个包含两端的区间，例如 `through("dayOfWeek", 1, 5)`。`from` 必须小于 `to`。 |
| `each(period)` | 将字段重置为 `*`。 |
| `every(period, interval)` | 设置步长表达式，例如 `every("minute", 15)` 生成 `*/15`。 |
| `withTimeZone(timeZone)` | 使用经过校验的 IANA 时区，为表达式添加 `CRON_TZ=` 前缀。 |
| `toString()` | 返回六字段表达式的字符串，若设置了时区则包含时区。 |

每个链式方法都会修改并返回同一个构建器。对同一周期的后续调用会**替换**该字段，而不是追加另一个约束。例如，`on("hour", 9).on("hour", 17)` 只会选中 17，而 `on("hour", 9, 17)` 会同时选中两者。

值与区间端点必须是该周期取值范围内的整数。步长必须是不大于该字段取值个数的正整数：秒或分钟最大为 60，小时为 24，月中日为 31，月份为 12，星期为 7。无效的字段或值会抛出 `RangeError`。

步长是 Cron 字段步长，而不是经过时间间隔。例如，`every("hour", 2)` 会选中一天中每隔一个小时的时刻；它并不表示注册后两小时。若需要经过时间间隔，请使用 `"@every 2h"`。

`toString()` 可以脱离 Jobs 客户端单独使用。将构建器传给 `schedule` 时，取的是它当前的字符串值；之后修改构建器不会更新已存储的 job。若要更改已存储的调度，请使用 `overwrite: true` 重新调度。

## 指定时区

默认情况下，Dapr 会按 Scheduler service 的本地时区计算 Cron 调度，而不一定是 Node.js 进程所在的时区。若希望获得可预测的墙钟时间调度，请显式指定 IANA 时区：

```javascript
const schedule = new CronExpressionBuilder()
  .on("second", 0)
  .on("minute", 0)
  .on("hour", 9)
  .withTimeZone("Europe/Rome");
```

构建器使用 Node.js 的 `Intl.DateTimeFormat` 校验时区。空字符串、包含空白字符或无法识别的名称都会被拒绝。之后再次调用 `withTimeZone` 会替换之前的时区。

你也可以在原始字符串中直接传入运行时的时区前缀，例如 `"CRON_TZ=Europe/Rome 0 0 9 * * *"` 或 `"CRON_TZ=Europe/Rome @daily"`。若不希望受夏令时切换影响，请使用 `"UTC"`。使用地区时区时，Dapr 会在夏令时切换前后按本地墙钟时间计算调度。

不要将时区前缀与 `@every` 组合使用：固定时长的间隔没有墙钟时区，运行时会拒绝这种组合。关于运行时调度语法，请参阅 [Jobs API 参考]({{% ref jobs_api.md %}})。
