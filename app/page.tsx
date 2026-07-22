"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Flame,
  Gauge,
  Mail,
  Moon,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Target
} from "lucide-react";
import { AIChatPanel } from "@/components/AIChatPanel";
import { AIInsightCard } from "@/components/AIInsightCard";
import { AccountCard } from "@/components/AccountCard";
import { AppleHealthMetricCard } from "@/components/AppleHealthMetricCard";
import { BalanceCard } from "@/components/BalanceCard";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { FocusModePanel } from "@/components/FocusModePanel";
import { GlassCard } from "@/components/GlassCard";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { LiquidBackground } from "@/components/LiquidBackground";
import { MonthlyVisualSummary as MonthlyVisualSummaryGrid } from "@/components/MonthlyVisualSummary";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { RealBankingPanel } from "@/components/RealBankingPanel";
import { TodayCard as TodaySummaryCard } from "@/components/TodayCard";
import { DebtBudgetPlanner } from "@/components/DebtBudgetPlanner";
import { AuthGate } from "@/components/AuthGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { TransactionItem } from "@/components/TransactionItem";
import { AutomationPanel } from "@/components/AutomationPanel";
import { AdaptiveSettings } from "@/components/AdaptiveSettings";
import { AccountsView } from "@/components/AccountsView";
import { BudgetManager } from "@/components/BudgetManager";
import { SubscriptionsView } from "@/components/SubscriptionsView";
import { useSyncedPreferences } from "@/hooks/use-synced-preferences";
import type { Account, BalancePoint, CategoryPoint, HeatmapDay, Transaction } from "@/lib/types";

const CategoryDonut = dynamic(() => import("@/components/Charts").then((module) => module.CategoryDonut), { ssr: false });
const TrendLineChart = dynamic(() => import("@/components/Charts").then((module) => module.TrendLineChart), { ssr: false });
const HeatmapSpending = dynamic(() => import("@/components/HeatmapSpending").then((module) => module.HeatmapSpending), { ssr: false });

const categoryColors = ["#0A84FF", "#34C759", "#FF9F0A", "#FF375F", "#AF52DE", "#64D2FF", "#FFD60A", "#8E8E93"];

function buildCategoryData(transactions: Transaction[]): CategoryPoint[] {
  const totalsByCategory = transactions
    .filter((transaction) => transaction.amount < 0)
    .reduce<Record<string, number>>((acc, transaction) => {
      const category = transaction.category || "Otros";
      acc[category] = (acc[category] ?? 0) + Math.abs(transaction.amount);
      return acc;
    }, {});

  return Object.entries(totalsByCategory)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], index) => ({
      name,
      value,
      color: categoryColors[index % categoryColors.length]
    }));
}

function buildBalanceTrend(transactions: Transaction[], currentBalance: number): BalancePoint[] {
  const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  if (sorted.length < 2) return [];

  const totalMovement = sorted.reduce((sum, transaction) => sum + transaction.amount, 0);
  let runningBalance = currentBalance - totalMovement;

  return sorted.slice(-30).map((transaction) => {
    runningBalance += transaction.amount;
    return {
      day: new Date(transaction.date).toLocaleDateString("es-CL", { day: "2-digit" }),
      balance: Math.round(runningBalance),
      projected: Math.round(runningBalance)
    };
  });
}

function buildHeatmap(transactions: Transaction[]): HeatmapDay[] {
  const today = new Date();
  const days = Array.from({ length: 35 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (34 - index));
    const key = date.toISOString().slice(0, 10);
    return { date: key, amount: 0, level: 0 as HeatmapDay["level"] };
  });

  const byDate = transactions
    .filter((transaction) => transaction.amount < 0)
    .reduce<Record<string, number>>((acc, transaction) => {
      const key = transaction.date.slice(0, 10);
      acc[key] = (acc[key] ?? 0) + Math.abs(transaction.amount);
      return acc;
    }, {});

  const max = Math.max(1, ...Object.values(byDate));
  return days.map((day) => {
    const amount = byDate[day.date] ?? 0;
    const ratio = amount / max;
    const level = amount === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
    return { ...day, amount, level };
  });
}

