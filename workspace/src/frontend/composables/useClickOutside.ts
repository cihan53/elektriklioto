
import { unref, getCurrentScope, onScopeDispose, type MaybeRef } from 'vue';

// TALEP-052: Modül eksikliği FilterChips.vue'da 'Cannot find module' hatasına
// yol açıyordu. TALEP-050 sözleşmesi: dinleyiciler capture fazında kurulur,
// bileşen kaldırıldığında temizlenir (memory leak yok), Escape tuşu da
// dış alan etkileşimi sayılır.
// NOT: SSR korumasi `import.meta.client` ile yapilamaz; vitest ortaminda bu
// deger undefined'dir ve dinleyiciler hic kurulmazdi. `typeof document`
// kontrolu hem SSR'da hem testte dogru calisir.
export const useClickOutside = (
  target: MaybeRef<HTMLElement | null | undefined>,
  handler: (event: Event) => void
) => {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const onPointerDown = (event: Event) => {
    const el = unref(target);
    if (!el) return;
    const node = event.target as Node | null;
    if (node && el.contains(node)) return;
    handler(event);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') handler(event);
  };

  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown, true);

  const cleanup = () => {
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown, true);
  };

  if (getCurrentScope()) {
    onScopeDispose(cleanup);
  }

  return cleanup;
};
