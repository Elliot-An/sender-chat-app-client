"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TooltipProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>
const Tooltip = ({ children, open }: { children: React.ReactNode; open?: boolean }) => <span className="relative block">{React.Children.map(children, child => React.isValidElement(child) ? React.cloneElement(child, { "data-tooltip-open": open || undefined } as never) : child)}</span>
const TooltipTrigger = ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span {...props}>{children}</span>
const TooltipContent = ({ children, className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => <span className={cn("pointer-events-none absolute left-0 top-full z-50 mt-2 rounded-md bg-destructive px-3 py-1.5 text-xs text-destructive-foreground shadow-md data-[tooltip-open=false]:hidden", className)} {...props}>{children}</span>
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