const emptyInsight = {
  id: "empty-insight",
  user_id: "current-user",
  title: "Faltan datos",
  message: "Configura tu correo y reenvia avisos bancarios para generar alertas reales.",
  severity: "blue" as const,
  type: "alerta" as const,
  urgency: 1,
  action: "Enlaza tu correo y envia el primer aviso.",
  action_label: "Configurar correo",
  quick_button: "Enlazar correo",
  previous_month_delta: 0,
  estimated_impact: 0,
  icon: "🔒",
  created_at: new Date().toISOString()
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [hidden, setHidden] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [hideSections, setHideSections] = useState(false);
  const [query, setQuery] = useState("");
  const [liveAccounts, setLiveAccounts] = useState<Account[]>([]);
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([]);
  const [liveMode, setLiveMode] = useState(false);
  const [financialLimits, setFinancialLimits] = useState({ daily: 0, weekly: 0, monthly: 0 });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [systemDark, setSystemDark] = useState(false);
  const { value: adaptivePreferences, update: updateAdaptivePreferences, syncState } = useSyncedPreferences();

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemDark(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const darkMode = adaptivePreferences.theme === "dark" || (adaptivePreferences.theme === "auto" && systemDark);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", darkMode);
    root.dataset.textSize = adaptivePreferences.textSize;
    root.dataset.density = adaptivePreferences.density;
    root.dataset.contrast = adaptivePreferences.highContrast ? "high" : "standard";
    root.dataset.reduceMotion = adaptivePreferences.reduceMotion ? "true" : "false";
  }, [adaptivePreferences, darkMode]);

  const handleLiveData = useCallback(({ accounts, transactions, liveMode: nextLiveMode, budgets }: { accounts: Account[]; transactions: Transaction[]; liveMode: boolean; budgets: { daily: number; weekly: number; monthly: number } }) => {
    setLiveAccounts(accounts);
    setLiveTransactions(transactions);
    setLiveMode(nextLiveMode);
    setFinancialLimits(budgets);
  }, []);

  const navigate = useCallback((tab: string) => {
    setFocusMode(false);
    setActiveTab(tab);
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: adaptivePreferences.reduceMotion ? "auto" : "smooth" }));
  }, [adaptivePreferences.reduceMotion]);

  const activeAccounts = liveAccounts;
  const visibleAccounts = activeAccounts.filter((account) => !account.is_hidden);
  const activeTransactions = liveTransactions;
  const activeBalance = activeAccounts
    .filter((account) => !account.is_hidden && !account.exclude_from_total)
    .reduce((sum, account) => sum + account.balance, 0);
  const monthPrefix = new Date().toISOString().slice(0, 7);
  const activeMonthlySpent = activeTransactions
    .filter((transaction) => transaction.amount < 0 && transaction.date.startsWith(monthPrefix))
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const accountsById = useMemo(() => Object.fromEntries(activeAccounts.map((account) => [account.id, account])), [activeAccounts]);
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate() + 1);
  const todayPrefix = today.toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6);
  const spentToday = activeTransactions.filter((transaction) => transaction.amount < 0 && transaction.date.startsWith(todayPrefix)).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const spentThisWeek = activeTransactions.filter((transaction) => transaction.amount < 0 && new Date(transaction.date) >= sevenDaysAgo).reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
  const monthlyRemaining = financialLimits.monthly > 0 ? Math.max(0, financialLimits.monthly - activeMonthlySpent) : activeBalance;
  const dailyAllowance = financialLimits.daily > 0 ? Math.max(0, financialLimits.daily - spentToday) : monthlyRemaining > 0 ? Math.floor(monthlyRemaining / daysLeft) : 0;
  const weeklyAllowance = financialLimits.weekly > 0 ? Math.max(0, financialLimits.weekly - spentThisWeek) : activeBalance > 0 ? Math.floor(activeBalance / 4) : 0;
  const availableToday = Math.max(0, Math.min(activeBalance, monthlyRemaining, dailyAllowance));
  const availableWeek = Math.max(0, Math.min(activeBalance, monthlyRemaining, weeklyAllowance));
  const savedThisMonth = activeAccounts
    .filter((account) => account.type === "savings" && !account.is_hidden)
    .reduce((sum, account) => sum + account.balance, 0);
  const categoryChart = useMemo(() => buildCategoryData(activeTransactions), [activeTransactions]);
  const balanceChart = useMemo(() => buildBalanceTrend(activeTransactions, activeBalance), [activeTransactions, activeBalance]);
  const heatmap = useMemo(() => buildHeatmap(activeTransactions), [activeTransactions]);
  const monthlyProgress = financialLimits.monthly > 0 ? Math.min(100, Math.round((activeMonthlySpent / financialLimits.monthly) * 100)) : 0;
  const filteredTransactions = activeTransactions.filter((transaction) =>
    [transaction.merchant, transaction.category, transaction.description].join(" ").toLowerCase().includes(query.toLowerCase())
  );
  const urgentInsight = emptyInsight;

  return (
    <main className="min-h-dvh">
      <LiquidBackground focusMode={focusMode || adaptivePreferences.reduceMotion} />
      <AuthGate>
      <div className="app-shell mx-auto min-h-dvh w-full max-w-7xl overflow-x-hidden px-4 pb-28 sm:px-6 lg:px-8">
        <header className="app-header sticky z-30 mb-4 flex items-center justify-between gap-2 rounded-3xl border border-white/40 bg-white/70 px-2.5 py-2 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60 sm:rounded-full sm:px-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1.05rem] bg-black shadow-glow ring-1 ring-white/35">
              <img src="/icons/wallet-icon-192.png" alt="Wallet" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black sm:text-xl">Wallet</h1>
              <p className="truncate text-xs text-muted-foreground">{liveMode ? "Datos actualizados" : "Configura tu correo"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block"><InstallPWAButton compact /></span>
            <Button variant="glass" size="icon" onClick={() => navigate("automatizacion")} aria-label="Automatización por correo y PDF">
              <Mail className="h-4 w-4" />
            </Button>
            <Button variant="glass" size="icon" onClick={() => navigate("ia")} aria-label="Asistente financiero con IA">
              <Sparkles className="h-4 w-4" />
            </Button>
            <Button variant="glass" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Personalizar experiencia">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <Button
              variant="glass"
              size="icon"
              className="hidden sm:inline-flex"
              onClick={() => updateAdaptivePreferences({ ...adaptivePreferences, theme: darkMode ? "light" : "dark" })}
              aria-label="Cambiar modo claro oscuro"
            >
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <PrivacyToggle
              hidden={hidden}
              focusMode={focusMode}
              onToggleHidden={() => setHidden((value) => !value)}
              onToggleFocus={() => setFocusMode((value) => !value)}
            />
          </div>
        </header>

        <section className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-white/45 p-3 backdrop-blur-md dark:bg-white/5">
          <div className="min-w-0"><p className="font-black">Captura por correo</p><p className="truncate text-xs text-muted-foreground">{liveTransactions.length > 0 ? `${liveTransactions.length} movimientos sincronizados` : "Enlaza tus avisos bancarios"}</p></div>
          <Button className="shrink-0" onClick={() => navigate("automatizacion")}><Mail className="h-4 w-4" /><span className="hidden sm:inline">Configurar</span></Button>
        </section>

        {focusMode ? (
          <FocusModePanel
            hidden={hidden}
            totalBalance={activeBalance}
            availableToday={availableToday}
            subscriptions={[]}
            urgentInsight={urgentInsight}
          />
        ) : (
          <>
            {activeTab !== "cuentas" && <RealBankingPanel showPanel={false} onLiveData={handleLiveData} />}
            {activeTab === "inicio" && (
              <Dashboard
                hidden={hidden}
                onToggleHidden={() => setHidden((value) => !value)}
                hideSections={hideSections}
                onToggleSections={() => setHideSections((value) => !value)}
                monthlyProgress={monthlyProgress}
                accounts={visibleAccounts}
                transactions={activeTransactions}
                totalBalance={activeBalance}
                monthlySpent={activeMonthlySpent}
                availableToday={availableToday}
                availableWeek={availableWeek}
                savedThisMonth={savedThisMonth}
                categoryChart={categoryChart}
                balanceChart={balanceChart}
                liveMode={liveMode}
                onNavigate={navigate}
                sectionOrder={adaptivePreferences.sectionOrder}
                hiddenSections={adaptivePreferences.hiddenSections}
              />
            )}
            {activeTab === "movimientos" && (
              <Movements
                hidden={hidden}
                query={query}
                setQuery={setQuery}
                filteredTransactions={filteredTransactions}
                accountsById={accountsById}
              />
            )}
            {activeTab === "suscripciones" && <SubscriptionsView accounts={visibleAccounts} transactions={activeTransactions} hidden={hidden} />}
            {activeTab === "presupuesto" && <Budgets monthlyProgress={monthlyProgress} transactions={activeTransactions} hidden={hidden} />}
            {activeTab === "cuentas" && (
              <AccountsView
                accounts={activeAccounts}
                hidden={hidden}
                bankingPanel={<RealBankingPanel showPanel onLiveData={handleLiveData} />}
              />
            )}
            {activeTab === "automatizacion" && <AutomationPanel />}
            {activeTab === "ia" && <AISection transactions={activeTransactions} monthlySpent={activeMonthlySpent} totalBalance={activeBalance} categoryChart={categoryChart} heatmap={heatmap} />}
          </>
        )}
      </div>
      <FloatingTabBar active={activeTab} onChange={navigate} order={adaptivePreferences.tabOrder} />
      <AdaptiveSettings open={settingsOpen} value={adaptivePreferences} onChange={updateAdaptivePreferences} onClose={() => setSettingsOpen(false)} syncState={syncState} />
      </AuthGate>
    </main>
  );
}

