import { imageCacheService } from 'src/services/imageCacheService';
import { type ComputedRef, type Ref, ref, watch } from 'vue';

type SourceRef = Ref<string> | ComputedRef<string>;

export function useCachedImageUrl(source: SourceRef): Ref<string> {
  const resolvedSource = ref('');
  let requestId = 0;

  watch(
    source,
    (value) => {
      const normalizedValue = value.trim();
      const currentRequestId = ++requestId;

      if (!normalizedValue) {
        resolvedSource.value = '';
        return;
      }

      void imageCacheService
        .resolveCachedImageUrl(normalizedValue)
        .then((cachedValue) => {
          if (currentRequestId !== requestId) {
            return;
          }

          resolvedSource.value = cachedValue;
        })
        .catch(() => {
          if (currentRequestId !== requestId) {
            return;
          }

          resolvedSource.value = normalizedValue;
        });
    },
    { immediate: true }
  );

  return resolvedSource;
}
