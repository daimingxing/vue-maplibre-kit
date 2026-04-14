import { describe, expect, it } from 'vitest';
import {
  matchFeatureProperty,
  whenFeaturePropertyEquals,
  whenFeaturePropertyIn,
} from './map-feature-property-expression';

describe('map-feature-property-expression', () => {
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
});
