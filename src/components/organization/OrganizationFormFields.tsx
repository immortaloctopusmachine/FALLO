'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface OrganizationFormFieldsProps {
  nameId: string;
  nameLabel: string;
  namePlaceholder: string;
  name: string;
  onNameChange: (value: string) => void;
  descriptionId: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  colorLabel: string;
  colorDescription?: string;
  colors: string[];
  selectedColor: string;
  onColorChange: (color: string) => void;
  disabled: boolean;
}

export function OrganizationFormFields({
  nameId,
  nameLabel,
  namePlaceholder,
  name,
  onNameChange,
  descriptionId,
  descriptionLabel,
  descriptionPlaceholder,
  description,
  onDescriptionChange,
  colorLabel,
  colorDescription,
  colors,
  selectedColor,
  onColorChange,
  disabled,
}: OrganizationFormFieldsProps) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor={nameId}>{nameLabel}</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={namePlaceholder}
          required
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={descriptionId}>{descriptionLabel}</Label>
        <Textarea
          id={descriptionId}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={descriptionPlaceholder}
          rows={2}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2">
        <Label>{colorLabel}</Label>
        {colorDescription && (
          <p className="text-caption text-text-tertiary">{colorDescription}</p>
        )}
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onColorChange(color)}
              className={cn(
                'w-8 h-8 rounded-full border-2 transition-transform',
                selectedColor === color ? 'border-white scale-110' : 'border-transparent'
              )}
              style={{ backgroundColor: color }}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </>
  );
}
