import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export type AuthUser = {
  id: number;
  username: string;
  role: string;
};

type AuthCredentials = {
  username: string;
  password: string;
};

type RegisterInput = AuthCredentials & { role?: "admin" | "staff" | "driver" };

const authQueryKey = [api.auth.me.path];

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const authQuery = useQuery({
    queryKey: authQueryKey,
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, {
        credentials: "include",
      });
      if (res.status === 401) {
        return null;
      }
      if (!res.ok) {
        throw new Error("Failed to fetch session");
      }
      return api.auth.me.responses[200].parse(await res.json());
    },
    retry: false,
  });

  const login = useMutation({
    mutationFn: async (data: AuthCredentials) => {
      const res = await fetch(api.auth.login.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const message = (await res.json().catch(() => null))?.message;
        throw new Error(message || "Login failed");
      }
      return api.auth.login.responses[200].parse(await res.json());
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKey, user);
      toast({ title: "Welcome back", description: `Signed in as ${user.username}` });
    },
    onError: (error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    },
  });

  const register = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const res = await fetch(api.auth.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const message = (await res.json().catch(() => null))?.message;
        throw new Error(message || "Registration failed");
      }
      return api.auth.register.responses[201].parse(await res.json());
    },
    onSuccess: (user) => {
      queryClient.setQueryData(authQueryKey, user);
      toast({ title: "Account created", description: `Welcome, ${user.username}` });
    },
    onError: (error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.logout.path, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Logout failed");
      }
      return api.auth.logout.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.setQueryData(authQueryKey, null);
      toast({ title: "Signed out", description: "You have been logged out." });
    },
    onError: (error) => {
      toast({ title: "Logout failed", description: error.message, variant: "destructive" });
    },
  });

  return {
    user: authQuery.data ?? null,
    isLoading: authQuery.isLoading,
    login,
    register,
    logout,
  };
}
