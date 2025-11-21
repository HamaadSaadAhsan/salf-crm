import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge, BadgeButton } from '@/components/ui/badge';
import { CircleX } from 'lucide-react';

type TagValue = string | { label: string; value: string; color?: string };

interface TagInputProps {
  label?: string;
  value: TagValue[];
  onChange: (tags: TagValue[]) => void;
  placeholder?: string;
}

function TagInput({ label = 'Tags', value, onChange, placeholder = 'Add tags (press Enter or comma)' }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Helper to normalize tag to string for comparison
  const getTagValue = (tag: TagValue): string => {
    return typeof tag === 'string' ? tag : tag.value || tag.label;
  };

  // Helper to get tag display label
  const getTagLabel = (tag: TagValue): string => {
    return typeof tag === 'string' ? tag : tag.label || tag.value;
  };

  const addTag = (tag: string) => {
    const t = tag.trim();
    if (t && !value.some(existingTag => getTagValue(existingTag) === t)) {
      onChange([...value, t]);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove: TagValue) => {
    const removeValue = getTagValue(tagToRemove);
    onChange(value.filter((tag) => getTagValue(tag) !== removeValue));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2.5 mb-2.5">
        <Label className="text-xs leading-3">{label}</Label>
        <Input
          placeholder={placeholder}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {value.map((tag) => (
          <Badge
            key={getTagValue(tag)}
            variant="secondary"
            appearance="light"
            className="flex items-center gap-1"
          >
            {getTagLabel(tag)}
            <BadgeButton onClick={() => removeTag(tag)}>
              <CircleX className="size-3.5 text-muted-foreground" />
            </BadgeButton>
          </Badge>
        ))}
      </div>
    </div>
  );
}

export default TagInput;
