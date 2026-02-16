import { useEffect, useState, useRef, memo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { useFinancialStore } from "@/store"
import { useShallow } from 'zustand/react/shallow'
import { apiClient } from "@/api/client"

interface Nudge {
    title: string
    message: string
    icon: string
}

export const CoachCorner = memo(function CoachCorner() {
    const { incomes, expenses, simulationParams, accounts, currency, actualExpenses } = useFinancialStore(
        useShallow((state) => ({
            incomes: state.incomes,
            expenses: state.expenses,
            simulationParams: state.simulationParams,
            accounts: state.accounts,
            currency: state.currency,
            actualExpenses: state.actualExpenses
        }))
    )

    const [nudges, setNudges] = useState<Nudge[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)

    // Current savings needed for payload
    const currentNetWorth = accounts.reduce((sum, acc) => {
        if (acc.type === 'Liability') return sum - (acc.current_balance || 0);
        return sum + (acc.current_balance || 0);
    }, 0)

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)

        debounceRef.current = setTimeout(async () => {
            setLoading(true)
            try {
                const effectiveExpenses = expenses.filter(e => e.id !== 'savings')

                const payload = {
                    current_savings: currentNetWorth,
                    incomes: incomes,
                    expenses: effectiveExpenses,
                    years: simulationParams.years || 30,
                    annual_raise: simulationParams.annualRaise || 2,
                    market_return: simulationParams.marketReturn || 7,
                    inflation: simulationParams.inflation || 2.5,
                    currency: currency,
                    actual_expenses: Object.keys(actualExpenses).length > 0 ? actualExpenses : undefined
                }

                const response = await apiClient.post('/coach/analyze', payload)
                setNudges(response.data)
                setError(false)
            } catch (err) {
                console.error("Coach failed", err)
                setError(true)
            } finally {
                setLoading(false)
            }
        }, 1500)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [incomes, expenses, currentNetWorth, actualExpenses])

    if (loading) return (
        <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
                <div className="flex items-center gap-2 text-primary">
                    <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
                    <span className="text-sm font-medium">Coach is thinking...</span>
                </div>
            </CardContent>
        </Card>
    )

    if (error) return (
        <Card className="bg-muted/30 border-dashed">
            <CardContent className="p-6 text-center text-muted-foreground">
                <p className="text-sm">🎓 Coach is offline. Start the backend to get personalized tips.</p>
            </CardContent>
        </Card>
    )

    if (nudges.length === 0) return null

    return (
        <Card className="bg-primary/5 border-primary/20 shadow-sm relative overflow-hidden transition-all duration-300">
            {/* Decorative Background Icon */}
            <div className="absolute -right-4 -top-4 text-9xl opacity-5 transform rotate-12 select-none">
                🎓
            </div>

            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <span>🎓</span> Coach's Corner
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {nudges.map((nudge, idx) => (
                    <div key={idx} className="flex gap-3 items-start bg-card/60 p-3 rounded-lg border">
                        <span className="text-2xl pt-1">{nudge.icon}</span>
                        <div>
                            <p className="text-sm font-bold">{nudge.title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{nudge.message}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
})
