import { ref, watch, type ComputedRef, type Ref } from 'vue';
import { imageCacheService } from 'src/services/imageCacheService';

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
