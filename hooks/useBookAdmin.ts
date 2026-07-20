// hooks/useBookAdmin.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addBookContributor,
  createBook,
  deleteBook,
  mergeBooks,
  removeBookContributor,
  updateBook,
} from "@/lib/api/books-admin";
import type {
  AddContributorPayload,
  ContributorRole,
  CreateBookPayload,
  UpdateBookPayload,
} from "@/lib/api/types";

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateBookPayload) => createBook(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useUpdateBook(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateBookPayload) => updateBook(bookId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["books", bookId] });
      queryClient.invalidateQueries({ queryKey: ["books"] });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => deleteBook(bookId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useMergeBooks() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: string; targetId: string }) =>
      mergeBooks(sourceId, targetId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}

export function useAddBookContributor(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddContributorPayload) => addBookContributor(bookId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books", bookId] }),
  });
}

export function useRemoveBookContributor(bookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ contributorId, role }: { contributorId: string; role: ContributorRole }) =>
      removeBookContributor(bookId, contributorId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books", bookId] }),
  });
}
