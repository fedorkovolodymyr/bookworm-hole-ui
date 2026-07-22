// hooks/useFriendContent.ts
import { useQuery } from "@tanstack/react-query";
import { getFriendCollections, getFriendLibrary } from "@/lib/api/friends-content";

interface FriendContentParams {
  skip?: number;
  limit?: number;
}

export function useFriendCollections(userId: string | undefined, params: FriendContentParams = {}) {
  return useQuery({
    queryKey: ["friends", userId, "collections", params],
    queryFn: () => getFriendCollections(userId as string, params),
    enabled: Boolean(userId),
  });
}

export function useFriendLibrary(userId: string | undefined, params: FriendContentParams = {}) {
  return useQuery({
    queryKey: ["friends", userId, "library", params],
    queryFn: () => getFriendLibrary(userId as string, params),
    enabled: Boolean(userId),
  });
}
