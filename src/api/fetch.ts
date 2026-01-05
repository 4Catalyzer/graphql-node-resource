import FormData from 'form-data';

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

export type RequestOptions = RequestInit & {
  method: HttpMethod;
  url: string;
  data?: Record<string, unknown> | null | undefined;
  files?: File[];
};

export default function apiFetch(
  reqOptions: RequestOptions,
): Promise<Response> {
  const { url, data, headers, files, method, ...rest } = reqOptions;

  const init: RequestInit = {
    method,
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

      files.forEach(({ fieldname, buffer, originalname }) => {
        formData.append(fieldname, buffer, originalname);
      });

      init.body = formData as unknown as RequestInit['body'];
    } else {
      init.headers = {
        ...init.headers,
        'Content-Type': 'application/json',
      };
      init.body = JSON.stringify(data);
    }
  }

  return fetch(url, init);
}
