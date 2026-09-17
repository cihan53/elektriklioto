
import type { OperatorItem } from '~/types/station';

export const useOperators = () => {
  const config = useRuntimeConfig();
  const operators = useState<OperatorItem[]>('operators-cache', () => []);
  const loading = useState<boolean>('operators-loading', () => false);
  const error = useState<string | null>('operators-error', () => null);

  const fetchOperators = async () => {
    if (operators.value.length > 0) return;
    loading.value = true;
    error.value = null;

    try {
      const res = await $fetch<{ count: number; data: OperatorItem[] }>(
        `${config.public.apiBase}/operators`
      );
      operators.value = res.data || [];
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
