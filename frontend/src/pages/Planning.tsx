
import { useEffect, useState, useRef, useMemo } from 'react'
import confetti from 'canvas-confetti'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useFinancialStore } from "@/store"
import { useShallow } from 'zustand/react/shallow'
import { Target, ArrowLeft, TrendingUp, ChevronDown } from "lucide-react"
import { apiClient } from "@/api/client"
import { FinancialTooltip } from "@/components/features/FinancialTooltip"
import { useNavigate } from 'react-router-dom'

export function Planning() {
    const navigate = useNavigate()
    const { planningTargets, setPlanningTargets, simulationParams, getFreeCashFlow, currency, actualExpenses, incomes } = useFinancialStore(
        useShallow((state) => ({
            planningTargets: state.planningTargets,
            setPlanningTargets: state.setPlanningTargets,
            simulationParams: state.simulationParams,
            getFreeCashFlow: state.getFreeCashFlow,
            currency: state.currency,
            actualExpenses: state.actualExpenses,
            incomes: state.incomes
        }))
    )

    // Reality Check: compute actual monthly spend if data exists
    const hasActuals = Object.keys(actualExpenses).length > 0
    const totalActualSpend = Object.values(actualExpenses).reduce((s, v) => s + v, 0)
    const totalMonthlyIncomeRC = incomes.reduce((s, i) => s + i.amount, 0)
    const actualMonthlySavings = hasActuals ? totalMonthlyIncomeRC - totalActualSpend : null

    const [requiredSavings, setRequiredSavings] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const currentSavingsRate = getFreeCashFlow()

    useEffect(() => {
        const calculatePlan = async () => {
            setLoading(true)
            try {
                const payload = {
                    current_savings: currentNetWorth,
                    target_net_worth: planningTargets.targetNetWorth,
                    years: planningTargets.targetYears,
                    annual_raise: simulationParams.annualRaise,
                    market_return: simulationParams.marketReturn,
                    inflation: simulationParams.inflation
                }

                const response = await apiClient.post('/scenarios/reverse', payload)
                const result = response.data
                setRequiredSavings(result.required_monthly_contribution)
            } catch (error) {
                console.error("Failed to calculate plan", error)
            } finally {
                setLoading(false)
            }
        }

        // Debounce
        const timer = setTimeout(() => {
            calculatePlan()
        }, 500)
        return () => clearTimeout(timer)

    }, [planningTargets, simulationParams])


    // FIRE State
    type FIREResult = {
        fire_number: number
        current_swr: number
        years_to_fire: number
        message: string
    }
    const [fireResult, setFireResult] = useState<FIREResult | null>(null)
    const [swr, setSwr] = useState(4.0)
    const [manualAnnualSpend, setManualAnnualSpend] = useState<number | null>(null)
    const [showFire, setShowFire] = useState(false)

    // Derived Financials
    const totalMonthlyIncome = useFinancialStore(state => state.incomes.reduce((sum, i) => sum + i.amount, 0))
    const totalMonthlySavings = getFreeCashFlow()
    const totalMonthlyExpenses = totalMonthlyIncome - totalMonthlySavings
    const computedAnnualSpend = totalMonthlyExpenses * 12
    const annualSpend = manualAnnualSpend ?? computedAnnualSpend

    // Net Worth from accounts or override
    const { accounts, fetchAccounts } = useFinancialStore(useShallow(state => ({ accounts: state.accounts, fetchAccounts: state.fetchAccounts })))

    useEffect(() => {
        fetchAccounts()
    }, [fetchAccounts])

    const currentNetWorth = useMemo(() => accounts.reduce((sum, acc) => {
        if (acc.type === 'Liability') return sum - (acc.current_balance || 0);
        return sum + (acc.current_balance || 0);
    }, 0), [accounts])

    useEffect(() => {
        const calculateFire = async () => {
            try {
                const payload = {
                    current_net_worth: currentNetWorth,
                    annual_spend: annualSpend,
                    safe_withdrawal_rate: swr,
                    return_rate: simulationParams.marketReturn,
                    inflation: simulationParams.inflation
                }

                const response = await apiClient.post('/scenarios/fire', payload)
                const result = response.data
                setFireResult(result)
            } catch (error) {
                console.error("Failed to calculate FIRE", error)
            }
        }

        const timer = setTimeout(() => {
            calculateFire()
        }, 800)
        return () => clearTimeout(timer)
    }, [currentNetWorth, annualSpend, swr, simulationParams])

    const savingsGap = (requiredSavings || 0) - currentSavingsRate
    const isPossible = savingsGap <= 0

    // Confetti on "On Track"
    const prevOnTrack = useRef(false)
    useEffect(() => {
        if (isPossible && requiredSavings !== null && !prevOnTrack.current) {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.7 } })
        }
        prevOnTrack.current = isPossible && requiredSavings !== null
    }, [isPossible, requiredSavings])

    return (
        <div className="space-y-12 h-full flex flex-col pb-10">
            {/* Section 1: Reverse Engineering */}
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <h1 className="text-5xl font-extrabold tracking-tight">The Time Machine</h1>
                    <p className="text-xl text-muted-foreground">Set your destination. We'll tell you the price of the ticket.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    {/* ... Existing Inputs Card ... */}
                    <Card className="bg-card/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-2xl"><Target className="h-6 w-6" /> Your Goal</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-4">
                                <label className="text-lg font-bold">I want to have...</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-4 text-3xl font-bold text-muted-foreground">{currency}</span>
                                    <Input
                                        type="number"
                                        className="pl-12 text-4xl font-bold h-20"
                                        value={planningTargets.targetNetWorth}
                                        onChange={(e) => setPlanningTargets({ targetNetWorth: parseFloat(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" size="lg" className="text-lg" onClick={() => setPlanningTargets({ targetNetWorth: 1000000 })}>{currency}1M</Button>
                                    <Button variant="outline" size="lg" className="text-lg" onClick={() => setPlanningTargets({ targetNetWorth: 2000000 })}>{currency}2M</Button>
                                    <Button variant="outline" size="lg" className="text-lg" onClick={() => setPlanningTargets({ targetNetWorth: 5000000 })}>{currency}5M</Button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-lg font-bold">In...</label>
                                    <Badge variant="secondary" className="text-2xl font-mono px-3 py-1">{planningTargets.targetYears} Years</Badge>
                                </div>
                                <Slider
                                    value={[planningTargets.targetYears]}
                                    max={50}
                                    step={1}
                                    onValueChange={(val) => setPlanningTargets({ targetYears: val[0] })}
                                    className="py-2"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* ... Existing Result ... */}
                    <div className="space-y-6">
                        <Card className={`border-l-8 ${isPossible ? 'border-l-emerald-500' : 'border-l-orange-500'} shadow-neobrutal transition-all duration-500`}>
                            <CardHeader>
                                <CardTitle><FinancialTooltip term="reverse-planning">The Magic Number</FinancialTooltip></CardTitle>
                                <CardDescription>Required monthly savings to hit your goal.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Result */}
                                <div className="text-center space-y-2 p-6 bg-muted/50 rounded-xl border-2 border-dashed border-border">
                                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Required Monthly Savings</p>
                                    {loading ? (
                                        <div className="h-12 w-32 bg-muted animate-pulse rounded mx-auto" />
                                    ) : requiredSavings !== null ? (
                                        <>
                                            <div className="text-5xl font-black text-foreground tracking-tight">
                                                {currency}{requiredSavings.toLocaleString()}
                                            </div>
                                            <div className="pt-4 border-t mt-4">
                                                <p className="text-sm text-muted-foreground mb-1">Current Dashboard Allocation</p>
                                                <div className={`text-xl font-bold ${currentSavingsRate >= requiredSavings ? 'text-green-600' : 'text-red-500'}`}>
                                                    {currency}{currentSavingsRate.toLocaleString()}
                                                    <span className="text-sm font-normal text-muted-foreground ml-2">
                                                        ({currentSavingsRate >= requiredSavings ? 'On Track! 🎉' : `Short by ${currency}${(requiredSavings - currentSavingsRate).toLocaleString()}`})
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-muted-foreground">Calculating...</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card >

                        {/* Mini Timeline Visualization */}
                        {requiredSavings !== null && (
                            <Card>
                                <CardContent className="pt-6 space-y-3">
                                    <div className="flex justify-between text-xs font-medium text-muted-foreground">
                                        <span>Now</span>
                                        <span>{planningTargets.targetYears} years</span>
                                    </div>
                                    <div className="relative h-8 bg-muted rounded-full overflow-hidden border border-border">
                                        <div
                                            className={`h-full rounded-full transition-all duration-1000 ${isPossible ? 'bg-gradient-to-r from-emerald-500 to-primary' : 'bg-gradient-to-r from-orange-400 to-orange-500'}`}
                                            style={{ width: `${Math.min(Math.max((currentNetWorth / planningTargets.targetNetWorth) * 100, 2), 100)}%` }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-foreground/80">
                                            {currency}{currentNetWorth.toLocaleString()} → {currency}{planningTargets.targetNetWorth.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground">{((currentNetWorth / planningTargets.targetNetWorth) * 100).toFixed(1)}% there</span>
                                        <span className="font-medium">{currency}{(planningTargets.targetNetWorth - currentNetWorth).toLocaleString()} to go</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {!isPossible && (
                            <Card className="bg-orange-500/10 border-orange-500/30">
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex gap-4 items-start">
                                        <div className="p-2 bg-orange-500/20 rounded-full text-orange-500">
                                            <Target className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground"><FinancialTooltip term="gap-analysis">Close the Gap</FinancialTooltip></h4>
                                            <p className="text-muted-foreground text-sm mt-1">
                                                You need an extra <strong>{currency}{savingsGap.toLocaleString()}/mo</strong>.
                                                Try extending your timeline, increasing your raise assumption, or adjusting your allocations.
                                            </p>
                                            {hasActuals && actualMonthlySavings !== null && (
                                                <p className="text-sm mt-2 p-2 rounded bg-muted/50 border border-border">
                                                    <span className="text-xs font-bold uppercase text-muted-foreground">Reality Check:</span>{' '}
                                                    Your actual monthly spend is <strong>{currency}{totalActualSpend.toLocaleString()}</strong>,
                                                    leaving <strong className={actualMonthlySavings >= (requiredSavings || 0) ? 'text-emerald-600' : 'text-red-500'}>{currency}{actualMonthlySavings.toLocaleString()}/mo</strong> in savings
                                                    {actualMonthlySavings < (requiredSavings || 0)
                                                        ? ` — still short by ${currency}${((requiredSavings || 0) - actualMonthlySavings).toLocaleString()}/mo based on actuals.`
                                                        : ` — on track based on actual spending!`
                                                    }
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="outline" size="sm" onClick={() => navigate('/')} className="gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10">
                                            <ArrowLeft className="h-3.5 w-3.5" /> Adjust Allocations
                                        </Button>
                                        <Button variant="outline" size="sm" onClick={() => navigate('/simulation')} className="gap-1 text-orange-500 border-orange-500/30 hover:bg-orange-500/10">
                                            <TrendingUp className="h-3.5 w-3.5" /> View Projection
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                        }
                    </div >
                </div >
            </div >

            {/* FIRE Station — Collapsible */}
            <Card className="border-2 border-dashed">
                <CardHeader
                    className="cursor-pointer select-none"
                    onClick={() => setShowFire(!showFire)}
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2 text-xl">
                                🔥 <FinancialTooltip term="fire-number">FIRE Station</FinancialTooltip>
                            </CardTitle>
                            <CardDescription>Financial Independence, Retire Early. Calculate your freedom number.</CardDescription>
                        </div>
                        <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${showFire ? 'rotate-180' : ''}`} />
                    </div>
                </CardHeader>

                {showFire && (
                    <CardContent className="space-y-6 pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* FIRE Inputs */}
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">Annual Spend</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-muted-foreground">{currency}</span>
                                        <Input
                                            type="number"
                                            value={annualSpend}
                                            onChange={(e) => setManualAnnualSpend(parseFloat(e.target.value) || 0)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Defaults to Income − Savings.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm font-bold"><FinancialTooltip term="swr">Safe Withdrawal Rate</FinancialTooltip></label>
                                        <Badge variant="outline">{swr}%</Badge>
                                    </div>
                                    <Slider value={[swr]} min={2} max={6} step={0.1} onValueChange={(val) => setSwr(val[0])} />
                                    <p className="text-xs text-muted-foreground">Standard rule is 4%. Conservative is 3-3.5%.</p>
                                </div>
                            </div>

                            {/* FIRE Results */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-muted-foreground">FIRE Number</p>
                                        <div className="text-3xl font-bold text-foreground">{currency}{fireResult?.fire_number?.toLocaleString() || "..."}</div>
                                        <p className="text-xs text-muted-foreground">Based on {swr}% withdrawal</p>
                                        {fireResult?.fire_number && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-1 text-xs gap-1"
                                                onClick={() => setPlanningTargets({ targetNetWorth: fireResult.fire_number })}
                                            >
                                                <Target className="h-3 w-3" /> Use as Goal
                                            </Button>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm font-bold text-muted-foreground"><FinancialTooltip term="coast-fire">Years to Coast FIRE</FinancialTooltip></p>
                                        <div className="text-3xl font-bold text-primary">{fireResult?.years_to_fire ?? "..."} <span className="text-lg text-muted-foreground">years</span></div>
                                        <p className="text-xs text-muted-foreground">{fireResult?.message}</p>
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm font-medium text-foreground">
                                        <span>Progress</span>
                                        <span>{Math.min(((currentNetWorth / (fireResult?.fire_number || 1)) * 100), 100).toFixed(1)}% Funded</span>
                                    </div>
                                    <div className="h-3 bg-muted rounded-full overflow-hidden border border-border">
                                        <div
                                            className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-1000"
                                            style={{ width: `${Math.min(((currentNetWorth / (fireResult?.fire_number || 1)) * 100), 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-muted-foreground text-right">
                                        {currency}{currentNetWorth.toLocaleString()} of {currency}{fireResult?.fire_number?.toLocaleString() || "..."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                )}
            </Card>
        </div >
    )
}
