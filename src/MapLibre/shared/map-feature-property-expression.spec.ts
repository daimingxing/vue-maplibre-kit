import { describe, expect, it } from 'vitest';
import {
  getFeatureBoolean,
  getFeatureColor,
  getFeatureNumber,
  getFeatureProperty,
  getFeatureString,
  matchFeatureProperty,
  whenFeaturePropertyEquals,
  whenFeaturePropertyIn,
} from './map-feature-property-expression';

describe('map-feature-property-expression', () => {
  const emptyStringFallback = (propertyKey: string, fallbackValue: unknown) => [
    'case',
    ['==', ['get', propertyKey], ''],
    fallbackValue,
    ['coalesce', ['get', propertyKey], fallbackValue],
  ];

  it('会生成读取 properties 的 get 表达式', () => {
    expect(getFeatureProperty('color')).toEqual(['get', 'color']);
  });

  it('会生成带默认值的类型化属性取值表达式', () => {
    expect(getFeatureColor('color', '#79b8ff')).toEqual([
      'to-color',
      emptyStringFallback('color', '#79b8ff'),
    ]);
    expect(getFeatureNumber('width', 3)).toEqual([
      'to-number',
      emptyStringFallback('width', 3),
    ]);
    expect(getFeatureString('label', '')).toEqual([
      'to-string',
      emptyStringFallback('label', ''),
    ]);
    expect(getFeatureBoolean('disabled', false)).toEqual([
      'to-boolean',
      emptyStringFallback('disabled', false),
    ]);
  });

  it('会生成单值等值比较表达式', () => {
    expect(whenFeaturePropertyEquals('status', 'warning', '#ff8800', '#000000')).toEqual([
      'case',
      ['==', ['get', 'status'], 'warning'],
      '#ff8800',
      '#000000',
    ]);
  });

  it('会生成多值命中表达式', () => {
    expect(whenFeaturePropertyIn('status', ['warning', 'error'], '#ff8800', '#000000')).toEqual([
      'match',
      ['get', 'status'],
      ['warning', 'error'],
      '#ff8800',
      '#000000',
    ]);
  });

  it('会生成属性映射 match 表达式', () => {
    expect(matchFeatureProperty('id', { line_1: '#ff0000', line_2: '#00ff00' }, '#0000ff')).toEqual([
      'match',
      ['get', 'id'],
      'line_1',
      '#ff0000',
      'line_2',
      '#00ff00',
      '#0000ff',
    ]);
  });

  it('允许等值判断的命中值和默认值嵌套属性表达式', () => {
    expect(
      whenFeaturePropertyEquals(
        'status',
        'warning',
        getFeatureColor('warningColor', '#ef4444'),
        getFeatureColor('color', '#64748b')
      )
    ).toEqual([
      'case',
      ['==', ['get', 'status'], 'warning'],
      ['to-color', emptyStringFallback('warningColor', '#ef4444')],
      ['to-color', emptyStringFallback('color', '#64748b')],
    ]);
  });

  it('允许多值命中表达式嵌套数值表达式', () => {
    expect(
      whenFeaturePropertyIn(
        'status',
        ['warning', 'checking'],
        getFeatureNumber('activeWidth', 6),
        getFeatureNumber('width', 3)
      )
    ).toEqual([
      'match',
      ['get', 'status'],
      ['warning', 'checking'],
      ['to-number', emptyStringFallback('activeWidth', 6)],
      ['to-number', emptyStringFallback('width', 3)],
    ]);
  });

  it('允许属性映射表达式嵌套动态取值表达式', () => {
    expect(
      matchFeatureProperty(
        'kind',
        {
          pipe: getFeatureColor('pipeColor', '#1677ff'),
          area: getFeatureColor('areaColor', '#79b8ff'),
        },
        getFeatureColor('color', '#64748b')
      )
    ).toEqual([
      'match',
      ['get', 'kind'],
      'pipe',
      ['to-color', emptyStringFallback('pipeColor', '#1677ff')],
      'area',
      ['to-color', emptyStringFallback('areaColor', '#79b8ff')],
      ['to-color', emptyStringFallback('color', '#64748b')],
    ]);
  });
});
