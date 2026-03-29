---
type: docs
title: "生产环境参考：Actor"
linkTitle: "生产环境参考"
weight: 1000
description: 在生产环境中运行 PHP Actor
no_list: true
---

## 代理模式

Actor 代理有四种不同的处理模式。每种模式呈现不同的权衡，你需要在开发和生产环境中进行权衡。

```php
<?php
\Dapr\Actors\Generators\ProxyFactory::GENERATED;
\Dapr\Actors\Generators\ProxyFactory::GENERATED_CACHED;
\Dapr\Actors\Generators\ProxyFactory::ONLY_EXISTING;
\Dapr\Actors\Generators\ProxyFactory::DYNAMIC;
```

可以通过 `dapr.actors.proxy.generation` 配置键进行设置。

{{< tabpane text=true >}}
{{% tab header="GENERATED" %}}

这是默认模式。在此模式下，每个请求都会生成一个类并通过 `eval` 执行。它主要用于开发，不应在生产环境中使用。

{{% /tab %}}
{{% tab header="GENERATED_CACHED" %}}

这与 `ProxyModes::GENERATED` 相同，只是类存储在临时文件中，因此不需要在每次请求时重新生成。它不知道何时更新缓存的类，因此不建议在开发中使用，但在无法手动生成文件时提供此选项。

{{% /tab %}}
{{% tab header="ONLY_EXISTING" %}}

在此模式下，如果代理类不存在，将抛出异常。当你不想在生产环境中生成代码时，这很有用。你需要确保生成并预加载/自动加载该类。

### 生成代理

你可以创建一个 composer 脚本按需生成代理，以利用 `ONLY_EXISTING` 模式。

创建一个 `ProxyCompiler.php`

```php
<?php

class ProxyCompiler {
    private const PROXIES = [
        MyActorInterface::class,
        MyOtherActorInterface::class,
    ];
    
    private const PROXY_LOCATION = __DIR__.'/proxies/';
    
    public static function compile() {
        try {
            $app = \Dapr\App::create();
            foreach(self::PROXIES as $interface) {
                $output = $app->run(function(\DI\FactoryInterface $factory) use ($interface) {
                    return \Dapr\Actors\Generators\FileGenerator::generate($interface, $factory);
                });
                $reflection = new ReflectionClass($interface);
                $dapr_type = $reflection->getAttributes(\Dapr\Actors\Attributes\DaprType::class)[0]->newInstance()->type;
                $filename = 'dapr_proxy_'.$dapr_type.'.php';
                file_put_contents(self::PROXY_LOCATION.$filename, $output);
                echo "Compiled: $interface";
            }
        } catch (Exception $ex) {
            echo "Failed to generate proxy for $interface\n{$ex->getMessage()} on line {$ex->getLine()} in {$ex->getFile()}\n";
        }
    }
}
```

然后为生成的代理添加一个 psr-4 自动加载器，并在 `composer.json` 中添加一个脚本：

```json
{
  "autoload": {
    "psr-4": {
      "Dapr\\Proxies\\": "path/to/proxies"
    }
  },
  "scripts": {
    "compile-proxies": "ProxyCompiler::compile"
  }
}
```

最后，配置 dapr 仅使用生成的代理：

```php
<?php
// in config.php

return [
    'dapr.actors.proxy.generation' => ProxyFactory::ONLY_EXISTING,
];
```

{{% /tab %}}
{{% tab header="DYNAMIC" %}}

在此模式下，代理满足接口约定，但实际上并不实现接口本身（意味着 `instanceof` 将返回 `false`）。此模式利用 PHP 的一些特性来工作，适用于代码无法被 `eval` 或生成的场景。

{{% /tab %}}
{{< /tabpane >}}

### 请求

对于任何模式，创建 actor 代理的开销都非常小。创建 actor 代理对象时不会发起任何请求。

当你在代理对象上调用方法时，只有你实现的方法由你的 actor 实现提供服务。`get_id()` 在本地处理，而 `get_reminder()`、`delete_reminder()` 等由 `daprd` 处理。

## Actor 实现

