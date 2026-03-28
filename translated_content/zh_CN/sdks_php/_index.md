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

Dapr 提供了一个 SDK，用于帮助开发 PHP 应用程序。使用它，你可以使用 Dapr 创建 PHP 客户端、服务器和虚拟 Actor。

## 环境准备

### 前置要求

- [Composer](https://getcomposer.org/)
- [PHP 8](https://www.php.net/)

### 可选前置要求

- [Docker](https://www.docker.com/)
- [xdebug](http://xdebug.org/) -- 用于调试

## 初始化项目

在你想要创建服务的目录中，运行 `composer init` 并回答问题。
使用 `composer require dapr/php-sdk` 安装 SDK 以及你可能需要使用的其他依赖。

## 配置服务

创建一个 config.php，复制以下内容：

```php
<?php

use Dapr\Actors\Generators\ProxyFactory;
use Dapr\Middleware\Defaults\{Response\ApplicationJson,Tracing};
use Psr\Log\LogLevel;
use function DI\{env,get};

return [
    // set the log level
    'dapr.log.level'               => LogLevel::WARNING,

    // Generate a new proxy on each request - recommended for development
    'dapr.actors.proxy.generation' => ProxyFactory::GENERATED,
    
    // put any subscriptions here
    'dapr.subscriptions'           => [],
    
    // if this service will be hosting any actors, add them here
    'dapr.actors'                  => [],
    
    // if this service will be hosting any actors, configure how long until dapr should consider an actor idle
    'dapr.actors.idle_timeout'     => null,
    
    // if this service will be hosting any actors, configure how often dapr will check for idle actors 
    'dapr.actors.scan_interval'    => null,
    
    // if this service will be hosting any actors, configure how long dapr will wait for an actor to finish during drains
    'dapr.actors.drain_timeout'    => null,
    
    // if this service will be hosting any actors, configure if dapr should wait for an actor to finish
    'dapr.actors.drain_enabled'    => null,
    
    // you shouldn't have to change this, but the setting is here if you need to
    'dapr.port'                    => env('DAPR_HTTP_PORT', '3500'),
    
    // add any custom serialization routines here
    'dapr.serializers.custom'      => [],
    
    // add any custom deserialization routines here
    'dapr.deserializers.custom'    => [],
    
    // the following has no effect, as it is the default middlewares and processed in order specified
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

## 试一下

使用 `dapr init` 初始化 Dapr，然后使用 `dapr run -a dev -p 3000 -- php -S 0.0.0.0:3000` 启动项目。

<!-- IGNORE_LINKS -->
现在你可以打开浏览器并访问 [http://localhost:3000/hello/world](http://localhost:3000/hello/world)，将 `world` 替换为你的名字、宠物的名字或任何你想要的内容。
<!-- END_IGNORE -->

恭喜，你已经创建了第一个 Dapr 服务！我很期待看到你会用它做什么！

## 更多信息

- [Packagist](https://packagist.org/packages/dapr/php-sdk)
- [Dapr SDK 序列化]({{% ref sdk-serialization.md %}})
