---
type: docs
title: "dapr scheduler"
linkTitle: "scheduler"
description: "使用 dapr CLI 管理 Dapr Scheduler job 和 reminder"
weight: 3000
---

# dapr scheduler

管理存储在 Dapr Scheduler 中的计划 job 和 reminder。

``` bash
dapr scheduler [command]
```

## 别名
- `scheduler`
- `sched`

## 可用命令

- [list](#dapr-scheduler-list): 列出计划 job
- [get](#dapr-scheduler-get): 按键获取计划 job
- [delete](#dapr-scheduler-delete): 按键删除计划 job
- [delete-all)](#dapr-scheduler-delete-all): 按键前缀删除所有计划 job
- [export](#dapr-scheduler-export): 将所有计划 job 导出到文件
- [import](#dapr-scheduler-import): 从文件导入计划 job


## 全局标志

| 标志 | 描述 |
| -k, --kubernetes | 在 Kubernetes Dapr 集群上执行操作 |
| -n, --namespace string | Dapr 应用的 namespace（默认 "default"） |
| --scheduler-namespace string | Scheduler 运行的 namespace（默认 "dapr-system"） |

## dapr scheduler list

列出 Scheduler 中的计划 job。

```bash
dapr scheduler list [flags]
```

### 标志

- `--filter string` – 按类型筛选 job。可选值：all、app、actor、workflow、activity（默认 all）
- `-o, --output string` – 输出格式：short、wide、yaml、json（默认 short）

### 示例

```bash
$ dapr scheduler list
NAME                                           BEGIN     COUNT  LAST TRIGGER
actor/myactortype/actorid1/test1               -3.89s    1      2025-10-03T16:58:55Z
actor/myactortype/actorid2/test2               -3.89s    1      2025-10-03T16:58:55Z
app/test-scheduler/test1                       -3.89s    1      2025-10-03T16:58:55Z
app/test-scheduler/test2                       -3.89s    1      2025-10-03T16:58:55Z
activity/test-scheduler/xyz1::0::0             -888.8ms  0
activity/test-scheduler/xyz2::0::0             -888.8ms  0
workflow/test-scheduler/abc1/timer-0-TVIQGkvu  +50.0h    0
workflow/test-scheduler/abc2/timer-0-OM2xqG9m  +50.0h    0
```

```bash
$ dapr scheduler list -o wide
NAMESPACE  NAME                                           BEGIN                 EXPIRATION            SCHEDULE         DUE TIME                   TTL     REPEATS  COUNT  LAST TRIGGER
default    actor/myactortype/actorid1/test1               2025-10-03T16:58:55Z                        @every 2h46m40s  2025-10-03T17:58:55+01:00          100      1      2025-10-03T16:58:55Z
default    actor/myactortype/actorid2/test2               2025-10-03T16:58:55Z                        @every 2h46m40s  2025-10-03T17:58:55+01:00          100      1      2025-10-03T16:58:55Z
default    app/test-scheduler/test1                       2025-10-03T16:58:55Z                        @every 100m      2025-10-03T17:58:55+01:00          1234     1      2025-10-03T16:58:55Z
default    app/test-scheduler/test2                       2025-10-03T16:58:55Z  2025-10-03T19:45:35Z  @every 100m      2025-10-03T17:58:55+01:00  10000s  56788    1      2025-10-03T16:58:55Z
default    activity/test-scheduler/xyz1::0::0             2025-10-03T16:58:58Z                                         0s                                          0
default    activity/test-scheduler/xyz2::0::0             2025-10-03T16:58:58Z                                         0s                                          0
default    workflow/test-scheduler/abc1/timer-0-TVIQGkvu  2025-10-05T18:58:58Z                                         2025-10-05T18:58:58Z                        0
default    workflow/test-scheduler/abc2/timer-0-OM2xqG9m  2025-10-05T18:58:58Z                                         2025-10-05T18:58:58Z                        0
```

## dapr scheduler get

按键获取一个或多个计划 job/reminder。

```bash
dapr scheduler get <keys...> [flags]
```

### 键格式

- App job：`app/<app-id>/<job-name>`
- Actor reminder：`actor/<actor-type>/<actor-id>/<reminder-name>`
- workflow reminder：`workflow/<app-id>/<instance-id>/<reminder-name>`
- activity reminder：`activity/<app-id>/<instance-id>::<task-id>::0`（Dapr 1.19 及更高版本；更早的运行时会以 workflow instance 的代数（generation）结尾，例如 `::1`）

### 标志

- `-o, --output string` – 输出格式：`short`、`wide`、`yaml`、`json`（默认 `short`）

### 示例

```bash
dapr scheduler get app/my-app/job1 -o yaml
```

## dapr scheduler delete

删除一个或多个 job。

```bash
dapr scheduler delete <keys...>
```

### 别名
- `delete`、`d`、`del`

### 示例

```bash
dapr scheduler delete app/my-app/job1 actor/MyActor/123/reminder1
```

## dapr scheduler delete-all

按筛选键批量删除 job。

```bash
dapr scheduler delete-all <filter-key>
```

### 别名

- `delete-all`、`da`、`delall`

### 示例

```bash
dapr scheduler delete-all all
dapr scheduler delete-all app/my-app
dapr scheduler delete-all actor/MyActorType
```

## dapr scheduler export

将所有 job 和 reminder 导出到文件。

```bash
dapr scheduler export -o backup.bin
```

## dapr scheduler import

从文件导入 job 和 reminder。

```bash
dapr scheduler import -f backup.bin
```
