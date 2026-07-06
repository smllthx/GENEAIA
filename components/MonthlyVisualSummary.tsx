import { AccountCardMini } from "@/components/Cards";

export function MonthlyVisualSummary({ cards }: { cards: Array<[string, string, string]> }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-3">
      {cards.map(([label, value, icon]) => (
        <AccountCardMini key={label} label={label} value={value} icon={icon} />
      ))}
    </div>
  );
}
