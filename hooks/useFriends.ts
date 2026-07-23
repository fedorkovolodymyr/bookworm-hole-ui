import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acceptFriendRequest,
  blockUser,
  declineFriendRequest,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  removeFriend,
  sendFriendRequest,
  unblockUser,
} from "@/lib/api/friends";
import type { SendFriendRequestPayload } from "@/lib/api/types";

export function useFriends() {
  return useQuery({
    queryKey: ["friends", "list"],
    queryFn: listFriends,
  });
}

export function useIncomingRequests() {
  return useQuery({
    queryKey: ["friends", "requests", "incoming"],
    queryFn: listIncomingRequests,
  });
}

export function useOutgoingRequests() {
  return useQuery({
    queryKey: ["friends", "requests", "outgoing"],
    queryFn: listOutgoingRequests,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: SendFriendRequestPayload) => sendFriendRequest(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "requests", "outgoing"] });
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => acceptFriendRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "requests", "incoming"] });
      queryClient.invalidateQueries({ queryKey: ["friends", "list"] });
    },
  });
}

export function useDeclineFriendRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendshipId: string) => declineFriendRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "requests", "incoming"] });
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => removeFriend(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "list"] });
    },
  });
}

export function useBlockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => blockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "list"] });
    },
  });
}

export function useUnblockUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => unblockUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friends", "list"] });
    },
  });
}
