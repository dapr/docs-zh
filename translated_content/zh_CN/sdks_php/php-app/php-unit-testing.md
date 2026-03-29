---
type: docs
title: "单元测试"
linkTitle: "单元测试"
weight: 1000
description: 单元测试
no_list: true
---

单元测试和集成测试是 PHP SDK 的一等公民。通过使用 DI 容器、mock、stub 以及提供的 `\Dapr\Mocks\TestClient`，你可以编写非常细粒度的测试。

## 测试 Actor

在测试 Actor 时，我们关注两件事：

1. 基于初始状态的返回结果
2. 基于初始状态的最终状态

{{< tabpane text=true >}}

{{% tab header="使用 TestClient 进行集成测试" %}}

下面是一个测试非常简单的 actor 的示例，该 actor 更新其状态并返回特定值：

```php
<?php

// TestState.php

class TestState extends \Dapr\Actors\ActorState
{
    public int $number;
}

// TestActor.php

#[\Dapr\Actors\Attributes\DaprType('TestActor')]
class TestActor extends \Dapr\Actors\Actor
{
    public function __construct(string $id, private TestState $state)
    {
        parent::__construct($id);
    }

    public function oddIncrement(): bool
    {
        if ($this->state->number % 2 === 0) {
            return false;
        }
        $this->state->number += 1;

        return true;
    }
}

// TheTest.php

class TheTest extends \PHPUnit\Framework\TestCase
{
    private \DI\Container $container;

    public function setUp(): void
    {
        parent::setUp();
        // 创建一个默认应用并从中提取 DI 容器
        $app = \Dapr\App::create(
            configure: fn(\DI\ContainerBuilder $builder) => $builder->addDefinitions(
            ['dapr.actors' => [TestActor::class]],
            [\Dapr\DaprClient::class => \DI\autowire(\Dapr\Mocks\TestClient::class)]
        ));
        $app->run(fn(\DI\Container $container) => $this->container = $container);
    }

    public function testIncrementsWhenOdd()
    {
        $id      = uniqid();
        $runtime = $this->container->get(\Dapr\Actors\ActorRuntime::class);
        $client  = $this->getClient();

        // 从 http://localhost:1313/reference/api/actors_api/ 返回当前状态
        $client->register_get("/actors/TestActor/$id/state/number", code: 200, data: 3);

        // 确保从 http://localhost:1313/reference/api/actors_api/ 递增
        $client->register_post(
            "/actors/TestActor/$id/state",
            code: 204,
            response_data: null,
            expected_request: [
                [
                    'operation' => 'upsert',
                    'request'   => [
                        'key'   => 'number',
                        'value' => 4,
                    ],
                ],
            ]
        );

        $result = $runtime->resolve_actor(
            'TestActor',
            $id,
            fn($actor) => $runtime->do_method($actor, 'oddIncrement', null)
        );
        $this->assertTrue($result);
    }

    private function getClient(): \Dapr\Mocks\TestClient
    {
        return $this->container->get(\Dapr\DaprClient::class);
    }
}
```

{{% /tab %}}
{{% tab header="单元测试" %}}

```php
<?php

// TestState.php

class TestState extends \Dapr\Actors\ActorState
{
    public int $number;
}

// TestActor.php

#[\Dapr\Actors\Attributes\DaprType('TestActor')]
class TestActor extends \Dapr\Actors\Actor
{
    public function __construct(string $id, private TestState $state)
    {
        parent::__construct($id);
    }

    public function oddIncrement(): bool
    {
        if ($this->state->number % 2 === 0) {
            return false;
        }
        $this->state->number += 1;

        return true;
    }
}

// TheTest.php

class TheTest extends \PHPUnit\Framework\TestCase
{
    public function testNotIncrementsWhenEven() {
        $container = new \DI\Container();
        $state = new TestState($container, $container);
        $state->number = 4;
        $id = uniqid();
        $actor = new TestActor($id, $state);
        $this->assertFalse($actor->oddIncrement());
        $this->assertSame(4, $state->number);
    }
}
```

{{% /tab %}}

{{< /tabpane >}}

## 测试事务

在基于事务构建时，你可能需要测试如何处理失败的事务。为此，你需要注入故障并确保事务符合你的预期。

{{< tabpane text=true >}}

{{% tab header="使用 TestClient 进行集成测试" %}}

```php
<?php

// MyState.php
#[\Dapr\State\Attributes\StateStore('statestore', \Dapr\consistency\EventualFirstWrite::class)]
class MyState extends \Dapr\State\TransactionalState {
    public string $value = '';
}

// SomeService.php
class SomeService {
    public function __construct(private MyState $state) {}

    public function doWork() {
        $this->state->begin();
        $this->state->value = "hello world";
        $this->state->commit();
    }
}

// TheTest.php
class TheTest extends \PHPUnit\Framework\TestCase {
    private \DI\Container $container;

    public function setUp(): void
    {
        parent::setUp();
        $app = \Dapr\App::create(configure: fn(\DI\ContainerBuilder $builder)
            => $builder->addDefinitions([\Dapr\DaprClient::class => \DI\autowire(\Dapr\Mocks\TestClient::class)]));
        $this->container = $app->run(fn(\DI\Container $container) => $container);
    }

    private function getClient(): \Dapr\Mocks\TestClient {
        return $this->container->get(\Dapr\DaprClient::class);
    }

    public function testTransactionFailure() {
        $client = $this->getClient();

        // 从 {{% ref state_api %}} 创建响应
        $client->register_post('/state/statestore/bulk', code: 200, response_data: [
            [
                'key' => 'value',
                // 没有先前的值
            ],
        ], expected_request: [
            'keys' => ['value'],
            'parallelism' => 10
        ]);
        $client->register_post('/state/statestore/transaction',
            code: 200,
            response_data: null,
            expected_request: [
                'operations' => [
                    [
                        'operation' => 'upsert',
                        'request' => [
                            'key' => 'value',
                            'value' => 'hello world'
                        ]
                    ]
                ]
            ]
        );
        $state = new MyState($this->container, $this->container);
        $service = new SomeService($state);
        $service->doWork();
        $this->assertSame('hello world', $state->value);
    }
}
```

{{% /tab %}}
{{% tab header="单元测试" %}}

```php
<?php
// MyState.php
#[\Dapr\State\Attributes\StateStore('statestore', \Dapr\consistency\EventualFirstWrite::class)]
class MyState extends \Dapr\State\TransactionalState {
    public string $value = '';
}

// SomeService.php
class SomeService {
    public function __construct(private MyState $state) {}

    public function doWork() {
        $this->state->begin();
        $this->state->value = "hello world";
        $this->state->commit();
    }
}

// TheTest.php
class TheTest extends \PHPUnit\Framework\TestCase {
    public function testTransactionFailure() {
        $state = $this->createStub(MyState::class);
        $service = new SomeService($state);
        $service->doWork();
        $this->assertSame('hello world', $state->value);
    }
}
```

{{% /tab %}}

{{< /tabpane >}}
