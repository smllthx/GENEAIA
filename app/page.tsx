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
import { BudgetRing } from "@/components/BudgetRing";
import { DebtCard, GoalCard, SubscriptionCard } from "@/components/Cards";
import { CategoryDonut, TrendLineChart } from "@/components/Charts";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { FocusModePanel } from "@/components/FocusModePanel";
import { GlassCard } from "@/components/GlassCard";
import { HeatmapSpending } from "@/components/HeatmapSpending";
import { InstallPWAButton } from "@/components/InstallPWAButton";
import { LiquidBackground } from "@/components/LiquidBackground";
import { MonthlyVisualSummary as MonthlyVisualSummaryGrid } from "@/components/MonthlyVisualSummary";
import { AddTransactionModal, AppleWalletImportModal, ConnectBankModal } from "@/components/Modals";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import { RealBankingPanel } from "@/components/RealBankingPanel";
import { TodayCard as TodaySummaryCard } from "@/components/TodayCard";
import { DebtBudgetPlanner } from "@/components/DebtBudgetPlanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  balanceTrend,
  categoryData,
  demoAccounts,
  demoBudgets,
  demoDebts,
  demoGoals,
  demoInsights,
  demoSubscriptions,
  demoTransactions,
  heatmapDays,
  totals
} from "@/lib/demo-data";
import { formatCurrency } from "@/lib/utils";
import { TransactionItem } from "@/components/TransactionItem";
import type { Account, Transaction } from "@/lib/types";

const healthCards = [
  { label: "Tu ritmo de gasto", value: "18% alto", icon: Gauge, color: "text-orange-500", copy: "Reduce compras chicas" },
  { label: "Promedio diario", value: "$21.900", icon: Flame, color: "text-red-500", copy: "Meta: $18.000" },
  { label: "Saldo proyectado", value: "$918k", icon: Sparkles, color: "text-sky-500", copy: "Fin de mes" },
  { label: "Categoría dominante", value: "Comida", icon: CreditCard, color: "text-amber-500", copy: "28% arriba" },
  { label: "Gasto impulsivo detectado", value: "$38.990", icon: Shield, color: "text-pink-500", copy: "Compras online" },
  { label: "Días críticos", value: "3", icon: CalendarDays, color: "text-violet-500", copy: "Pagos cerca" },
  { label: "Racha de ahorro", value: "12 días", icon: CheckCircle2, color: "text-emerald-500", copy: "Vas bien" },
  { label: "Meta más cercana", value: "Carlino", icon: Target, color: "text-orange-500", copy: "43% listo" }
];

