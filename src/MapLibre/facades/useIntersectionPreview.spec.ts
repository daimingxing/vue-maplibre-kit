import { computed, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useIntersectionPreview } from './useIntersectionPreview';

describe('useIntersectionPreview', () => {
  it('会读取交点插件状态并透出基础动作', () => {
    const api = {
      refresh: () => undefined,
      clear: () => undefined,
      materialize: () => true,
      removeMaterialized: () => true,
      updateMaterializedProperties: () => true,
      clearMaterialized: () => undefined,
      show: () => undefined,
      hide: () => undefined,
      setScope: () => undefined,
      getData: () => ({
        type: 'FeatureCollection',
        features: [],
      }),
      getMaterializedData: () => ({
        type: 'FeatureCollection',
        features: [],
      }),
      getById: () => null,
      getSelected: () => null,
    };
    const state = computed(() => ({
      visible: true,
      scope: 'all' as const,
      count: 2,
      materializedCount: 1,
      selectedId: null,
      lastError: null,
    }));

    const mapRef = ref({
      plugins: {
        list: () => [{ id: 'intersectionPreview', type: 'intersectionPreview' }],
        getApi: () => api,
        getState: () => state.value,
      },
    });

    const preview = useIntersectionPreview(mapRef as any);

    expect(preview.count.value).toBe(2);
    expect(preview.materializedCount.value).toBe(1);
    expect(preview.visible.value).toBe(true);
    expect(preview.scope.value).toBe('all');
    expect(preview.materialize()).toBe(true);
    expect(preview.removeMaterialized('intersection-a')).toBe(true);
    expect(preview.updateMaterializedProperties('intersection-a', { name: '已确认' })).toBe(true);
    expect(typeof preview.refresh).toBe('function');
  });
});
