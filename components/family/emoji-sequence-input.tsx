"use client";

import { Button } from "@/components/ui/button";

const EMOJI_CHOICES = ["🐶", "🐱", "🐻", "🦊", "🐸", "🦄", "⭐", "🍕"];

type EmojiSequenceInputProps = {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
};

export function EmojiSequenceInput({
  value,
  onChange,
  maxLength = 4,
}: EmojiSequenceInputProps) {
  const sequence = value ? value.split("-").filter(Boolean) : [];
  const canAddMore = sequence.length < maxLength;

  const handleAdd = (emoji: string) => {
    if (!canAddMore) return;
    const next = [...sequence, emoji].join("-");
    onChange(next);
  };

  const handleClear = () => onChange("");

  return (
    <div className="space-y-3">
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-lg">
        {sequence.length > 0 ? sequence.join(" ") : "Pick emojis in order"}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {EMOJI_CHOICES.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => handleAdd(emoji)}
            disabled={!canAddMore}
            className="rounded-md border px-3 py-2 text-xl hover:bg-muted disabled:opacity-40"
          >
            {emoji}
          </button>
        ))}
      </div>
      <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
        Clear
      </Button>
    </div>
  );
}
