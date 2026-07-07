export class ApiException extends Error {
  readonly code: number;
  readonly data?: unknown;
  readonly params?: Record<string, unknown>;

  constructor(code: number, params?: Record<string, unknown>, data?: unknown) {
    super(String(code));
    this.code = code;
    this.params = params;
    this.data = data;
  }
}
