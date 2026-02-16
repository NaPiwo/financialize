
import { useRef, useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useFinancialStore } from "@/store"
import { useShallow } from 'zustand/react/shallow'
import { Coins, Trash2, AlertTriangle, Download, Upload, Sun, Moon, Monitor, Save, FolderOpen, GraduationCap, Users, Plus, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/api/client"

export function Settings() {
    const { currency, setCurrency, resetData, theme, setTheme, showCoach, setShowCoach, incomes, expenses, simulationParams, planningTargets, events, fetchAccounts, fetchHistory, persons, fetchPersons, createPerson, deletePerson, actualExpenses, exchangeRates, setExchangeRate, removeExchangeRate } = useFinancialStore(
        useShallow((state) => ({
            currency: state.currency,
            setCurrency: state.setCurrency,
            resetData: state.resetData,
            theme: state.theme,
            setTheme: state.setTheme,
            showCoach: state.showCoach,
            setShowCoach: state.setShowCoach,
            incomes: state.incomes,
            expenses: state.expenses,
            simulationParams: state.simulationParams,
            planningTargets: state.planningTargets,
            events: state.events,
            fetchAccounts: state.fetchAccounts,
            fetchHistory: state.fetchHistory,
            persons: state.persons,
            fetchPersons: state.fetchPersons,
            createPerson: state.createPerson,
            deletePerson: state.deletePerson,
            actualExpenses: state.actualExpenses,
            exchangeRates: state.exchangeRates,
            setExchangeRate: state.setExchangeRate,
            removeExchangeRate: state.removeExchangeRate
        }))
    )

    const [newPersonName, setNewPersonName] = useState('')
    const [newPersonAge, setNewPersonAge] = useState('')
    const [newPersonColor, setNewPersonColor] = useState('#818cf8')
    const [newRateCurrency, setNewRateCurrency] = useState('')
    const [newRateValue, setNewRateValue] = useState('')
    const fileInputRef = useRef<HTMLInputElement>(null)

    const PERSON_COLOR_SWATCHES = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#a78bfa', '#fb7185', '#2dd4bf', '#f97316', '#8b5cf6']

    // Scenarios
    type SavedScenario = { id: number; name: string; data: string | null }
    const [scenarios, setScenarios] = useState<SavedScenario[]>([])
    const [newScenarioName, setNewScenarioName] = useState('')

    const fetchScenarios = async () => {
        try {
            const res = await apiClient.get('/scenarios/saved')
            setScenarios(res.data)
        } catch { /* backend may be down */ }
    }

    useEffect(() => { fetchScenarios(); fetchPersons() }, [])

    const handleSaveScenario = async () => {
        if (!newScenarioName.trim()) return
        try {
            const accountsRes = await apiClient.get('/tracker/accounts')
            const historyRes = await apiClient.get('/tracker/history')
            const personsRes = await apiClient.get('/tracker/persons')
            const snapshot = JSON.stringify({
                incomes, expenses, simulationParams, planningTargets, events, currency,
                accounts: accountsRes.data, history: historyRes.data, persons: personsRes.data
            })
            await apiClient.post('/scenarios/saved', { name: newScenarioName, data: snapshot })
            setNewScenarioName('')
            fetchScenarios()
        } catch (e) {
            console.error('Failed to save scenario', e)
        }
    }

    const handleLoadScenario = (scenario: SavedScenario) => {
        if (!scenario.data) return
        if (!confirm(`Load "${scenario.name}"? This will overwrite your current setup.`)) return
        const cs = JSON.parse(scenario.data)
        useFinancialStore.setState({
            incomes: cs.incomes || [],
            expenses: cs.expenses || [],
            simulationParams: cs.simulationParams || useFinancialStore.getState().simulationParams,
            planningTargets: cs.planningTargets || useFinancialStore.getState().planningTargets,
            events: cs.events || [],
            currency: cs.currency || '$'
        })
    }

    const handleDeleteScenario = async (id: number) => {
        await apiClient.delete(`/scenarios/saved/${id}`)
        fetchScenarios()
    }

    const currencies = [
        { symbol: '$', name: 'USD', code: 'USD' },
        { symbol: '€', name: 'EUR', code: 'EUR' },
        { symbol: '£', name: 'GBP', code: 'GBP' },
        { symbol: '¥', name: 'JPY', code: 'JPY' },
        { symbol: '₹', name: 'INR', code: 'INR' },
        { symbol: 'CHF', name: 'CHF', code: 'CHF' },
        { symbol: 'kr', name: 'SEK', code: 'SEK' },
        { symbol: 'R$', name: 'BRL', code: 'BRL' },
        { symbol: '₩', name: 'KRW', code: 'KRW' },
        { symbol: 'A$', name: 'AUD', code: 'AUD' },
        { symbol: 'C$', name: 'CAD', code: 'CAD' },
    ]
    const [customCurrency, setCustomCurrency] = useState('')

    const handleReset = () => {
        if (confirm("Are you sure? This will wipe all your data and return to defaults.")) {
            resetData()
        }
    }

    const handleExport = async () => {
        try {
            const accountsRes = await apiClient.get('/tracker/accounts')
            const historyRes = await apiClient.get('/tracker/history')
            const personsRes = await apiClient.get('/tracker/persons')
            const exportData = {
                version: '1.1.0',
                exportedAt: new Date().toISOString(),
                clientState: { incomes, expenses, simulationParams, planningTargets, events, currency, showCoach, actualExpenses, exchangeRates },
                backendState: { accounts: accountsRes.data, history: historyRes.data, persons: personsRes.data }
            }
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `financialize-backup-${new Date().toISOString().split('T')[0]}.json`
            a.click()
            URL.revokeObjectURL(url)
            alert('Backup exported successfully!')
        } catch (e) {
            console.error('Export failed', e)
            alert('Export failed. Is the backend running?')
        }
    }

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
            const text = await file.text()
            const data = JSON.parse(text)
            if (!data.version || !data.clientState) {
                alert('Invalid backup file.')
                return
            }
            if (!confirm('This will overwrite your current data. Continue?')) return
            const cs = data.clientState
            useFinancialStore.setState({
                incomes: cs.incomes || [],
                expenses: cs.expenses || [],
                simulationParams: cs.simulationParams || useFinancialStore.getState().simulationParams,
                planningTargets: cs.planningTargets || useFinancialStore.getState().planningTargets,
                events: cs.events || [],
                currency: cs.currency || '$',
                actualExpenses: cs.actualExpenses || {},
                exchangeRates: cs.exchangeRates || {}
            })
            // Restore persons
            if (data.backendState?.persons) {
                for (const p of data.backendState.persons) {
                    try {
                        await apiClient.post('/tracker/persons', { name: p.name, age: p.age, color: p.color })
                    } catch { /* person may already exist */ }
                }
            }
            if (data.backendState?.accounts) {
                for (const acc of data.backendState.accounts) {
                    try {
                        const created = await apiClient.post('/tracker/accounts', { name: acc.name, type: acc.type, subtype: acc.subtype, description: acc.description, target_balance: acc.target_balance })
                        if (data.backendState?.history) {
                            const accHistory = data.backendState.history.filter((h: any) => h.account_id === acc.id)
                            for (const entry of accHistory) {
                                try {
                                    await apiClient.post('/tracker/entries', {
                                        account_id: created.data.id,
                                        date: entry.date,
                                        amount: entry.amount,
                                        note: entry.note
                                    })
                                } catch { /* entry may fail */ }
                            }
                        }
                    } catch { /* account may already exist */ }
                }
            }
            fetchAccounts()
            fetchHistory()
            fetchPersons()
            alert('Import successful!')
        } catch (err) {
            console.error('Import failed', err)
            alert('Failed to parse backup file.')
        }
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <div className="space-y-8 h-full">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-extrabold tracking-tight">Settings</h1>
                <p className="text-lg text-muted-foreground">Customize your experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* General Preferences */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" /> Currency</CardTitle>
                        <CardDescription>Select your preferred currency symbol.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {currencies.map((c) => (
                                <Button
                                    key={c.symbol}
                                    variant={currency === c.symbol ? "default" : "outline"}
                                    onClick={() => setCurrency(c.symbol)}
                                    className="h-auto py-3 px-4 flex flex-col items-center gap-0.5 min-w-[70px]"
                                >
                                    <span className="text-xl font-bold">{c.symbol}</span>
                                    <span className="text-[10px] font-normal opacity-70">{c.name}</span>
                                </Button>
                            ))}
                        </div>
                        <div className="flex gap-2 items-center">
                            <Input
                                placeholder="Custom symbol (e.g. PLN)"
                                value={customCurrency}
                                onChange={e => setCustomCurrency(e.target.value)}
                                className="w-40 h-8 text-sm"
                            />
                            <Button variant="outline" size="sm" disabled={!customCurrency.trim()}
                                onClick={() => { setCurrency(customCurrency.trim()); setCustomCurrency('') }}>
                                Use Custom
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Exchange Rate Table */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Coins className="h-5 w-5" /> Exchange Rates</CardTitle>
                        <CardDescription>Set conversion rates from foreign currencies to your main currency ({currency}). Used to convert multi-currency accounts.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {Object.entries(exchangeRates).length > 0 ? (
                            <div className="space-y-2">
                                {Object.entries(exchangeRates).map(([code, rate]) => (
                                    <div key={code} className="flex items-center justify-between p-2 rounded-lg border">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono">{code}</Badge>
                                            <span className="text-sm text-muted-foreground">1 {code} =</span>
                                            <span className="font-bold font-mono">{rate} {currency}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                            onClick={() => removeExchangeRate(code)}>
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-2">No exchange rates configured. Add one if you have accounts in foreign currencies.</p>
                        )}
                        <div className="flex gap-2 items-end pt-2 border-t">
                            <div className="space-y-1 flex-1">
                                <label className="text-xs font-medium">Currency Code</label>
                                <Input placeholder="e.g. EUR" value={newRateCurrency} onChange={e => setNewRateCurrency(e.target.value.toUpperCase())} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1 flex-1">
                                <label className="text-xs font-medium">Rate (1 unit = ? {currency})</label>
                                <Input type="number" step="0.0001" placeholder="e.g. 1.08" value={newRateValue} onChange={e => setNewRateValue(e.target.value)} className="h-8 text-sm" />
                            </div>
                            <Button variant="outline" size="sm" className="h-8"
                                disabled={!newRateCurrency.trim() || !newRateValue}
                                onClick={() => { setExchangeRate(newRateCurrency.trim(), parseFloat(newRateValue)); setNewRateCurrency(''); setNewRateValue('') }}>
                                <Plus className="h-3.5 w-3.5 mr-1" /> Add
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Coach Toggle */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" /> Coach</CardTitle>
                        <CardDescription>Toggle the AI-powered Coach's Corner on the Dashboard.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${showCoach ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                                onClick={() => setShowCoach(!showCoach)}>
                                <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${showCoach ? 'translate-x-6' : 'translate-x-1'}`} />
                            </div>
                            <span className="text-sm font-medium">{showCoach ? 'Coach is enabled' : 'Coach is disabled'}</span>
                        </label>
                    </CardContent>
                </Card>

                {/* Theme */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Sun className="h-5 w-5" /> Theme</CardTitle>
                        <CardDescription>Choose your preferred appearance.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-3">
                            {[
                                { value: 'light' as const, label: 'Light', icon: Sun },
                                { value: 'dark' as const, label: 'Dark', icon: Moon },
                                { value: 'system' as const, label: 'System', icon: Monitor },
                            ].map((t) => {
                                const Icon = t.icon
                                return (
                                    <Button
                                        key={t.value}
                                        variant={theme === t.value ? 'default' : 'outline'}
                                        onClick={() => setTheme(t.value)}
                                        className="h-auto py-4 px-6 flex flex-col items-center gap-1 min-w-[100px]"
                                    >
                                        <Icon className="h-6 w-6" />
                                        <span className="text-xs font-normal opacity-70">{t.label}</span>
                                    </Button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Saved Scenarios */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Save className="h-5 w-5" /> Saved Scenarios</CardTitle>
                        <CardDescription>Save your current setup as a named scenario to compare or restore later.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Scenario name (e.g. Aggressive Plan)"
                                value={newScenarioName}
                                onChange={(e) => setNewScenarioName(e.target.value)}
                                className="flex-1"
                            />
                            <Button onClick={handleSaveScenario} disabled={!newScenarioName.trim()} className="gap-2">
                                <Save className="h-4 w-4" /> Save Current
                            </Button>
                        </div>
                        {scenarios.length > 0 ? (
                            <div className="space-y-2">
                                {scenarios.map((s) => (
                                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                                        <span className="font-medium">{s.name}</span>
                                        <div className="flex gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleLoadScenario(s)} className="gap-1">
                                                <FolderOpen className="h-3.5 w-3.5" /> Load
                                            </Button>
                                            <Button variant="ghost" size="sm" onClick={() => handleDeleteScenario(s.id)} className="text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No saved scenarios yet.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Household Persons */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Household Members</CardTitle>
                        <CardDescription>Manage people in your household. Accounts can be linked to persons.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {persons.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border">
                                <span className="h-4 w-4 rounded-full flex-shrink-0" style={{ background: p.color }} />
                                <span className="font-medium flex-1">{p.name}</span>
                                {p.age && <span className="text-sm text-muted-foreground">Age {p.age}</span>}
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                    onClick={() => { if (confirm(`Remove ${p.name}?`)) deletePerson(p.id) }}>
                                    <X className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        ))}
                        {persons.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No household members yet.</p>}
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex gap-2">
                                <Input placeholder="Name" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} className="flex-1" />
                                <Input placeholder="Age" type="number" value={newPersonAge} onChange={e => setNewPersonAge(e.target.value)} className="w-20" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-xs text-muted-foreground mr-1">Color:</span>
                                {PERSON_COLOR_SWATCHES.map(c => (
                                    <button key={c} className={`h-5 w-5 rounded-full border-2 transition-all ${newPersonColor === c ? 'border-foreground scale-125' : 'border-transparent'}`}
                                        style={{ background: c }} onClick={() => setNewPersonColor(c)} />
                                ))}
                            </div>
                            <Button variant="outline" disabled={!newPersonName.trim()} className="gap-1 w-full"
                                onClick={() => { createPerson(newPersonName.trim(), newPersonAge ? parseInt(newPersonAge) : undefined, newPersonColor); setNewPersonName(''); setNewPersonAge(''); }}>
                                <Plus className="h-4 w-4" /> Add Member
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Management */}
                <Card className="border-destructive/20 bg-destructive/5">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Danger Zone</CardTitle>
                        <CardDescription>Manage your local data.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            This application stores your data locally in your browser.
                            Clicking the button below will wipe all your income, expenses, and settings returning the app to its factory state.
                        </p>
                        <Button variant="destructive" onClick={handleReset} className="w-full sm:w-auto">
                            <Trash2 className="mr-2 h-4 w-4" /> Reset All Data
                        </Button>
                    </CardContent>
                </Card>

                {/* Data Backup */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5" /> Data Backup</CardTitle>
                        <CardDescription>Export or import all your financial data as a JSON file.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-4">
                        <Button onClick={handleExport} variant="outline" className="gap-2">
                            <Download className="h-4 w-4" /> Export Backup
                        </Button>
                        <div>
                            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
                            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="gap-2">
                                <Upload className="h-4 w-4" /> Import Backup
                            </Button>
                        </div>
                        <p className="w-full text-xs text-muted-foreground">Exports include all income sources, expenses, simulation settings, accounts, and balance history.</p>
                    </CardContent>
                </Card>

                {/* About */}
                <Card className="md:col-span-2 bg-secondary/20">
                    <CardHeader>
                        <CardTitle>About Financialize</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                        <p>Version 1.1.0</p>
                        <p>Built with React, Vite, Tailwind, and Python.</p>
                        <div className="flex gap-2 mt-4">
                            <Badge variant="outline">Local-First</Badge>
                            <Badge variant="outline">Privacy-Focused</Badge>
                            <Badge variant="outline">Fast</Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