function Dashboard({
  hidden,
  onToggleHidden,
  hideSections,
  onToggleSections,
  monthlyProgress,
  accounts,
  transactions,
  totalBalance,
  monthlySpent,
  availableToday,
  availableWeek,
  savedThisMonth,
  categoryChart,
  balanceChart,
  liveMode,
  onNavigate,
  sectionOrder,
  hiddenSections
}: {
  hidden: boolean;
  onToggleHidden: () => void;
  hideSections: boolean;
  onToggleSections: () => void;
  monthlyProgress: number;
  accounts: Account[];
  transactions: Transaction[];
  totalBalance: number;
  monthlySpent: number;
  availableToday: number;
  availableWeek: number;
  savedThisMonth: number;
  categoryChart: CategoryPoint[];
  balanceChart: BalancePoint[];
  liveMode: boolean;
  onNavigate: (tab: string) => void;
  sectionOrder: string[];
  hiddenSections: string[];
}) {
  const dailyAverage = transactions.length > 0 ? Math.round(monthlySpent / Math.max(1, new Date().getDate())) : 0;
  const topCategory = categoryChart[0];
  const insights = transactions.length > 0 ? [
    {
      ...emptyInsight,
      id: "spending-pace",
      title: dailyAverage > availableToday && availableToday > 0 ? "Ritmo sobre tu disponible" : "Ritmo bajo control",
      message: `Promedio diario ${formatCurrency(dailyAverage)}. Disponible estimado ${formatCurrency(availableToday)}.`,
      severity: dailyAverage > availableToday && availableToday > 0 ? "orange" as const : "green" as const,
      type: "presupuesto" as const,
      urgency: dailyAverage > availableToday && availableToday > 0 ? 4 : 1,
      action: "Revisa los cargos recientes y ajusta el limite diario.",
      quick_button: "Ver movimientos",
      estimated_impact: Math.max(0, dailyAverage - availableToday)
    },
    {
      ...emptyInsight,
      id: "top-category",
      title: topCategory ? `${topCategory.name} lidera tus gastos` : "Categorias en orden",
      message: topCategory ? `Acumula ${formatCurrency(topCategory.value)} este mes.` : "Aun no hay una categoria dominante.",
      severity: "blue" as const,
      type: "habito" as const,
      urgency: 2,
      action: "Compara sus movimientos antes de cambiar tu presupuesto.",
      quick_button: "Revisar categoria",
      estimated_impact: topCategory?.value ?? 0
    }
  ] : [emptyInsight];

  const asideSections: Record<string, React.ReactNode> = {
    resumen: (
      <MonthVisualSummary
        monthlyProgress={monthlyProgress}
        hidden={hidden}
        monthlySpent={monthlySpent}
        availableWeek={availableWeek}
        savedThisMonth={savedThisMonth}
        categoryChart={categoryChart}
        liveMode={liveMode}
      />
    ),
    presupuesto: (
      <GlassCard>
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-xl font-black">Presupuesto mensual</h2><Badge>{monthlyProgress}%</Badge></div>
        <Progress value={monthlyProgress} />
        <Button variant="glass" className="mt-4 w-full" onClick={() => onNavigate("presupuesto")}>Administrar presupuesto</Button>
      </GlassCard>
    ),
    tendencia: (
      <GlassCard><h2 className="text-xl font-black">Tendencia de saldo</h2>{balanceChart.length > 1 ? <TrendLineChart data={balanceChart} /> : <EmptyState title="Sin tendencia" copy="Necesitas mas movimientos." />}</GlassCard>
    ),
    categorias: (
      <GlassCard>
        <h2 className="text-xl font-black">Categorias</h2>
        {categoryChart.length > 0 ? <><CategoryDonut data={categoryChart} /><div className="grid grid-cols-2 gap-2">{categoryChart.map((category) => <div key={category.name} className="flex min-w-0 items-center gap-2 text-sm"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: category.color }} /><span className="truncate">{category.name}</span></div>)}</div></> : <EmptyState title="Sin categorias" copy="Apareceran al recibir movimientos." />}
      </GlassCard>
    )
  };

  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="min-w-0 space-y-5">
        <BalanceCard balance={totalBalance} hidden={hidden} onToggleHidden={onToggleHidden} />
        <TodaySummaryCard availableToday={availableToday} hidden={hidden} onReview={() => onNavigate("movimientos")} onSave={() => onNavigate("presupuesto")} onPayments={() => onNavigate("presupuesto")} />
        <GlassCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Cuentas</p>
              <h2 className="text-2xl font-black">Saldo por institución</h2>
            </div>
            <Badge>{accounts.length > 0 ? "Datos reales" : "Sin cuentas"} · {accounts.length} activas</Badge>
          </div>
          {accounts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} hidden={hidden} />
              ))}
            </div>
          ) : (
            <EmptyState title="Aun no hay saldo" copy="Configura el correo y reenvia un aviso bancario para comenzar." />
          )}
        </GlassCard>
        <GlassCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
                <p className="text-sm font-semibold text-muted-foreground">Smart Insights</p>
                <h2 className="text-2xl font-black">Acciones importantes</h2>
            </div>
            <Button variant="glass" size="sm" onClick={onToggleSections}>
              <SlidersHorizontal className="h-4 w-4" />
              {hideSections ? "Mostrar" : "Ocultar"}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">{insights.map((insight) => <AIInsightCard key={insight.id} insight={insight} onAction={() => onNavigate(insight.id === "spending-pace" ? "movimientos" : insight.id === "top-category" ? "movimientos" : "automatizacion")} />)}</div>
        </GlassCard>
        <GlassCard>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Últimos movimientos</p>
              <h2 className="text-2xl font-black">Timeline</h2>
            </div>
            <Badge>IA activa</Badge>
          </div>
          <div className="space-y-2">
            {transactions.length > 0 ? (
              transactions.slice(0, 7).map((transaction) => (
                <TransactionItem
                  key={transaction.id}
                  transaction={transaction}
                  account={accounts.find((account) => account.id === transaction.account_id)}
                  hidden={hidden}
                />
              ))
            ) : (
              <EmptyState title="Sin movimientos" copy="Enlaza tu correo para comenzar." />
            )}
          </div>
        </GlassCard>
      </div>
      <aside className="min-w-0 space-y-5">{sectionOrder.map((section) => hiddenSections.includes(section) ? null : <div key={section}>{asideSections[section]}</div>)}</aside>
    </div>
  );
}

