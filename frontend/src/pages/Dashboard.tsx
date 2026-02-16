
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CoachCorner } from "@/components/features/CoachCorner"
import { CashFlowSankey } from "@/components/features/CashFlowSankey"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, TrendingUp, Wallet, Landmark, Banknote, BarChart3, CreditCard, ClipboardCheck, X } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell, Legend } from 'recharts'
import { FinancialTooltip } from "@/components/features/FinancialTooltip"
import { useFinancialStore } from "@/store"
import { AllocationChart } from "@/components/features/AllocationChart"
import { useShallow } from 'zustand/react/shallow'
import { motion } from 'framer-motion'

import { useNavigate } from "react-router-dom"

// Emoji + color mapping for expense categories
const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
    house: { emoji: '🏠', color: '#f87171' },
    food: { emoji: '🍕', color: '#fb923c' },
    transport: { emoji: '🚗', color: '#facc15' },
    savings: { emoji: '💰', color: '#10b981' },
    lifestyle: { emoji: '🎉', color: '#818cf8' },
}
const FALLBACK_COLORS = ['#f472b6', '#38bdf8', '#a78bfa', '#34d399', '#fbbf24', '#fb7185', '#2dd4bf', '#c084fc']

function getCategoryMeta(id: string, index: number) {
    if (CATEGORY_META[id]) return CATEGORY_META[id]
    return { emoji: '📦', color: FALLBACK_COLORS[index % FALLBACK_COLORS.length] }
}

