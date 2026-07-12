import type { ApiError } from "./api-error.model";

export enum EResult {
  ERROR = "error",
  SUCCESS = "success",
}

export interface Err {
  type: EResult.ERROR;
  value: ApiError;
  status: number | undefined;
}

export interface Success<T> {
  type: EResult.SUCCESS;
  value: T;
  status: number | undefined;
}

export type TResult<T> = Success<T> | Err;
