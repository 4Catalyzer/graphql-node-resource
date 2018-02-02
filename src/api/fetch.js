/* @flow */

import FormData from 'form-data';
import fetch from 'node-fetch';

import HttpError from './HttpError';

type File = {
  fieldname: string,
  originalname: string,
  buffer: Buffer,
};

export type RequestOptions = {
  method: string,
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

export default async function request<T>({
  method,
  url,
  data,
  headers,
  files,
}: RequestOptions): Promise<?T> {
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
      init.body = JSON.stringify({ data });
    }
  }
  const response = await fetch(url, init);

  if (
    response.status === 204 ||
    (response.status === 404 && method === 'GET')
  ) {
    return null;
  }

  if (!response.ok) {
    const error = new HttpError(response);
    await error.init();

    throw error;
  }

  return response;
}
