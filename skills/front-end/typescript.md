# TypeScript 开发规范

## 1. 显式类型声明：在函数参数和返回值上强制使用显式类型声明。

**正例**：
```typescript
function add(a: number, b: number): number {
  return a + b;
}
```

**反例**：
```typescript
function add(a, b) {
  return a + b;
}
```

## 2. 避免使用 any：严禁滥用 `any` 类型，优先使用 `unknown` 或定义具体的 `interface/type`。

**正例**：
```typescript
const data: unknown = JSON.parse(str);
if (typeof data === 'object' && data !== null) {
  // 进行类型收窄
}
```

**反例**：
```typescript
const data: any = JSON.parse(str);
```

## 3. Interface vs Type：定义对象结构优先使用 `interface`，定义联合类型或交叉类型使用 `type`。

**正例**：
```typescript
interface User {
  name: string;
}

type ID = string | number;
```

**反例**：
```typescript
type User = {
  name: string;
};
```

## 4. 可选链：合理使用可选链 (`?.`) 和空值合并运算符 (`??`)。

**正例**：
```typescript
const name = user?.profile?.name ?? 'Guest';
```

**反例**：
```typescript
const name = user && user.profile ? user.profile.name : 'Guest';
```
