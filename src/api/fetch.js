/* @flow */

import FormData from 'form-data';
import _fetch from 'node-fetch';

import HttpError from './HttpError';

type File = {
  fieldname: string,
  originalname: string,
  buffer: Buffer,
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
  method: HttpMethod,
  url: string,
  data?: ?mixed,
  files?: File[],
  headers?: { [string]: string },
};

type Init = {
  method: string,
  headers: { [string]: string },
  body?: string | FormData,
};

export default async function fetch({
  method,
  url,
  data,
  headers,
  files,
}: RequestOptions): Promise<Response> {
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
  const response = await _fetch(url, init);

  if (!response.ok) {
    const error = new HttpError(response);
    await error.init();

    throw error;
  }

  return response;
}
