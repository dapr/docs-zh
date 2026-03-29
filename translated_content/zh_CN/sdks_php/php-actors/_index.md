---
type: docs
title: "虚拟 Actor"
linkTitle: "Actor"
weight: 1000
description: 如何构建 Actor
no_list: true
---

如果你不熟悉 Actor 模式，了解 Actor 模式的最佳位置是
[Actor 概述。]({{% ref actors-overview.md %}})

在 PHP SDK 中，Actor 有两个方面，即客户端和 Actor（也称为运行时）。作为 Actor 的客户端，
你将通过 `ActorProxy` 类与远程 Actor 交互。该类使用若干配置策略之一动态地生成代理类。

在编写 Actor 时，状态可以为你管理。你可以钩入 Actor 生命周期，并定义提醒和定时器。
这为你处理适合 Actor 模式的各类问题提供了相当大的能力。

## Actor 代理

每当您需要与 Actor 通信时，都需要获取一个代理对象来执行此操作。代理负责
序列化您的请求、反序列化响应并将其返回给您，同时遵守指定接口定义的契约。

为了创建代理，首先需要一个接口来定义您与 Actor 发送和接收的内容和方式。
例如，如果您想与一个仅跟踪计数的计数 Actor 通信，您可以将接口
定义如下：

```php
<?php
#[\Dapr\Actors\Attributes\DaprType('Counter')]
interface ICount {
    function increment(int $amount = 1): void;
    function get_count(): int;
}
```

将此接口放在 Actor 和客户端都可以访问的共享库中（如果两者都用 PHP 编写），这是一个好主意。`DaprType`
属性告诉 DaprClient 要发送到的 Actor 名称。它应该与实现的 `DaprType` 匹配，尽管
如果需要，您可以覆盖该类型。

```php
<?php
$app->run(function(\Dapr\Actors\ActorProxy $actorProxy) {
    $actor = $actorProxy->get(ICount::class, 'actor-id');
    $actor->increment(10);
});
```

## 编写 Actor

要创建 Actor，您需要实现之前定义的接口，并添加 `DaprType` 属性。所有
Actor *必须*实现 `IActor`，不过有一个 `Actor` 基类实现了样板代码，使您的实现
更加简单。

以下是计数 Actor：

```php
<?php
#[\Dapr\Actors\Attributes\DaprType('Count')]
class Counter extends \Dapr\Actors\Actor implements ICount {
    function __construct(string $id, private CountState $state) {
        parent::__construct($id);
    }
    
    function increment(int $amount = 1): void {
        $this->state->count += $amount;
    }
    
    function get_count(): int {
        return $this->state->count;
    }
}
```

最重要的是构造函数。它至少接受一个名为 `id` 的参数，该参数是 Actor 的 id。
任何其他参数都由 DI 容器注入，包括您想要使用的任何 `ActorState`。

### Actor 生命周期

Actor 通过构造函数在每个针对该 Actor 类型的请求上进行实例化。您可以使用它来计算
临时状态或处理您所需的任何特定于请求的启动，例如设置其他客户端或
连接。

实例化 Actor 后，可能会调用 `on_activation()` 方法。`on_activation()` 方法在 Actor "唤醒"
或首次创建时调用。它不会在每次请求时调用。

接下来，调用 Actor 方法。这可能来自定时器、提醒或客户端。您可以执行任何需要
完成的工作和/或抛出异常。

最后，工作结果返回给调用者。一段时间后（取决于您如何配置
服务），Actor 将被停用，并将调用 `on_deactivation()`。如果主机宕机、
daprd 崩溃或发生其他一些阻止其成功调用的错误，则可能不会调用此方法。

## Actor 状态

Actor 状态是扩展 `ActorState` 的"普通旧 PHP 对象"（POPO）。`ActorState` 基类提供了一些
有用的方法。以下是示例实现：

```php
<?php
class CountState extends \Dapr\Actors\ActorState {
    public int $count = 0;
}
```

## 注册 Actor

Dapr 期望在启动时知道服务可以托管哪些 Actor。您需要将其添加到配置中：

{{< tabpane text=true >}}

{{% tab header="Production" %}}

如果你想利用预编译的依赖注入，你需要使用一个工厂：

```php
<?php
// in config.php

return [
    'dapr.actors' => fn() => [Counter::class],
];
```

启动应用程序所需的全部内容：

```php
<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = \Dapr\App::create(
    configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions('config.php')->enableCompilation(__DIR__)
);
$app->start();
```

{{% /tab %}}
{{% tab header="Development" %}}

```php
<?php
// in config.php

return [
    'dapr.actors' => [Counter::class]
];
```

启动应用程序所需的全部内容：

```php
<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = \Dapr\App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions('config.php'));
$app->start();
```

{{% /tab %}}
{{< /tabpane >}}
