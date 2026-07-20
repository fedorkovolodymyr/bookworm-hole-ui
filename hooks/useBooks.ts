// hooks/useBooks.ts
import { useQuery } from "@tanstack/react-query";
import {
  getBook,
  getBookByIsbn,
  getBookHistory,
  getBookReviews,
  getBookVersion,
  listBooks,
} from "@/lib/api/books";
import type { BookListParams, ReviewSort } from "@/lib/api/types";

export function useBookList(params: BookListParams = {}) {
  return useQuery({
    queryKey: ["books", params],
    queryFn: () => listBooks(params),
  });
}

export function useBook(bookId: string | undefined) {
  return useQuery({
    queryKey: ["books", bookId],
    queryFn: () => getBook(bookId as string),
    enabled: Boolean(bookId),
  });
}

export function useBookByIsbn(isbn: string | undefined) {
  return useQuery({
    queryKey: ["books", "by-isbn", isbn],
    queryFn: () => getBookByIsbn(isbn as string),
    enabled: Boolean(isbn),
  });
}

export function useBookReviews(
  bookId: string | undefined,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["books", bookId, "reviews", params],
    queryFn: () => getBookReviews(bookId as string, params),
    enabled: Boolean(bookId),
  });
}

export function useBookHistory(
  bookId: string | undefined,
  params: { skip?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: ["books", bookId, "history", params],
    queryFn: () => getBookHistory(bookId as string, params),
    enabled: Boolean(bookId),
  });
}

export function useBookVersion(bookId: string | undefined, version: number | undefined) {
  return useQuery({
    queryKey: ["books", bookId, "history", version],
    queryFn: () => getBookVersion(bookId as string, version as number),
    enabled: Boolean(bookId) && version !== undefined,
  });
}