PHP 中的每个 actor 实现都必须实现 `\Dapr\Actors\IActor` 并使用 `\Dapr\Actors\ActorTrait` trait。这允许快速反射并提供一些快捷方式。使用 `\Dapr\Actors\Actor` 抽象基类会自动为你完成这些，但如果你需要覆盖默认行为，可以通过实现接口并使用该 trait 来实现。

## 激活和停用

当 actor 激活时，会将一个令牌文件写入临时目录（在 Linux 上默认为 `'/tmp/dapr_' + sha256(concat(Dapr type, id))`，在 Windows 上为 `'%temp%/dapr_' + sha256(concat(Dapr type, id))`）。该文件会一直保留，直到 actor 停用或主机关闭。这确保了当 Dapr 在主机上激活 actor 时，`on_activation` 只被调用一次。

## 性能

在使用 `php-fpm` 和 `nginx` 或 Windows 上的 IIS 的生产环境中，actor 方法调用非常快。虽然 actor 在每个请求上都会被构造，但 actor 状态键仅在需要时加载，而不是在每个请求期间加载。但是，单独加载每个键会有一些开销。可以通过在状态中存储数据数组来缓解这个问题，以可用性换取速度。不建议从一开始就这样做，而是作为需要时的优化手段。

## 状态版本控制

`ActorState` 对象中的变量名直接对应存储中的键名。这意味着如果你更改变量的类型或名称，可能会遇到错误。为了解决这个问题，你可能需要对状态对象进行版本控制。为此，你需要覆盖状态的加载和存储方式。有很多方法可以解决这个问题，其中一种解决方案可能如下所示：

```php
<?php

class VersionedState extends \Dapr\Actors\ActorState {
    /**
     * @var int 存储中状态的当前版本。我们给出当前版本的默认值。 
     * 但是，它在存储中可能有不同的值。 
     */
    public int $state_version = self::VERSION;
    
    /**
     * @var int 数据的当前版本
     */
    private const VERSION = 3;
    
    /**
     * 在你的 actor 激活时调用。
     */
    public function upgrade() {
        if($this->state_version < self::VERSION) {
            $value = parent::__get($this->get_versioned_key('key', $this->state_version));
            // 更新数据结构后更新值
            parent::__set($this->get_versioned_key('key', self::VERSION), $value);
            $this->state_version = self::VERSION;
            $this->save_state();
        }
    }
    
    // 如果你在上面的方法中根据需要升级所有键，则不需要在加载/保存时遍历以前的
    // 键，你只需获取键的当前版本。
    
    private function get_previous_version(int $version): int {
        return $this->has_previous_version($version) ? $version - 1 : $version;
    }
    
    private function has_previous_version(int $version): bool {
        return $version >= 0;
    }
    
    private function walk_versions(int $version, callable $callback, callable $predicate): mixed {
        $value = $callback($version);
        if($predicate($value) || !$this->has_previous_version($version)) {
            return $value;
        }
        return $this->walk_versions($this->get_previous_version($version), $callback, $predicate);
    }
    
    private function get_versioned_key(string $key, int $version) {
        return $this->has_previous_version($version) ? $version.$key : $key;
    }
    
    public function __get(string $key): mixed {
        return $this->walk_versions(
            self::VERSION, 
            fn($version) => parent::__get($this->get_versioned_key($key, $version)),
            fn($value) => isset($value)
        );
    }
    
    public function __isset(string $key): bool {
        return $this->walk_versions(
            self::VERSION,
            fn($version) => parent::__isset($this->get_versioned_key($key, $version)),
            fn($isset) => $isset
        );
    }
    
    public function __set(string $key,mixed $value): void {
        // 可选：你可以取消设置键的以前版本
        parent::__set($this->get_versioned_key($key, self::VERSION), $value);
    }
    
    public function __unset(string $key) : void {
        // 取消设置此版本和所有以前版本
        $this->walk_versions(
            self::VERSION, 
            fn($version) => parent::__unset($this->get_versioned_key($key, $version)), 
            fn() => false
        );
    }
}
```

有很多可以优化的地方，直接在生产环境中使用它并不是一个好主意，但你可以了解它的工作原理。其中大部分将取决于你的用例，这也是 SDK 中没有类似功能的原因。例如，在此示例实现中，保留以前的值是为了防止升级期间可能出现的错误；保留以前的值允许再次运行升级，但你可能希望删除以前的值。
