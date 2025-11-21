import { Head, Link, useForm } from '@inertiajs/react'
import AppLayout from '@/layouts/app-layout'
import { type BreadcrumbItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardHeading, CardTable, CardToolbar } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TagInput from '@/components/tag-input'

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Dashboard', href: '/dashboard' },
  { title: 'Leads', href: '/leads' },
  { title: 'Edit Lead', href: '#' },
]

const leadStatuses = [
  { id: 'new', name: 'New' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'qualified', name: 'Qualified' },
  { id: 'lost', name: 'Lost' },
  { id: 'converted', name: 'Converted' },
]

const leadSources = [
  { id: 'website', name: 'Website' },
  { id: 'referral', name: 'Referral' },
  { id: 'social_media', name: 'Social Media' },
  { id: 'email', name: 'Email' },
  { id: 'other', name: 'Other' },
]

interface LeadEditProps {
  lead: {
    id: number
    name: string | null
    email: string | null
    phone: string | null
    status: string
    source: string | null
    tags?: string[]
  }
}

export default function LeadEdit({ lead }: LeadEditProps) {
  const form = useForm({
    name: lead.name ?? '',
    email: lead.email ?? '',
    phone: lead.phone ?? '',
    status: lead.status ?? 'new',
    source: lead.source ?? 'website',
    tags: (lead.tags ?? []) as string[],
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    form.put(`/leads/${lead.id}`)
  }

  return (
    <AppLayout breadcrumbs={breadcrumbs}>
      <Head title={`Edit Lead #${lead.id}`} />
      <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto p-4">
        <Card>
          <CardHeader className="px-3 py-3">
            <CardHeading>Edit Lead</CardHeading>
            <CardToolbar>
              <Link href="/leads">
                <Button variant="outline">Cancel</Button>
              </Link>
            </CardToolbar>
          </CardHeader>
          <CardTable>
            <form onSubmit={onSubmit} className="p-4 space-y-4 w-full max-w-2xl">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} className={form.errors.name ? 'border-destructive' : ''} />
                {form.errors.name && <p className="text-sm text-destructive">{form.errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} className={form.errors.email ? 'border-destructive' : ''} />
                {form.errors.email && <p className="text-sm text-destructive">{form.errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={form.data.phone} onChange={(e) => form.setData('phone', e.target.value)} className={form.errors.phone ? 'border-destructive' : ''} />
                {form.errors.phone && <p className="text-sm text-destructive">{form.errors.phone}</p>}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadStatuses.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.errors.status && <p className="text-sm text-destructive">{form.errors.status}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Source</Label>
                  <Select value={form.data.source ?? ''} onValueChange={(v) => form.setData('source', v)}>
                    <SelectTrigger id="source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      {leadSources.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.errors.source && <p className="text-sm text-destructive">{form.errors.source}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <TagInput value={form.data.tags as string[]} onChange={(tags) => form.setData('tags', tags)} />
              </div>
              <div className="flex gap-2">
                <Link href="/leads">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={form.processing}>{form.processing ? 'Saving...' : 'Save Changes'}</Button>
              </div>
            </form>
          </CardTable>
        </Card>
      </div>
    </AppLayout>
  )
}
