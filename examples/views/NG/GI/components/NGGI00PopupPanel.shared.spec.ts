import { describe, expect, it, vi } from "vitest";

vi.mock("vue-maplibre-kit/plugins/line-draft-preview", () => ({
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID: "lineDraftLineLayer",
  LINE_DRAFT_PREVIEW_SOURCE_ID: "lineDraftSource",
}));
import {
  DRAFT_HINT_TEXT,
  DRAFT_WARN_TEXT,
  NGGI00_POPUP_TYPE,
  createLinePopupPayload,
  createPointPopupPayload,
  createTerradrawPopupPayload,
  getDraftWarn,
  hasLineSegment,
  getLineActionPayload,
  getLinePopupPayload,
  getPointPopupPayload,
  getTerradrawPopupPayload,
} from "./NGGI00PopupPanel.shared";
import {
  LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
  LINE_DRAFT_PREVIEW_SOURCE_ID,
} from "vue-maplibre-kit/plugins/line-draft-preview";

describe("NGGI00PopupPanel.shared", () => {
  it("会创建点弹窗载荷并克隆属性快照", () => {
    const pointFeature = {
      id: "point_feature_id",
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [120, 30],
      },
      properties: {
        id: "point_prop_id",
        name: "站点 A",
      },
    };

    const payload = createPointPopupPayload(pointFeature as any, null);

    expect(payload).toEqual({
      type: NGGI00_POPUP_TYPE.point,
      featureId: "point_prop_id",
      geometryType: "Point",
      featureProps: {
        id: "point_prop_id",
        name: "站点 A",
      },
    });

    pointFeature.properties.name = "站点 B";
    expect(payload.featureProps.name).toBe("站点 A");
  });

  it("会创建线弹窗载荷并约束线段索引范围", () => {
    const lineFeature = {
      id: "line_1",
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [0, 1],
          [0, 2],
        ],
      },
      properties: {
        id: "line_1",
      },
    };
    const featureRef = {
      sourceId: "business-source",
      featureId: "line_1",
      layerId: "line-layer",
    };

    const payload = createLinePopupPayload(lineFeature as any, 99, featureRef);

    expect(payload.type).toBe(NGGI00_POPUP_TYPE.line);
    expect(payload.featureId).toBe("line_1");
    expect(payload.featureRef).toEqual(featureRef);
    expect(payload.lineFeature).toEqual(lineFeature);
    expect(payload.selectedSegmentIndex).toBe(1);
    expect(payload.lineLengthMeters).toBeGreaterThan(0);
    expect(payload.selectedSegmentLengthMeters).toBeGreaterThan(0);

    lineFeature.properties.id = "line_2";
    featureRef.featureId = "line_2";
    expect(payload.lineFeature.properties.id).toBe("line_1");
    expect(payload.featureRef?.featureId).toBe("line_1");
  });

  it("未显式传入 featureRef 时，会为线草稿自动补齐动作目标来源引用", () => {
    const draftLineFeature = {
      id: "draft_1",
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [0, 0],
          [0, 1],
        ],
      },
      properties: {
        id: "draft_1",
        generatedKind: "line-corridor-draft",
      },
    };

    const payload = createLinePopupPayload(draftLineFeature as any, -1);
    const actionPayload = getLineActionPayload(payload);

    expect(payload.featureRef).toEqual({
      sourceId: LINE_DRAFT_PREVIEW_SOURCE_ID,
      featureId: "draft_1",
      layerId: LINE_DRAFT_PREVIEW_LINE_LAYER_ID,
    });
    expect(actionPayload?.segmentIndex).toBe(-1);
    expect(actionPayload?.featureRef?.sourceId).toBe(LINE_DRAFT_PREVIEW_SOURCE_ID);
  });

  it("未命中具体线段时，会给出统一的线草稿阻断判定与提示文案", () => {
    const actionPayload = getLineActionPayload({
      type: NGGI00_POPUP_TYPE.line,
      featureId: "line_1",
      geometryType: "LineString",
      featureProps: { id: "line_1" },
      featureRef: null,
      lineFeature: {
        id: "line_1",
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [0, 0],
            [0, 1],
          ],
        },
        properties: { id: "line_1" },
      } as any,
      lineLengthMeters: 100,
      selectedSegmentIndex: -1,
      selectedSegmentLengthMeters: 0,
    });

    expect(hasLineSegment(actionPayload)).toBe(false);
    expect(DRAFT_HINT_TEXT).toContain("不能创建线草稿");
    expect(getDraftWarn(actionPayload)).toBe(DRAFT_WARN_TEXT);
  });

  it("会创建 TerraDraw 载荷并支持统一提取不同类型的 payload", () => {
    const terradrawPayload = createTerradrawPopupPayload(
      {
        id: "draw_feature_id",
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [0, 1],
              [1, 1],
              [0, 0],
            ],
          ],
        },
        properties: {
          mode: "polygon",
        },
      } as any,
      "draw_1",
    );

    expect(getTerradrawPopupPayload(terradrawPayload)?.featureId).toBe("draw_1");
    expect(getPointPopupPayload(terradrawPayload)).toBeNull();
    expect(getLinePopupPayload(terradrawPayload)).toBeNull();
  });
});
