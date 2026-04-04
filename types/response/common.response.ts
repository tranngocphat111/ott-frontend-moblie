export interface ApiResponse<T = any> {
  code: number;
  message?: string;
  result?: T;
}

export interface ApiError {
  code: number;
  message: string;
  details?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}