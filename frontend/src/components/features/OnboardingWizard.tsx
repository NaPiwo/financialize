
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useFinancialStore } from "@/store"
import { ArrowRight, Sparkles, Plus, X } from "lucide-react"

const STEPS = ['welcome', 'currency', 'household', 'income', 'expenses', 'done'] as const

const PERSON_COLORS = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#a78bfa', '#fb7185', '#2dd4bf']
type Step = typeof STEPS[number]

const CURRENCIES = [
    { symbol: '$', name: 'Dollar (USD)' },
    { symbol: '€', name: 'Euro (EUR)' },
    { symbol: '£', name: 'Pound (GBP)' },
    { symbol: '¥', name: 'Yen (JPY)' },
    { symbol: '₹', name: 'Rupee (INR)' },
]

export function OnboardingWizard({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState<Step>('welcome')
    const [incomeName, setIncomeName] = useState('Main Salary')
    const [incomeAmount, setIncomeAmount] = useState('4000')
    const [housingPct, setHousingPct] = useState(30)
    const [savingsPct, setSavingsPct] = useState(20)

    const [pendingPersons, setPendingPersons] = useState<{ name: string; age: string; color: string }[]>([])
    const [personName, setPersonName] = useState('')
    const [personAge, setPersonAge] = useState('')

    const addIncome = useFinancialStore(s => s.addIncome)
    const setExpenseAllocations = useFinancialStore(s => s.setExpenseAllocations)
    const setCurrency = useFinancialStore(s => s.setCurrency)
    const createPerson = useFinancialStore(s => s.createPerson)
    const currency = useFinancialStore(s => s.currency)

    const handleAddPendingPerson = () => {
        if (!personName) return
        const color = PERSON_COLORS[pendingPersons.length % PERSON_COLORS.length]
        setPendingPersons(prev => [...prev, { name: personName, age: personAge, color }])
        setPersonName('')
        setPersonAge('')
    }

    const handleFinish = async () => {
        // Create persons in backend
        for (const p of pendingPersons) {
            await createPerson(p.name, p.age ? parseInt(p.age) : undefined, p.color)
        }

        // Clear defaults and set user's choices
        useFinancialStore.setState({ incomes: [] })
        addIncome(incomeName, parseFloat(incomeAmount) || 0)

        setExpenseAllocations([
            { id: 'house', percentage: housingPct },
            { id: 'savings', percentage: savingsPct },
        ])

        onComplete()
    }

    const next = () => {
        const idx = STEPS.indexOf(step)
        if (idx < STEPS.length - 1) setStep(STEPS[idx + 1])
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-background to-secondary/30">
            <Card className="w-full max-w-lg shadow-neobrutal animate-in fade-in slide-in-from-bottom-4">
                {step === 'welcome' && (
                    <>
                        <CardHeader className="text-center space-y-4 pt-10">
                            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <Sparkles className="h-8 w-8 text-primary" />
                            </div>
                            <CardTitle className="text-3xl">Welcome to Financialize</CardTitle>
                            <CardDescription className="text-lg">
                                Let's set up your financial playground in 30 seconds.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-10 space-y-3">
                            <div className="flex justify-center">
                                <Button size="lg" onClick={next} className="gap-2 text-lg px-8">
                                    Let's Go <ArrowRight className="h-5 w-5" />
                                </Button>
                            </div>
                            <div className="flex justify-center">
                                <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground text-xs">
                                    Skip setup
                                </Button>
                            </div>
                        </CardContent>
                    </>
                )}

                {step === 'currency' && (
                    <>
                        <CardHeader>
                            <CardTitle>💱 Your Currency</CardTitle>
                            <CardDescription>Which currency do you use?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-wrap gap-3 justify-center">
                                {CURRENCIES.map((c) => (
                                    <Button
                                        key={c.symbol}
                                        variant={currency === c.symbol ? 'default' : 'outline'}
                                        onClick={() => setCurrency(c.symbol)}
                                        className="h-auto py-3 px-5 flex flex-col items-center gap-1 min-w-[90px]"
                                    >
                                        <span className="text-2xl">{c.symbol}</span>
                                        <span className="text-xs font-normal opacity-70">{c.name}</span>
                                    </Button>
                                ))}
                            </div>
                            <Button onClick={next} className="w-full gap-2">
                                Next <ArrowRight className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </>
                )}

                {step === 'household' && (
                    <>
                        <CardHeader>
                            <CardTitle>👥 Your Household</CardTitle>
                            <CardDescription>Who manages finances in your household? You can link accounts to each person later.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {pendingPersons.map((p, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg border">
                                    <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ background: p.color }} />
                                    <span className="font-bold flex-1">{p.name}</span>
                                    {p.age && <span className="text-sm text-muted-foreground">Age {p.age}</span>}
                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPendingPersons(prev => prev.filter((_, j) => j !== i))}>
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                            <div className="flex gap-2">
                                <Input placeholder="Name" value={personName} onChange={e => setPersonName(e.target.value)} className="h-10" />
                                <Input placeholder="Age" type="number" value={personAge} onChange={e => setPersonAge(e.target.value)} className="h-10 w-20" />
                                <Button variant="outline" onClick={handleAddPendingPerson} disabled={!personName} className="h-10 px-3">
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">You can always add more people later in the Tracker sidebar.</p>
                            <Button onClick={next} className="w-full gap-2">
                                Next <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={next} className="w-full text-muted-foreground text-xs">
                                Skip this step
                            </Button>
                        </CardContent>
                    </>
                )}

                {step === 'income' && (
                    <>
                        <CardHeader>
                            <CardTitle>💰 Your Income</CardTitle>
                            <CardDescription>What's your primary monthly income source?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                placeholder="Source name"
                                value={incomeName}
                                onChange={(e) => setIncomeName(e.target.value)}
                                className="h-12 text-lg"
                            />
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-lg text-muted-foreground">{currency}</span>
                                <Input
                                    type="number"
                                    placeholder="Monthly amount"
                                    value={incomeAmount}
                                    onChange={(e) => setIncomeAmount(e.target.value)}
                                    className="pl-8 h-12 text-lg"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">You can add more sources later from the Dashboard.</p>
                            <Button onClick={next} className="w-full gap-2" disabled={!incomeAmount}>
                                Next <ArrowRight className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={onComplete} className="w-full text-muted-foreground text-xs">
                                Skip setup
                            </Button>
                        </CardContent>
                    </>
                )}

                {step === 'expenses' && (
                    <>
                        <CardHeader>
                            <CardTitle>🏠 Quick Allocations</CardTitle>
                            <CardDescription>Roughly, how much of your income goes to these?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="font-bold">🏠 Housing</label>
                                    <span className="font-mono font-bold">{housingPct}%</span>
                                </div>
                                <Slider
                                    value={[housingPct]}
                                    max={60}
                                    step={1}
                                    onValueChange={(val) => setHousingPct(val[0])}
                                />
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <label className="font-bold">💰 Savings / Investments</label>
                                    <span className="font-mono font-bold">{savingsPct}%</span>
                                </div>
                                <Slider
                                    value={[savingsPct]}
                                    max={60}
                                    step={1}
                                    onValueChange={(val) => setSavingsPct(val[0])}
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                The rest ({Math.max(0, 100 - housingPct - savingsPct)}%) will be split across other categories. You can fine-tune everything on the Dashboard.
                            </p>
                            <Button onClick={next} className="w-full gap-2">
                                Almost Done <ArrowRight className="h-4 w-4" />
                            </Button>
                        </CardContent>
                    </>
                )}

                {step === 'done' && (
                    <>
                        <CardHeader className="text-center space-y-4 pt-10">
                            <div className="text-6xl">🎉</div>
                            <CardTitle className="text-3xl">You're All Set!</CardTitle>
                            <CardDescription className="text-lg">
                                Your dashboard is ready. Start exploring your financial future.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-10 flex justify-center">
                            <Button size="lg" onClick={handleFinish} className="gap-2 text-lg px-8">
                                Open Dashboard <Sparkles className="h-5 w-5" />
                            </Button>
                        </CardContent>
                    </>
                )}
            </Card>
        </div>
    )
}