function MonthVisualSummary({
  monthlyProgress,
  hidden,
  monthlySpent,
  availableWeek,
  savedThisMonth,
  categoryChart,
  liveMode
}: {
  monthlyProgress: number;
  hidden: boolean;
  monthlySpent: number;
  availableWeek: number;
  savedThisMonth: number;
  categoryChart: CategoryPoint[];
  liveMode: boolean;
}) {
  const topCategory = categoryChart[0]?.name ?? "Sin datos";
  const cards: Array<[string, string, string]> = [
    ["Gasto del mes", hidden ? "••••" : formatCurrency(monthlySpent), "💸"],
    ["Presupuesto usado", monthlyProgress > 0 ? `${monthlyProgress}%` : "Sin presupuesto", "🟡"],
    ["Categoría cara", topCategory, "🍽️"],
    ["Mejor mejora", "Calculando", "🌱"],
    ["Mayor alerta", categoryChart.length > 0 ? "Revisar gastos" : "Sin alertas", "📅"],
    ["Modo", liveMode ? "Real" : "Sin banco", "🏦"],
    ["Disponible", hidden ? "••••" : formatCurrency(availableWeek), "🧭"],
    ["Ahorrado", hidden ? "••••" : formatCurrency(savedThisMonth), "✅"]
  ];
  return (
    <GlassCard>
      <h2 className="text-xl font-black">Resumen visual del mes</h2>
      <MonthlyVisualSummaryGrid cards={cards} />
    </GlassCard>
  );
}

