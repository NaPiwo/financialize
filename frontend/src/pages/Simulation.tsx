
import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { useFinancialStore } from "@/store"
import { useShallow } from 'zustand/react/shallow'
import { ProjectionChart } from "@/components/features/ProjectionChart"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Trash2, TrendingUp, PiggyBank, Percent, Calendar } from "lucide-react"
import { apiClient } from "@/api/client"
import { FinancialTooltip } from "@/components/features/FinancialTooltip"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

export function Simulation() {

    const { simulationParams, setSimulationParams, incomes, expenses, currency, events, addEvent, removeEvent, accounts, fetchAccounts, planningTargets, actualExpenses } = useFinancialStore(
        useShallow((state) => ({
            simulationParams: state.simulationParams,
            setSimulationParams: state.setSimulationParams,
            incomes: state.incomes,
            expenses: state.expenses,
            currency: state.currency,
            events: state.events,
            addEvent: state.addEvent,
            removeEvent: state.removeEvent,
            accounts: state.accounts,
            fetchAccounts: state.fetchAccounts,
            planningTargets: state.planningTargets,
            actualExpenses: state.actualExpenses
        }))
    )

    // Reality Check: actual-based projection toggle
    const hasActuals = Object.keys(actualExpenses).length > 0
    const [useActuals, setUseActuals] = useState(false)
    const totalActualSpend = Object.values(actualExpenses).reduce((s, v) => s + v, 0)
    const totalIncomeForActuals = incomes.reduce((s, i) => s + i.amount, 0)
    const actualSavingsPercentage = totalIncomeForActuals > 0 ? ((totalIncomeForActuals - totalActualSpend) / totalIncomeForActuals) * 100 : 0

    type YearProjection = {
        year: number
        age: number
        net_worth: number
        contribution: number
        interest_earned: number
        buying_power: number
        events_value?: number
    }
    type MilestoneData = {
        name: string
        year: number
        net_worth: number
        message: string
    }
    type ForecastStats = {
        monthly_growth: number
        annual_growth_rate: number
        r_squared: number
        forecast_data: YearProjection[]
        message: string
    }

    const [graphData, setGraphData] = useState<YearProjection[]>([])
    const [milestones, setMilestones] = useState<MilestoneData[]>([])
    const [loading, setLoading] = useState(false)
    const [useLiveNetWorth, setUseLiveNetWorth] = useState(true)
    const [forecastMode, setForecastMode] = useState<'assumptions' | 'history'>('assumptions')
    const [forecastStats, setForecastStats] = useState<ForecastStats | null>(null)

    useEffect(() => {
        fetchAccounts()
    }, [fetchAccounts])

    const currentNetWorth = useMemo(() => accounts.reduce((sum, acc) => {
        if (acc.type === 'Liability') return sum - (acc.current_balance || 0);
        return sum + (acc.current_balance || 0);
    }, 0), [accounts])

    // Event Input State
    const [newEventName, setNewEventName] = useState('')
    const [newEventYear, setNewEventYear] = useState('')
    const [newEventAmount, setNewEventAmount] = useState('')
    const [newEventRecurring, setNewEventRecurring] = useState(false)
    const [newEventDuration, setNewEventDuration] = useState('1')


    // Debounce logic could be here, but for local dev, fetch on every change is OK if lightweight.
    // Actually, let's use a simple effect.

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                if (forecastMode === 'history') {
                    // FORECAST API
                    const payload = {
                        years: simulationParams.years,
                        current_age: simulationParams.currentAge,
                        inflation: simulationParams.inflation,
                        currency: currency
                    }
                    const response = await apiClient.post('/scenarios/forecast', payload)
                    const result = response.data
                    // If not enough data, result might have empty data and a message
                    setGraphData(result.forecast_data)
                    setForecastStats(result)
                } else {
                    // ASSUMPTIONS API
                    // Filter out 'savings' from expenses so it doesn't count as money burned
                    const effectiveExpenses = useActuals && hasActuals
                        ? [{ name: 'Actual Spending', percentage: ((totalActualSpend / totalIncomeForActuals) * 100), is_fixed: false }]
                        : expenses.filter(e => e.id !== 'savings')

                    // Prepare Payload
                    const payload = {
                        current_savings: useLiveNetWorth ? currentNetWorth : (simulationParams.currentSavings || 50000),
                        incomes: incomes,
                        expenses: effectiveExpenses,
                        events: events,
                        years: simulationParams.years,
                        annual_raise: simulationParams.annualRaise,
                        market_return: simulationParams.marketReturn,
                        inflation: simulationParams.inflation,
                        current_age: simulationParams.currentAge,
                        currency: currency
                    }

                    const response = await apiClient.post('/scenarios/calculate', payload)
                    const result = response.data
                    setGraphData(result.data)
                    setMilestones(result.milestones || []) // Set Milestones
                    setForecastStats(null)
                }
            } catch (error) {
                console.error("Failed to fetch projection", error)
            } finally {
                setLoading(false)
            }
        }

        // Debounce basic
        const timer = setTimeout(() => {
            fetchData()
        }, 500)

        return () => clearTimeout(timer)

    }, [simulationParams, incomes, expenses, events, useLiveNetWorth, currentNetWorth, forecastMode, useActuals, actualExpenses])

    // Computed: savings rate and monthly contribution
    const totalMonthlyIncome = useMemo(() => incomes.reduce((s, i) => s + i.amount, 0), [incomes])
    const expenseRate = useMemo(() => expenses.filter(e => e.id !== 'savings').reduce((s, e) => s + e.percentage, 0) / 100, [expenses])
    const monthlyContribution = useMemo(() => totalMonthlyIncome * (1 - expenseRate), [totalMonthlyIncome, expenseRate])
    const savingsRate = useMemo(() => totalMonthlyIncome > 0 ? ((1 - expenseRate) * 100) : 0, [totalMonthlyIncome, expenseRate])

    // Computed: summary stats from graph data
    const summaryStats = useMemo(() => {
        if (graphData.length < 2) return null
        const last = graphData[graphData.length - 1]
        const totalContrib = graphData.reduce((s, d) => s + (d.contribution || 0), 0)
        const totalInterest = graphData.reduce((s, d) => s + (d.interest_earned || 0), 0)
        return {
            finalNetWorth: last.net_worth,
            finalBuyingPower: last.buying_power,
            finalAge: last.age,
            totalContributions: Math.round(totalContrib),
            totalInterest: Math.round(totalInterest),
            interestPct: totalContrib + totalInterest > 0 ? Math.round((totalInterest / (totalContrib + totalInterest)) * 100) : 0
        }
    }, [graphData])

    // Computed: lifestyle creep data
    const creepData = useMemo(() => {
        if (graphData.length < 2 || forecastMode !== 'assumptions' || simulationParams.annualRaise <= 0) return null
        const raiseRate = simulationParams.annualRaise / 100
        const marketRate = simulationParams.marketReturn / 100
        const baseContribution = graphData[0]?.contribution || 0
        const startNW = graphData[0]?.net_worth || 0
        let nwSave = startNW
        let nwSpend = startNW
        const data = graphData.map((d, i) => {
            if (i === 0) return { year: d.year, save_raises: startNW, spend_raises: startNW }
            const yearlyRaise = baseContribution * 12 * raiseRate * i
            nwSave = nwSave * (1 + marketRate) + (baseContribution * 12) + yearlyRaise
            nwSpend = nwSpend * (1 + marketRate) + baseContribution * 12
            return { year: d.year, save_raises: Math.round(nwSave), spend_raises: Math.round(nwSpend) }
        })
        const diff = (data[data.length - 1]?.save_raises || 0) - (data[data.length - 1]?.spend_raises || 0)
        return { data, diff }
    }, [graphData, forecastMode, simulationParams.annualRaise, simulationParams.marketReturn])

    // Event templates
    const EVENT_TEMPLATES = [
        { name: '🏠 Buy House', amount: -50000 },
        { name: '🚗 New Car', amount: -30000 },
        { name: '👶 Baby', amount: -15000, recurring: true, duration: 3 },
        { name: '💰 Inheritance', amount: 50000 },
    ]

    const handleAddEvent = () => {
        if (newEventName && newEventYear && newEventAmount) {
            const yr = parseInt(newEventYear)
            if (yr < 0 || yr > simulationParams.years) {
                alert(`Event year must be between 0 and ${simulationParams.years}`)
                return
            }
            addEvent({
                id: Math.random().toString(),
                name: newEventName,
                year: yr,
                amount: parseFloat(newEventAmount),
                isRecurring: newEventRecurring,
                duration: newEventRecurring ? parseInt(newEventDuration) || 1 : 1
            })
            setNewEventName('')
            setNewEventYear('')
            setNewEventAmount('')
            setNewEventRecurring(false)
            setNewEventDuration('1')
        }
    }

    const applyTemplate = (tpl: typeof EVENT_TEMPLATES[0]) => {
        setNewEventName(tpl.name)
        setNewEventAmount(String(tpl.amount))
        if (!newEventYear) setNewEventYear('5')
        if ('recurring' in tpl) {
            setNewEventRecurring(true)
            setNewEventDuration(String((tpl as any).duration || 1))
        }
    }


    return (
        <div className="space-y-8 h-full flex flex-col">
            <div className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-extrabold tracking-tight">The Future Playground</h1>
                        <p className="text-xl text-muted-foreground">Adjust the variables. See your wealth grow.</p>
                    </div>
                    <div className="bg-muted p-1 rounded-lg flex items-center">
                        <button
                            onClick={() => setForecastMode('assumptions')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${forecastMode === 'assumptions' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            🎲 Assumptions
                        </button>
                        <button
                            onClick={() => setForecastMode('history')}
                            className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${forecastMode === 'history' ? 'bg-card shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            🔮 Historical Trend
                        </button>
                    </div>
                </div>

                {forecastMode === 'assumptions' && (
                    <div className="flex flex-wrap items-center gap-6">
                        <label htmlFor="live-nw" className="flex items-center gap-3 cursor-pointer group w-fit">
                            <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useLiveNetWorth ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                onClick={() => setUseLiveNetWorth(!useLiveNetWorth)}>
                                <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${useLiveNetWorth ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                            </div>
                            <span className="text-sm font-medium">
                                Start with Live Net Worth ({currency}{currentNetWorth.toLocaleString()})
                            </span>
                        </label>
                        {hasActuals && (
                            <label className="flex items-center gap-3 cursor-pointer w-fit">
                                <div className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${useActuals ? 'bg-amber-500' : 'bg-muted-foreground/30'}`}
                                    onClick={() => setUseActuals(!useActuals)}>
                                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${useActuals ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                                </div>
                                <span className="text-sm font-medium">
                                    Use Actual Spending <span className="text-xs text-muted-foreground">({actualSavingsPercentage.toFixed(0)}% savings rate)</span>
                                </span>
                            </label>
                        )}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
                {/* Controls */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Savings Rate + Contribution KPI */}
                    {forecastMode === 'assumptions' && totalMonthlyIncome > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl border bg-card">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                    <Percent className="h-3 w-3" /> Savings Rate
                                </div>
                                <p className={`text-2xl font-black font-mono ${savingsRate >= 20 ? 'text-emerald-600' : savingsRate >= 10 ? 'text-amber-500' : 'text-red-500'}`}>
                                    {savingsRate.toFixed(0)}%
                                </p>
                            </div>
                            <div className="p-3 rounded-xl border bg-card">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                                    <PiggyBank className="h-3 w-3" /> Monthly Savings
                                </div>
                                <p className="text-2xl font-black font-mono">{currency}{Math.round(monthlyContribution).toLocaleString()}</p>
                            </div>
                        </div>
                    )}

                    <Card className={`backdrop-blur transition-colors duration-500 ${forecastMode === 'history' ? 'bg-secondary/50 border-secondary' : 'bg-card/50'}`}>
                        <CardHeader>
                            <CardTitle>{forecastMode === 'history' ? 'Historical Trends' : 'Macro Variables'}</CardTitle>
                            <CardDescription>{forecastMode === 'history' ? 'Based on your actual performance.' : 'Assumptions about the world.'}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">

                            {forecastMode === 'history' ? (
                                <div className="space-y-6 transition-all duration-300">
                                    {(forecastStats?.forecast_data?.length ?? 0) > 0 ? (
                                        <>
                                            <div className="p-4 bg-card rounded-lg border shadow-sm space-y-1">
                                                <p className="text-xs font-bold text-primary uppercase tracking-wider">Historical Monthly Growth</p>
                                                <p className="text-3xl font-black text-foreground">{currency}{forecastStats!.monthly_growth.toLocaleString()}</p>
                                                <p className="text-xs text-muted-foreground">Derived from linear regression of past data.</p>
                                            </div>

                                            <div className="p-4 bg-card rounded-lg border shadow-sm space-y-1">
                                                <p className="text-xs font-bold text-primary uppercase tracking-wider">Implied Annual Return</p>
                                                <p className="text-3xl font-black text-foreground">{forecastStats!.annual_growth_rate}%</p>
                                                <p className="text-xs text-muted-foreground">If this trend continues indefinitely.</p>
                                            </div>

                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <FinancialTooltip term="r-squared">Confidence (R²): {forecastStats!.r_squared}</FinancialTooltip>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-6 text-center text-muted-foreground bg-muted rounded-lg border-2 border-dashed">
                                            <p>Not enough historical data.</p>
                                            <p className="text-xs mt-2">Add more balance history entries to unlock forecasting.</p>
                                        </div>
                                    )}

                                    <div className="space-y-4 pt-4 border-t-2 border-dashed border-border">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold flex items-center gap-2">
                                                ⏳ Projection Years
                                            </label>
                                            <Badge variant="secondary" className="text-base font-mono">{simulationParams.years} Years</Badge>
                                        </div>
                                        <Slider
                                            value={[simulationParams.years]}
                                            max={50}
                                            step={1}
                                            onValueChange={(val) => setSimulationParams({ years: val[0] })}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Manual Starting Capital Override */}
                                    {!useLiveNetWorth && (
                                        <div className="space-y-4 transition-all duration-300">
                                            <div className="flex justify-between items-center">
                                                <label className="text-base font-bold flex items-center gap-2">
                                                    💰 Starting Capital
                                                </label>
                                                <Badge variant="outline" className="text-lg font-mono">{currency}{simulationParams.currentSavings?.toLocaleString() || 0}</Badge>
                                            </div>
                                            <Input
                                                type="number"
                                                className="h-12 text-lg"
                                                value={simulationParams.currentSavings || 0}
                                                onChange={(e) => setSimulationParams({ currentSavings: parseFloat(e.target.value) || 0 })}
                                            />
                                            <p className="text-sm text-muted-foreground">Manual starting amount since you disabled Live Net Worth.</p>
                                        </div>
                                    )}

                                    {/* Market Return */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-base font-bold flex items-center gap-2">
                                                📈 <FinancialTooltip term="market-return">Market Return</FinancialTooltip>
                                            </label>
                                            <Badge variant="outline" className="text-lg font-mono">{simulationParams.marketReturn}%</Badge>
                                        </div>
                                        <Slider
                                            value={[simulationParams.marketReturn]}
                                            max={15}
                                            step={0.5}
                                            onValueChange={(val) => setSimulationParams({ marketReturn: val[0] })}
                                            className="[&_span[data-orientation]]:bg-green-500 py-2"
                                        />
                                        <p className="text-sm text-muted-foreground">Historical average of S&P 500 is ~10% (7% inflation adjusted).</p>
                                    </div>

                                    {/* Annual Raise */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-base font-bold flex items-center gap-2">
                                                💼 <FinancialTooltip term="annual-raise">Annual Raise</FinancialTooltip>
                                            </label>
                                            <Badge variant="outline" className="text-lg font-mono">{simulationParams.annualRaise}%</Badge>
                                        </div>
                                        <Slider
                                            value={[simulationParams.annualRaise]}
                                            max={10}
                                            step={0.5}
                                            onValueChange={(val) => setSimulationParams({ annualRaise: val[0] })}
                                            className="py-2"
                                        />
                                    </div>

                                    {/* Inflation */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-base font-bold flex items-center gap-2">
                                                🏷️ <FinancialTooltip term="inflation">Inflation</FinancialTooltip>
                                            </label>
                                            <Badge variant="outline" className="text-lg font-mono">{simulationParams.inflation}%</Badge>
                                        </div>
                                        <Slider
                                            value={[simulationParams.inflation]}
                                            max={10}
                                            step={0.1}
                                            onValueChange={(val) => setSimulationParams({ inflation: val[0] })}
                                            className="[&_span[data-orientation]]:bg-red-400 py-2"
                                        />
                                    </div>

                                    {/* Time Horizon */}
                                    <div className="space-y-4 pt-4 border-t-2 border-dashed">
                                        <div className="flex justify-between items-center">
                                            <label className="text-base font-bold flex items-center gap-2">
                                                ⏳ Time Horizon
                                            </label>
                                            <Badge variant="secondary" className="text-lg font-mono">{simulationParams.years} Years</Badge>
                                        </div>
                                        <Slider
                                            value={[simulationParams.years]}
                                            max={50}
                                            step={1}
                                            onValueChange={(val) => setSimulationParams({ years: val[0] })}
                                            className="py-2"
                                        />
                                    </div>

                                    {/* Current Age */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-base font-bold flex items-center gap-2">
                                                🎂 Current Age
                                            </label>
                                            <Badge variant="secondary" className="text-lg font-mono">{simulationParams.currentAge} yrs</Badge>
                                        </div>
                                        <Slider
                                            value={[simulationParams.currentAge]}
                                            min={18}
                                            max={70}
                                            step={1}
                                            onValueChange={(val) => setSimulationParams({ currentAge: val[0] })}
                                            className="py-2"
                                        />
                                        <p className="text-sm text-muted-foreground">Used for milestone ages on the projection chart.</p>
                                    </div>
                                </>
                            )}

                        </CardContent>
                    </Card>

                    {/* Events Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Life Events</CardTitle>
                            <CardDescription>Major purchases or windfalls.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Quick Templates */}
                            {events.length === 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {EVENT_TEMPLATES.map((tpl, i) => (
                                        <Button key={i} variant="ghost" size="sm" className="text-xs h-7 px-2"
                                            onClick={() => applyTemplate(tpl)}>{tpl.name}</Button>
                                    ))}
                                </div>
                            )}

                            {/* Input Row */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="col-span-3">
                                        <Input placeholder="Event Name (e.g. Buy House)" value={newEventName} onChange={(e) => setNewEventName(e.target.value)} />
                                    </div>
                                    <Input type="number" placeholder={`Year (0-${simulationParams.years})`} value={newEventYear} onChange={(e) => setNewEventYear(e.target.value)} />
                                    <Input type="number" placeholder="Amount (- = cost)" value={newEventAmount} onChange={(e) => setNewEventAmount(e.target.value)} />
                                    <Button size="icon" onClick={handleAddEvent} disabled={!newEventName || !newEventYear || !newEventAmount}><span className="text-lg">+</span></Button>
                                </div>
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input type="checkbox" checked={newEventRecurring} onChange={(e) => setNewEventRecurring(e.target.checked)} className="rounded accent-primary" />
                                        Recurring
                                    </label>
                                    {newEventRecurring && (
                                        <div className="flex items-center gap-1 transition-all duration-200">
                                            <span className="text-xs text-muted-foreground">for</span>
                                            <Input type="number" placeholder="yrs" value={newEventDuration} onChange={(e) => setNewEventDuration(e.target.value)} className="w-16 h-7 text-sm" />
                                            <span className="text-xs text-muted-foreground">years</span>
                                            {newEventAmount && newEventDuration && (
                                                <span className="text-xs font-mono text-muted-foreground ml-1">
                                                    (= {currency}{(parseFloat(newEventAmount) * parseInt(newEventDuration || '1')).toLocaleString()} total)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 mt-4 max-h-[200px] overflow-y-auto">
                                {events.map(ev => (
                                    <div key={ev.id} className="flex justify-between items-center text-sm p-2 border rounded bg-muted/50">
                                        <div>
                                            <div className="font-bold">{ev.name}</div>
                                            <div className="text-xs text-muted-foreground">Year {ev.year}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <span className={`font-mono ${ev.amount < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    {currency}{ev.amount.toLocaleString()}
                                                </span>
                                                {ev.isRecurring && (
                                                    <div className="text-[10px] text-muted-foreground">
                                                        ×{ev.duration}yr = {currency}{(ev.amount * ev.duration).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeEvent(ev.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {events.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-2">No events added. Try a quick template above!</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Graph */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="min-h-[500px] flex flex-col">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Net Worth Projection</CardTitle>
                                <CardDescription>
                                    {forecastMode === 'assumptions'
                                        ? `${simulationParams.years}-year projection at ${simulationParams.marketReturn}% return`
                                        : 'Linear trend from your actual data'}
                                </CardDescription>
                            </div>
                            {loading && <Loader2 className="animate-spin text-muted-foreground" />}
                        </CardHeader>
                        <CardContent className="flex-1 min-h-[300px]">
                            {graphData.length > 0 ? (
                                <ProjectionChart
                                    data={graphData}
                                    currency={currency}
                                    goalValue={planningTargets.targetNetWorth}
                                    goalYear={planningTargets.targetYears}
                                    milestones={milestones}
                                    events={events}
                                />
                            ) : loading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                    <p className="text-sm font-medium">Crunching your numbers...</p>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
                                    <p className="text-lg font-medium">No projection yet</p>
                                    <p className="text-sm">Adjust your assumptions or add income on the Dashboard to see your future.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary Stats Panel */}
                    {summaryStats && (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card><CardContent className="p-4">
                                <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Final Net Worth</p>
                                <p className="text-xl font-bold font-mono mt-1">{currency}{summaryStats.finalNetWorth.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">at age {summaryStats.finalAge}</p>
                            </CardContent></Card>
                            <Card><CardContent className="p-4">
                                <p className="text-xs text-muted-foreground">Final Buying Power</p>
                                <p className="text-xl font-bold font-mono mt-1 text-amber-500">{currency}{summaryStats.finalBuyingPower.toLocaleString()}</p>
                                <p className="text-[10px] text-muted-foreground">inflation-adjusted</p>
                            </CardContent></Card>
                            {summaryStats.totalContributions > 0 && (
                                <Card><CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground">Contributions vs Interest</p>
                                    <p className="text-xl font-bold font-mono mt-1">
                                        <span className="text-emerald-600">{currency}{summaryStats.totalContributions.toLocaleString()}</span>
                                        <span className="text-muted-foreground mx-1">/</span>
                                        <span className="text-blue-500">{currency}{summaryStats.totalInterest.toLocaleString()}</span>
                                    </p>
                                    <p className="text-[10px] text-muted-foreground">{summaryStats.interestPct}% from compound growth</p>
                                </CardContent></Card>
                            )}
                            {milestones.length > 0 && (
                                <Card className="col-span-2 lg:col-span-3"><CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground mb-2">Milestone Timeline</p>
                                    <div className="flex flex-wrap gap-3">
                                        {milestones.map((m, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-violet-500/10 rounded-lg px-3 py-1.5">
                                                <span className="text-violet-500 font-bold text-sm">Yr {m.year}</span>
                                                <span className="text-sm font-medium">{m.name}</span>
                                                <span className="text-[10px] text-muted-foreground">{m.message}</span>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent></Card>
                            )}
                        </div>
                    )}

                    {/* Lifestyle Creep Simulator */}
                    {creepData && (
                        <Card>
                            <CardHeader>
                                <CardTitle>💸 Lifestyle Creep Simulator</CardTitle>
                                <CardDescription>What happens if you spend your raises vs. save them?</CardDescription>
                            </CardHeader>
                            <CardContent className="h-[300px]">
                                <div className="h-full flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-muted-foreground">
                                            Saving your raises could mean <strong className="text-emerald-600">{currency}{creepData.diff.toLocaleString()}</strong> more over {simulationParams.years} years.
                                        </p>
                                        <div className="flex gap-3 text-[10px] font-medium">
                                            <span className="flex items-center gap-1"><span className="h-2 w-4 rounded-full bg-emerald-500 inline-block" /> Save Raises</span>
                                            <span className="flex items-center gap-1"><span className="h-0.5 w-4 border-t-2 border-dashed border-orange-500 inline-block" /> Spend Raises</span>
                                        </div>
                                    </div>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={creepData.data}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                                            <XAxis dataKey="year" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                                            <YAxis tickFormatter={(v: number) => `${currency}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                                            <Tooltip formatter={(v) => `${currency}${Number(v).toLocaleString()}`} contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }} />
                                            <Area type="monotone" dataKey="save_raises" name="Save Raises" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
                                            <Area type="monotone" dataKey="spend_raises" name="Spend Raises" stroke="#f97316" fill="#f97316" fillOpacity={0.1} strokeWidth={2} strokeDasharray="6 3" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    )
}
