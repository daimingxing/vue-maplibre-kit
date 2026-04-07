import { cloneDeep } from 'lodash-es';

/**
 * line-pattern 正式态下隐藏基础线，仅在绘制中或编辑拖拽中保留预览线。
 * 这样可以避免底线与离散纹理同时显示，导致视觉发灰或重影。
 * @param feature 当前 TerraDraw / Measure 线要素
 * @returns 当前基础线透明度
 */
function resolvePatternPreviewLineOpacity(feature: any): number {
  const featureProperties = feature?.properties || {};

  return featureProperties.currentlyDrawing === true || featureProperties.edited === true ? 1 : 0;
}

/** 绘图控件开启线装饰时的弱化基础线默认配置。 */
export const drawDecorationWeakLineStyleConfig = {
  modeOptions: {
    linestring: {
      styles: {
        lineStringColor: '#8ea2b8',
        lineStringWidth: 2,
      },
    },
  },
};

/** 测量控件开启线装饰时的弱化基础线默认配置。 */
export const measureDecorationWeakLineStyleConfig = {
  modeOptions: {
    linestring: {
      styles: {
        lineStringColor: '#8ea2b8',
        lineStringWidth: 2,
      },
    },
  },
};

/** 绘图控件在 line-pattern 模式下的基础线预览配置。 */
export const drawPatternDecorationPreviewLineStyleConfig = {
  modeOptions: {
    linestring: {
      styles: {
        lineStringColor: '#8ea2b8',
        lineStringWidth: 2,
        lineStringOpacity: resolvePatternPreviewLineOpacity,
      },
    },
  },
};

/** 测量控件在 line-pattern 模式下的基础线预览配置。 */
export const measurePatternDecorationPreviewLineStyleConfig = {
  modeOptions: {
    linestring: {
      styles: {
        lineStringColor: '#8ea2b8',
        lineStringWidth: 2,
        lineStringOpacity: resolvePatternPreviewLineOpacity,
      },
    },
  },
};

/**
 * 根据当前线装饰配置，决定 TerraDraw / Measure 自带基础线应当使用的样式补丁。
 * line-pattern 使用“正式态隐藏、交互态显示”的预览线策略；
 * 其他模式继续使用弱化基础线策略。
 * @param lineDecorationConfig 业务层传入的线装饰配置
 * @param fallbackStyleConfig 其他模式使用的弱化基础线配置
 * @param linePatternStyleConfig line-pattern 使用的预览线配置
 * @returns 需要合并进控件配置的基础线样式补丁
 */
export function resolveDecorationBaseLineStyleConfig(
  lineDecorationConfig: any,
  fallbackStyleConfig: Record<string, unknown>,
  linePatternStyleConfig: Record<string, unknown>
) {
  if (lineDecorationConfig?.enabled !== true) {
    return {};
  }

  if (lineDecorationConfig?.defaultStyle?.mode === 'line-pattern') {
    return cloneDeep(linePatternStyleConfig);
  }

  return cloneDeep(fallbackStyleConfig);
}
