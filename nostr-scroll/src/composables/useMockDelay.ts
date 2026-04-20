export async function useMockDelay(min = 180, max = 420): Promise<void> {
  const duration = min >= max ? min : Math.round(Math.random() * (max - min) + min);
  await new Promise((resolve) => {
    window.setTimeout(resolve, duration);
  });
}
