"use client";

/**
 * Security Search Component
 * Search bar with autocomplete for finding stocks
 */

import { useState, useCallback } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useSecuritySearch } from "../hooks";
import { cn } from "@/lib/utils";
import type { Security } from "../types";

interface SecuritySearchProps {
  onSelect: (security: Security) => void;
  placeholder?: string;
  className?: string;
}

export function SecuritySearch({
  onSelect,
  placeholder = "Search stocks...",
  className,
}: SecuritySearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data: results, isLoading } = useSecuritySearch(searchTerm, 10);

  const handleSelect = useCallback(
    (security: Security) => {
      onSelect(security);
      setSearchTerm("");
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay to allow click on result
            setTimeout(() => setIsOpen(false), 200);
          }}
          className="pl-10"
        />
      </div>

      {isOpen && searchTerm.length >= 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          {isLoading ? (
            <div className="p-3 text-sm text-muted-foreground">
              Searching...
            </div>
          ) : results && results.length > 0 ? (
            <ul className="max-h-60 overflow-auto py-1">
              {results.map((security) => (
                <li
                  key={security.id}
                  className="cursor-pointer px-3 py-2 hover:bg-muted"
                  onClick={() => handleSelect(security)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{security.ticker}</span>
                    <span className="text-xs text-muted-foreground">
                      {security.exchange}
                    </span>
                  </div>
                  {security.name && (
                    <div className="text-sm text-muted-foreground truncate">
                      {security.name}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-3 text-sm text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
