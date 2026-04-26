import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('mapLibre-init template', () => {
  it('应渲染默认插槽，允许 MglPopup 等地图子组件放在 MapLibreInit 内部', () => {
    const filePath = resolve(process.cwd(), 'src/MapLibre/core/mapLibre-init.vue');
    const content = readFileSync(filePath, 'utf-8');

    expect(content).toContain('<slot></slot>');
  });
});
