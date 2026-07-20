import { apiClient } from "./client";
import type {
  BookListParams,
  BookResponse,
  BookWithReleasesResponse,
  EntityVersionDetailResponse,
  EntityVersionResponse,
  Page,
  ReviewResponse,
  ReviewSort,
} from "./types";

export async function listBooks(params: BookListParams = {}): Promise<Page<BookResponse>> {
  const { data } = await apiClient.get("/books", { params });
  return data;
}

export async function getBookByIsbn(isbn: string): Promise<BookWithReleasesResponse> {
  const { data } = await apiClient.get(`/books/by-isbn/${encodeURIComponent(isbn)}`);
  return data;
}

export async function getBook(bookId: string): Promise<BookWithReleasesResponse> {
  const { data } = await apiClient.get(`/books/${bookId}`);
  return data;
}

export async function getBookReviews(
  bookId: string,
  params: { sort?: ReviewSort; skip?: number; limit?: number } = {},
): Promise<Page<ReviewResponse>> {
  const { data } = await apiClient.get(`/books/${bookId}/reviews`, { params });
  return data;
}

export async function getBookHistory(
  bookId: string,
  params: { skip?: number; limit?: number } = {},
): Promise<Page<EntityVersionResponse>> {
  const { data } = await apiClient.get(`/books/${bookId}/history`, { params });
  return data;
}

export async function getBookVersion(
  bookId: string,
  version: number,
): Promise<EntityVersionDetailResponse> {
  const { data } = await apiClient.get(`/books/${bookId}/history/${version}`);
  return data;
}
