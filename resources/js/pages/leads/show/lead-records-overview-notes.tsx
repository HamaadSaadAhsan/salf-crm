import { FileText } from 'lucide-react';

export function LeadRecordsOverviewNotes() {
    return (
        <div className="space-y-3.5">
            <h3 className="ms-1 flex items-center gap-1.5 text-sm font-semibold">
                <FileText className="size-3.5 opacity-60" />
                Notes
            </h3>
            <div className="text-muted-foreground py-8 text-center text-sm">
                No notes yet
            </div>
        </div>
    );
}
