import { describe, expect, it } from "vitest";
import {
  DXF_CALLBACK_GUIDE_TEXT,
  DXF_DEFAULT_CRS_CONFIG_PATH_TEXT,
  DXF_DEFAULT_CRS_TEXT,
  DXF_DEFAULT_FILE_NAME,
  DXF_DEFAULT_TRUE_COLOR_CONFIG_PATH_TEXT,
  DXF_GLOBAL_TRUE_COLOR_TEXT,
  DXF_OVERRIDE_GUIDE_TEXT,
  DXF_PLUGIN_OPTIONS_GUIDE_TEXT,
  DXF_PRIMARY_ONLY_FILE_NAME,
  buildMaterializedIntersectionFeature,
  buildIntersectionCandidates,
  buildDxfResolvedOptionsText,
  buildLineDraftStatusText,
  buildLineOperationText,
  buildSelectionChangeSummary,
  buildSelectionGuideText,
  createSelectionPanelState,
  getFeatureCollectionFeatures,
} from "./NGGI00DemoPanel.shared";

describe("NGGI00DemoPanel.shared", () => {
  it("会提供示例面板默认摘要与 DXF 说明常量", () => {
    const panelState = createSelectionPanelState();

    expect(panelState).toEqual({
      lastChangeSummary: "当前还没有发生选中集变化",
      contextMenuSummary: "当前未展示选中集摘要",
    });
    expect(DXF_DEFAULT_FILE_NAME).toBe("nggi00-business-all.dxf");
    expect(DXF_PRIMARY_ONLY_FILE_NAME).toBe("nggi00-primary-only.dxf");
    expect(DXF_DEFAULT_CRS_TEXT).toContain("EPSG");
    expect(DXF_GLOBAL_TRUE_COLOR_TEXT).toContain("DEFAULT_DXF_TRUE_COLOR_RULES");
    expect(DXF_DEFAULT_CRS_CONFIG_PATH_TEXT).toContain("createMapDxfExportPlugin");
    expect(DXF_DEFAULT_TRUE_COLOR_CONFIG_PATH_TEXT).toContain("DEFAULT_DXF_TRUE_COLOR_RULES");
    expect(DXF_OVERRIDE_GUIDE_TEXT).toContain("downloadDxf(overrides)");
    expect(DXF_OVERRIDE_GUIDE_TEXT).toContain("setMapGlobalConfig");
    expect(DXF_PLUGIN_OPTIONS_GUIDE_TEXT).toContain("mapDxfExportPlugin 可配项");
    expect(DXF_CALLBACK_GUIDE_TEXT).toContain("featureFilter");
  });

  it("会按当前选择态生成示例说明与变化摘要", () => {
    expect(buildSelectionGuideText(false, false)).toContain("当前没有选中要素");
    expect(buildSelectionGuideText(true, true)).toContain("直接绑定选择态门面");
    expect(buildSelectionGuideText(true, false)).toContain("已有选中结果");

    expect(
      buildSelectionChangeSummary({
        reason: "replace",
        selectionMode: "multiple",
        selectedCount: 3,
        addedIds: ["line_1"],
        removedIds: ["point_1"],
        circleIds: ["point_2"],
      }),
    ).toBe(
      "原因：replace；模式：多选；当前 3 个；新增 line_1；移除 point_1；circleLayer 业务 ID：point_2",
    );
  });

  it("会按线选择来源和草稿状态生成业务说明", () => {
    expect(
      buildLineOperationText({
        selectedFeatureIds: [],
        selectedLineFeatureId: null,
        selectedLineSourceId: null,
        lineDraftSourceId: "line-draft-preview-source",
      }),
    ).toContain("当前未选中线要素");

    expect(
      buildLineOperationText({
        selectedFeatureIds: ["point_1"],
        selectedLineFeatureId: null,
        selectedLineSourceId: null,
        lineDraftSourceId: "line-draft-preview-source",
      }),
    ).toContain("当前选中的不是线要素");

    expect(
      buildLineOperationText({
        selectedFeatureIds: ["line_1"],
        selectedLineFeatureId: "draft_1",
        selectedLineSourceId: "line-draft-preview-source",
        lineDraftSourceId: "line-draft-preview-source",
      }),
    ).toContain("线草稿源");

    expect(buildLineDraftStatusText(true, 2)).toContain("共 2 个");
    expect(buildLineDraftStatusText(false, 0)).toContain("当前没有线草稿");
  });

  it("会按默认配置和局部覆写结果生成 DXF 最终说明", () => {
    const text = buildDxfResolvedOptionsText(
      {
        sourceIds: null,
        fileName: DXF_DEFAULT_FILE_NAME,
        sourceCrs: "EPSG:4326",
        targetCrs: "EPSG:4547",
        layerTrueColorResolver: () => "#ffffff",
        featureTrueColorResolver: null,
      },
      {
        sourceIds: ["test_geojson_source"],
        fileName: DXF_PRIMARY_ONLY_FILE_NAME,
        sourceCrs: "EPSG:4326",
        targetCrs: "EPSG:4547",
        layerTrueColorResolver: null,
        featureTrueColorResolver: () => "#000000",
      },
    );

    expect(text).toContain("插件默认导出：范围 = 全部业务 source");
    expect(text).toContain(`文件 = ${DXF_DEFAULT_FILE_NAME}`);
    expect(text).toContain("默认颜色解析器：图层色 = 已配置；要素色 = 未配置。");
    expect(text).toContain("业务层局部覆写后：范围 = test_geojson_source");
    expect(text).toContain(`文件 = ${DXF_PRIMARY_ONLY_FILE_NAME}`);
    expect(text).toContain("图层名 = 按 sourceId + mark 生成");
  });

  it("会把业务 source 中的线要素转换成交点插件候选，并优先对齐业务属性 ID", () => {
    const candidates = buildIntersectionCandidates([
      {
        sourceId: "primary-source",
        layerId: "primary-line-layer",
        features: [
          {
            type: "Feature",
            id: 8,
            properties: {
              id: "line_1",
              name: "主线",
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0],
                [10, 10],
              ],
            },
          },
          {
            type: "Feature",
            id: "point_1",
            properties: {
              id: "point_1",
            },
            geometry: {
              type: "Point",
              coordinates: [5, 5],
            },
          },
        ],
      },
      {
        sourceId: "secondary-source",
        layerId: "secondary-line-layer",
        features: [
          {
            type: "Feature",
            properties: {
              id: "line_2",
              name: "次线",
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 10],
                [10, 0],
              ],
            },
          },
          {
            type: "Feature",
            id: "line_3_top",
            properties: {
              name: "只存在顶层 ID 的线",
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 20],
                [10, 20],
              ],
            },
          },
          {
            type: "Feature",
            properties: {
              name: "缺少 ID 的线",
            },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 5],
                [10, 5],
              ],
            },
          },
        ],
      },
    ]);

    expect(candidates).toHaveLength(3);
    expect(candidates[0].ref).toEqual({
      sourceId: "primary-source",
      featureId: "line_1",
      layerId: "primary-line-layer",
    });
    expect(candidates[1].ref).toEqual({
      sourceId: "secondary-source",
      featureId: "line_2",
      layerId: "secondary-line-layer",
    });
    expect(candidates[2].ref).toEqual({
      sourceId: "secondary-source",
      featureId: "line_3_top",
      layerId: "secondary-line-layer",
    });
  });

  it("会安全读取 FeatureCollection 要素列表，并把交点上下文落成正式点要素", () => {
    expect(getFeatureCollectionFeatures("mock.geojson")).toEqual([]);
    expect(
      getFeatureCollectionFeatures({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [0, 0],
        },
        properties: {
          id: "single-point",
        },
      }),
    ).toEqual([]);

    expect(
      getFeatureCollectionFeatures({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [1, 2],
            },
            properties: {
              id: "point_1",
            },
          },
        ],
      }),
    ).toHaveLength(1);

    const feature = buildMaterializedIntersectionFeature({
      intersectionId: "intersection-a-b",
      point: {
        lng: 121.5,
        lat: 31.2,
      },
      scope: "selected",
      leftRef: {
        sourceId: "primary-source",
        featureId: "line-a",
        layerId: "primary-line-layer",
      },
      rightRef: {
        sourceId: "secondary-source",
        featureId: "line-b",
        layerId: "secondary-line-layer",
      },
      leftSegmentIndex: 0,
      rightSegmentIndex: 1,
      isEndpointHit: false,
      participants: {
        leftLabel: "主线",
        rightLabel: "次线",
      },
    });

    expect(feature.id).toBe("intersection-a-b");
    expect(feature.properties?.id).toBe("intersection-a-b");
    expect(feature.properties?.generatedKind).toBe("intersection-materialized");
    expect(feature.properties?.leftFeatureId).toBe("line-a");
    expect(feature.geometry.coordinates).toEqual([121.5, 31.2]);
  });
});
