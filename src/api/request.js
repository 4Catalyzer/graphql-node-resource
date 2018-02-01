/* @flow */

import type { $Request } from 'express';
import FormData from 'form-data';
import fetch from 'node-fetch';

import HttpError from './HttpError';

type File = {
  fieldname: string,
  originalname: string,
  buffer: Buffer,
};

export type Request = $Request & {
  files?: File[],
};

export type Data = mixed & {
  files?: string[],
};

export type RequestOptions = {
  method: string,
  url: string,
  data?: ?Data,
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
  files: reqFiles,
}: RequestOptions): Promise<?T> {
  const init: Init = {
    method,
    headers: {
      Accept: 'application/json',
      ...headers,
    },
  };

  if (data) {
    if (data.files && reqFiles) {
      const { files, ...fields } = data;
      const formData = new FormData();

      Object.keys(fields).forEach(fieldName =>
        formData.append(fieldName, fields[fieldName]),
      );

      files.forEach(fieldName => {
        if (!reqFiles) return; // Flow doesn't count the check above
        reqFiles
          .filter(file => file.fieldname === fieldName)
          .forEach(({ buffer, originalname }) =>
            formData.append(fieldName, buffer, {
              filename: originalname,
            }),
          );
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
  return response.json();
}
