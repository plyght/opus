import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const API_BASE_URL = "http://localhost:8081";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json();
}

// User API
export const userApi = {
  getCurrentUser: () => fetchApi<any>("/api/users/me"),
  list: (params: { query?: string; limit?: number; offset?: number }) =>
    fetchApi<{ items: any[]; total: number }>(
      `/api/users?${new URLSearchParams({
        ...(params.query && { query: params.query }),
        limit: params.limit?.toString() || "20",
        offset: params.offset?.toString() || "0",
      }).toString()}`
    ),
};

// Book API
export const bookApi = {
  getTotalCount: async () => {
    const result = await fetchApi<{ total: number }>("/api/books?limit=1");
    return result.total;
  },
  list: (params: { query?: string; limit?: number; offset?: number }) =>
    fetchApi<{ items: any[]; total: number }>(
      `/api/books?${new URLSearchParams({
        ...(params.query && { query: params.query }),
        limit: params.limit?.toString() || "20",
        offset: params.offset?.toString() || "0",
      }).toString()}`
    ),
};

// Checkout API
export const checkoutApi = {
  getOverdueCheckouts: () => fetchApi<any[]>("/api/checkouts/overdue"),
  getActiveCount: async () => {
    const result = await fetchApi<{ total: number }>("/api/checkouts?status=ACTIVE&limit=1");
    return result.total;
  },
  list: (params: { status?: string; limit?: number; offset?: number }) =>
    fetchApi<{ items: any[]; total: number }>(
      `/api/checkouts?${new URLSearchParams({
        ...(params.status && { status: params.status }),
        limit: params.limit?.toString() || "20",
        offset: params.offset?.toString() || "0",
      }).toString()}`
    ),
  checkoutBook: (data: { isbn: string; user_id: string }) =>
    fetchApi<any>("/api/checkouts/checkout", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  returnBook: (data: { checkoutId: string }) =>
    fetchApi<any>("/api/checkouts/return", {
      method: "POST",
      body: JSON.stringify({ checkout_id: data.checkoutId }),
    }),
  renewCheckout: (data: { checkoutId: string }) =>
    fetchApi<any>("/api/checkouts/renew", {
      method: "POST",
      body: JSON.stringify({ checkout_id: data.checkoutId }),
    }),
};

// React Query hooks
export const useUserQuery = {
  getCurrentUser: () =>
    useQuery({
      queryKey: ["user", "current"],
      queryFn: userApi.getCurrentUser,
    }),
  list: (params: { query?: string; limit?: number; offset?: number }) =>
    useQuery({
      queryKey: ["users", "list", params],
      queryFn: () => userApi.list(params),
    }),
};

export const useBookQuery = {
  getTotalCount: () =>
    useQuery({
      queryKey: ["books", "count"],
      queryFn: bookApi.getTotalCount,
    }),
  list: (params: { query?: string; limit?: number; offset?: number }) =>
    useQuery({
      queryKey: ["books", "list", params],
      queryFn: () => bookApi.list(params),
    }),
};

export const useCheckoutQuery = {
  getOverdueCheckouts: () =>
    useQuery({
      queryKey: ["checkouts", "overdue"],
      queryFn: checkoutApi.getOverdueCheckouts,
    }),
  getActiveCount: () =>
    useQuery({
      queryKey: ["checkouts", "active", "count"],
      queryFn: checkoutApi.getActiveCount,
    }),
  list: (params: { status?: string; limit?: number; offset?: number }) =>
    useQuery({
      queryKey: ["checkouts", "list", params],
      queryFn: () => checkoutApi.list(params),
    }),
};

export const useCheckoutMutation = {
  checkoutBook: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: checkoutApi.checkoutBook,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["checkouts"] });
        queryClient.invalidateQueries({ queryKey: ["books"] });
      },
    });
  },
  returnBook: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: checkoutApi.returnBook,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["checkouts"] });
        queryClient.invalidateQueries({ queryKey: ["books"] });
      },
    });
  },
  renewCheckout: () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: checkoutApi.renewCheckout,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["checkouts"] });
      },
    });
  },
};