/* @flow */

import type { $Request } from 'express';
import FormData from 'form-data';
import snakeCase from 'lodash/snakeCase';
import fetch from 'node-fetch';

import getResponseData from './getResponseData';
import HttpError from './HttpError';
import translateKeys from './translateKeys';

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
  request: Request,
  authorization?: string,
  getHeaders: Request => { [string]: string },
};

type Init = {
  method: string,
  headers: {
    Authorization: ?string,
    Accept: string,
    'Content-Type'?: string,
  },
  body?: string | FormData,
};

export default async function request<T>({
  method,
  url,
  data,
  getHeaders,
  authorization,
  request: req,
}: RequestOptions): Promise<?T> {
  const init: Init = {
    method,
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      ...getHeaders(request),
    },
  };

  if (data) {
    const reqFiles = req.files;

    if (data.files && reqFiles) {
      const { files, ...fields } = data;
      const formData = new FormData();

      Object.keys(fields).forEach(fieldName =>
        formData.append(snakeCase(fieldName), fields[fieldName]),
      );

      files.forEach(fieldName => {
        reqFiles
          .filter(file => file.fieldname === fieldName)
          .forEach(({ buffer, originalname }) =>
            formData.append(snakeCase(fieldName), buffer, {
              filename: originalname,
            }),
          );
      });

      init.body = formData;
    } else {
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify({
        data: translateKeys(data, snakeCase),
      });
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
    const requestData = { ...init };
    if (typeof requestData.body === 'string') {
      requestData.body = JSON.parse(requestData.body);
    }

    const error = new HttpError(response);
    await error.init();

    throw error;
  }
  const body = await response.json();
  return getResponseData(body);
}
