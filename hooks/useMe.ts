// hooks/useMe.ts
import { useQuery } from "@tanstack/react-query";
import { fetchProfile } from "@/lib/api/users";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: fetchProfile,
    retry: false,
  });
}
