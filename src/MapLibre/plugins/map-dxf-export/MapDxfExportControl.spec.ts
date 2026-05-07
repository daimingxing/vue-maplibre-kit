import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('MapDxfExportControl', () => {
  it('应复用 MapLibre 控件组外观，避免按钮内外两层背景叠加', () => {
    const source = readFileSync(resolve(__dirname, './MapDxfExportControl.vue'), 'utf-8');

    expect(source).toContain('width: 29px;');
    expect(source).toContain('height: 29px;');
    expect(source).toContain('background-color: transparent;');
    expect(source).not.toContain('min-width: 34px;');
    expect(source).not.toContain('min-height: 34px;');
    expect(source).not.toContain('background: #ffffff;');
    expect(source).not.toContain('border-radius: 4px;');
    expect(source).not.toContain('box-shadow: 0 1px 4px');
    expect(source).not.toContain('dxf-export-control__label.is-visible');
  });
});
