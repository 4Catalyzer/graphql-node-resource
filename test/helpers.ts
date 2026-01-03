import type { Data } from '../src/api/HttpApi.js';
import apiFetch from '../src/api/fetch.js';
import type { HttpMethod } from '../src/api/fetch.js';
import { HttpApi, HttpError, HttpResource, utils } from '../src/index.js';
import type { Obj } from '../src/utils/typing.js';

function getData(response: { data?: { [key: string]: any }; meta?: {} } = {}) {
  const { data, meta } = response;
  if (meta) data!.meta = meta;
  return data;
}

export class TestHttpApi extends HttpApi {
  constructor() {
    super({
      apiBase: '/v1',
      origin: 'https://gateway',
      externalOrigin: 'https://example.com',
    });
  }

  async request<T>(method: HttpMethod, url: string, data?: Data) {
    console.log('FETCHING');
    const resp = await apiFetch({ method, url, data: { data } });
    if (resp.status === 204) return null;

    if (!resp.ok) throw await new HttpError(resp).init();
    return getData((await resp.json()) as Obj) as T;
  }

  foo() {
    return 'foobar';
  }
}

export type MockContext = {
  httpApi: TestHttpApi;
};

export class TestHttpResource extends HttpResource<TestHttpApi> {
  getWidgetPath(widgetId: string, id: string) {
    return utils.urlJoin('widgets', widgetId, this.getPath(id));
  }
}
