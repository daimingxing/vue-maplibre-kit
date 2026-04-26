import { createSSRApp, defineComponent, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it, vi } from "vitest";
import NGGI00DemoPanel from "./NGGI00DemoPanel.vue";

vi.mock("vue-maplibre-kit/plugins/line-draft-preview", () => {
  return {
    LINE_DRAFT_PREVIEW_SOURCE_ID: "line-draft-preview-source",
  };
});

/**
 * 创建测试用的按钮桩组件，避免 SSR 依赖完整的 Element Plus 渲染链路。
 * @returns 仅透传默认插槽内容的按钮组件
 */
function createButtonStub() {
  return defineComponent({
    name: "ElButtonStub",
    setup(_, { slots }) {
      return () => h("button", slots.default?.());
    },
  });
}

describe("NGGI00DemoPanel", () => {
  it("会优先展示父层传入的选中集摘要状态", async () => {
    const app = createSSRApp(() =>
      h(NGGI00DemoPanel as any, {
        isSelectionActive: false,
        selectionMode: "single",
        selectedCount: 0,
        selectedFeatureIds: [],
        selectedLayerGroups: [],
        selectedCircleIds: [],
        hasSelection: false,
        selectedLineFeatureId: null,
        selectedLineSourceId: null,
        hasLineDraftFeatures: false,
        lineDraftCount: 0,
        intersectionCount: 0,
        intersectionMaterializedCount: 0,
        dxfDefaultOptions: null,
        dxfPrimaryOptions: null,
        selectionPanelState: {
          lastChangeSummary: "父层变更摘要",
          contextMenuSummary: "父层右键摘要",
        },
      }),
    );

    const buttonStub = createButtonStub();
    app.component("el-button", buttonStub);
    app.component("ElButton", buttonStub);

    const html = await renderToString(app);

    expect(html).toContain("父层变更摘要");
    expect(html).toContain("父层右键摘要");
  });

  it("会展示交点正式点示例状态与清空按钮", async () => {
    const app = createSSRApp(() =>
      h(NGGI00DemoPanel as any, {
        isSelectionActive: false,
        selectionMode: "single",
        selectedCount: 0,
        selectedFeatureIds: [],
        selectedLayerGroups: [],
        selectedCircleIds: [],
        hasSelection: false,
        selectedLineFeatureId: null,
        selectedLineSourceId: null,
        hasLineDraftFeatures: false,
        lineDraftCount: 0,
        intersectionCount: 3,
        intersectionMaterializedCount: 2,
        dxfDefaultOptions: null,
        dxfPrimaryOptions: null,
        selectionPanelState: {
          lastChangeSummary: "父层变更摘要",
          contextMenuSummary: "父层右键摘要",
        },
      }),
    );

    const buttonStub = createButtonStub();
    app.component("el-button", buttonStub);
    app.component("ElButton", buttonStub);

    const html = await renderToString(app);

    expect(html).toContain("交点正式点示例");
    expect(html).toContain("当前预览交点");
    expect(html).toContain("3 个");
    expect(html).toContain("当前正式交点");
    expect(html).toContain("2 个");
    expect(html).toContain("清空正式交点");
  });
});
