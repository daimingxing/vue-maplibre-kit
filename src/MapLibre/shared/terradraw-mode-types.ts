import type { TerradrawModeClass } from '@watergis/maplibre-gl-terradraw';

type TerradrawModeInputValue = TerradrawModeClass | object | null | undefined;

/** TerraDraw 模式配置集合。 */
export interface TerradrawModeOptionsInput {
  /** 点模式配置。 */
  point?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawPointMode>[0]
    | import('terra-draw').TerraDrawPointMode;
  /** 标记点模式配置。 */
  marker?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawMarkerMode>[0]
    | import('terra-draw').TerraDrawMarkerMode;
  /** 线模式配置。 */
  linestring?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawLineStringMode>[0]
    | import('terra-draw').TerraDrawLineStringMode;
  /** 面模式配置。 */
  polygon?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawPolygonMode>[0]
    | import('terra-draw').TerraDrawPolygonMode;
  /** 矩形模式配置。 */
  rectangle?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawRectangleMode>[0]
    | import('terra-draw').TerraDrawRectangleMode;
  /** 圆形模式配置。 */
  circle?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawCircleMode>[0]
    | import('terra-draw').TerraDrawCircleMode;
  /** 自由绘面模式配置。 */
  freehand?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawFreehandMode>[0]
    | import('terra-draw').TerraDrawFreehandMode;
  /** 自由绘线模式配置。 */
  'freehand-linestring'?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawFreehandLineStringMode>[0]
    | import('terra-draw').TerraDrawFreehandLineStringMode;
  /** 斜矩形模式配置。 */
  'angled-rectangle'?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawAngledRectangleMode>[0]
    | import('terra-draw').TerraDrawAngledRectangleMode;
  /** 传感器模式配置。 */
  sensor?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawSensorMode>[0]
    | import('terra-draw').TerraDrawSensorMode;
  /** 扇形模式配置。 */
  sector?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawSectorMode>[0]
    | import('terra-draw').TerraDrawSectorMode;
  /** 选择模式配置。 */
  select?:
    | ConstructorParameters<typeof import('terra-draw').TerraDrawSelectMode>[0]
    | import('terra-draw').TerraDrawSelectMode;
  /** 允许业务层继续扩展其他自定义模式键。 */
  [modeName: string]: TerradrawModeInputValue;
}
