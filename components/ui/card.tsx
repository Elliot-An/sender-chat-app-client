import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)} {...props} />,
)
Card.displayName = "Card"
const CardHeader = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
const CardContent = ({ className, ...props }: React.ComponentProps<"div">) => <div className={cn("p-6 pt-0", className)} {...props} />
const CardTitle = ({ className, ...props }: React.ComponentProps<"h1">) => <h1 className={cn("text-2xl font-semibold tracking-tight", className)} {...props} />
export { Card, CardHeader, CardContent, CardTitle }
