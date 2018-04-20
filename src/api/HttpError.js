/* @flow */

import util from 'util';

export type JsonApiError = {
  detail?: string,
  code: string,
  source?: {
    pointer: string,
  },
  meta: any,
};

export default class HttpError extends Error {
  response: Response;
  status: number;
  errors: Array<JsonApiError> = [];
  body: string = '';
  extensions: ?{
    upstream: {
      status: number,
      errors: JsonApiError[],
    },
  };

  constructor(response: Response) {
    super();

    this.response = response;
    this.status = response.status;
    this.message = `HttpError(${this.status}): A network request failed`;
  }

  async init() {
    try {
      this.body = await this.response.text();
      this.errors = JSON.parse(this.body).errors || [];

      this.extensions = {
        upstream: {
          status: this.status,
          errors: this.errors,
        },
      };
    } catch (e) {
      this.errors = [];
    }

    if (this.errors && this.errors.length) {
      this.message = `HttpError(${
        this.status
      }): The network resource returned the following errors:\n\n${util.inspect(
        this.errors,
      )}`;
    } else {
      this.message = `HttpError(${
        this.status
      }): The network resource returned the following message:\n\n${
        this.body
      }`;
    }
  }
}
