---
type: docs 
title: "使用 PHP 进行状态管理"
linkTitle: "状态管理"
weight: 1000 
description: 如何使用
no_list: true
---

Dapr 为在应用程序中使用状态提供了一种优秀的模块化方法。学习基础知识的最佳方式是访问
[操作指南]({{% ref howto-get-save-state.md %}})。

## 元数据

许多状态组件允许您向组件传递元数据以控制组件行为的特定方面。PHP SDK 允许您通过以下方式传递该元数据：

```php
<?php
// 使用 state manager
$app->run(
    fn(\Dapr\State\StateManager $stateManager) => 
        $stateManager->save_state('statestore', new \Dapr\State\StateItem('key', 'value', metadata: ['port' => '112'])));

// 使用 DaprClient
$app->run(fn(\Dapr\Client\DaprClient $daprClient) => $daprClient->saveState(storeName: 'statestore', key: 'key', value: 'value', metadata: ['port' => '112']))
```

这是向 [Cassandra]({{% ref setup-cassandra.md %}}) 传递端口元数据的示例。

每个状态操作都允许传递元数据。

## 一致性/并发

在 PHP SDK 中，有四个类代表 Dapr 中四种不同类型的一致性和并发：

```php
<?php
[
    \Dapr\consistency\StrongLastWrite::class, 
    \Dapr\consistency\StrongFirstWrite::class,
    \Dapr\consistency\EventualLastWrite::class,
    \Dapr\consistency\EventualFirstWrite::class,
] 
```

将其中之一传递给 `StateManager` 方法或使用 `StateStore()` 属性，您可以定义状态存储应如何处理冲突。

## 并行度

执行批量读取或开始事务时，您可以指定并行度数量。如果 Dapr 必须一次读取一个键，它将从底层存储中"最多"一次读取该数量的键。这有助于控制状态存储上的负载，但会降低性能。默认值为 `10`。

## 前缀

硬编码的键名称很有用，但为什么不使状态对象更具可重用性呢？在提交事务或将对象保存到状态时，您可以传递一个应用于对象中每个键的前缀。

{{< tabpane text=true >}}

{{% tab header="Transaction prefix" %}}

```php
<?php
class TransactionObject extends \Dapr\State\TransactionalState {
    public string $key;
}

$app->run(function (TransactionObject $object ) {
    $object->begin(prefix: 'my-prefix-');
    $object->key = 'value';
    // 提交到键 `my-prefix-key`
    $object->commit();
});
```

{{% /tab %}}
{{% tab header="StateManager prefix" %}}

```php
<?php
class StateObject {
    public string $key;
}

$app->run(function(\Dapr\State\StateManager $stateManager) {
    $stateManager->load_object($obj = new StateObject(), prefix: 'my-prefix-');
    // 原始值来自 `my-prefix-key`
    $obj->key = 'value';
    // 保存到 `my-prefix-key`
    $stateManager->save_object($obj, prefix: 'my-prefix-');
});
```

{{% /tab %}}

{{< /tabpane >}}
