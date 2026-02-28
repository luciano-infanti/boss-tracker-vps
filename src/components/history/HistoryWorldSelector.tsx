"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WORLDS } from "@/lib/constants";

export function HistoryWorldSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentWorldId = searchParams.get("worldId") || "1";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("worldId", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={currentWorldId} onValueChange={handleChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select world" />
      </SelectTrigger>
      <SelectContent>
        {WORLDS.map((world) => (
          <SelectItem key={world.id} value={String(world.id)}>
            {world.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
