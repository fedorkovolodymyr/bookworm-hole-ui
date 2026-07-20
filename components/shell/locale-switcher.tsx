"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routing } from "@/i18n/routing";

const LABEL_KEYS: Record<(typeof routing.locales)[number], "english" | "ukrainian"> = {
  en: "english",
  uk: "ukrainian",
};

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();

  function switchLocale(next: string) {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={t("language")}>
            <Languages className="h-4 w-4" />
          </Button>
        }
      />
      <DropdownMenuContent>
        {routing.locales.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => switchLocale(code)}
            disabled={code === locale}
          >
            {t(LABEL_KEYS[code])}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
