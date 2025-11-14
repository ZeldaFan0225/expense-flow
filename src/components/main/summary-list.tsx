import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card"
import {cn} from "@/lib/utils"

type SummaryListItem = {
    id: string
    title: string
    subtitle?: string | null
    amount?: string
    meta?: string
}

type SummaryListProps = {
    title: string
    description: string
    emptyLabel: string
    items: SummaryListItem[]
    variant?: "default" | "alert"
}

export function SummaryList({
                                title,
                                description,
                                emptyLabel,
                                items,
                                variant = "default",
                            }: SummaryListProps) {
    const isAlert = variant === "alert"
    return (
        <Card
            className={cn(
                "rounded-3xl",
                isAlert ? "border-destructive/30 bg-destructive/5" : ""
            )}
        >
            <CardHeader>
                <CardTitle className={isAlert ? "text-destructive" : undefined}>
                    {title}
                </CardTitle>
                <p
                    className={cn(
                        "text-sm text-muted-foreground",
                        isAlert ? "text-destructive/70" : ""
                    )}
                >
                    {description}
                </p>
            </CardHeader>
            <CardContent className="space-y-3">
                {items.length === 0 ? (
                    <p
                        className={cn(
                            "text-sm text-muted-foreground",
                            isAlert ? "text-destructive/70" : ""
                        )}
                    >
                        {emptyLabel}
                    </p>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center justify-between rounded-2xl border px-3 py-2",
                                isAlert
                                    ? "border-destructive/40 bg-background dark:bg-card"
                                    : ""
                            )}
                        >
                            <div>
                                <p
                                    className={cn(
                                        "text-sm font-medium text-foreground",
                                        isAlert ? "text-destructive" : ""
                                    )}
                                >
                                    {item.title}
                                </p>
                                {item.subtitle ? (
                                    <p
                                        className={cn(
                                            "text-xs text-muted-foreground",
                                            isAlert ? "text-destructive/80" : ""
                                        )}
                                    >
                                        {item.subtitle}
                                    </p>
                                ) : null}
                            </div>
                            <div className="text-right">
                                {item.amount ? (
                                    <p
                                        className={cn(
                                            "text-sm font-semibold text-foreground",
                                            isAlert ? "text-destructive" : ""
                                        )}
                                    >
                                        {item.amount}
                                    </p>
                                ) : null}
                                {item.meta ? (
                                    <p
                                        className={cn(
                                            "text-xs text-muted-foreground",
                                            isAlert ? "text-destructive/80" : ""
                                        )}
                                    >
                                        {item.meta}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    )
}
