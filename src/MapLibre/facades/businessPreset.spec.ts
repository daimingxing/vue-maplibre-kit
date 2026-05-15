import { describe, expect, it } from "vitest";
import { createMapBusinessSourceRegistry } from "./createMapBusinessSource";
import type * as BusinessPresetModule from "./businessPreset";
import {
  getFeatureColor,
  getFeatureNumber,
} from "../shared/map-feature-property-expression";

/** 生成属性空字符串、缺失值和 null 时回退默认值的期望表达式。 */
function createFallbackExpression(propertyKey: string, fallbackValue: unknown) {
  return [
    "case",
    ["==", ["get", propertyKey], ""],
    fallbackValue,
    ["coalesce", ["get", propertyKey], fallbackValue],
  ];
}

/**
 * 动态读取业务预设模块。
 * @returns 业务预设模块
 */
async function loadBusinessPreset(): Promise<typeof BusinessPresetModule> {
  (globalThis as any).window = globalThis;
  return import("./businessPreset");
}

describe("businessPreset", () => {
  it("应创建常用简单样式", async () => {
    const businessPreset = await loadBusinessPreset();
    const {
      createSimpleCircleStyle,
      createSimpleFillStyle,
      createSimpleLineStyle,
    } = businessPreset;
    const lineStyle = createSimpleLineStyle({ color: "#2563eb", width: 3 });
    const circleStyle = createSimpleCircleStyle({
      color: "#16a34a",
      radius: 8,
    });
    const fillStyle = createSimpleFillStyle({ color: "#f97316", opacity: 0.2 });

    expect(lineStyle.paint!["line-color"]).toBe("#2563eb");
    expect(lineStyle.paint!["line-width"]).toBe(3);
    expect(circleStyle.paint!["circle-color"]).toBe("#16a34a");
    expect(circleStyle.paint!["circle-radius"]).toBe(8);
    expect(fillStyle.paint!["fill-color"]).toBe("#f97316");
    expect(fillStyle.paint!["fill-opacity"]).toBe(0.2);
  }, 20000);

  it("简单样式工厂应支持表达式值", async () => {
    const businessPreset = await loadBusinessPreset();
    const {
      createSimpleCircleStyle,
      createSimpleFillStyle,
      createSimpleLineStyle,
    } = businessPreset;
    const lineStyle = createSimpleLineStyle({
      color: getFeatureColor("color", "#2563eb"),
      width: getFeatureNumber("width", 3),
      opacity: getFeatureNumber("opacity", 0.8),
    });
    const circleStyle = createSimpleCircleStyle({
      color: getFeatureColor("color", "#16a34a"),
      radius: getFeatureNumber("radius", 8),
      strokeColor: getFeatureColor("strokeColor", "#ffffff"),
      strokeWidth: getFeatureNumber("strokeWidth", 2),
    });
    const fillStyle = createSimpleFillStyle({
      color: getFeatureColor("color", "#f97316"),
      opacity: getFeatureNumber("opacity", 0.2),
      outlineColor: getFeatureColor("outlineColor", "#ffffff"),
    });

    expect(lineStyle.paint!["line-color"]).toEqual([
      "to-color",
      createFallbackExpression("color", "#2563eb"),
    ]);
    expect(lineStyle.paint!["line-width"]).toEqual([
      "to-number",
      createFallbackExpression("width", 3),
    ]);
    expect(lineStyle.paint!["line-opacity"]).toEqual([
      "to-number",
      createFallbackExpression("opacity", 0.8),
    ]);
    expect(circleStyle.paint!["circle-color"]).toEqual([
      "to-color",
      createFallbackExpression("color", "#16a34a"),
    ]);
    expect(circleStyle.paint!["circle-radius"]).toEqual([
      "to-number",
      createFallbackExpression("radius", 8),
    ]);
    expect(circleStyle.paint!["circle-stroke-color"]).toEqual([
      "to-color",
      createFallbackExpression("strokeColor", "#ffffff"),
    ]);
    expect(circleStyle.paint!["circle-stroke-width"]).toEqual([
      "to-number",
      createFallbackExpression("strokeWidth", 2),
    ]);
    expect(fillStyle.paint!["fill-color"]).toEqual([
      "to-color",
      createFallbackExpression("color", "#f97316"),
    ]);
    expect(fillStyle.paint!["fill-opacity"]).toEqual([
      "to-number",
      createFallbackExpression("opacity", 0.2),
    ]);
    expect(fillStyle.paint!["fill-outline-color"]).toEqual([
      "to-color",
      createFallbackExpression("outlineColor", "#ffffff"),
    ]);
  }, 10000);

  it("应把图层组简写转换为现有业务图层描述", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createLayerGroup, createSimpleLineStyle } = businessPreset;
    const layers = createLayerGroup({
      sourceId: " pipe ",
      defaultPolicy: { fixedKeys: ["id"] },
      defaultStyle: createSimpleLineStyle({ color: "#2563eb" }),
      layers: [
        {
          type: "line",
          id: " line ",
          where: { kind: "pipe" },
          geometryTypes: ["LineString"],
        },
      ],
    });

    expect(layers).toHaveLength(1);
    expect(layers[0]).toMatchObject({
      type: "line",
      layerId: "pipe-line",
      where: { kind: "pipe" },
      geometryTypes: ["LineString"],
      propertyPolicy: { fixedKeys: ["id"] },
    });
  });

  it("图层组 sourceId 和 layer id 为空时应直接失败", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createLayerGroup } = businessPreset;

    expect(() =>
      createLayerGroup({
        sourceId: " ",
        layers: [
          {
            type: "line",
            id: "pipe-line",
          },
        ],
      }),
    ).toThrow("[createLayerGroup] sourceId 不能为空");

    expect(() =>
      createLayerGroup({
        sourceId: "pipe",
        layers: [
          {
            type: "line",
            id: " ",
          },
        ],
      }),
    ).toThrow("[createLayerGroup] layer id 不能为空");
  });

  it("不再提供控件预设工厂", async () => {
    const businessPreset = await loadBusinessPreset();

    expect("createMapControlsPreset" in businessPreset).toBe(false);
  });

  it("应创建常用业务插件配置", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const sourceRegistry = createMapBusinessSourceRegistry();
    const plugins = createBusinessPlugins({
      sourceRegistry,
      snap: {
        businessLayers: {
          管线: "pipe-line",
        },
      },
      lineDraft: true,
      intersection: {
        targetSourceIds: ["primary"],
      },
      polygonEdge: true,
      multiSelect: true,
      dxfExport: {
        control: {
          enabled: false,
        },
      },
    });

    expect(plugins.map((plugin) => plugin.type)).toEqual([
      "mapFeatureSnap",
      "lineDraftPreview",
      "intersectionPreview",
      "polygonEdgePreview",
      "mapFeatureMultiSelect",
      "mapDxfExport",
    ]);
    expect((plugins[0].options as any).businessLayers.rules[0]).toMatchObject({
      id: "管线",
      label: "管线",
      layerIds: ["pipe-line"],
    });
    expect((plugins[2].options as any).sourceRegistry).toBe(sourceRegistry);
    expect((plugins[3].options as any).enabled).toBe(true);
    expect((plugins[5].options as any).sourceRegistry).toBe(sourceRegistry);
    expect((plugins[5].options as any).control.enabled).toBe(false);
  });

  it("应支持顶层 sourceRegistry 复用和 dxfExport 布尔简写", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const sourceRegistry = createMapBusinessSourceRegistry();
    const plugins = createBusinessPlugins({
      sourceRegistry,
      intersection: {
        targetLayerIds: ["pipe-line"],
      },
      dxfExport: true,
    });

    expect(plugins.map((plugin) => plugin.type)).toEqual([
      "intersectionPreview",
      "mapDxfExport",
    ]);
    expect((plugins[0].options as any).sourceRegistry).toBe(sourceRegistry);
    expect((plugins[0].options as any).targetSourceIds).toEqual([]);
    expect((plugins[0].options as any).targetLayerIds).toEqual(["pipe-line"]);
    expect((plugins[1].options as any).sourceRegistry).toBe(sourceRegistry);
    expect((plugins[1].options as any).enabled).toBe(true);
  });

  it("应把 DXF 扁平任务参数归入 defaults", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const sourceRegistry = createMapBusinessSourceRegistry();
    const plugins = createBusinessPlugins({
      sourceRegistry,
      dxfExport: {
        control: { enabled: false },
        sourceCrs: "EPSG:4326",
        targetCrs: "EPSG:3857",
        fileName: "business.dxf",
        defaults: {
          pointMode: "circle",
        },
      },
    });

    expect((plugins[0].options as any).control).toEqual({ enabled: false });
    expect((plugins[0].options as any).defaults).toMatchObject({
      sourceCrs: "EPSG:4326",
      targetCrs: "EPSG:3857",
      fileName: "business.dxf",
      pointMode: "circle",
    });
  });

  it("intersection 使用 getCandidates 高级模式时不强制要求目标范围和 sourceRegistry", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const getCandidates = () => [];

    const plugins = createBusinessPlugins({
      intersection: {
        getCandidates,
      },
    });

    expect(plugins).toHaveLength(1);
    expect(plugins[0].type).toBe("intersectionPreview");
    expect((plugins[0].options as any).getCandidates).toBe(getCandidates);
    expect((plugins[0].options as any).targetSourceIds).toEqual([]);
  });

  it("intersection 自动模式缺少目标范围时应提示补充 targetSourceIds 或 targetLayerIds", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const sourceRegistry = createMapBusinessSourceRegistry();

    expect(() =>
      createBusinessPlugins({
        sourceRegistry,
        intersection: {} as any,
      }),
    ).toThrow(
      "createBusinessPlugins({ intersection }) 自动模式需要 targetSourceIds 或 targetLayerIds",
    );
  });

  it("intersection 自动模式缺少 sourceRegistry 时应提示补充数据来源", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;

    expect(() =>
      createBusinessPlugins({
        intersection: {
          targetLayerIds: ["pipe-line"],
        },
      }),
    ).toThrow(
      "createBusinessPlugins({ intersection }) 自动模式需要 sourceRegistry；高级模式请改用 getCandidates",
    );
  });

  it("应允许 snap 直接传完整 businessLayers 配置", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const plugins = createBusinessPlugins({
      snap: {
        businessLayers: {
          enabled: true,
          rules: [
            {
              id: "custom-snap",
              layerIds: ["custom-line"],
              snapTo: ["vertex", "segment"],
            },
          ],
        },
      },
    });

    expect(plugins[0].type).toBe("mapFeatureSnap");
    expect((plugins[0].options as any).layerIds).toBeUndefined();
    expect((plugins[0].options as any).businessLayers.rules[0].id).toBe(
      "custom-snap",
    );
  });

  it("应兼容 snap.layerIds 旧版业务图层吸附简写", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const plugins = createBusinessPlugins({
      snap: {
        layerIds: ["pipe-line"],
        ruleDefaults: {
          snapTo: ["vertex"],
          tolerancePx: 18,
        },
      },
    });

    expect((plugins[0].options as any).layerIds).toBeUndefined();
    expect((plugins[0].options as any).businessLayers).toEqual({
      enabled: true,
      rules: [
        {
          id: "business-layer-snap",
          label: "业务图层",
          layerIds: ["pipe-line"],
          snapTo: ["vertex"],
          tolerancePx: 18,
        },
      ],
    });
  });

  it("同时传 businessLayers 和旧版 layerIds 时应优先使用 businessLayers", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const plugins = createBusinessPlugins({
      snap: {
        layerIds: ["legacy-line"],
        businessLayers: {
          新规则: "pipe-line",
        },
      },
    });

    expect((plugins[0].options as any).businessLayers.rules).toEqual([
      {
        id: "新规则",
        label: "新规则",
        layerIds: ["pipe-line"],
      },
    ]);
  });

  it("snap businessLayers 简写应生成带 id 和 label 的业务图层规则", async () => {
    const businessPreset = await loadBusinessPreset();
    const { createBusinessPlugins } = businessPreset;
    const plugins = createBusinessPlugins({
      snap: {
        defaultTolerancePx: 12,
        ruleDefaults: {
          snapTo: ["vertex"],
        },
        businessLayers: {
          主正式线: "pipe-line",
          parcelBorder: {
            label: "地块边界",
            layerIds: ["parcel-line", "parcel-fill"],
            snapTo: ["vertex", "segment"],
            tolerancePx: 20,
          },
        },
      },
    });

    const [lineRule, parcelRule] = (plugins[0].options as any).businessLayers
      .rules;
    expect(lineRule).toMatchObject({
      id: "主正式线",
      label: "主正式线",
      layerIds: ["pipe-line"],
      snapTo: ["vertex"],
    });
    expect(parcelRule).toMatchObject({
      id: "parcelBorder",
      label: "地块边界",
      layerIds: ["parcel-line", "parcel-fill"],
      snapTo: ["vertex", "segment"],
      tolerancePx: 20,
    });
    expect((plugins[0].options as any).defaultTolerancePx).toBe(12);
  });
});
