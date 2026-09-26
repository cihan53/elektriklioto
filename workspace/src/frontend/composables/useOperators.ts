
import type { OperatorItem } from '~/types/station';
import defaultOperators from '~/data/operators.json';

export const useOperators = () => {
  const config = useRuntimeConfig();
  const operators = useState<OperatorItem[]>('operators-cache', () => defaultOperators as OperatorItem[]);
  const loading = useState<boolean>('operators-loading', () => false);
  const error = useState<string | null>('operators-error', () => null);

  const fetchOperators = async (force = false) => {
    if (!force && operators.value.length >= 170) return;
    loading.value = true;
    error.value = null;

    try {
      const res: any = await $fetch(`${config.public.apiBase}/operators`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (list && list.length > 0) {
        if (list.length >= 170) {
          // TALEP-024: İstasyon sayılarını koru ve birleştir
          const opMap = new Map<string, OperatorItem>();
          for (const op of (defaultOperators as OperatorItem[])) {
            opMap.set(op.slug, op);
          }
          for (const op of list) {
            const existing = opMap.get(op.slug);
            opMap.set(op.slug, {
              ...existing,
              ...op,
              station_count: op.station_count ?? existing?.station_count ?? 0,
            });
          }
          operators.value = Array.from(opMap.values());
        } else {
          // TALEP-023: Eksik veya parçalı API yanıtlarında EPDK 179 marka tabanını koru ve birleştir
          const opMap = new Map<string, OperatorItem>();
          for (const op of (defaultOperators as OperatorItem[])) {
            opMap.set(op.slug, op);
          }
          for (const op of list) {
            const existing = opMap.get(op.slug);
            opMap.set(op.slug, {
              ...existing,
              ...op,
              station_count: op.station_count ?? existing?.station_count ?? 0,
            });
          }
          operators.value = Array.from(opMap.values());
        }
      }
    } catch (err: any) {
      error.value = err.message || 'Operatör listesi yüklenemedi.';
    } finally {
      loading.value = false;
    }
  };

  return {
    operators,
    loading,
    error,
    fetchOperators
  };
};
