---
type: docs 
title: "Dapr PHP SDK"
linkTitle: "PHP"
weight: 1000 
description: 用于开发 Dapr 应用程序的 PHP SDK 包
no_list: true
cascade:
  github_repo: https://github.com/dapr/php-sdk
  github_subdir: daprdocs/content/en/php-sdk-docs
  path_base_for_github_subdir: content/en/developing-applications/sdks/php/
  github_branch: main
---

Dapr 提供了一个 SDK 来帮助开发 PHP 应用程序。使用它，你可以用 Dapr 创建 PHP 客户端、服务器和虚拟 Actor。

## 设置

### 前提条件

- [Composer](https://getcomposer.org/)
- [PHP 8](https://www.php.net/)

### 可选前提条件

- [Docker](https://www.docker.com/)
- [xdebug](http://xdebug.org/) -- 用于调试

## 初始化项目

在你想要创建服务的目录中，运行 `composer init` 并回答问题。
使用 `composer require dapr/php-sdk` 以及你可能希望使用的任何其他依赖项进行安装。

## 配置服务

创建一个 config.php，复制以下内容：

```php
<?php

use Dapr\Actors\Generators\ProxyFactory;
use Dapr\Middleware\Defaults\{Response\ApplicationJson,Tracing};
use Psr\Log\LogLevel;
use function DI\{env,get};

return [
    // 设置日志级别
    'dapr.log.level'               => LogLevel::WARNING,

    // 在每个请求上生成一个新的代理 - 建议在开发中使用
    'dapr.actors.proxy.generation' => ProxyFactory::GENERATED,
    
    // 在此处添加任何订阅
    'dapr.subscriptions'           => [],
    
    // 如果此服务将托管任何 Actor，请在此添加它们
    'dapr.actors'                  => [],
    
    // 如果此服务将托管任何 Actor，配置 Dapr 应将 Actor 视为空闲的时间
    'dapr.actors.idle_timeout'     => null,
    
    // 如果此服务将托管任何 Actor，配置 Dapr 检查空闲 Actor 的频率
    'dapr.actors.scan_interval'    => null,
    
    // 如果此服务将托管任何 Actor，配置 Dapr 在排空期间等待 Actor 完成的时间
    'dapr.actors.drain_timeout'    => null,
    
    // 如果此服务将托管任何 Actor，配置 Dapr 是否应等待 Actor 完成
    'dapr.actors.drain_enabled'    => null,
    
    // 你通常不需要更改此项，但如果需要可以在此设置
    'dapr.port'                    => env('DAPR_HTTP_PORT', '3500'),
    
    // 在此处添加任何自定义序列化例程
    'dapr.serializers.custom'      => [],
    
    // 在此处添加任何自定义反序列化例程
    'dapr.deserializers.custom'    => [],
    
    // 以下内容无效，因为它是默认中间件并按指定顺序处理
    'dapr.http.middleware.request'  => [get(Tracing::class)],
    'dapr.http.middleware.response' => [get(ApplicationJson::class), get(Tracing::class)],
];
```

## 创建服务

创建 `index.php` 并放入以下内容：

```php
<?php

require_once __DIR__.'/vendor/autoload.php';

use Dapr\App;

$app = App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions(__DIR__ . '/config.php'));
$app->get('/hello/{name}', function(string $name) {
    return ['hello' => $name];
});
$app->start();
```

## 试用

使用 `dapr init` 初始化 dapr，然后使用 `dapr run -a dev -p 3000 -- php -S 0.0.0.0:3000` 启动项目。

<!-- IGNORE_LINKS -->
现在你可以打开 Web 浏览器并访问 [http://localhost:3000/hello/world](http://localhost:3000/hello/world)
将 `world` 替换为你的名字、宠物的名字或任何你想要的内容。
<!-- END_IGNORE -->

恭喜，你已经创建了你的第一个 Dapr 服务！我很期待看到你用它做什么！

## 更多信息

- [Packagist](https://packagist.org/packages/dapr/php-sdk)
- [Dapr SDK 序列化]({{% ref sdk-serialization.md %}})
