---
type: docs
title: "应用"
linkTitle: "应用"
weight: 1000
description: 使用 App 类
no_list: true
---

在 PHP 中，没有默认的路由器。因此，提供了 `\Dapr\App` 类。它在底层使用 
[Nikic's FastRoute](https://github.com/nikic/FastRoute)。不过，您可以根据需要自由使用任何路由器或
框架。只需查看 `App` 类中的 `add_dapr_routes()` 方法，即可了解 actors 和
订阅是如何实现的。

每个应用都应从 `App::create()` 开始，它接受两个参数，第一个是现有的 DI 容器（如果
您有的话），第二个是回调函数，用于钩入 `ContainerBuilder` 并添加您自己的配置。

在此基础上，您应该定义路由，然后调用 `$app->start()` 来执行当前请求的路由。


```php
<?php
// app.php

require_once __DIR__ . '/vendor/autoload.php';

$app = \Dapr\App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions('config.php'));

// 添加一个 GET /test/{id} 的控制器，返回 id
$app->get('/test/{id}', fn(string $id) => $id);

$app->start();
```

## 从控制器返回

您可以从控制器返回任何内容，它将被序列化为 json 对象。您也可以请求
Psr Response 对象并返回该对象，从而允许您自定义标头，并对整个响应进行控制：

```php
<?php
$app = \Dapr\App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions('config.php'));

// 添加一个 GET /test/{id} 的控制器，返回 id
$app->get('/test/{id}', 
    fn(
        string $id, 
        \Psr\Http\Message\ResponseInterface $response, 
        \Nyholm\Psr7\Factory\Psr17Factory $factory) => $response->withBody($factory->createStream($id)));

$app->start();
```

## 将应用作为客户端使用

当您只想将 Dapr 用作客户端时，例如在现有代码中，可以调用 `$app->run()`。在这些情况下，通常
不需要自定义配置，不过，您可能希望使用编译后的 DI 容器，特别是在生产环境中：

```php
<?php
// app.php

require_once __DIR__ . '/vendor/autoload.php';

$app = \Dapr\App::create(configure: fn(\DI\ContainerBuilder $builder) => $builder->enableCompilation(__DIR__));
$result = $app->run(fn(\Dapr\DaprClient $client) => $client->get('/invoke/other-app/method/my-method'));
```

## 在其他框架中使用

提供了 `DaprClient` 对象，实际上，`App` 对象使用的所有便捷方法都是基于 `DaprClient` 构建的。

```php
<?php

require_once __DIR__ . '/vendor/autoload.php';

$clientBuilder = \Dapr\Client\DaprClient::clientBuilder();

// 您可以自定义（反）序列化，或注释掉以使用默认的 JSON 序列化器。
$clientBuilder = $clientBuilder->withSerializationConfig($yourSerializer)->withDeserializationConfig($yourDeserializer);

// 您还可以传入一个 logger
$clientBuilder = $clientBuilder->withLogger($myLogger);

// 以及更改边车的 url，例如，使用 https
$clientBuilder = $clientBuilder->useHttpClient('https://localhost:3800') 
```

在调用之前，您可以调用多个函数
