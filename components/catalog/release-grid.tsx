"use client";

import type { ReleaseWithISBNsResponse } from "@/lib/api/types";
import { ReleaseCard } from "@/components/catalog/release-card";

interface ReleaseGridProps {
  releases: ReleaseWithISBNsResponse[];
}

export function ReleaseGrid({ releases }: ReleaseGridProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {releases.map((release) => (
        <ReleaseCard key={release.id} release={release} />
      ))}
    </div>
  );
}
