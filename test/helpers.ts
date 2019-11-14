import { HttpApi, HttpError, HttpResource, utils } from '../src';
import apiFetch, { HttpMethod } from '../src/api/fetch';
import { Data } from '../src/api/HttpApi';

function getData({ data, meta } = {}) {
  if (meta) data.meta = meta; // eslint-disable-line no-param-reassign
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

  async request(method: HttpMethod, url: string, data?: Data) {
    const resp = await apiFetch({ method, url, data: { data } });
    if (resp.status === 204) return null;

    if (!resp.ok) throw await new HttpError(resp).init();
    return getData(await resp.json());
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