function Movements({
  hidden,
  query,
  setQuery,
  filteredTransactions,
  accountsById
}: {
  hidden: boolean;
  query: string;
  setQuery: (query: string) => void;
  filteredTransactions: Transaction[];
  accountsById: Record<string, Account>;
}) {
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const categories = Array.from(new Set(filteredTransactions.map((transaction) => transaction.category))).sort();
  const visibleTransactions = filteredTransactions.filter((transaction) =>
    (!categoryFilter || transaction.category === categoryFilter) &&
    (!accountFilter || transaction.account_id === accountFilter) &&
    (reviewFilter === "all" || (reviewFilter === "reviewed" ? transaction.reviewed : !transaction.reviewed))
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <GlassCard className="space-y-4">
        <h2 className="text-2xl font-black">Filtros</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar comercio, categoría o nota" />
        </div>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Cuenta
          <select className="h-11 w-full rounded-full border border-white/40 bg-white/60 px-4 text-sm text-foreground dark:bg-slate-900/80" value={accountFilter} onChange={(event) => setAccountFilter(event.target.value)}>
            <option value="">Todas</option>
            {Object.values(accountsById).map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Categoría
          <select className="h-11 w-full rounded-full border border-white/40 bg-white/60 px-4 text-sm text-foreground dark:bg-slate-900/80" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
            <option value="">Todas</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-xs font-semibold text-muted-foreground">
          Estado
          <select className="h-11 w-full rounded-full border border-white/40 bg-white/60 px-4 text-sm text-foreground dark:bg-slate-900/80" value={reviewFilter} onChange={(event) => setReviewFilter(event.target.value)}>
            <option value="all">Todos</option>
            <option value="pending">Por revisar</option>
            <option value="reviewed">Revisados</option>
          </select>
        </label>
        {(categoryFilter || accountFilter || reviewFilter !== "all") && (
          <Button variant="glass" className="w-full" onClick={() => { setCategoryFilter(""); setAccountFilter(""); setReviewFilter("all"); }}>
            Limpiar filtros
          </Button>
        )}
      </GlassCard>
      <GlassCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Movimientos</p>
            <h2 className="text-2xl font-black">Edición y revisión</h2>
          </div>
          <Badge>Captura por correo</Badge>
        </div>
        <div className="space-y-2">
          {visibleTransactions.length > 0 ? (
            visibleTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} account={accountsById[transaction.account_id]} hidden={hidden} />
            ))
          ) : (
            <EmptyState title="No hay movimientos" copy="Configura el reenvio de correo y envia un aviso bancario para comenzar." />
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function Budgets({ monthlyProgress, transactions, hidden }: { monthlyProgress: number; transactions: Transaction[]; hidden: boolean }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-sm font-bold uppercase tracking-[0.16em] text-orange-500">Planifica sin perder el contexto</p><h2 className="text-4xl font-black sm:text-5xl">Presupuestos</h2></div>
        <Badge>{monthlyProgress}% del límite mensual</Badge>
      </div>
      <BudgetManager transactions={transactions} hidden={hidden} />
      <DebtBudgetPlanner />
    </div>
  );
}

function Savings() {
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
      <GlassCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Ahorros y objetivos</p>
            <h2 className="text-2xl font-black">Metas activas</h2>
          </div>
          <Button><Target className="h-4 w-4" />Meta</Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <EmptyState title="Sin metas todavía" copy="Pronto podrás crear metas de ahorro desde aquí. Por ahora usa presupuestos y deudas." />
        </div>
      </GlassCard>
      <div className="space-y-5">
        <GlassCard>
          <h2 className="text-xl font-black">Pagos futuros y suscripciones</h2>
          <div className="mt-4 space-y-2">
            <EmptyState title="Sin suscripciones" copy="Cuando sincronices movimientos, Wallet detectará pagos recurrentes." />
          </div>
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Deudas y deudores</h2>
          <div className="mt-4 space-y-3">
            <EmptyState title="Tus deudas aparecen en Presupuesto" copy="Usa la pestaña Presupuesto para crear o editar deudas y deudores." />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-[1.4rem] bg-white/55 p-4 text-sm dark:bg-white/8">
      <p className="font-black">{title}</p>
      <p className="mt-1 text-muted-foreground">{copy}</p>
    </div>
  );
}

