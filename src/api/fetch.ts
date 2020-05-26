import FormData from 'form-data';
import _fetch, { Response } from 'node-fetch';

export type File = {
  fieldname: string;
  originalname: string;
  buffer: Buffer;
};

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

export type RequestOptions = {
  method: HttpMethod;
  url: string;
  data?: Record<string, unknown> | null | undefined;
  files?: File[];
  headers?: {
    [key: string]: string;
  };
};

type Init = {
  method: string;
  headers: Record<string, string>;
  body?: string | FormData;
};

export default function fetch(reqOptions: RequestOptions): Promise<Response> {
  const { method, url, data, headers, files } = reqOptions;

  const init: Init = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  if (data) {
    if (files) {
      const formData = new FormData();

      Object.entries(data).forEach(([name, value]) =>
        formData.append(name, value),
      );

      files.forEach(({ fieldname, buffer, originalname }) => {
        formData.append(fieldname, buffer, originalname);
      });

      init.body = formData;
    } else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(data);
    }
  }

  return _fetch(url, init);
}
