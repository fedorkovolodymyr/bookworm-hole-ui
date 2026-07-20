// hooks/useImportBook.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { importBook } from "@/lib/api/external";
import type { ImportBookPayload } from "@/lib/api/types";

export function useImportBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ImportBookPayload) => importBook(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["books"] }),
  });
}
