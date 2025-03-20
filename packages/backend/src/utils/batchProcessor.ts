const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T, index: number) => Promise<R>,
  delayMs = 1000,
): Promise<R[]> {
  const results: R[] = [];
  const totalBatches = Math.ceil(items.length / batchSize);
  console.log(
    `Starting batch processing of ${items.length} items in ${totalBatches} batches of size ${batchSize}`,
  );

  for (let i = 0; i < items.length; i += batchSize) {
    const currentBatch = Math.floor(i / batchSize) + 1;
    const batch = items.slice(i, i + batchSize);
    console.log(
      `Processing batch ${currentBatch}/${totalBatches} (${batch.length} items)`,
    );

    const batchPromises = batch.map(async (item, j) => {
      const result = await processor(item, i + j);
      console.log(`Completed item ${i + j + 1}/${items.length}`);
      return result;
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    if (i < items.length - batchSize) {
      console.log(`Waiting ${delayMs}ms before processing next batch...`);
      await delay(delayMs);
    }

    console.log(`Completed batch ${currentBatch}/${totalBatches}`);
  }

  console.log("Batch processing completed");
  return results;
}
