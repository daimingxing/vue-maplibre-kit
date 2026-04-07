# UI 与主题定制

如果您希望完全保留插件提供的工具栏交互逻辑，仅仅是修改它的**外观**（例如换个颜色、换个图标），可以通过覆盖 CSS 来实现。

## 1. 替换默认按钮图标

插件为每个绘制模式提供了一个默认图标（通过背景图 `background-image` 的方式渲染）。如果您想使用自己的 SVG 图标（如 FontAwesome 图标），可以通过查找插件的特定类名并用 `!important` 覆盖它。

操作步骤：
1. 准备您的 SVG 源码。
2. 将 SVG 转换为 Base64 Data URI（可以在网上找转换工具）。
3. 在全局 CSS 中覆盖特定按钮的类。

例如，我们要把**画多边形**的按钮图标换掉：

```css
/* 找到对应的按钮类名（以 maplibregl-terradraw-add- 开头） */
.maplibregl-terradraw-add-polygon-button {
    /* 使用您的自定义 SVG Base64 */
    background: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL...') !important;
    background-position: center !important;
    background-repeat: no-repeat !important;
    /* 根据需要调整缩放比例，使其适配按钮大小 */
    background-size: 80% !important;
}
```

其他常见的类名包括：
- `.maplibregl-terradraw-add-point-button`
- `.maplibregl-terradraw-add-linestring-button`
- `.maplibregl-terradraw-select-button`
- `.maplibregl-terradraw-delete-button`

## 2. 毛玻璃主题 (Glass Theme) 示例

除了改变图标，我们还可以利用 CSS 伪类与滤镜，对整个 MapLibre 的控件组应用流行的“毛玻璃 (Glassmorphism)”特效。

下面的示例展示了如何给工具栏加上半透明和反色图标的效果：

```css
/* 给地图容器加上一个标识类 .maplibre-glass-theme */

/* 设置按钮基础圆角和边框 */
.maplibre-glass-theme .maplibregl-ctrl-group > button[class*='maplibregl-terradraw'] {
    border-radius: 6px;
    margin-bottom: 5px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background-color: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    position: relative;
}

/* 使用伪元素继承背景图标，并使用滤镜让图标变成白色 */
.maplibre-glass-theme .maplibregl-ctrl-group > button[class*='maplibregl-terradraw']::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background-image: inherit;
    background-position: inherit;
    background-repeat: inherit;
    background-size: inherit;
    /* 核心：将黑色图标反转为白色 */
    filter: brightness(0) invert(1); 
}

/* 激活(active)状态的高亮样式 */
.maplibre-glass-theme .maplibregl-ctrl-group > button[class*='maplibregl-terradraw'].active {
    background-color: rgba(0, 123, 255, 0.6); /* 主题蓝 */
    box-shadow: 0 0 12px rgba(0, 123, 255, 0.5);
}

.maplibre-glass-theme .maplibregl-ctrl-group > button[class*='maplibregl-terradraw'].active::before {
    filter: brightness(0) invert(1);
}
```

将以上样式应用到您的项目中，工具栏就会从默认的白底黑字变成非常现代的深色/玻璃态风格。如果需要彻底改变 DOM 结构，请参阅 API 章节中的编程式控制，在 Vue 中自行编写 UI。