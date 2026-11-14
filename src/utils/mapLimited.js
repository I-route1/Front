// 항목마다 비동기 요청을 보내되 동시에 limit개까지만 보낸다. 실패한 항목은 null.
export async function mapLimited(items, fn, { limit = 6, onProgress } = {}) {
  const results = new Array(items.length)
  let next = 0
  let done = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await Promise.resolve().then(() => fn(items[i])).catch(() => null)
      onProgress?.(++done)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}
