"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Flame,
  Gauge,
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
import { CategoryDonut, TrendLineChart } from "@/components/Charts";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { FocusModePanel } from "@/components/FocusModePanel";
import { GlassCard } from "@/components/GlassCard";
import { HeatmapSpending } from "@/components/HeatmapSpending";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { LiquidBackground } from "@/components/LiquidBackground";
import { MonthlyVisualSummary as MonthlyVisualSummaryGrid } from "@/components/MonthlyVisualSummary";
import { AddTransactionModal, AppleWalletImportModal, ConnectBankModal, ManualAccountModal } from "@/components/Modals";
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
import type { Account, BalancePoint, CategoryPoint, HeatmapDay, Transaction } from "@/lib/types";

const categoryColors = ["#0A84FF", "#34C759", "#FF9F0A", "#FF375F", "#AF52DE", "#64D2FF", "#FFD60A", "#8E8E93"];

const secondaryItems = [
  "Cuentas",
  "Deudas",
  "Suscripciones",
  "Ajustes",
  "Apple Wallet",
  "Seguridad"
];

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
  message: "Agrega una cuenta y registra movimientos para generar alertas reales.",
  severity: "blue" as const,
  type: "alerta" as const,
  urgency: 1,
  action: "Conecta un banco o agrega efectivo.",
  action_label: "Agregar datos",
  quick_button: "Agregar cuenta",
  previous_month_delta: 0,
  estimated_impact: 0,
  icon: "🔒",
  created_at: new Date().toISOString()
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("inicio");
  const [hidden, setHidden] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [hideSections, setHideSections] = useState(false);
  const [query, setQuery] = useState("");
  const [liveAccounts, setLiveAccounts] = useState<Account[]>([]);
  const [liveTransactions, setLiveTransactions] = useState<Transaction[]>([]);
  const [liveMode, setLiveMode] = useState(false);

  const activeAccounts = liveAccounts;
  const activeTransactions = liveTransactions;
  const activeBalance = activeAccounts
    .filter((account) => !account.is_hidden && !account.exclude_from_total)
    .reduce((sum, account) => sum + account.balance, 0);
  const activeMonthlySpent = activeTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const accountsById = useMemo(() => Object.fromEntries(activeAccounts.map((account) => [account.id, account])), [activeAccounts]);
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - today.getDate() + 1);
  const availableToday = activeBalance > 0 ? Math.floor(activeBalance / daysLeft) : 0;
  const availableWeek = activeBalance > 0 ? Math.floor(activeBalance / 4) : 0;
  const savedThisMonth = activeAccounts
    .filter((account) => account.type === "savings")
    .reduce((sum, account) => sum + account.balance, 0);
  const categoryChart = useMemo(() => buildCategoryData(activeTransactions), [activeTransactions]);
  const balanceChart = useMemo(() => buildBalanceTrend(activeTransactions, activeBalance), [activeTransactions, activeBalance]);
  const heatmap = useMemo(() => buildHeatmap(activeTransactions), [activeTransactions]);
  const monthlyProgress = 0;
  const filteredTransactions = activeTransactions.filter((transaction) =>
    [transaction.merchant, transaction.category, transaction.description].join(" ").toLowerCase().includes(query.toLowerCase())
  );
  const urgentInsight = emptyInsight;

  return (
    <main className={darkMode ? "dark" : ""}>
      <LiquidBackground focusMode={focusMode} />
      <AuthGate>
      <div className="mx-auto min-h-screen w-full max-w-7xl overflow-x-hidden px-4 pb-28 pt-4 sm:px-6 lg:px-8">
        <header className="sticky top-3 z-30 mb-5 flex items-center justify-between gap-3 rounded-full border border-white/40 bg-white/60 px-3 py-2 shadow-sm backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/45">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[1.05rem] bg-black shadow-glow ring-1 ring-white/35">
              <img src="/icons/wallet-icon-192.png" alt="Wallet" className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black sm:text-xl">Wallet</h1>
              <p className="truncate text-xs text-muted-foreground">{liveMode ? "Banca real read-only" : "Listo para banca real"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <InstallPWAButton />
            <Button
              variant="glass"
              size="icon"
              onClick={() => setDarkMode((value) => !value)}
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

        <section className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <GlassCard className="p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Bienvenido</Badge>
              <Badge>{liveMode ? "Modo real activo" : "Sin datos de ejemplo"}</Badge>
              <Badge>Moneda principal: CLP</Badge>
              <Badge>OAuth read-only preparado</Badge>
              <Badge>PWA instalable</Badge>
            </div>
            <p className="mt-3 max-w-3xl text-sm font-medium text-muted-foreground">
              Wallet usa conexiones read-only. Agrega cuentas manuales, efectivo o conecta bancos mediante proveedores seguros. Nunca se guardan claves bancarias reales.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["CLP", "USD", "EUR"].map((currency) => (
                <Badge key={currency} className={currency === "CLP" ? "bg-sky-500 text-white" : ""}>
                  {currency}
                </Badge>
              ))}
            </div>
          </GlassCard>
          <div className="flex flex-wrap gap-2">
            <ConnectBankModal />
            <ManualAccountModal />
            <ManualAccountModal cash />
            <AddTransactionModal />
            <AppleWalletImportModal />
          </div>
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
            <RealBankingPanel
              onLiveData={({ accounts, transactions, liveMode: nextLiveMode }) => {
                setLiveAccounts(accounts);
                setLiveTransactions(transactions);
                setLiveMode(nextLiveMode);
              }}
            />
            {activeTab === "inicio" && (
              <Dashboard
                hidden={hidden}
                onToggleHidden={() => setHidden((value) => !value)}
                hideSections={hideSections}
                onToggleSections={() => setHideSections((value) => !value)}
                monthlyProgress={monthlyProgress}
                accounts={activeAccounts}
                transactions={activeTransactions}
                totalBalance={activeBalance}
                monthlySpent={activeMonthlySpent}
                availableToday={availableToday}
                availableWeek={availableWeek}
                savedThisMonth={savedThisMonth}
                categoryChart={categoryChart}
                balanceChart={balanceChart}
                liveMode={liveMode}
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
            {activeTab === "presupuesto" && <Budgets monthlyProgress={monthlyProgress} />}
            {activeTab === "ahorros" && <Savings />}
            {activeTab === "ia" && <AISection transactions={activeTransactions} monthlySpent={activeMonthlySpent} totalBalance={activeBalance} categoryChart={categoryChart} heatmap={heatmap} />}
          </>
        )}
      </div>
      <FloatingTabBar active={activeTab} onChange={setActiveTab} />
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
  liveMode
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
}) {
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="min-w-0 space-y-5">
        <BalanceCard balance={totalBalance} hidden={hidden} onToggleHidden={onToggleHidden} />
        <TodaySummaryCard availableToday={availableToday} hidden={hidden} />
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
            <EmptyState title="Agrega tu primera cuenta" copy="Conecta un banco, agrega efectivo o crea una cuenta manual para empezar." />
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
          <div className="grid gap-3 sm:grid-cols-2">
            {transactions.length > 0 ? (
              <EmptyState title="Insights en preparación" copy="Wallet usará tus movimientos reales para generar alertas, sin datos inventados." />
            ) : (
              <EmptyState title="Sin insights todavía" copy="Registra movimientos o conecta un banco para activar alertas inteligentes." />
            )}
          </div>
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
              <EmptyState title="Sin movimientos" copy="Registra un pago o sincroniza un banco para ver tu timeline." />
            )}
          </div>
        </GlassCard>
      </div>
      <aside className="min-w-0 space-y-5">
        <MonthVisualSummary
          monthlyProgress={monthlyProgress}
          hidden={hidden}
          monthlySpent={monthlySpent}
          availableWeek={availableWeek}
          savedThisMonth={savedThisMonth}
          categoryChart={categoryChart}
          liveMode={liveMode}
        />
        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Presupuesto mensual</h2>
            <Badge className={monthlyProgress > 80 ? "text-orange-600" : ""}>{monthlyProgress}% usado</Badge>
          </div>
          <Progress value={monthlyProgress} />
          <p className="mt-3 text-sm text-muted-foreground">
            Define un presupuesto mensual para calcular cuánto queda por gastar.
          </p>
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Tendencia de saldo</h2>
          {balanceChart.length > 1 ? <TrendLineChart data={balanceChart} /> : <EmptyState title="Sin tendencia" copy="Necesitas más movimientos para calcular una tendencia." />}
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Categorías</h2>
          {categoryChart.length > 0 ? (
            <>
              <CategoryDonut data={categoryChart} />
              <div className="grid grid-cols-2 gap-2">
                {categoryChart.map((category) => (
                  <div key={category.name} className="flex items-center gap-2 text-sm">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                    <span className="truncate">{category.name}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <EmptyState title="Sin categorías" copy="Registra gastos para ver porcentajes por categoría." />
          )}
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Semáforo financiero</h2>
          <div className="mt-4 grid gap-2">
            {[
              ["Saldo", "Vas bien", "bg-emerald-400"],
              ["Comida", "Atención", "bg-yellow-400"],
              ["Pagos próximos", "Urgencia", "bg-red-500"]
            ].map(([label, value, color]) => (
              <div key={label} className="flex items-center justify-between rounded-2xl bg-white/55 p-3 dark:bg-white/8">
                <span className="font-semibold">{label}</span>
                <span className="flex items-center gap-2 text-sm font-bold">
                  <span className={`h-3 w-3 rounded-full ${color}`} />
                  {value}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Menú secundario</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {secondaryItems.map((item) => (
              <Button key={item} variant="glass" className="justify-between">
                {item}
                <ChevronRight className="h-4 w-4" />
              </Button>
            ))}
          </div>
        </GlassCard>
      </aside>
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
  return (
    <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr]">
      <GlassCard className="space-y-4">
        <h2 className="text-2xl font-black">Filtros</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar comercio, categoría o nota" />
        </div>
        {["Fecha", "Cuenta", "Categoría", "Monto", "Recurrente", "Revisado"].map((filter) => (
          <Button key={filter} className="w-full justify-between" variant="glass">
            {filter}
            <ChevronRight className="h-4 w-4" />
          </Button>
        ))}
      </GlassCard>
      <GlassCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Movimientos</p>
            <h2 className="text-2xl font-black">Edición y revisión</h2>
          </div>
          <AddTransactionModal />
        </div>
        <div className="space-y-2">
          {filteredTransactions.length > 0 ? (
            filteredTransactions.map((transaction) => (
              <TransactionItem key={transaction.id} transaction={transaction} account={accountsById[transaction.account_id]} hidden={hidden} />
            ))
          ) : (
            <EmptyState title="No hay movimientos" copy="Agrega una cuenta y registra tu primer gasto." />
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function Budgets({ monthlyProgress }: { monthlyProgress: number }) {
  return (
    <div className="space-y-5">
      <DebtBudgetPlanner />
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <GlassCard>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Presupuestos</p>
            <h2 className="text-2xl font-black">Control por categoría</h2>
            </div>
            <Button><Plus className="h-4 w-4" />Crear</Button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <EmptyState title="Sin presupuestos por categoría" copy="Usa el formulario superior para crear gastos diarios, semanales, mensuales, anuales o por evento." />
        </div>
        </GlassCard>
        <GlassCard glow>
        <h2 className="text-2xl font-black">Recomendación IA</h2>
        <p className="mt-3 text-lg font-semibold">
          Crea gastos por periodo y registra movimientos para recibir recomendaciones reales.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">Wallet no muestra recomendaciones inventadas sin tus datos.</p>
          <div className="mt-5 rounded-[1.4rem] bg-orange-400/14 p-4">
            <p className="font-black">Zona de atención</p>
            <p className="text-sm text-muted-foreground">Si pasas el 80%, activa límite diario automático.</p>
          </div>
          <Progress value={monthlyProgress} className="mt-5" />
        </GlassCard>
      </div>
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
