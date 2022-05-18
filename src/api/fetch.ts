import {
  File,
  FormData,
  RequestInit,
  Response,
  fetch as _fetch,
} from 'undici';

export type { File };

export type HttpMethod =
  | 'GET'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'CONNECT'
  | 'OPTIONS'
  | 'TRACE'
  | 'PATCH';

export type RequestOptions = RequestInit & {
  method: HttpMethod;
  url: string;
  data?: Record<string, unknown> | null | undefined;
  files?: File[];
};

export default function fetch(reqOptions: RequestOptions): Promise<Response> {
  const { url, data, headers, files, ...rest } = reqOptions;

  const init: Partial<RequestInit> = {
    headers: {
      Accept: 'application/json',
      ...headers,
    },
    ...rest,
  };

  if (data) {
    if (files) {
      const formData = new FormData();

      Object.entries(data).forEach(([name, value]) =>
        formData.append(name, value),
      );

      files.forEach((file) => {
        formData.append(file.name, file, file.name);
      });
      // @ts-expect-error readonly on the type
      init.body = formData;
    } else {
      // @ts-expect-error readonly on the type
      init.headers = {
        ...init.headers,
        'Content-Type': 'application/json',
      };

      // @ts-expect-error readonly on the type
      init.body = JSON.stringify(data);
    }
  }

  return _fetch(url, init);
}
