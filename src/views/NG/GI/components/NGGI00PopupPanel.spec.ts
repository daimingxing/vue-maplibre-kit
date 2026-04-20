import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import NGGI00PopupPanel from "./NGGI00PopupPanel.vue";

/**
 * 创建仅透传默认插槽的通用桩组件。
 * @returns 适合 SSR 测试的轻量桩组件
 */
function createSlotStub() {
  return defineComponent({
    name: "SlotStub",
    setup(_, { slots }) {
      return () => h("div", slots.default?.());
    },
  });
}

/**
 * 渲染 popup 展示组件并返回 HTML 文本。
 * @param props 组件入参
 * @returns SSR 渲染后的 HTML 字符串
 */
async function renderPopupPanel(props: Record<string, unknown>) {
  const app = createSSRApp(() => h(NGGI00PopupPanel as any, props));
  const slotStub = createSlotStub();
  const componentNames = [
    "el-button",
    "ElButton",
    "el-icon",
    "ElIcon",
    "el-tag",
    "ElTag",
    "el-descriptions",
    "ElDescriptions",
    "el-descriptions-item",
    "ElDescriptionsItem",
    "el-input-number",
    "ElInputNumber",
  ];

  componentNames.forEach((componentName) => {
    app.component(componentName, slotStub);
  });

  return renderToString(app);
}

describe("NGGI00PopupPanel", () => {
  it("会渲染线弹窗展示内容", async () => {
    const html = await renderPopupPanel({
      payload: {
        type: "line",
        featureId: "line_1",
        geometryType: "LineString",
        featureProps: { id: "line_1" },
        lineLengthMeters: 120.56,
        selectedSegmentIndex: 1,
        selectedSegmentLengthMeters: 45.12,
      },
      hasLineDraftFeatures: true,
      widthMeters: 10,
      extendLengthMeters: 20,
    });

    expect(html).toContain("线操作");
    expect(html).toContain("第 2 段");
    expect(html).toContain("生成线廊");
    expect(html).toContain("清空临时草稿");
  });

  it("会渲染点弹窗展示内容", async () => {
    const html = await renderPopupPanel({
      payload: {
        type: "point",
        featureId: "point_1",
        geometryType: "Point",
        featureProps: { name: "站点 A", status: "warning" },
      },
      hasLineDraftFeatures: false,
      widthMeters: 10,
      extendLengthMeters: 20,
    });

    expect(html).toContain("站点信息");
    expect(html).toContain("站点 A");
    expect(html).toContain("异常");
    expect(html).toContain("进入站点视图");
  });

  it("会渲染 TerraDraw 弹窗展示内容", async () => {
    const html = await renderPopupPanel({
      payload: {
        type: "terradraw",
        featureId: "draw_1",
        geometryType: "Polygon",
        featureProps: { mode: "polygon" },
      },
      hasLineDraftFeatures: false,
      widthMeters: 10,
      extendLengthMeters: 20,
    });

    expect(html).toContain("TerraDraw 要素");
    expect(html).toContain("draw_1");
    expect(html).toContain("Polygon");
    expect(html).toContain("polygon");
  });
});
