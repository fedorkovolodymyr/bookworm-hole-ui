import { apiClient } from "./client";
import type {
  AddContributorPayload,
  AddContributorResult,
  BookResponse,
  BookWithReleasesResponse,
  ContributorRole,
  CreateBookPayload,
  UpdateBookPayload,
} from "./types";

export async function createBook(payload: CreateBookPayload): Promise<BookResponse> {
  const { data } = await apiClient.post("/books", payload);
  return data;
}

export async function updateBook(bookId: string, payload: UpdateBookPayload): Promise<BookResponse> {
  const { data } = await apiClient.patch(`/books/${bookId}`, payload);
  return data;
}

export async function deleteBook(bookId: string): Promise<void> {
  await apiClient.delete(`/books/${bookId}`);
}

export async function mergeBooks(
  sourceId: string,
  targetId: string,
): Promise<BookWithReleasesResponse> {
  const { data } = await apiClient.post(`/books/${sourceId}/merge-into/${targetId}`);
  return data;
}

export async function addBookContributor(
  bookId: string,
  payload: AddContributorPayload,
): Promise<AddContributorResult> {
  const { data } = await apiClient.post(`/books/${bookId}/contributors`, payload);
  return data;
}

export async function removeBookContributor(
  bookId: string,
  contributorId: string,
  role: ContributorRole,
): Promise<void> {
  await apiClient.delete(`/books/${bookId}/contributors/${contributorId}`, { params: { role } });
}
