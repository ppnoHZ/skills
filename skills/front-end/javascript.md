# JavaScript 开发规范

## 1. 变量声明：优先使用 `const`，仅在变量会被重新赋值时使用 `let`。禁止使用 `var`。

**正例**：
```javascript
const count = 1;
let index = 0;
index++;
```

**反例**：
```javascript
var count = 1;
```

## 2. 箭头函数：优先使用箭头函数（尤其是回调函数）。

**正例**：
```javascript
list.map(item => item.id);
```

**反例**：
```javascript
list.map(function(item) {
  return item.id;
});
```

## 3. 命名规范：变量和函数使用小驼峰（camelCase），类名使用大驼峰（PascalCase）。

**正例**：
```javascript
const userInfo = {};
function getUserName() {}
class UserProfile {}
```

**反例**：
```javascript
const user_info = {};
function GetUserName() {}
class userProfile {}
```

## 4. 异步处理：优先使用 `async/await` 代替 `.then()`。

**正例**：
```javascript
async function fetchData() {
  try {
    const res = await api.get();
    console.log(res);
  } catch (err) {
    console.error(err);
  }
}
```

**反例**：
```javascript
api.get().then(res => {
  console.log(res);
}).catch(err => {
  console.error(err);
});
```

## 5. 解构赋值：优先使用对象和数组的解构赋值。

**正例**：
```javascript
const { name, age } = user;
const [first, second] = list;
```

**反例**：
```javascript
const name = user.name;
const age = user.age;
const first = list[0];
```
