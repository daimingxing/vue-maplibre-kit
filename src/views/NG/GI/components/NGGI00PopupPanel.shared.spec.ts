import { describe, expect, it } from "vitest";
import {
  NGGI00_POPUP_TYPE,
  createLinePopupPayload,
  createPointPopupPayload,
  createTerradrawPopupPayload,
  getLinePopupPayload,
  getPointPopupPayload,
  getTerradrawPopupPayload,
} from "./NGGI00PopupPanel.shared";

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

    const payload = createLinePopupPayload(lineFeature as any, 99);

    expect(payload.type).toBe(NGGI00_POPUP_TYPE.line);
    expect(payload.featureId).toBe("line_1");
    expect(payload.selectedSegmentIndex).toBe(1);
    expect(payload.lineLengthMeters).toBeGreaterThan(0);
    expect(payload.selectedSegmentLengthMeters).toBeGreaterThan(0);
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
