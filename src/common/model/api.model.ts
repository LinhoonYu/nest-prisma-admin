export class ApiResult<T = unknown> {
  code: number;
  message: string;
  data?: T;

  constructor(code: number, message: string, data?: T) {
    this.code = code;
    this.message = message;
    this.data = data;
  }

  static success<T>(data?: T, message = 'success') {
    return new ApiResult<T>(0, message, data);
  }

  static error(message: string, code = 1) {
    return new ApiResult(code, message);
  }
}

export class PageResult<T = unknown> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;

  constructor(items: T[], total: number, page: number, pageSize: number) {
    this.items = items;
    this.total = total;
    this.page = page;
    this.pageSize = pageSize;
  }
}
