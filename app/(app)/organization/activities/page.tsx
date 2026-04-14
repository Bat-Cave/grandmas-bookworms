import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ActivityManager } from '@/components/organization/activity-manager'

export default function OrganizationActivitiesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Link
          href="/organization"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to organization admin
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Manage Activities</h1>
          <p className="text-muted-foreground">
            Update the activity list used for future bingo cards.
          </p>
        </div>
      </div>

      <ActivityManager />
    </div>
  )
}
