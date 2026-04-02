import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateLabelDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

const COLORS = [
    { value: 'red', bg: 'bg-red-500' },
    { value: 'blue', bg: 'bg-blue-500' },
    { value: 'green', bg: 'bg-green-500' },
    { value: 'yellow', bg: 'bg-yellow-500' },
    { value: 'purple', bg: 'bg-purple-500' },
    { value: 'orange', bg: 'bg-orange-500' },
    { value: 'gray', bg: 'bg-gray-500' },
];

export function CreateLabelDialog({ isOpen, onClose, onCreated }: CreateLabelDialogProps) {
    const [name, setName] = useState('');
    const [color, setColor] = useState('blue');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        if (!name.trim()) {
            setError('Label name is required.');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            await api.post('/api/mail/labels', { name: name.trim(), color });
            onCreated();
            onClose();
            setName('');
            setColor('blue');
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Failed to create label.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[360px]">
                <DialogHeader>
                    <DialogTitle>Create Label</DialogTitle>
                    <DialogDescription className="sr-only">Create a new mail label</DialogDescription>
                </DialogHeader>

                {error && <div className="bg-destructive/15 text-destructive rounded-md px-3 py-2 text-sm">{error}</div>}

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label>Name</Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Important" />
                    </div>

                    <div className="space-y-1.5">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    onClick={() => setColor(c.value)}
                                    className={cn(
                                        'size-7 rounded-full transition-all',
                                        c.bg,
                                        color === c.value ? 'ring-2 ring-offset-2 ring-primary' : 'opacity-60 hover:opacity-100',
                                    )}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="mono" onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
