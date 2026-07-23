"use client";

import { Building2, Check, ChevronsUpDown, User } from "lucide-react";
import { useWorkspace } from "@/components/providers/workspace-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function WorkspaceSwitcher() {
  const { workspaces, selected, select } = useWorkspace();

  if (workspaces.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-white/5 hover:text-gray-100"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-400">
            {selected.id === "personal" ? (
              <User className="h-3.5 w-3.5" />
            ) : (
              <Building2 className="h-3.5 w-3.5" />
            )}
          </span>
          <span className="flex-1 truncate text-left">{selected.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-gray-500" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" sideOffset={8} align="start" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium text-gray-500">
          Workspaces
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {workspaces.map((ws) => {
          const isPersonal = ws.id === "personal";
          return (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => select(ws.id)}
              className={cn(
                "cursor-pointer",
                selected.id === ws.id && "bg-indigo-500/10 text-indigo-300",
              )}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/5">
                {isPersonal ? (
                  <User className="h-3.5 w-3.5 text-gray-400" />
                ) : (
                  <Building2 className="h-3.5 w-3.5 text-gray-400" />
                )}
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium">{ws.name}</p>
                {!isPersonal && (
                  <p className="text-xs text-gray-500 capitalize">{ws.role.toLowerCase()}</p>
                )}
              </div>
              {selected.id === ws.id && (
                <Check className="h-4 w-4 text-indigo-400" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
