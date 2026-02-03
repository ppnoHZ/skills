# CSS 开发规范

## 1. 命名规范：推荐使用 BEM (Block Element Modifier) 命名约定。

**正例**：
```css
.menu__item--active {
  color: red;
}
```

**反例**：
```css
.menuItemActive {
  color: red;
}
/* 或 */
.active-menu-item {
  color: red;
}
```

## 2. 变量使用：优先使用 CSS 变量 (Custom Properties) 定义颜色、间距等主题相关属性。

**正例**：
```css
:root {
  --primary-color: #3498db;
}

.button {
  color: var(--primary-color);
}
```

**反例**：
```css
.button {
  color: #3498db;
}
```

## 3. 布局：优先使用 Flexbox 或 Grid 进行布局，减少使用 `float`。

**正例**：
```css
.container {
  display: flex;
  justify-content: center;
}
```

**反例**：
```css
.container {
  float: left;
  width: 50%;
}
```

## 4. 单位：推荐使用 `rem` 或 `em` 作为响应式单位，边框等固定尺寸使用 `px`。

**正例**：
```css
.text {
  font-size: 1rem;
  border: 1px solid #ccc;
}
```

**反例**：
```css
.text {
  font-size: 16px;
  border: 0.1rem solid #ccc;
}
```

## 5. 避免内联样式：除非动态计算，否则禁止使用 `style` 属性。

**正例**：
```html
<div class="card"></div>
```

**反例**：
```html
<div style="color: red; padding: 10px;"></div>
```