export function Dashboard() {
    const navigate = useNavigate()
    const [visualMode, setVisualMode] = useState<'chart' | 'sankey' | 'compare'>('sankey')

    const { incomes, expenses, addIncome, removeIncome, updateIncome, getTotalIncome, getFreeCashFlow, setExpenseAllocations, addExpense, removeExpense, updateExpense, currency, accounts, fetchAccounts, fetchHistory, history, showCoach, actualExpenses, setActualExpense, clearActualExpenses, persons, fetchPersons } = useFinancialStore(
        useShallow((state) => ({
            incomes: state.incomes,
            expenses: state.expenses,
            addIncome: state.addIncome,
            removeIncome: state.removeIncome,
            updateIncome: state.updateIncome,
            getTotalIncome: state.getTotalIncome,
            getFreeCashFlow: state.getFreeCashFlow,
            setExpenseAllocations: state.setExpenseAllocations,
            addExpense: state.addExpense,
            removeExpense: state.removeExpense,
            updateExpense: state.updateExpense,
            currency: state.currency,
            accounts: state.accounts,
            fetchAccounts: state.fetchAccounts,
            fetchHistory: state.fetchHistory,
            history: state.history,
            showCoach: state.showCoach,
            actualExpenses: state.actualExpenses,
            setActualExpense: state.setActualExpense,
            clearActualExpenses: state.clearActualExpenses,
            persons: state.persons,
            fetchPersons: state.fetchPersons
        }))
    )

    const [realityCheckMode, setRealityCheckMode] = useState(false)

    const TYPE_ICONS: Record<string, any> = {
        General: Landmark,
        Cash: Banknote,
        Investment: BarChart3,
        Liability: CreditCard,
    }
    const TYPE_COLORS: Record<string, string> = {
        General: '#6b7280',
        Cash: '#10b981',
        Investment: '#3b82f6',
        Liability: '#ef4444',
    }

    // Ensure we have accounts and history for Net Worth + Recent Activity
    useEffect(() => {
        fetchAccounts()
        fetchHistory()
        fetchPersons()
    }, [fetchAccounts, fetchHistory, fetchPersons])

    const totalIncome = getTotalIncome()

    const netWorth = useMemo(() =>
        accounts.reduce((sum, acc) => {
            if (acc.type === 'Liability') return sum - (acc.current_balance || 0)
            return sum + (acc.current_balance || 0)
        }, 0),
        [accounts]
    )

    const nwDelta = useMemo(() => {
        const monthAgo = new Date()
        monthAgo.setDate(monthAgo.getDate() - 30)
        const monthAgoStr = monthAgo.toISOString().split('T')[0]
        const olderEntries = history.filter(h => h.date <= monthAgoStr)
        const oldBalances: Record<number, number> = {}
        for (const entry of [...olderEntries].sort((a, b) => a.date.localeCompare(b.date))) {
            oldBalances[entry.account_id] = entry.amount
        }
        // Subtract liabilities from old net worth
        let oldNetWorth = 0
        for (const [accIdStr, bal] of Object.entries(oldBalances)) {
            const acc = accounts.find(a => a.id === Number(accIdStr))
            if (acc?.type === 'Liability') oldNetWorth -= bal
            else oldNetWorth += bal
        }
        return olderEntries.length > 0 ? netWorth - oldNetWorth : null
    }, [history, netWorth, accounts])

    const computedExpenses = useMemo(() =>
        expenses.map(e => ({
            ...e,
            absoluteAmount: totalIncome * (e.percentage / 100)
        })),
        [expenses, totalIncome]
    )

    const freeCashFlow = getFreeCashFlow()
    const savingsRate = useMemo(() => {
        return totalIncome > 0 ? (freeCashFlow / totalIncome) * 100 : 0
    }, [freeCashFlow, totalIncome])

    // Reality Check computed values
    const hasActuals = Object.keys(actualExpenses).length > 0
    const realityStats = useMemo(() => {
        const totalActual = Object.values(actualExpenses).reduce((s, v) => s + v, 0)
        const totalPlanned = computedExpenses.reduce((s, e) => s + e.absoluteAmount, 0)
        const actualSavings = totalIncome - totalActual
        const actualSavingsRate = totalIncome > 0 ? (actualSavings / totalIncome) * 100 : 0
        const onTarget = computedExpenses.filter(e => {
            const actual = actualExpenses[e.id] || 0
            const planned = e.absoluteAmount
            if (planned === 0) return actual === 0
            return Math.abs(actual - planned) / planned <= 0.1
        }).length
        const accuracy = computedExpenses.length > 0 ? (onTarget / computedExpenses.length) * 100 : 0
        return { totalActual, totalPlanned, actualSavings, actualSavingsRate, accuracy, delta: totalActual - totalPlanned }
    }, [actualExpenses, computedExpenses, totalIncome])

    const handleAllocationChange = useCallback((id: string, newVal: number[]) => {
        setExpenseAllocations([{ id, percentage: newVal[0] }])
    }, [setExpenseAllocations])

    const chartData = useMemo(() =>
        computedExpenses.map((e, i) => {
            const meta = getCategoryMeta(e.id, i)
            return { name: `${meta.emoji} ${e.name}`, value: e.absoluteAmount, color: meta.color }
        }),
        [computedExpenses]
    )

    const compareData = useMemo(() =>
        computedExpenses.map((e, i) => {
            const meta = getCategoryMeta(e.id, i)
            const actual = actualExpenses[e.id] || 0
            return {
                name: `${meta.emoji} ${e.name}`,
                planned: e.absoluteAmount,
                actual,
                delta: actual - e.absoluteAmount,
                color: meta.color
            }
        }),
        [computedExpenses, actualExpenses]
    )


    return (
        <div className="space-y-8">
            {/* Header */}
            <motion.div
                className="flex flex-col gap-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
            >
                <h1 className="text-4xl font-extrabold tracking-tight">The "Now" Dashboard</h1>
                <p className="text-lg text-muted-foreground">Design your monthly flow. Tweak the sliders to see where your money goes.</p>
            </motion.div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium"><FinancialTooltip term="net-worth">Total Net Worth</FinancialTooltip></CardTitle>
                        <Wallet className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold transition-all duration-300">{currency}{netWorth.toLocaleString()}</div>
                        {nwDelta !== null ? (
                            <p className={`text-sm font-medium ${nwDelta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {nwDelta >= 0 ? '↑' : '↓'} {currency}{Math.abs(nwDelta).toLocaleString()} vs 30d ago
                            </p>
                        ) : accounts.length === 0 ? (
                            <Button variant="link" size="sm" className="h-auto p-0 text-sm text-primary" onClick={() => navigate('/tracker')}>Set up your first account →</Button>
                        ) : (
                            <p className="text-sm text-muted-foreground">Across {accounts.length} accounts</p>
                        )}
                    </CardContent>
                </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium"><FinancialTooltip term="allocation">Monthly Income</FinancialTooltip></CardTitle>
                        <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold transition-all duration-300">{currency}{totalIncome.toLocaleString()}</div>
                        <p className="text-sm text-muted-foreground">{incomes.length} source{incomes.length !== 1 ? 's' : ''}</p>
                    </CardContent>
                </Card>
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }}>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-base font-medium"><FinancialTooltip term="savings-rate">Savings Rate</FinancialTooltip></CardTitle>
                        <div className="h-5 w-5 text-muted-foreground">%</div>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-4xl font-bold transition-colors duration-300 ${savingsRate >= 20 ? 'text-emerald-600' : 'text-orange-600'}`}>
                            {savingsRate.toFixed(1)}%
                        </div>
                        {hasActuals ? (
                            <p className={`text-sm font-medium ${realityStats.actualSavingsRate >= 20 ? 'text-emerald-600' : 'text-red-500'}`}>
                                Actual: {realityStats.actualSavingsRate.toFixed(1)}%
                            </p>
                        ) : (
                            <p className="text-sm text-muted-foreground">Target: 20%+</p>
                        )}
                    </CardContent>
                </Card>
                </motion.div>
            </div>
            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 h-full">
                {/* Inputs Column (Left) */}
                <div className="xl:col-span-5 space-y-6 flex flex-col">
                    {/* Coach's Corner */}
                    {showCoach && (
                        <motion.div
                            initial={{ opacity: 0, y: -12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: 0.2 }}
                        >
                            <CoachCorner />
                        </motion.div>
                    )}

                    {/* Income Section */}
                    <Card className="bg-card">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-xl">
                                    <Wallet className="h-6 w-6 text-primary" />
                                    Income Sources
                                </CardTitle>
                                <span className="text-2xl font-bold font-mono">{currency}{totalIncome.toLocaleString()}</span>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {incomes.map(income => {
                                return (
                                <div key={income.id} className="flex items-center gap-4 transition-all duration-200">
                                    {persons.length > 0 && (
                                        <div className="flex gap-0.5 flex-shrink-0">
                                            {persons.map(p => (
                                                <button key={p.id} title={p.name}
                                                    className={`h-5 w-5 rounded-full border-2 transition-all ${income.personId === String(p.id) ? 'border-foreground scale-110' : 'border-transparent opacity-40 hover:opacity-80'}`}
                                                    style={{ background: p.color }}
                                                    onClick={() => updateIncome(income.id, 'personId', income.personId === String(p.id) ? undefined : String(p.id))}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    <Input
                                        value={income.name}
                                        onChange={(e) => updateIncome(income.id, 'name', e.target.value)}
                                        className="flex-1 h-12 text-lg"
                                    />
                                    <div className="relative w-36">
                                        <span className="absolute left-3 top-3 text-muted-foreground text-sm">{currency}</span>
                                        <Input
                                            type="number"
                                            value={income.amount}
                                            onChange={(e) => updateIncome(income.id, 'amount', Math.max(0, parseFloat(e.target.value) || 0))}
                                            className="pl-8 text-right h-12 text-lg"
                                        />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeIncome(income.id)}
                                        className="h-10 w-10 text-muted-foreground hover:text-destructive"
                                    >
                                        <Trash2 className="h-5 w-5" />
                                    </Button>
                                </div>
                                )
                            })}

                            <Button
                                variant="outline"
                                onClick={() => addIncome('New Income', 0)}
                                className="w-full border-dashed border-2 hover:border-primary hover:text-primary h-9"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Source
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Expenses Section */}
                    <Card className={`flex-1 ${realityCheckMode ? 'bg-amber-500/5 border-amber-500/30' : 'bg-secondary/20'}`}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl"><FinancialTooltip term="allocation">Smart Allocations</FinancialTooltip></CardTitle>
                                    <CardDescription className="text-base">
                                        {realityCheckMode ? 'Enter your actual spending per category' : `Drag to allocate your ${currency}${totalIncome.toLocaleString()}`}
                                    </CardDescription>
                                </div>
                                <Button
                                    variant={realityCheckMode ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setRealityCheckMode(!realityCheckMode)}
                                    className={`gap-1.5 ${realityCheckMode ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                                >
                                    <ClipboardCheck className="h-4 w-4" />
                                    {realityCheckMode ? 'Exit' : 'Reality Check'}
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {computedExpenses.map((expense, idx) => {
                                const meta = getCategoryMeta(expense.id, idx)
                                const actualAmt = actualExpenses[expense.id] || 0
                                const delta = actualAmt - expense.absoluteAmount
                                const actualPct = totalIncome > 0 ? (actualAmt / totalIncome) * 100 : 0
                                return (
                                <div key={expense.id} className="space-y-2 transition-all duration-200">
                                    <div className="flex justify-between items-center gap-2">
                                        <span className="text-lg flex-shrink-0">{meta.emoji}</span>
                                        <Input
                                            value={expense.name}
                                            onChange={(e) => updateExpense(expense.id, 'name', e.target.value)}
                                            className="flex-1 h-8 text-base font-bold border-none bg-transparent px-1 focus-visible:ring-1"
                                        />
                                        <span className="font-mono font-medium text-base whitespace-nowrap tabular-nums transition-all duration-200">{currency}{expense.absoluteAmount.toFixed(0)} ({expense.percentage}%)</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => removeExpense(expense.id)}
                                            className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <Slider
                                        value={[expense.percentage]}
                                        max={100}
                                        step={1}
                                        onValueChange={(val) => handleAllocationChange(expense.id, val)}
                                        className="py-2"
                                    />
                                    {/* Reality Check Row */}
                                    {realityCheckMode && (
                                        <div className="flex items-center gap-2 pl-7">
                                            <span className="text-xs text-muted-foreground w-12">Actual:</span>
                                            <div className="relative w-28">
                                                <span className="absolute left-2 top-1.5 text-muted-foreground text-xs">{currency}</span>
                                                <Input
                                                    type="number"
                                                    value={actualAmt || ''}
                                                    placeholder="0"
                                                    onChange={(e) => setActualExpense(expense.id, Math.max(0, parseFloat(e.target.value) || 0))}
                                                    className="pl-6 text-right h-7 text-sm"
                                                />
                                            </div>
                                            {actualAmt > 0 && (
                                                <span className={`text-xs font-semibold whitespace-nowrap ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                                                    {delta > 0 ? '+' : ''}{currency}{delta.toFixed(0)} {delta > 0 ? 'over' : delta < 0 ? 'under' : 'on target'}
                                                </span>
                                            )}
                                            {/* Comparison bar: planned outline vs actual fill */}
                                            {actualAmt > 0 && (
                                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
                                                    {/* Planned marker */}
                                                    <div className="absolute h-full border-r-2 border-foreground/30" style={{ left: `${Math.min(expense.percentage, 100)}%` }} />
                                                    {/* Actual fill */}
                                                    <div className={`h-full rounded-full transition-all ${delta > 0 ? 'bg-red-400' : 'bg-emerald-400'}`}
                                                        style={{ width: `${Math.min(actualPct, 100)}%` }} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                )
                            })}

                            <Button
                                variant="outline"
                                onClick={() => addExpense('New Category')}
                                className="w-full border-dashed border-2 hover:border-primary hover:text-primary h-9"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Category
                            </Button>

                            {/* Visual Allocation Bar */}
                            {(() => {
                                const total = computedExpenses.reduce((acc, c) => acc + c.percentage, 0)
                                const over = total > 100
                                const pct = Math.min(total, 100)
                                return (
                                    <div className="space-y-2 pt-4 border-t-2 border-border/10">
                                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${pct}%` }} />
                                        </div>
                                        <div className={`flex justify-between text-xs ${over ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                            <span>{over ? '⚠️ ' : ''}Allocated: {total}%</span>
                                            <span>{over ? `${total - 100}% over budget` : `Remaining: ${100 - total}%`}</span>
                                        </div>
                                    </div>
                                )
                            })()}

                            {/* Reality Check Summary */}
                            {realityCheckMode && hasActuals && (
                                <div className="space-y-3 pt-4 border-t-2 border-amber-500/20">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold">Reality Check Summary</span>
                                        <Button variant="ghost" size="sm" className="h-6 text-xs text-muted-foreground gap-1" onClick={clearActualExpenses}>
                                            <X className="h-3 w-3" /> Clear All
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-card p-2.5 rounded-lg border">
                                            <p className="text-xs text-muted-foreground">Planned Spending</p>
                                            <p className="text-sm font-bold font-mono">{currency}{realityStats.totalPlanned.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                        </div>
                                        <div className="bg-card p-2.5 rounded-lg border">
                                            <p className="text-xs text-muted-foreground">Actual Spending</p>
                                            <p className="text-sm font-bold font-mono">{currency}{realityStats.totalActual.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                        </div>
                                        <div className={`p-2.5 rounded-lg border ${realityStats.delta > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                                            <p className="text-xs text-muted-foreground">Overall Delta</p>
                                            <p className={`text-sm font-bold font-mono ${realityStats.delta > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {realityStats.delta > 0 ? '+' : ''}{currency}{realityStats.delta.toFixed(0)}
                                            </p>
                                        </div>
                                        <div className="bg-card p-2.5 rounded-lg border">
                                            <p className="text-xs text-muted-foreground">Accuracy</p>
                                            <p className={`text-sm font-bold ${realityStats.accuracy >= 60 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                {realityStats.accuracy.toFixed(0)}% on-target
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>Actual Savings Rate:</span>
                                        <span className={`font-bold ${realityStats.actualSavingsRate >= 20 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                            {realityStats.actualSavingsRate.toFixed(1)}%
                                        </span>
                                        <span>vs planned {savingsRate.toFixed(1)}%</span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column (Visuals) */}
                <div className="xl:col-span-7 space-y-6">
                    <Card className="bg-background flex flex-col justify-start items-center relative overflow-hidden min-h-[500px]">
                        <CardHeader className="w-full pb-2">
                            <div className="flex justify-between items-center">
                                <CardTitle>Flow & Breakdown</CardTitle>
                                <Tabs value={visualMode} onValueChange={(v) => setVisualMode(v as 'chart' | 'sankey' | 'compare')} className={hasActuals ? 'w-[280px]' : 'w-[200px]'}>
                                    <TabsList className={`grid w-full ${hasActuals ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                        <TabsTrigger value="sankey">Flow</TabsTrigger>
                                        <TabsTrigger value="chart">Chart</TabsTrigger>
                                        {hasActuals && <TabsTrigger value="compare">Compare</TabsTrigger>}
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardHeader>
                        <CardContent className="w-full p-6 pt-2 h-full flex items-center justify-center">
                            {visualMode === 'sankey' ? (
                                <CashFlowSankey incomes={incomes} expenses={expenses} totalIncome={totalIncome} currency={currency} />
                            ) : visualMode === 'compare' && hasActuals ? (
                                <div className="w-full h-[500px] flex flex-col">
                                    <ResponsiveContainer width="100%" height="90%">
                                        <BarChart data={compareData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
                                            <XAxis type="number" tickFormatter={(v) => `${currency}${v.toLocaleString()}`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                                                formatter={(value?: number, name?: string) => [`${currency}${(value ?? 0).toLocaleString()}`, name === 'planned' ? 'Planned' : 'Actual']}
                                            />
                                            <Legend />
                                            <Bar dataKey="planned" name="Planned" fill="hsl(var(--primary))" opacity={0.4} radius={[0, 4, 4, 0]} />
                                            <Bar dataKey="actual" name="Actual" radius={[0, 4, 4, 0]}>
                                                {compareData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.delta > 0 ? '#ef4444' : '#10b981'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <p className="text-center text-xs text-muted-foreground">Green = under budget, Red = over budget</p>
                                </div>
                            ) : (
                                <AllocationChart data={chartData} />
                            )}
                        </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Projected Savings CTA */}
                        <Card className="bg-primary/5 border-primary/20">
                            <div className="text-center space-y-4 p-6">
                                <h3 className="text-lg font-bold">Projected Monthly Savings</h3>
                                <div className="text-3xl font-bold text-primary transition-all duration-300 tabular-nums">
                                    {currency}{freeCashFlow.toLocaleString()}
                                </div>
                                {hasActuals ? (
                                    <div className="space-y-1">
                                        <p className={`text-sm font-semibold ${realityStats.actualSavings >= freeCashFlow ? 'text-emerald-600' : 'text-red-500'}`}>
                                            Actual: {currency}{realityStats.actualSavings.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {realityStats.actualSavings >= freeCashFlow ? 'On track!' : `${currency}${(freeCashFlow - realityStats.actualSavings).toFixed(0)} short of plan`}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">This is your "Wealth Snowball".</p>
                                )}
                                <Button size="lg" className="w-full" onClick={() => navigate('/simulation')}>
                                    <TrendingUp className="mr-2 h-5 w-5" /> Invest This
                                </Button>
                            </div>
                        </Card>

                        {/* Recent Activity */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {[...history].sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id).slice(0, 5).map((item, idx) => {
                                    const acc = accounts.find(a => a.id === item.account_id)
                                    const Icon = TYPE_ICONS[acc?.type || 'General'] || Landmark
                                    const color = TYPE_COLORS[acc?.type || 'General'] || '#6b7280'
                                    return (
                                        <div key={idx} className="flex items-center gap-3 text-sm">
                                            <Icon className="h-4 w-4 flex-shrink-0" style={{ color }} />
                                            {acc?.person_name && (() => {
                                                const person = persons.find(p => p.name === acc.person_name)
                                                return person ? <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: person.color }} title={person.name} /> : null
                                            })()}
                                            <span className="text-muted-foreground text-xs flex-shrink-0">{new Date(item.date).toLocaleDateString()}</span>
                                            <span className="font-medium truncate flex-1" title={acc?.name}>{acc?.name || `Account #${item.account_id}`}</span>
                                            <span className="font-mono font-medium flex-shrink-0">{currency}{item.amount.toLocaleString()}</span>
                                        </div>
                                    )
                                })}
                                {history.length === 0 && <p className="text-xs text-muted-foreground text-center">No recent activity. Log a balance in the Tracker.</p>}
                                <Button variant="link" size="sm" className="w-full text-muted-foreground" onClick={() => navigate('/tracker')}>View All History</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
