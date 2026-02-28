"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DAY_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "60", label: "Last 60 days" },
  { value: "90", label: "Last 90 days" },
];

export function DaysSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentDays = searchParams.get("days") || "30";

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("days", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <Select value={currentDays} onValueChange={handleChange}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {DAY_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
