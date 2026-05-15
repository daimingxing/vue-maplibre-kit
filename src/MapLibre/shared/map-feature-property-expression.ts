/** 简化后的 MapLibre 表达式值。 */
export type MapExpressionValue =
  | string
  | number
  | boolean
  | null
  | MapExpression
  | { [key: string]: MapExpressionValue };

/** MapLibre 表达式数组。 */
export type MapExpression = MapExpressionValue[];

/** 可参与属性比较的字面量值。 */
type FeaturePropertyComparableValue = string | number | boolean | null;

/** 业务属性名。 */
type FeaturePropertyKey = string;

/**
 * 生成读取 feature properties 的 `get` 表达式。
 * @param propertyKey 属性键名
 * @returns MapLibre `get` 表达式
 */
export function getFeatureProperty(propertyKey: FeaturePropertyKey): MapExpression {
  return ['get', propertyKey];
}

/**
 * 生成带默认值的属性取值表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认值
 * @returns MapLibre `case` 表达式，空字符串、缺失值和 null 都会回退到默认值
 */
function getFeaturePropertyWithFallback(
  propertyKey: FeaturePropertyKey,
  fallbackValue: MapExpressionValue
): MapExpression {
  const propertyExpression = getFeatureProperty(propertyKey);
  return [
    'case',
    ['==', propertyExpression, ''],
    fallbackValue,
    ['coalesce', propertyExpression, fallbackValue],
  ];
}

/**
 * 读取属性并转换为颜色表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认颜色
 * @returns MapLibre `to-color` 表达式
 */
export function getFeatureColor(
  propertyKey: FeaturePropertyKey,
  fallbackValue: string
): MapExpression {
  return ['to-color', getFeaturePropertyWithFallback(propertyKey, fallbackValue)];
}

/**
 * 读取属性并转换为数值表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认数值
 * @returns MapLibre `to-number` 表达式
 */
export function getFeatureNumber(
  propertyKey: FeaturePropertyKey,
  fallbackValue: number
): MapExpression {
  return ['to-number', getFeaturePropertyWithFallback(propertyKey, fallbackValue)];
}

/**
 * 读取属性并转换为字符串表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认字符串
 * @returns MapLibre `to-string` 表达式
 */
export function getFeatureString(
  propertyKey: FeaturePropertyKey,
  fallbackValue: string
): MapExpression {
  return ['to-string', getFeaturePropertyWithFallback(propertyKey, fallbackValue)];
}

/**
 * 读取属性并转换为布尔表达式。
 * @param propertyKey 属性键名
 * @param fallbackValue 属性不存在或为空时使用的默认布尔值
 * @returns MapLibre `to-boolean` 表达式
 */
export function getFeatureBoolean(
  propertyKey: FeaturePropertyKey,
  fallbackValue: boolean
): MapExpression {
  return ['to-boolean', getFeaturePropertyWithFallback(propertyKey, fallbackValue)];
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
    ['==', getFeatureProperty(propertyKey), expectedValue],
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

  return ['match', getFeatureProperty(propertyKey), [...expectedValues], matchedValue, fallbackValue];
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
    getFeatureProperty(propertyKey),
    ...entries.flatMap(([expectedValue, matchedValue]) => [expectedValue, matchedValue]),
    fallbackValue,
  ];
}
