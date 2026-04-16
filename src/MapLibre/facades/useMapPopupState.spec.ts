import { describe, expect, expectTypeOf, it } from 'vitest';
import { useMapPopupState } from './useMapPopupState';

describe('useMapPopupState', () => {
  it('会在打开、更新载荷和关闭时维护统一状态', () => {
    const popup = useMapPopupState<{ id: string }>();
    expectTypeOf(popup.payload.value).toEqualTypeOf<{ id: string } | null>();

    expect(popup.visible.value).toBe(false);
    expect(popup.isOpen.value).toBe(false);
    expect(popup.lngLat.value).toBeNull();
    expect(popup.payload.value).toBeNull();

    popup.open({
      lngLat: [120, 30],
      payload: {
        id: 'point-1',
      },
    });

    expect(popup.visible.value).toBe(true);
    expect(popup.isOpen.value).toBe(true);
    expect(popup.lngLat.value).toEqual([120, 30]);
    expect(popup.payload.value).toEqual({
      id: 'point-1',
    });

    popup.setPayload({
      id: 'point-2',
    });

    expect(popup.visible.value).toBe(true);
    expect(popup.lngLat.value).toEqual([120, 30]);
    expect(popup.payload.value).toEqual({
      id: 'point-2',
    });

    popup.close();

    expect(popup.visible.value).toBe(false);
    expect(popup.isOpen.value).toBe(false);
    expect(popup.lngLat.value).toBeNull();
    expect(popup.payload.value).toBeNull();
  });
});
