import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('MapFeatureMultiSelectControl', () => {
  it('应复用 MapLibre 控件组外观，避免按钮内外两层背景叠加', () => {
    const source = readFileSync(resolve(__dirname, './MapFeatureMultiSelectControl.vue'), 'utf-8');

    expect(source).toContain('width: 29px;');
    expect(source).toContain('height: 29px;');
    expect(source).toContain('background-color: transparent;');
    expect(source).not.toContain('min-width: 34px;');
    expect(source).not.toContain('min-height: 34px;');
    expect(source).not.toContain('background: #ffffff;');
    expect(source).not.toContain('border-radius: 4px;');
    expect(source).not.toContain('box-shadow: 0 1px 4px');
    expect(source).not.toContain('background: #2563eb;');
  });

  it('应使用两套图标表达多选开关状态，不依赖项目主题色', () => {
    const source = readFileSync(resolve(__dirname, './MapFeatureMultiSelectControl.vue'), 'utf-8');

    expect(source).toContain('multi-select-control__icon--open');
    expect(source).toContain('multi-select-control__icon--close');
    expect(source).not.toContain('color: #2563eb;');
    expect(source).not.toContain('background-color: #2563eb;');
  });
});
