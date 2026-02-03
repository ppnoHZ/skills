# HTML 开发规范

## 1. 语义化标签：优先使用语义化标签（如 `<header>`, `<footer>`, `<main>`, `<nav>`, `<article>`），提高可访问性和 SEO。

**正例**：
```html
<header>
  <nav>...</nav>
</header>
```

**反例**：
```html
<div class="header">
  <div class="nav">...</div>
</div>
```

## 2. 属性引号：属性值必须使用双引号。

**正例**：
```html
<div class="container"></div>
```

**反例**：
```html
<div class='container'></div>
<!-- 或 -->
<div class=container></div>
```

## 3. 小写命名：标签名和属性名必须小写。

**正例**：
```html
<div id="main"></div>
```

**反例**：
```html
<DIV ID="MAIN"></DIV>
```

## 4. 图片 Alt 属性：所有 `<img>` 标签必须包含 `alt` 属性。

**正例**：
```html
<img src="logo.png" alt="Company Logo">
```

**反例**：
```html
<img src="logo.png">
```

## 5. 缩进：使用 2 个空格进行缩进。

**正例**：
```html
<div>
  <p>Hello</p>
</div>
```

**反例**：
```html
<div>
    <p>Hello</p>
</div>
```
