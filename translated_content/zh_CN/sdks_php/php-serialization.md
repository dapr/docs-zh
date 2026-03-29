---
type: docs
title: "自定义序列化"
linkTitle: "自定义序列化器"
weight: 1000
description: 如何配置序列化
no_list: true
---

Dapr 使用 JSON 序列化，因此在发送/接收数据时会丢失（复杂）类型信息。

## 序列化

当从控制器返回对象、将对象传递给 `DaprClient`，或将对象存储在状态存储中时，
只有公共属性会被扫描和序列化。你可以通过实现 `\Dapr\Serialization\ISerialize` 来自定义此行为。
例如，如果你想创建一个序列化为字符串的 ID 类型，可以像这样实现：

```php
<?php

class MyId implements \Dapr\Serialization\Serializers\ISerialize 
{
    public string $id;
    
    public function serialize(mixed $value,\Dapr\Serialization\ISerializer $serializer): mixed
    {
        // $value === $this
        return $this->id; 
    }
}
```

这适用于我们拥有完全所有权的任何类型，但它不适用于来自库或 PHP 本身的类。
为此，你需要向 DI 容器注册自定义序列化器：

```php
<?php
// 在 config.php 中

class SerializeSomeClass implements \Dapr\Serialization\Serializers\ISerialize 
{
    public function serialize(mixed $value,\Dapr\Serialization\ISerializer $serializer) : mixed 
    {
        // 序列化 $value 并返回结果
    }
}

return [
    'dapr.serializers.custom'      => [SomeClass::class => new SerializeSomeClass()],
];
```

## 反序列化

反序列化的工作方式完全相同，只是接口是 `\Dapr\Deserialization\Deserializers\IDeserialize`。
