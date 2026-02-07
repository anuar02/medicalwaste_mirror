import { User } from './models';

export interface ApiSuccess<T> {
  status: 'success';
  token?: string;
  data?: T;
}

export interface AuthResponseData {
  user: User;
}

export interface ApiError {
  message: string;
  code?: string;
}
