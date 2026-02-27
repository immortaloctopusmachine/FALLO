interface TodayIndicatorProps {
  startDate: Date;
  columnWidth: number;
  className?: string;
}

export function TodayIndicator({
  startDate,
  columnWidth,
  className = 'absolute top-0 bottom-0 w-0.5 bg-error z-10',
}: TodayIndicatorProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let daysFromStart = 0;
  const current = new Date(startDate);

  while (current < today) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      daysFromStart++;
    }
    current.setDate(current.getDate() + 1);
  }

  if (current.toDateString() !== today.toDateString()) {
    return null;
  }

  const left = daysFromStart * columnWidth + columnWidth / 2;

  return <div className={className} style={{ left }} />;
}
