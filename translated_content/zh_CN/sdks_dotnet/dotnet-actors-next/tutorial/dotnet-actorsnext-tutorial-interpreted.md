---
type: docs
title: "第 5 部分：运行时定义的状态机"
linkTitle: "5. 运行时定义"
weight: 165000
description: "以数据形式在运行时提供、上线前经过验证并被动态驱动的状态机"
---

第五个示例是前四个示例一直在为之铺路的终点：状态机不再编译进你的应用，而是在运行时以数据形式提供，上线前完成验证，并在没有编译期契约的情况下被驱动。

场景是一个设备管理平台。你要管理多种设备，例如智能锁、恒温器和阀门，每种设备类型都有自己的状态机：一把智能锁依次经历 Locked、Unlocking、Unlocked、Locking 等状态并回到 Locked，由命令和传感器事件驱动。新的设备类型通过配置接入，而不是通过代码部署；每个物理设备都是长期存在、可寻址的实体，正是[第 4 部分]({{< ref dotnet-actorsnext-tutorial-auction.md >}})所论证的、应当放在 state machine Actor 中的那类对象。这里的区别在于状态机本身是数据，因此一个编译好的 Actor 即可运行所有设备类型。

代码见：`/examples/Actor.Next/05-Interpreted/`。

## 你将构建的内容

三项能力，每一项都复用了为早先的编译期目的而构建的机制。

运行时定义的行为。由于状态机的配置是转换表（数据，而非代码），一个编译好的 `InterpretedStateMachineActor` 即可运行以数据形式提供的状态机。设备类型的状态、转换、守卫和效果都包含在一份定义文档中；每个物理设备都是运行该类型定义的解释器实例。守卫与效果（驱动电机、检查电池、发布遥测事件）通过能力注册表按名称解析，注册表中是经过审核、已编译的动作，而不是任意代码，因此新的设备类型只能由安全的 building block 组合而成。

```csharp
// 一份设备类型定义，以数据形式编写而非编译得到。可选的 includeUnlockingCompletion 标志
// 用于让测试构建一个刻意搁浅（无法离开某状态）的状态机。
public static class DeviceManagementDemo
{
    public static InterpretedMachineDefinition SmartLockDefinition(bool includeUnlockingCompletion = true, string motorEffect = "ActuateMotor") =>
        new()
        {
            DocumentVersion = 1,
            InitialState = "Locked",
            States =
            [
                new InterpretedStateDefinition { Name = "Locked" },
                new InterpretedStateDefinition { Name = "Unlocking" },
                new InterpretedStateDefinition { Name = "Unlocked" },
                new InterpretedStateDefinition { Name = "Locking" },
            ],
            Transitions = Transitions(includeUnlockingCompletion, motorEffect),
        };

    public static InterpretedMachineVerificationResult Verify(IInterpretedMachineVerifier verifier, InterpretedMachineDefinition definition) =>
        verifier.Verify(definition);

    private static IReadOnlyList<InterpretedTransitionDefinition> Transitions(bool includeUnlockingCompletion, string motorEffect)
    {
        var transitions = new List<InterpretedTransitionDefinition>
        {
            new()
            {
                Source = "Locked",
                Event = "Unlock",
                Branches = [new InterpretedBranchDefinition { Guards = ["CheckBattery"], Target = "Unlocking", Effects = [motorEffect] }],
            },
            new()
            {
                Source = "Unlocked",
                Event = "Lock",
                Branches = [new InterpretedBranchDefinition { Otherwise = true, Target = "Locking", Effects = [motorEffect] }],
            },
            new()
            {
                Source = "Locking",
                Event = "MotorStopped",
                Branches = [new InterpretedBranchDefinition { Otherwise = true, Target = "Locked" }],
            },
        };

        if (includeUnlockingCompletion)
        {
            transitions.Add(new InterpretedTransitionDefinition
            {
                Source = "Unlocking",
                Event = "MotorStopped",
                Branches = [new InterpretedBranchDefinition { Otherwise = true, Target = "Unlocked" }],
            });
        }

        return transitions;
    }
}
```

上线前验证。在设备类型接触真实硬件之前，先用解释型状态机验证器检查其定义。存在不可达状态或死胡同的状态机，意味着设备可能卡在一个再也无法离开的状态里——这是现场故障，应当在接入时就被拦下，而不是等固件发布之后才暴露。流程是：编写定义，进行确定性验证，然后部署。