const secondaryItems = [
  "Cuentas",
  "Deudas",
  "Suscripciones",
  "Ajustes",
  "Apple Wallet",
  "Seguridad"
];

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

  const activeAccounts = liveMode && liveAccounts.length > 0 ? liveAccounts : demoAccounts;
  const activeTransactions = liveMode && liveTransactions.length > 0 ? liveTransactions : demoTransactions;
  const activeBalance = activeAccounts
    .filter((account) => !account.is_hidden && !account.exclude_from_total)
    .reduce((sum, account) => sum + account.balance, 0);
  const activeMonthlySpent = activeTransactions
    .filter((transaction) => transaction.amount < 0)
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const accountsById = useMemo(() => Object.fromEntries(activeAccounts.map((account) => [account.id, account])), [activeAccounts]);
  const monthlyProgress = Math.round((activeMonthlySpent / totals.monthlyBudget) * 100);
  const filteredTransactions = activeTransactions.filter((transaction) =>
    [transaction.merchant, transaction.category, transaction.description].join(" ").toLowerCase().includes(query.toLowerCase())
  );
  const urgentInsight = [...demoInsights].sort((a, b) => b.urgency - a.urgency)[0];

  return (
    <main className={darkMode ? "dark" : ""}>
      <LiquidBackground focusMode={focusMode} />
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
              <Badge>{liveMode ? "Modo real activo" : "Modo demo disponible"}</Badge>
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
            <Button variant="glass"><Plus className="h-4 w-4" />Agregar cuenta manual</Button>
            <Button variant="glass"><Plus className="h-4 w-4" />Agregar efectivo</Button>
            <AddTransactionModal />
            <AppleWalletImportModal />
          </div>
        </section>

        {focusMode ? (
          <FocusModePanel
            hidden={hidden}
            totalBalance={activeBalance}
            availableToday={totals.availableToday}
            subscriptions={demoSubscriptions}
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
            {activeTab === "ia" && <AISection />}
          </>
        )}
      </div>
      <FloatingTabBar active={activeTab} onChange={setActiveTab} />
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
  liveMode: boolean;
}) {
  return (
    <div className="grid min-w-0 gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="min-w-0 space-y-5">
        <BalanceCard balance={totalBalance} hidden={hidden} onToggleHidden={onToggleHidden} />
        <TodaySummaryCard availableToday={totals.availableToday} hidden={hidden} />
        <GlassCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Cuentas</p>
              <h2 className="text-2xl font-black">Saldo por institución</h2>
            </div>
            <Badge>{liveMode ? "Datos reales" : "Demo"} · {accounts.length} activas</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {accounts.map((account) => (
              <AccountCard key={account.id} account={account} hidden={hidden} />
            ))}
          </div>
        </GlassCard>
        <GlassCard>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">Smart Insights</p>
              <h2 className="text-2xl font-black">Ordenados por prioridad</h2>
            </div>
            <Button variant="glass" size="sm" onClick={onToggleSections}>
              <SlidersHorizontal className="h-4 w-4" />
              {hideSections ? "Mostrar" : "Ocultar"}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {demoInsights
              .sort((a, b) => b.urgency - a.urgency)
              .slice(0, hideSections ? 2 : 5)
              .map((insight) => (
                <AIInsightCard key={insight.id} insight={insight} />
              ))}
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
            {transactions.slice(0, 7).map((transaction) => (
              <TransactionItem
                key={transaction.id}
                transaction={transaction}
                account={accounts.find((account) => account.id === transaction.account_id)}
                hidden={hidden}
              />
            ))}
          </div>
        </GlassCard>
      </div>
      <aside className="min-w-0 space-y-5">
        <MonthVisualSummary monthlyProgress={monthlyProgress} hidden={hidden} monthlySpent={monthlySpent} liveMode={liveMode} />
        <GlassCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-black">Presupuesto mensual</h2>
            <Badge className={monthlyProgress > 80 ? "text-orange-600" : ""}>{monthlyProgress}% usado</Badge>
          </div>
          <Progress value={monthlyProgress} />
          <p className="mt-3 text-sm text-muted-foreground">
            Te quedan {formatCurrency(totals.monthlyBudget - totals.monthlySpent)} para cerrar el mes.
          </p>
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Tendencia de saldo</h2>
          <TrendLineChart data={balanceTrend} />
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Categorías</h2>
          <CategoryDonut data={categoryData} />
          <div className="grid grid-cols-2 gap-2">
            {categoryData.map((category) => (
              <div key={category.name} className="flex items-center gap-2 text-sm">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
                <span className="truncate">{category.name}</span>
              </div>
            ))}
          </div>
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
  liveMode
}: {
  monthlyProgress: number;
  hidden: boolean;
  monthlySpent: number;
  liveMode: boolean;
}) {
  const cards: Array<[string, string, string]> = [
    ["Gasto del mes", hidden ? "••••" : formatCurrency(monthlySpent), "💸"],
    ["Presupuesto usado", `${monthlyProgress}%`, "🟡"],
    ["Categoría cara", "Comida", "🍽️"],
    ["Mejor mejora", "+$22.000 ahorro", "🌱"],
    ["Mayor alerta", "3 pagos", "📅"],
    ["Modo", liveMode ? "Real" : "Demo", "🏦"],
    ["Disponible", hidden ? "••••" : formatCurrency(totals.availableWeek), "🧭"],
    ["Ahorrado", hidden ? "••••" : formatCurrency(totals.savedThisMonth), "✅"]
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
  filteredTransactions: typeof demoTransactions;
  accountsById: Record<string, (typeof demoAccounts)[number]>;
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
          {filteredTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} account={accountsById[transaction.account_id]} hidden={hidden} />
          ))}
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
            {demoBudgets.map((budget) => (
              <BudgetRing key={budget.id} budget={budget} />
            ))}
          </div>
        </GlassCard>
        <GlassCard glow>
          <h2 className="text-2xl font-black">Recomendación IA</h2>
          <p className="mt-3 text-lg font-semibold">
            Tu presupuesto de comida es {formatCurrency(180000)}. Ya usaste {formatCurrency(121000)}.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Te quedan {formatCurrency(39000)} para 9 días.</p>
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
        <div className="mt-4 rounded-[1.4rem] bg-gradient-to-r from-emerald-400/20 via-sky-400/15 to-yellow-300/20 p-4">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 font-black">Confetti suave</p>
          <p className="text-sm text-muted-foreground">La meta Carlino subió a 43%. Buen avance sin saturar la pantalla.</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {demoGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      </GlassCard>
      <div className="space-y-5">
        <GlassCard>
          <h2 className="text-xl font-black">Pagos futuros y suscripciones</h2>
          <div className="mt-4 space-y-2">
            {demoSubscriptions.slice(0, 6).map((subscription) => (
              <SubscriptionCard key={subscription.id} subscription={subscription} />
            ))}
          </div>
        </GlassCard>
        <GlassCard>
          <h2 className="text-xl font-black">Deudas y deudores</h2>
          <div className="mt-4 space-y-3">
            {demoDebts.map((debt) => (
              <DebtCard key={debt.id} debt={debt} />
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function AISection() {
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
          <HeatmapSpending days={heatmapDays} />
        </GlassCard>
      </div>
    </div>
  );
}
