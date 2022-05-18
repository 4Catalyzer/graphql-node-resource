import { HttpApi, HttpError, HttpResource, utils } from '../src';
import { Data } from '../src/api/HttpApi';
import apiFetch, { HttpMethod } from '../src/api/fetch';

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
    const resp = await apiFetch({ method, url, data: { data } });
    if (resp.status === 204) return null;

    if (!resp.ok) throw await new HttpError(resp).init();
    return getData(await resp.json()) as T;
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
