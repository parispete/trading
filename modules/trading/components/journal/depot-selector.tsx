"use client";

import { useDepots } from "../../hooks/journal-hooks";
import { Select } from "@/components/ui/select";

interface DepotSelectorProps {
  value?: number;
  onChange: (depotId: number | undefined) => void;
  includeAll?: boolean;
  className?: string;
}

export function DepotSelector({
  value,
  onChange,
  includeAll = true,
  className,
}: DepotSelectorProps) {
  const { data: depots, isLoading } = useDepots();

  if (isLoading) {
    return (
      <Select
        options={[]}
        placeholder="Loading..."
        disabled
        className={className}
      />
    );
  }

  const options = [
    ...(includeAll ? [{ value: "", label: "All Depots" }] : []),
    ...(depots?.map((depot) => ({
      value: depot.id.toString(),
      label: `${depot.name}${depot.brokerName ? ` (${depot.brokerName})` : ""}`,
    })) ?? []),
  ];

  return (
    <Select
      value={value?.toString() ?? ""}
      onChange={(val) => onChange(val ? parseInt(val, 10) : undefined)}
      options={options}
      className={className}
    />
  );
}
