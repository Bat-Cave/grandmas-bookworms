import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { InviteManager } from '@/components/organization/invite-manager'

export default function OrganizationInvitesPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <Link
          href="/organization"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Back to organization admin
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Manage Invite Codes</h1>
          <p className="text-muted-foreground">
            Create, copy, and revoke invite codes for your organization.
          </p>
        </div>
      </div>

      <InviteManager />
    </div>
  )
}
