import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
	const gridCols = Math.min(count, 4)
	return (
		<div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-${gridCols}`}>
			{Array.from({ length: count }, (_, i) => (
				<Card key={i}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-5 w-5" />
					</CardHeader>
					<CardContent>
						<Skeleton className="h-8 w-20 mb-1" />
						<Skeleton className="h-3 w-32" />
					</CardContent>
				</Card>
			))}
		</div>
	)
}

export function TableRowsSkeleton({ rows = 5 }: { rows?: number }) {
	return (
		<div className="space-y-3">
			{Array.from({ length: rows }, (_, i) => (
				<Skeleton key={i} className="h-12 w-full" />
			))}
		</div>
	)
}

export function PageSkeleton({ cardCount = 4, tableRows = 5 }: { cardCount?: number; tableRows?: number }) {
	return (
		<div className="space-y-6">
			<StatCardsSkeleton count={cardCount} />
			<TableRowsSkeleton rows={tableRows} />
		</div>
	)
}
