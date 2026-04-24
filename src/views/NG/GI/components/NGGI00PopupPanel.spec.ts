import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import NGGI00PopupPanel from "./NGGI00PopupPanel.vue";
import { DRAFT_HINT_TEXT } from "./NGGI00PopupPanel.shared";

vi.mock("vue-maplibre-kit/plugins/line-draft-preview", () => ({
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID: "lineDraftLineLayer",
  LINE_DRAFT_PREVIEW_SOURCE_ID: "lineDraftSource",
}));

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
 * 创建会透传 disabled 与 click 的按钮桩组件。
 * @returns 适合交互测试的按钮桩组件
 */
function createButtonStub() {
  return defineComponent({
    name: "ButtonStub",
    inheritAttrs: false,
    emits: ["click"],
    setup(_, { attrs, emit, slots }) {
      return () =>
        h(
          "button",
          {
            disabled: attrs.disabled === "" || attrs.disabled === true ? true : undefined,
            onClick: () => emit("click"),
          },
          slots.default?.(),
        );
    },
  });
}

/**
 * 创建输入框桩组件，避免测试依赖 Element Plus 行为。
 * @returns 适合展示和挂载测试的输入框桩组件
 */
function createInputStub() {
  return defineComponent({
    name: "InputStub",
    props: {
      modelValue: {
        type: [Number, String],
        default: 0,
      },
    },
    setup(props) {
      return () => h("input", { value: props.modelValue as number | string });
    },
  });
}

/**
 * 构造 popup 组件测试所需的全局桩组件。
 * @returns SSR 与挂载测试可复用的桩组件字典
 */
function createGlobalStubs() {
  const slotStub = createSlotStub();
  const buttonStub = createButtonStub();
  const inputStub = createInputStub();
  return {
    "el-button": buttonStub,
    ElButton: buttonStub,
    "el-icon": slotStub,
    ElIcon: slotStub,
    "el-tag": slotStub,
    ElTag: slotStub,
    "el-descriptions": slotStub,
    ElDescriptions: slotStub,
    "el-descriptions-item": slotStub,
    ElDescriptionsItem: slotStub,
    "el-input-number": inputStub,
    ElInputNumber: inputStub,
  };
}

/**
 * 渲染 popup 展示组件并返回 HTML 文本。
 * @param props 组件入参
 * @returns SSR 渲染后的 HTML 字符串
 */
async function renderPopupPanel(props: Record<string, unknown>) {
  const app = createSSRApp(() => h(NGGI00PopupPanel as any, props));
  const globalStubs = createGlobalStubs();

  Object.entries(globalStubs).forEach(([componentName, componentStub]) => {
    app.component(componentName, componentStub);
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
        featureRef: {
          sourceId: "business-source",
          featureId: "line_1",
          layerId: "line-layer",
        },
        lineFeature: {
          type: "Feature",
          id: "line_1",
          properties: { id: "line_1" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [0, 1],
            ],
          },
        },
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

  it("未识别到具体线段时，会提示只能生成线廊而不能创建线草稿", async () => {
    const html = await renderPopupPanel({
      payload: {
        type: "line",
        featureId: "line_1",
        geometryType: "LineString",
        featureProps: { id: "line_1" },
        featureRef: {
          sourceId: "business-source",
          featureId: "line_1",
          layerId: "line-layer",
        },
        lineFeature: {
          type: "Feature",
          id: "line_1",
          properties: { id: "line_1" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [0, 1],
            ],
          },
        },
        lineLengthMeters: 120.56,
        selectedSegmentIndex: -1,
        selectedSegmentLengthMeters: 0,
      },
      hasLineDraftFeatures: false,
      widthMeters: 10,
      extendLengthMeters: 20,
    });

    expect(html).toContain("未识别");
    expect(html).toContain(DRAFT_HINT_TEXT);
  });

  it("未识别到具体线段时，会把创建线草稿按钮渲染为禁用态", async () => {
    const html = await renderPopupPanel({
      payload: {
        type: "line",
        featureId: "line_1",
        geometryType: "LineString",
        featureProps: { id: "line_1" },
        featureRef: {
          sourceId: "business-source",
          featureId: "line_1",
          layerId: "line-layer",
        },
        lineFeature: {
          type: "Feature",
          id: "line_1",
          properties: { id: "line_1" },
          geometry: {
            type: "LineString",
            coordinates: [
              [0, 0],
              [0, 1],
            ],
          },
        },
        lineLengthMeters: 120.56,
        selectedSegmentIndex: -1,
        selectedSegmentLengthMeters: 0,
      },
      hasLineDraftFeatures: false,
      widthMeters: 10,
      extendLengthMeters: 20,
    });

    expect(html).toContain("生成线廊");
    expect(html).toContain("创建线草稿");
    expect(html).toContain("disabled");
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
