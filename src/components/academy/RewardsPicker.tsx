'use client';

import { Coins, Award } from 'lucide-react';

interface RewardsPickerProps {
  coinsReward: number;
  badgeDefinitionId: string | null;
  onCoinsChange: (coins: number) => void;
  onBadgeChange: (badgeId: string | null) => void;
}

export function RewardsPicker({
  coinsReward,
  badgeDefinitionId,
  onCoinsChange,
  onBadgeChange,
}: RewardsPickerProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Rewards</h3>

      {/* Coins */}
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-yellow-500" />
        <label className="text-xs text-muted-foreground">Coins:</label>
        <input
          type="number"
          min={0}
          value={coinsReward}
          onChange={(e) => onCoinsChange(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-20 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground"
        />
      </div>

      {/* Badge */}
      <div className="flex items-center gap-2">
        <Award className="h-4 w-4 text-purple-500" />
        <label className="text-xs text-muted-foreground">Badge ID:</label>
        <input
          type="text"
          value={badgeDefinitionId || ''}
          onChange={(e) => onBadgeChange(e.target.value || null)}
          placeholder="Leave empty for no badge"
          className="flex-1 rounded border border-border bg-surface px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <p className="text-[10px] text-muted-foreground">
        Enter a Badge Definition ID from the rewards system. Leave empty for no badge reward.
      </p>
    </div>
  );
}
