export interface ApiResponse<T, M = undefined> {
  status: "success" | "error";
  message: string;
  meta?: M;
  data: T;
}