function AISection({
  transactions,
  monthlySpent,
  totalBalance,
  categoryChart,
  heatmap
}: {
  transactions: Transaction[];
  monthlySpent: number;
  totalBalance: number;
  categoryChart: CategoryPoint[];
  heatmap: HeatmapDay[];
}) {
  const expenseTransactions = transactions.filter((transaction) => transaction.amount < 0);
  const averageDaily = expenseTransactions.length > 0 ? Math.round(monthlySpent / Math.max(1, new Date().getDate())) : 0;
  const largestExpense = expenseTransactions.reduce((max, transaction) => Math.max(max, Math.abs(transaction.amount)), 0);
  const topCategory = categoryChart[0]?.name ?? "Sin datos";
  const healthCards = [
    { label: "Tu ritmo de gasto", value: transactions.length > 0 ? `${transactions.length} mov.` : "Sin datos", icon: Gauge, color: "text-orange-500", copy: transactions.length > 0 ? "Con datos reales" : "Agrega movimientos" },
    { label: "Promedio diario", value: formatCurrency(averageDaily), icon: Flame, color: "text-red-500", copy: expenseTransactions.length > 0 ? "Gasto real" : "Sin gastos" },
    { label: "Saldo proyectado", value: formatCurrency(totalBalance), icon: Sparkles, color: "text-sky-500", copy: "Según saldo actual" },
    { label: "Categoría dominante", value: topCategory, icon: CreditCard, color: "text-amber-500", copy: categoryChart.length > 0 ? "Mayor gasto" : "Sin categorías" },
    { label: "Gasto impulsivo detectado", value: formatCurrency(largestExpense), icon: Shield, color: "text-pink-500", copy: largestExpense > 0 ? "Mayor movimiento" : "Sin datos" },
    { label: "Días críticos", value: "0", icon: CalendarDays, color: "text-violet-500", copy: "Sin pagos cargados" },
    { label: "Racha de ahorro", value: totalBalance > 0 ? "Activa" : "Sin datos", icon: CheckCircle2, color: "text-emerald-500", copy: "Según saldo" },
    { label: "Meta más cercana", value: "Sin meta", icon: Target, color: "text-orange-500", copy: "Crea una meta" }
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <AIChatPanel />
      <div className="space-y-5">
        <GlassCard>
          <h2 className="text-2xl font-black">Tarjetas tipo Apple Health</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {healthCards.map((card) => {
              return (
                <AppleHealthMetricCard key={card.label} {...card} />
              );
            })}
          </div>
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Mapa de calor de gastos</h2>
          {expenseTransactions.length > 0 ? <HeatmapSpending days={heatmap} /> : <EmptyState title="Sin mapa todavía" copy="Registra gastos para ver los días de mayor actividad." />}
        </GlassCard>
      </div>
    </div>
  );
}
