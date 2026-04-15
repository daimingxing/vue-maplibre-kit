import type {
  MeasureControlOptions,
  TerradrawControlOptions,
} from '../shared/mapLibre-controls-types';
import type { TerradrawModeClass } from '@watergis/maplibre-gl-terradraw';
import {
  TerraDrawAngledRectangleMode,
  TerraDrawCircleMode,
  TerraDrawFreehandLineStringMode,
  TerraDrawFreehandMode,
  TerraDrawLineStringMode,
  TerraDrawMarkerMode,
  TerraDrawPointMode,
  TerraDrawPolygonMode,
  TerraDrawRectangleMode,
  TerraDrawSectorMode,
  TerraDrawSelectMode,
  TerraDrawSensorMode,
} from 'terra-draw';

/** TerraDraw 绘图模式配置输入。 */
export type TerradrawModeOptionsInput = NonNullable<TerradrawControlOptions['modeOptions']>;

/** TerraDraw 测量模式配置输入。 */
export type MeasureModeOptionsInput = NonNullable<MeasureControlOptions['modeOptions']>;

/**
 * 判断当前模式配置值是否已经是 TerraDraw 模式实例。
 * @param modeOption 待判断的模式配置值
 * @returns 是否为可直接复用的模式实例
 */
export function isTerradrawModeInstance(modeOption: unknown): modeOption is TerradrawModeClass {
  return Boolean(
    modeOption &&
      typeof modeOption === 'object' &&
      typeof (modeOption as { mode?: unknown }).mode === 'string' &&
      typeof (modeOption as { updateOptions?: unknown }).updateOptions === 'function'
  );
}

/**
 * 将业务层传入的模式配置统一转换为 TerraDraw 模式实例。
 * 已经是模式实例的值会直接复用，未知模式键则保持原值，避免误删业务层扩展。
 * @param modeOptions TerraDraw / Measure 模式配置集合
 * @returns 可直接传给底层控件的模式实例集合
 */
export function instantiateTerradrawModeOptions(
  modeOptions: TerradrawModeOptionsInput | MeasureModeOptionsInput | null | undefined
): Record<string, TerradrawModeClass | object> {
  const instantiatedModeOptions: Record<string, TerradrawModeClass | object> = {};

  Object.entries(modeOptions || {}).forEach(([modeName, modeOption]) => {
    if (!modeOption) {
      return;
    }

    if (isTerradrawModeInstance(modeOption)) {
      instantiatedModeOptions[modeName] = modeOption;
      return;
    }

    switch (modeName) {
      case 'point':
        instantiatedModeOptions.point = new TerraDrawPointMode(
          modeOption as ConstructorParameters<typeof TerraDrawPointMode>[0]
        );
        break;
      case 'marker':
        instantiatedModeOptions.marker = new TerraDrawMarkerMode(
          modeOption as ConstructorParameters<typeof TerraDrawMarkerMode>[0]
        );
        break;
      case 'linestring':
        instantiatedModeOptions.linestring = new TerraDrawLineStringMode(
          modeOption as ConstructorParameters<typeof TerraDrawLineStringMode>[0]
        );
        break;
      case 'polygon':
        instantiatedModeOptions.polygon = new TerraDrawPolygonMode(
          modeOption as ConstructorParameters<typeof TerraDrawPolygonMode>[0]
        );
        break;
      case 'rectangle':
        instantiatedModeOptions.rectangle = new TerraDrawRectangleMode(
          modeOption as ConstructorParameters<typeof TerraDrawRectangleMode>[0]
        );
        break;
      case 'circle':
        instantiatedModeOptions.circle = new TerraDrawCircleMode(
          modeOption as ConstructorParameters<typeof TerraDrawCircleMode>[0]
        );
        break;
      case 'freehand':
        instantiatedModeOptions.freehand = new TerraDrawFreehandMode(
          modeOption as ConstructorParameters<typeof TerraDrawFreehandMode>[0]
        );
        break;
      case 'freehand-linestring':
        instantiatedModeOptions['freehand-linestring'] = new TerraDrawFreehandLineStringMode(
          modeOption as ConstructorParameters<typeof TerraDrawFreehandLineStringMode>[0]
        );
        break;
      case 'angled-rectangle':
        instantiatedModeOptions['angled-rectangle'] = new TerraDrawAngledRectangleMode(
          modeOption as ConstructorParameters<typeof TerraDrawAngledRectangleMode>[0]
        );
        break;
      case 'sensor':
        instantiatedModeOptions.sensor = new TerraDrawSensorMode(
          modeOption as ConstructorParameters<typeof TerraDrawSensorMode>[0]
        );
        break;
      case 'sector':
        instantiatedModeOptions.sector = new TerraDrawSectorMode(
          modeOption as ConstructorParameters<typeof TerraDrawSectorMode>[0]
        );
        break;
      case 'select':
        instantiatedModeOptions.select = new TerraDrawSelectMode(
          modeOption as ConstructorParameters<typeof TerraDrawSelectMode>[0]
        );
        break;
      default:
        // 对未知模式键保持透传，避免把业务侧的扩展配置静默丢掉。
        instantiatedModeOptions[modeName] = modeOption;
        break;
    }
  });

  return instantiatedModeOptions;
}
