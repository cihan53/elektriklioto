
import type { OperatorItem } from '~/types/station';

export const useOperators = () => {
  const config = useRuntimeConfig();
  const operators = useState<OperatorItem[]>('operators-cache', () => []);
  const loading = useState<boolean>('operators-loading', () => false);
  const error = useState<string | null>('operators-error', () => null);

  const fetchOperators = async (force = false) => {
    if (!force && operators.value.length > 5) return;
    loading.value = true;
    error.value = null;

    try {
      const res: any = await $fetch(`${config.public.apiBase}/operators`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (list && list.length > 0) {
        operators.value = list;
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
