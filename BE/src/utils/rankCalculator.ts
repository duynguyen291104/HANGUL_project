// Rank calculation based on trophy count
export function getRank(trophy: number): string {
  if (trophy >= 4000) return 'Diamond';
  if (trophy >= 2000) return 'Platinum';
  if (trophy >= 1000) return 'Gold';
  if (trophy >= 500) return 'Silver';
  return 'Bronze';
}

// Get rank details with color and icon
export function getRankDetails(trophy: number) {
  const rank = getRank(trophy);
  const rankColors: Record<string, string> = {
    Bronze: '#8B4513',
    Silver: '#C0C0C0',
    Gold: '#FFD700',
    Platinum: '#E5E4E2',
    Diamond: '#1E90FF',
  };
  
  const rankIcons: Record<string, string> = {
    Bronze: '🥉',
    Silver: '🥈',
    Gold: '🥇',
    Platinum: '👑',
    Diamond: '💎',
  };
  
  return {
    rank,
    color: rankColors[rank],
    icon: rankIcons[rank],
  };
}
