/** 简化后的 MapLibre 表达式值。 */
type MapExpressionValue = any;

/** 可参与属性比较的字面量值。 */
type FeaturePropertyComparableValue = string | number | boolean | null;

/**
 * 生成读取 feature properties 的 `get` 表达式。
 * @param propertyKey 属性键名
 * @returns MapLibre `get` 表达式
 */
function getFeaturePropertyExpression(propertyKey: string): any {
  return ['get', propertyKey];
}

/**
 * 当指定属性等于某个值时返回命中结果，否则回退到默认值。
 * 适合业务层快速表达“某个字段命中单个值”的样式条件。
 *
 * @param propertyKey 属性键名
 * @param expectedValue 需要命中的属性值
 * @param matchedValue 命中时返回的表达式值
 * @param fallbackValue 未命中时回退的表达式值
 * @returns 标准的 MapLibre case 表达式
 */
export function whenFeaturePropertyEquals(
  propertyKey: string,
  expectedValue: FeaturePropertyComparableValue,
  matchedValue: MapExpressionValue,
  fallbackValue: MapExpressionValue
): any {
  return [
    'case',
    ['==', getFeaturePropertyExpression(propertyKey), expectedValue],
    matchedValue,
    fallbackValue,
  ];
}

/**
 * 当指定属性命中多个候选值之一时返回命中结果，否则回退到默认值。
 * 适合业务层快速表达“多个状态码共用同一套样式”的条件。
 *
 * @param propertyKey 属性键名
 * @param expectedValues 允许命中的属性值列表
 * @param matchedValue 命中时返回的表达式值
 * @param fallbackValue 未命中时回退的表达式值
 * @returns 标准的 MapLibre match 表达式；空数组时直接回退到默认值
 */
export function whenFeaturePropertyIn(
  propertyKey: string,
  expectedValues: FeaturePropertyComparableValue[],
  matchedValue: MapExpressionValue,
  fallbackValue: MapExpressionValue
): any {
  if (expectedValues.length === 0) {
    return fallbackValue;
  }

  return ['match', getFeaturePropertyExpression(propertyKey), [...expectedValues], matchedValue, fallbackValue];
}

/**
 * 按属性值映射批量构建 match 表达式。
 * 适合像“按 id / status / type 分色”这类一眼能写成映射表的场景。
 * 若需要比较数字或布尔值，优先改用 `whenFeaturePropertyEquals / In`。
 *
 * @param propertyKey 属性键名
 * @param valueMap 属性值到表达式值的映射表
 * @param fallbackValue 未命中时回退的表达式值
 * @returns 标准的 MapLibre match 表达式；空映射时直接回退到默认值
 */
export function matchFeatureProperty(
  propertyKey: string,
  valueMap: Record<string, MapExpressionValue>,
  fallbackValue: MapExpressionValue
): any {
  const entries = Object.entries(valueMap);
  if (entries.length === 0) {
    return fallbackValue;
  }

  return [
    'match',
    getFeaturePropertyExpression(propertyKey),
    ...entries.flatMap(([expectedValue, matchedValue]) => [expectedValue, matchedValue]),
    fallbackValue,
  ];
}