动态调用。单个 control plane 无论设备类型如何，都能驱动每一台设备。由于设备类型在运行时接入，其命令集在编译期未知，control plane 使用 `IActorRegistry` 发现设备可接受哪些命令，并使用 `IDynamicActorClient` 发送命令，无需为每种类型准备编译期契约。这一调用部分是通用能力，参见[动态调用]({{< ref dotnet-actorsnext-dynamic.md >}})。

### 为何此前无法实现

此前的每一项决策在这里都产生了叠加效果。为状态版本控制构建的 manifest，成了设备可接受内容的描述；为拍卖构建的声明式状态机，成了设备类型的编写格式；为确定性测试构建的测试运行时，成了阻止有缺陷的设备类型流入真实硬件的关口；而为每种类型各设一条流，才使得运行时接入的设备类型能够被托管。

需要坦率说明这一边界：interpreted Actor 携带的是动态状态包，因此 [第 2 部分]({{< ref dotnet-actorsnext-tutorial-migration.md >}}) 中关于有类型迁移的内容刻意不适用。对设备类型进行版本管理，意味着以数据形式对其定义文档进行版本管理，而不是编写 `IActorStateUpcaster`。

## 测试

这道关口可以测试：有问题的定义在被激活之前就会被拒绝，正常的定义则会通过。

```csharp
[Fact]
public void Verification_rejects_device_type_that_can_strand_a_lock()
{
    var verifier = new InterpretedMachineVerifier(new DeviceCapabilityRegistry());
    var stranded = DeviceManagementDemo.SmartLockDefinition(includeUnlockingCompletion: false);

    var result = DeviceManagementDemo.Verify(verifier, stranded);

    Assert.False(result.IsValid);
    Assert.Contains(result.Defects, defect => defect.Contains("State 'Unlocking' is a dead end", StringComparison.Ordinal));
}

[Fact]
public async Task Definition_with_unregistered_effect_is_rejected_before_rollout()
{
    var registry = new DeviceCapabilityRegistry();
    var verifier = new InterpretedMachineVerifier(registry);
    var store = new InMemoryInterpretedMachineStore();
    var deployer = new InterpretedMachineDeployer(verifier, store);
    var definition = DeviceManagementDemo.SmartLockDefinition(motorEffect: "UnknownMotor");

    Assert.False(registry.TryGetEffect("UnknownMotor", out _));
    var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => deployer.DeployAsync("SmartLock", FrontDoor, definition).AsTask());
    Assert.Contains("Effect 'UnknownMotor'", ex.Message, StringComparison.Ordinal);
    Assert.Null(await store.GetAsync("SmartLock", FrontDoor));
}
```

`FrontDoor` 即 `ActorId.Create("front-door")`，`DeviceCapabilityRegistry` 是示例中的 `ICapabilityRegistry` 实现，它按名称注册经过审核的 `CheckBattery` 守卫和 `ActuateMotor` 效果；未注册的效果（如 `UnknownMotor`）会验证失败，因此部署会在任何内容被存储之前被拒绝。

### 为何测试是关口

验证并非可有可无的附加项：正是它让运行一份你没有编译过的定义变得安全，而且你还可以测试这道关口本身。在[第 4 部分]({{< ref dotnet-actorsnext-tutorial-auction.md >}})中用于验证编译后状态机的那类结构性检查，这里通过解释型状态机验证器执行，用来验证以数据表达的设备类型定义，因此可以在任何硬件运行之前，拒绝上线一个可能使设备搁浅的设备类型。能力注册表测试则证明了安全性的另一半：定义只能引用你已审核并注册的动作，因此拼写错误或不受支持的效果会在验证阶段失败，而不是在现场的设备上失败。

需要指出，对完全动态的状态机进行行为测试，比对有类型的状态机更浅，因为没有可供断言的编译期契约。这里承担安全责任的是结构性验证加上经过审核的能力注册表，而不是丰富的行为断言。

## 另请参阅

- [state machine Actor]({{< ref dotnet-actorsnext-statemachine.md >}})
- [动态调用]({{< ref dotnet-actorsnext-dynamic.md >}})
- [测试]({{< ref dotnet-actorsnext-testing.md >}})
- 下一篇：[第 6 部分：用 workflow 组合 interpreted Actor]({{< ref dotnet-actorsnext-tutorial-approvals.md >}})
- 返回[教程概览]({{< ref "_index.md" >}})
