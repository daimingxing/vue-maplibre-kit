import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('MapFeatureSnapControl', () => {
  it('应使用两套图标表达吸附开关状态，不依赖激活态底色', () => {
    const source = readFileSync(resolve(__dirname, './MapFeatureSnapControl.vue'), 'utf-8');

    expect(source).toContain('snap-control__icon--open');
    expect(source).toContain('snap-control__icon--close');
    expect(source).not.toContain('../../../../icon/');
    expect(source).not.toContain('.snap-control.is-active {\n  color: #ffffff;\n  background: #2563eb;\n}');
  });

  it('应复用 MapLibre 控件组外观，避免按钮内外两层背景叠加', () => {
    const source = readFileSync(resolve(__dirname, './MapFeatureSnapControl.vue'), 'utf-8');

    expect(source).toContain('width: 29px;');
    expect(source).toContain('height: 29px;');
    expect(source).toContain('background-color: transparent;');
    expect(source).not.toContain('min-width: 29px;');
    expect(source).not.toContain('min-height: 29px;');
    expect(source).not.toContain('box-shadow: 0 1px 4px');
  });

  it('应提供右键配置面板，并沿用控件组的白底和小圆角风格', () => {
    const source = readFileSync(resolve(__dirname, './MapFeatureSnapControl.vue'), 'utf-8');

    expect(source).toContain('@contextmenu="handleContextMenu"');
    expect(source).toContain('snap-control-panel');
    expect(source).toContain('background: #ffffff;');
    expect(source).toContain('border-radius: 4px;');
    expect(source).toContain('box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);');
    expect(source).toContain("event.key === 'Escape'");
  });

  it('应按分组渲染右键面板，并按规则或插件目标分发切换动作', () => {
    const source = readFileSync(resolve(__dirname, './MapFeatureSnapControl.vue'), 'utf-8');

    expect(source).toContain('v-for="group in groups"');
    expect(source).toContain('v-for="item in group.items"');
    expect(source).toContain("kind: 'rule' | 'target'");
    expect(source).toContain('handleItemToggle(item)');
    expect(source).toContain("props.onToggleTarget(item.id)");
    expect(source).toContain("props.onToggleRule(item.id)");
    expect(source).toContain('.snap-control-panel__group + .snap-control-panel__group');
  });
});
