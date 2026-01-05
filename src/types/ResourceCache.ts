import type { Context } from './Context.js';
import { RESOURCE_CACHE_KEY } from './Context.js';
import Resource from '../resources/Resource.js';

export default class ResourceCache {
  cache = new WeakMap<any, Map<string, Resource<any>>>();

  private getResources(context: Context) {
    const cacheKey = context[RESOURCE_CACHE_KEY] || context;
    let resources = this.cache.get(cacheKey);

    if (!resources) {
      // eslint-disable-next-line no-param-reassign
      resources = new Map();
      this.cache.set(cacheKey, resources);
    }

    return resources;
  }

  get(context: Context, key: string) {
    const resources = this.getResources(context);

    return resources.get(key);
  }

  set(context: Context, key: string, resource: Resource<any>) {
    const resources = this.getResources(context);
    resources.set(key, resource);
  }
}
