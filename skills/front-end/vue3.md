# Vue 3 开发规范

## 0. 组件限制：单个 Vue 组件行数不能超过 500 行。新建组件必须使用 TypeScript。

## 1. 单文件组件 (SFC)：统一使用 `<script setup>` 语法。

**正例**：
```vue
<script setup lang="ts">
// 逻辑代码
</script>
```

**反例**：
```vue
<script>
export default {
  setup() {
    // 逻辑代码
  }
}
</script>
```

## 2. 组件命名：文件名和组件定义使用大驼峰 (PascalCase)。

**正例**：
`UserCard.vue`

**反例**：
`user-card.vue` 或 `usercard.vue`

## 3. Prop 定义：始终为 props 定义类型，必要时可以单独提出 TS 的类型定义。

**正例**：
```typescript
const props = defineProps<{
  title: string;
  count?: number;
}>();
```

**反例**：
```javascript
const props = defineProps(['title', 'count']);
```

## 4. Composition API：逻辑复用优先使用 Composable 函数 (`use...` 模式)。

**正例**：
```javascript
import { useMouse } from './useMouse';
const { x, y } = useMouse();
```

**反例**：
在组件内直接编写数百行复杂的、未封装的交互逻辑。

## 5. 指令缩写：统一使用指令缩写，如 `@click` 而非 `v-on:click`，`:prop` 而非 `v-bind:prop`。

**正例**：
```html
<button @click="submit">提交</button>
<img :src="userAvatar">
```

**反例**：
```html
<button v-on:click="submit">提交</button>
<img v-bind:src="userAvatar">
```

## 6. Key 值：`v-for` 循环必须绑定唯一的 `:key`。

**正例**：
```html
<ul>
  <li v-for="item in items" :key="item.id">{{ item.name }}</li>
</ul>
```

**反例**：
```html
<ul>
  <li v-for="item in items">{{ item.name }}</li>
</ul>
```

## 7. useTemplateRef：在 Vue 3.5+ 中，优先使用 `useTemplateRef` 代替 `ref(null)` 来获取模板引用。

**正例**：
```typescript
const inputRef = useTemplateRef<HTMLInputElement>('input-el');
```

**反例**：
```typescript
const inputRef = ref<HTMLInputElement | null>(null);
```

## 8. defineModel：在 Vue 3.4+ 中，优先使用 `defineModel` 来处理受控组件的双向绑定。

**基础绑定正例**：
```vue
<script setup lang="ts">
const model = defineModel<string>();
</script>

<template>
  <input v-model="model" />
</template>
```

**多个 model 绑定正例**：
```vue
<script setup lang="ts">
const title = defineModel<string>('title');
const count = defineModel<number>('count');
</script>

<template>
  <input v-model="title" />
  <input type="number" v-model="count" />
</template>
```

**反例**：
```vue
<script setup lang="ts">
const props = defineProps(['modelValue']);
const emit = defineEmits(['update:modelValue']);
</script>

<template>
  <input 
    :value="modelValue" 
    @input="emit('update:modelValue', $event.target.value)" 
  />
</template>
```

## 9. 事件定义：始终使用 `defineEmits` 声明组件事件，并优先使用类型标注。

**正例 (Vue 3.3+)**：
```typescript
const emit = defineEmits<{
  change: [id: number];
  update: [value: string];
}>();
```

**反例**：
```javascript
// 缺乏类型检查
const emit = defineEmits(['change', 'update']);
```

## 10. 类型安全：新建组件必须使用 TypeScript，并为变量和函数参数指定合适的类型。

**正例**：
```vue
<script setup lang="ts">
import { ref } from 'vue';

// 为变量显式指定类型
const count = ref<number>(0);
const list = ref<string[]>([]);

// 函数参数和返回值显式指定类型
function increment(val: number): void {
  count.value += val;
}
</script>
```

**反例**：
```vue
<script setup>
import { ref } from 'vue';

// 缺少类型定义（JS），或过度依赖自动推断
const count = ref(0);
const list = ref([]);

function increment(val) {
  count.value += val;
}
</script>
```
