// Apollo Server shallowly clones the context for each request in a batch,
// making the context object inappropriate as a batch-level cache key. Use this
// to manually assign a cache key for the full batch.
export const RESOURCE_CACHE_KEY = Symbol('resource cache key');

export interface Context {
  [RESOURCE_CACHE_KEY]: any;
}
