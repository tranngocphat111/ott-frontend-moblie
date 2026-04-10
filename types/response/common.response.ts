export interface ApiResponse<T = void> {
  code: number;
  message?: string;
  result?: T;
}

export interface ApiError {
  code: number;
  message: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}