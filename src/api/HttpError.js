/* @flow */

export type JsonApiErrorPayload = {
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
  errors: Array<JsonApiErrorPayload> = [];
  body: ?string = null;
  extensions: ?{
    upstream: {
      status: number,
      errors: JsonApiErrorPayload[],
    },
  };

  constructor(response: Response) {
    super();

    this.response = response;
    this.status = response.status;
  }

  async init() {
    try {
      this.body = await this.response.text();
      this.errors = JSON.parse(this.body).errors;

      this.message = this.errors && this.errors[0] && this.errors[0].detail;

      this.extensions = {
        upstream: {
          status: this.status,
          errors: this.errors,
        },
      };
    } catch (e) {
      this.errors = [];
    }
  }
}
