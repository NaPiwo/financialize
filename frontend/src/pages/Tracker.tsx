
import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useFinancialStore } from "@/store"
import { useShallow } from 'zustand/react/shallow'
import { Plus, Trash2, Wallet, Building2, CreditCard, TrendingUp, Banknote, ArrowUpDown, AlertTriangle, Target, Pencil } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Label, PieChart, Pie, Cell, LineChart, Line, ReferenceLine } from 'recharts'
import { format, subMonths } from 'date-fns'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useNavigate } from 'react-router-dom'

// --- Account Type System ---
const TYPE_META: Record<string, { color: string; subtypes: string[] }> = {
    General: { color: '#6366f1', subtypes: ['Checking', 'Savings', 'Other'] },
    Cash: { color: '#22c55e', subtypes: ['Wallet', 'Savings Account', 'Emergency Fund'] },
    Investment: { color: '#10b981', subtypes: ['Brokerage', '401k / Pension', 'IRA / Roth', 'Crypto', 'Real Estate', 'HSA'] },
    Liability: { color: '#ef4444', subtypes: ['Credit Card', 'Mortgage', 'Student Loan', 'Auto Loan', 'Personal Loan'] },
}

const PERSON_COLORS = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#a78bfa', '#fb7185', '#2dd4bf']
const TIME_RANGES = ['1M', '3M', '6M', '1Y', 'All'] as const
type TimeRange = typeof TIME_RANGES[number]

export function Tracker() {
    const navigate = useNavigate()
    const {
        accounts, history, persons,
        fetchAccounts, createAccount, deleteAccount, updateAccount,
        addHistoryEntry, fetchHistory, removeHistoryEntry,
        fetchPersons, createPerson,
        currency, exchangeRates
    } = useFinancialStore(
        useShallow((state) => ({
            accounts: state.accounts,
            history: state.history,
            persons: state.persons,
            fetchAccounts: state.fetchAccounts,
            createAccount: state.createAccount,
            deleteAccount: state.deleteAccount,
            updateAccount: state.updateAccount,
            addHistoryEntry: state.addHistoryEntry,
            fetchHistory: state.fetchHistory,
            removeHistoryEntry: state.removeHistoryEntry,
            fetchPersons: state.fetchPersons,
            createPerson: state.createPerson,
            currency: state.currency,
            exchangeRates: state.exchangeRates
        }))
    )

    // Currency conversion helper: convert account balance to main currency
    const convertToMain = (amount: number, accCurrency?: string) => {
        if (!accCurrency || !exchangeRates[accCurrency]) return amount
        return amount * exchangeRates[accCurrency]
    }
    const getAccCurrencySymbol = (acc: { currency?: string }) => acc.currency || currency

    const [selectedAccountId, setSelectedAccountId] = useState<number | 'all'>('all')
    const [amount, setAmount] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [note, setNote] = useState('')

    // New Account Modal State
    const [newAccountName, setNewAccountName] = useState('')
    const [newAccountType, setNewAccountType] = useState('General')
    const [newAccountSubtype, setNewAccountSubtype] = useState('')
    const [newAccountPersonId, setNewAccountPersonId] = useState<number | undefined>()
    const [newAccountCurrency, setNewAccountCurrency] = useState('')
    const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    // Filter, Sort, Time Range
    const [filterPersonId, setFilterPersonId] = useState<number | null>(null)
    const [sortBy, setSortBy] = useState<'default' | 'balance' | 'name' | 'type'>('default')
    const [timeRange, setTimeRange] = useState<TimeRange>('All')

    // Bulk Update
    const [isBulkOpen, setIsBulkOpen] = useState(false)
    const [bulkAmounts, setBulkAmounts] = useState<Record<number, string>>({})

    // Person add
    const [newPersonName, setNewPersonName] = useState('')
    const [newPersonAge, setNewPersonAge] = useState('')

    // Edit entry
    const [editingEntryId, setEditingEntryId] = useState<number | null>(null)
    const [editAmount, setEditAmount] = useState('')

    // Pie chart view toggle
    const [pieView, setPieView] = useState<'type' | 'person'>('type')

    useEffect(() => {
        fetchAccounts()
        fetchHistory()
        fetchPersons()
    }, [fetchAccounts, fetchHistory, fetchPersons])

    // --- Handlers ---
    const handleCreateAccount = async () => {
        if (newAccountName) {
            try {
                setIsSubmitting(true)
                await createAccount({
                    name: newAccountName, type: newAccountType,
                    subtype: newAccountSubtype || undefined,
                    person_id: newAccountPersonId,
                    currency: newAccountCurrency || undefined
                })
                setNewAccountName('')
                setNewAccountType('General')
                setNewAccountSubtype('')
                setNewAccountPersonId(undefined)
                setNewAccountCurrency('')
                setIsAddAccountOpen(false)
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e)
                alert(`Failed to create account: ${msg}`)
                console.error(e)
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    const handleAddEntry = async () => {
        const numAmount = parseFloat(amount)
        if (!isNaN(numAmount) && date && selectedAccountId !== 'all') {
            try {
                setIsSubmitting(true)
                await addHistoryEntry(selectedAccountId, numAmount, date, note)
                setAmount('')
                setNote('')
            } catch (e) {
                console.error('Failed to add entry', e)
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    const handleDeleteAccount = async (id: number) => {
        if (!confirm('Delete this account and all its history? This cannot be undone.')) return
        try {
            setIsDeleting(true)
            await deleteAccount(id)
            setSelectedAccountId('all')
        } catch (e) {
            console.error('Failed to delete account', e)
        } finally {
            setIsDeleting(false)
        }
    }

    const handleDeleteEntry = (entryId: number) => {
        if (!confirm('Delete this entry?')) return
        removeHistoryEntry(entryId)
    }

    const handleAddPerson = async () => {
        if (!newPersonName) return
        const color = PERSON_COLORS[persons.length % PERSON_COLORS.length]
        await createPerson(newPersonName, newPersonAge ? parseInt(newPersonAge) : undefined, color)
        setNewPersonName('')
        setNewPersonAge('')
    }

    const handleBulkSubmit = async () => {
        const today = new Date().toISOString().split('T')[0]
        for (const [accId, val] of Object.entries(bulkAmounts)) {
            const num = parseFloat(val)
            if (!isNaN(num)) {
                await addHistoryEntry(parseInt(accId), num, today)
            }
        }
        setBulkAmounts({})
        setIsBulkOpen(false)
    }

    const handleEditEntry = async (entryId: number, accountId: number) => {
        const num = parseFloat(editAmount)
        if (isNaN(num)) return
        try {
            const entry = history.find(h => h.id === entryId)
            if (!entry) return
            const { apiClient } = await import('@/api/client')
            await apiClient.put(`/tracker/entries/${entryId}`, {
                account_id: accountId, date: entry.date, amount: num, note: entry.note
            })
            setEditingEntryId(null)
            setEditAmount('')
            fetchAccounts()
            fetchHistory()
        } catch (e) {
            console.error('Failed to edit entry', e)
        }
    }

    const cycleSortBy = () => {
        const order: typeof sortBy[] = ['default', 'balance', 'name', 'type']
        const idx = order.indexOf(sortBy)
        setSortBy(order[(idx + 1) % order.length])
    }

    const getAccountIcon = (type: string, size = 'h-4 w-4') => {
        switch (type) {
            case 'Investment': return <TrendingUp className={`${size} text-emerald-500`} />
            case 'Liability': return <CreditCard className={`${size} text-red-500`} />
            case 'Cash': return <Banknote className={`${size} text-green-600`} />
            default: return <Wallet className={`${size} text-indigo-500`} />
        }
    }

    // --- Computed Values ---
    const totalAssets = accounts.filter(a => a.type !== 'Liability').reduce((s, a) => s + convertToMain(a.current_balance || 0, a.currency), 0)
    const totalLiabilities = accounts.filter(a => a.type === 'Liability').reduce((s, a) => s + convertToMain(a.current_balance || 0, a.currency), 0)
    const totalNetWorth = totalAssets - totalLiabilities

    const filteredAccounts = filterPersonId
        ? accounts.filter(a => a.person_id === filterPersonId)
        : accounts

    const sortedAccounts = useMemo(() => {
        const arr = [...filteredAccounts]
        switch (sortBy) {
            case 'balance': return arr.sort((a, b) => (b.current_balance || 0) - (a.current_balance || 0))
            case 'name': return arr.sort((a, b) => a.name.localeCompare(b.name))
            case 'type': return arr.sort((a, b) => a.type.localeCompare(b.type))
            default: return arr
        }
    }, [filteredAccounts, sortBy])

    const staleCount = useMemo(() => accounts.filter(acc => {
        const latest = history.filter(h => h.account_id === acc.id).sort((a, b) => b.date.localeCompare(a.date))[0]
        if (!latest) return false
        return Math.floor((Date.now() - new Date(latest.date).getTime()) / 86400000) > 14
    }).length, [accounts, history])

    // Net worth history
    const netWorthHistory = useMemo(() => {
        if (accounts.length === 0 || history.length === 0) return []
        const allDates = Array.from(new Set(history.map(h => h.date))).sort()
        const trend: { date: string; amount: number }[] = []
        allDates.forEach(d => {
            let dailyTotal = 0
            accounts.forEach(acc => {
                const entry = history
                    .filter(h => h.account_id === acc.id && h.date <= d)
                    .sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0]
                const bal = entry ? entry.amount : 0
                const converted = convertToMain(bal, acc.currency)
                if (acc.type === 'Liability') dailyTotal -= converted
                else dailyTotal += converted
            })
            trend.push({ date: d, amount: dailyTotal })
        })
        return trend
    }, [accounts, history])

    // Time-filtered history
    const timeFilteredHistory = useMemo(() => {
        if (timeRange === 'All') return netWorthHistory
        const months = timeRange === '1M' ? 1 : timeRange === '3M' ? 3 : timeRange === '6M' ? 6 : 12
        const cutoff = format(subMonths(new Date(), months), 'yyyy-MM-dd')
        return netWorthHistory.filter(h => h.date >= cutoff)
    }, [netWorthHistory, timeRange])

    // Monthly change
    const monthlyChange = useMemo(() => {
        if (netWorthHistory.length < 2) return null
        const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
        const startEntry = netWorthHistory.filter(h => h.date <= monthStart).pop()
        const latestEntry = netWorthHistory[netWorthHistory.length - 1]
        if (!startEntry || !latestEntry) return null
        return latestEntry.amount - startEntry.amount
    }, [netWorthHistory])

    const monthlyPct = useMemo(() => {
        if (netWorthHistory.length < 2 || monthlyChange === null) return null
        const monthStart = format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
        const startEntry = netWorthHistory.filter(h => h.date <= monthStart).pop()
        if (!startEntry || startEntry.amount === 0) return null
        return ((monthlyChange / Math.abs(startEntry.amount)) * 100).toFixed(1)
    }, [netWorthHistory, monthlyChange])

    // Allocation data for pie chart
    const allocationData = useMemo(() => {
        const groups: Record<string, number> = {}
        accounts.forEach(acc => {
            groups[acc.type] = (groups[acc.type] || 0) + (acc.current_balance || 0)
        })
        return Object.entries(groups).map(([name, value]) => ({
            name, value: Math.abs(value),
            color: TYPE_META[name]?.color || '#94a3b8'
        }))
    }, [accounts])

    // Per-person allocation data for pie chart
    const personAllocationData = useMemo(() => {
        if (persons.length === 0) return []
        const groups: Record<string, { value: number; color: string }> = {}
        accounts.forEach(acc => {
            const personName = acc.person_name || 'Unassigned'
            const person = persons.find(p => p.name === personName)
            const color = person?.color || '#94a3b8'
            const converted = convertToMain(acc.current_balance || 0, acc.currency)
            const val = acc.type === 'Liability' ? -converted : converted
            groups[personName] = {
                value: (groups[personName]?.value || 0) + val,
                color
            }
        })
        return Object.entries(groups).map(([name, { value, color }]) => ({
            name, value: Math.abs(value), color
        })).filter(d => d.value > 0)
    }, [accounts, persons])

    // Per-person net worth for KPI cards
    const personNetWorths = useMemo(() => {
        if (persons.length === 0) return []
        const map: Record<string, number> = {}
        accounts.forEach(acc => {
            const key = acc.person_name || 'Unassigned'
            const converted = convertToMain(acc.current_balance || 0, acc.currency)
            map[key] = (map[key] || 0) + (acc.type === 'Liability' ? -converted : converted)
        })
        return Object.entries(map).map(([name, value]) => ({
            name,
            value,
            color: persons.find(p => p.name === name)?.color || '#94a3b8'
        }))
    }, [accounts, persons])

    // Milestones for net worth chart
    const milestoneLines = useMemo(() => {
        const thresholds = [10000, 25000, 50000, 100000, 250000, 500000, 1000000]
        if (netWorthHistory.length < 2) return []
        const maxNW = Math.max(...netWorthHistory.map(h => h.amount))
        return thresholds.filter(t => t <= maxNW * 1.2 && t > 0)
    }, [netWorthHistory])

    const filteredHistory = selectedAccountId === 'all'
        ? timeFilteredHistory
        : history.filter(h => h.account_id === selectedAccountId).sort((a, b) => a.date.localeCompare(b.date))

    const displayHistory = selectedAccountId === 'all'
        ? []
        : ([...filteredHistory].reverse() as (typeof history))

    const currentAccount = selectedAccountId === 'all' ? null : accounts.find(a => a.id === selectedAccountId)
    const isAllSelected = selectedAccountId === 'all'

    // Debt payoff helpers
    const debtFirstEntry = currentAccount?.type === 'Liability'
        ? history.filter(h => h.account_id === currentAccount.id).sort((a, b) => a.date.localeCompare(b.date))[0]
        : null
    const debtPctPaid = debtFirstEntry && currentAccount
        ? Math.max(0, Math.min(100, ((debtFirstEntry.amount - (currentAccount.current_balance || 0)) / debtFirstEntry.amount) * 100))
        : 0

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col gap-2">
                <h1 className="text-5xl font-extrabold tracking-tight">Net Worth Tracker</h1>
                <p className="text-xl text-muted-foreground">Manage your accounts and track wealth.</p>
            </div>

            {/* Stale Account Nudge Banner */}
            {staleCount > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        <span className="text-sm font-medium">{staleCount} account{staleCount > 1 ? 's' : ''} not updated in 2+ weeks</span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setIsBulkOpen(true)}>Update All</Button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">

                {/* Left Sidebar: Accounts List */}
                <div className="lg:col-span-3 space-y-4">
                    {/* Person Filter Pills */}
                    {persons.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                onClick={() => setFilterPersonId(null)}
                                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${filterPersonId === null ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >All</button>
                            {persons.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setFilterPersonId(filterPersonId === p.id ? null : p.id)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${filterPersonId === p.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                                >
                                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                                    {p.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-2xl">Accounts</h2>
                            <button onClick={cycleSortBy} title={`Sort: ${sortBy}`} className="text-muted-foreground hover:text-foreground transition-colors">
                                <ArrowUpDown className="h-4 w-4" />
                            </button>
                            {sortBy !== 'default' && <span className="text-[10px] text-muted-foreground">{sortBy}</span>}
                        </div>
                        <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" variant="outline"><Plus className="h-5 w-5" /></Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New Account</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 pt-4">
                                    <div className="space-y-2">
                                        <label className="text-base font-medium">Account Name</label>
                                        <Input className="h-11 text-lg" placeholder="e.g. Chase Checking" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-base font-medium">Type</label>
                                        <div className="flex gap-1.5">
                                            {Object.keys(TYPE_META).map((t) => (
                                                <Button
                                                    key={t}
                                                    variant={newAccountType === t ? 'default' : 'outline'}
                                                    size="sm"
                                                    className="flex-1 text-xs"
                                                    onClick={() => { setNewAccountType(t); setNewAccountSubtype('') }}
                                                >{t}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    {TYPE_META[newAccountType]?.subtypes.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Subtype</label>
                                            <div className="flex flex-wrap gap-1">
                                                {TYPE_META[newAccountType].subtypes.map(s => (
                                                    <Button key={s} variant={newAccountSubtype === s ? 'default' : 'ghost'} size="sm" className="text-xs h-7"
                                                        onClick={() => setNewAccountSubtype(newAccountSubtype === s ? '' : s)}>{s}</Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {persons.length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Owner</label>
                                            <div className="flex flex-wrap gap-1">
                                                <Button variant={!newAccountPersonId ? 'default' : 'ghost'} size="sm" className="text-xs h-7"
                                                    onClick={() => setNewAccountPersonId(undefined)}>None</Button>
                                                {persons.map(p => (
                                                    <Button key={p.id} variant={newAccountPersonId === p.id ? 'default' : 'ghost'} size="sm" className="text-xs h-7"
                                                        onClick={() => setNewAccountPersonId(p.id)}>
                                                        <span className="h-2 w-2 rounded-full mr-1" style={{ background: p.color }} />{p.name}
                                                    </Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {Object.keys(exchangeRates).length > 0 && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Currency</label>
                                            <div className="flex flex-wrap gap-1">
                                                <Button variant={!newAccountCurrency ? 'default' : 'ghost'} size="sm" className="text-xs h-7"
                                                    onClick={() => setNewAccountCurrency('')}>{currency} (Main)</Button>
                                                {Object.keys(exchangeRates).map(code => (
                                                    <Button key={code} variant={newAccountCurrency === code ? 'default' : 'ghost'} size="sm" className="text-xs h-7 font-mono"
                                                        onClick={() => setNewAccountCurrency(code)}>{code}</Button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <Button onClick={handleCreateAccount} disabled={isSubmitting} className="w-full text-lg h-11">{isSubmitting ? 'Creating...' : 'Create Account'}</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="space-y-3">
                        {/* All Accounts Option */}
                        <div
                            onClick={() => setSelectedAccountId('all')}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${isAllSelected
                                ? 'bg-primary/10 border-primary shadow-neobrutal-sm translate-x-1'
                                : 'bg-card border-border hover:border-primary/50'
                                }`}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Building2 className="h-5 w-5 text-muted-foreground" />
                                    <span className="font-bold text-lg">All Accounts</span>
                                </div>
                                <span className="font-mono text-base font-medium">{currency}{totalNetWorth.toLocaleString()}</span>
                            </div>
                        </div>

                        {sortedAccounts.map((acc) => {
                            const meta = TYPE_META[acc.type] || TYPE_META.General
                            const accEntries = history.filter(h => h.account_id === acc.id).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)
                            const latestDate = accEntries.length > 0 ? accEntries[0].date : null
                            const daysSince = latestDate
                                ? Math.floor((Date.now() - new Date(latestDate).getTime()) / (1000 * 60 * 60 * 24))
                                : null
                            const isStale = daysSince !== null && daysSince > 14
                            const balanceChange = accEntries.length >= 2 ? accEntries[0].amount - accEntries[1].amount : null
                            const pctChange = balanceChange !== null && accEntries[1]?.amount !== 0
                                ? ((balanceChange / Math.abs(accEntries[1].amount)) * 100).toFixed(1)
                                : null
                            const sparkData = accEntries.slice(0, 10).reverse().map(e => ({ v: e.amount }))

                            return (
                                <div
                                    key={acc.id}
                                    onClick={() => setSelectedAccountId(acc.id)}
                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedAccountId === acc.id
                                        ? 'bg-primary/10 border-primary shadow-neobrutal-sm translate-x-1'
                                        : 'bg-card border-border hover:border-primary/50'
                                        }`}
                                    style={{ borderLeftColor: meta.color, borderLeftWidth: 3 }}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {getAccountIcon(acc.type)}
                                                <span className="font-bold text-sm">{acc.name}</span>
                                            </div>
                                            {acc.person_name && <span className="text-[10px] text-muted-foreground ml-6">👤 {acc.person_name}</span>}
                                        </div>
                                        <div className="text-right">
                                            <span className={`font-mono text-sm font-medium ${acc.type === 'Liability' ? 'text-red-500' : ''}`}>
                                                {acc.type === 'Liability' ? '-' : ''}{getAccCurrencySymbol(acc)}{acc.current_balance?.toLocaleString()}
                                            </span>
                                            {acc.currency && exchangeRates[acc.currency] && (
                                                <div className="text-[10px] font-mono text-muted-foreground">
                                                    ≈ {currency}{convertToMain(acc.current_balance || 0, acc.currency).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                                </div>
                                            )}
                                            {balanceChange !== null && balanceChange !== 0 && (
                                                <div className={`text-[10px] font-mono font-medium ${balanceChange > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                                    {balanceChange > 0 ? '↑' : '↓'} {currency}{Math.abs(balanceChange).toLocaleString()}
                                                    {pctChange && <span className="ml-0.5">({pctChange}%)</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Sparkline */}
                                    {sparkData.length > 2 && (
                                        <div className="h-6 mt-1 -mx-1">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={sparkData}>
                                                    <Line dataKey="v" stroke={meta.color} dot={false} strokeWidth={1.5} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                    <div className="mt-1 flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5" style={{ background: meta.color + '20', color: meta.color, borderColor: meta.color + '40' }}>
                                            {acc.subtype || acc.type}
                                        </Badge>
                                        {daysSince !== null && (
                                            <span className={`text-[10px] ${isStale ? 'text-orange-500 font-bold' : 'text-muted-foreground'}`}>
                                                {isStale ? '⚠️ ' : ''}{daysSince === 0 ? 'Today' : `${daysSince}d ago`}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Add Person Section */}
                    <div className="border-t pt-4 space-y-2">
                        <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-1"><span>👥</span> Household</h3>
                        {persons.map(p => (
                            <div key={p.id} className="flex items-center gap-2 text-sm">
                                <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: p.color }} />
                                <span className="font-medium">{p.name}</span>
                                {p.age && <span className="text-[10px] text-muted-foreground">({p.age})</span>}
                            </div>
                        ))}
                        <div className="flex gap-1.5">
                            <Input className="h-7 text-xs" placeholder="Name" value={newPersonName} onChange={e => setNewPersonName(e.target.value)} />
                            <Input className="h-7 text-xs w-14" placeholder="Age" type="number" value={newPersonAge} onChange={e => setNewPersonAge(e.target.value)} />
                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={handleAddPerson} disabled={!newPersonName}>
                                <Plus className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="lg:col-span-9 space-y-6">
                    {isAllSelected ? (
                        <>
                            {/* Monthly Summary Banner */}
                            {monthlyChange !== null && (
                                <div className={`rounded-xl p-5 ${monthlyChange >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                                    <p className="text-sm text-muted-foreground">This month</p>
                                    <p className={`text-3xl font-bold font-mono ${monthlyChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {monthlyChange >= 0 ? '+' : ''}{currency}{monthlyChange.toLocaleString()}
                                        {monthlyPct && <span className="text-base ml-2 font-normal text-muted-foreground">({monthlyPct}%)</span>}
                                    </p>
                                </div>
                            )}

                            {/* KPI Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card><CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground">Net Worth</p>
                                    <p className="text-2xl font-bold font-mono mt-1">{currency}{totalNetWorth.toLocaleString()}</p>
                                </CardContent></Card>
                                <Card><CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground">Total Assets</p>
                                    <p className="text-2xl font-bold font-mono mt-1 text-emerald-600">{currency}{totalAssets.toLocaleString()}</p>
                                </CardContent></Card>
                                <Card><CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground">Total Liabilities</p>
                                    <p className="text-2xl font-bold font-mono mt-1 text-red-500">{currency}{totalLiabilities.toLocaleString()}</p>
                                </CardContent></Card>
                                <Card><CardContent className="p-4">
                                    <p className="text-xs text-muted-foreground">Accounts</p>
                                    <p className="text-2xl font-bold mt-1">{accounts.length}</p>
                                </CardContent></Card>
                            </div>

                            {/* Per-Person Net Worth Cards */}
                            {personNetWorths.length > 1 && (
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {personNetWorths.map(pnw => (
                                        <Card key={pnw.name} className="border-l-4" style={{ borderLeftColor: pnw.color }}>
                                            <CardContent className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: pnw.color }} />
                                                    <p className="text-xs text-muted-foreground truncate">{pnw.name}</p>
                                                </div>
                                                <p className="text-lg font-bold font-mono mt-1">{currency}{pnw.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}

                            {/* Net Worth Trend Chart with Time Range + Milestones */}
                            <Card className="min-h-[500px] flex flex-col">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Net Worth Trend</CardTitle>
                                    <div className="flex gap-1">
                                        {TIME_RANGES.map(r => (
                                            <Button key={r} size="sm" variant={timeRange === r ? 'default' : 'ghost'}
                                                className="h-7 px-2.5 text-xs" onClick={() => setTimeRange(r)}>{r}</Button>
                                        ))}
                                    </div>
                                </CardHeader>
                                <CardContent className="flex-1">
                                    {filteredHistory.length === 0 ? (
                                        <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                                            <Wallet className="h-12 w-12 opacity-30" />
                                            <p className="text-lg font-medium">No data yet</p>
                                            <p className="text-sm">Log balances in your accounts to see the trend.</p>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={400}>
                                            <AreaChart data={filteredHistory} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                                                <defs>
                                                    <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}>
                                                    <Label value="Date" position="insideBottom" offset={-20} style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                                                </XAxis>
                                                <YAxis tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}>
                                                    <Label value="Balance" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                                                </YAxis>
                                                <Tooltip
                                                    labelFormatter={(val) => format(new Date(val), 'MMM d, yyyy')}
                                                    formatter={(val: any) => [`${currency}${val.toLocaleString()}`, 'Net Worth']}
                                                    contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                                                />
                                                {milestoneLines.map(m => (
                                                    <ReferenceLine key={m} y={m} stroke="hsl(var(--border))" strokeDasharray="4 4"
                                                        label={{ value: `${currency}${m >= 1000 ? (m / 1000) + 'k' : m}`, position: 'right', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                                                ))}
                                                <Area type="monotone" dataKey="amount" stroke="#10b981" fill="url(#colorTrend)" strokeWidth={3} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Asset Allocation Pie Chart */}
                            {allocationData.length > 0 && (
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>Asset Allocation</CardTitle>
                                        {personAllocationData.length > 1 && (
                                            <div className="flex gap-1">
                                                <Button size="sm" variant={pieView === 'type' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setPieView('type')}>By Type</Button>
                                                <Button size="sm" variant={pieView === 'person' ? 'default' : 'ghost'} className="h-7 text-xs" onClick={() => setPieView('person')}>By Person</Button>
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent className="h-[300px] flex items-center">
                                        <ResponsiveContainer width="50%" height="100%">
                                            <PieChart>
                                                <Pie data={pieView === 'person' ? personAllocationData : allocationData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                                                    innerRadius={60} outerRadius={100} paddingAngle={2}>
                                                    {(pieView === 'person' ? personAllocationData : allocationData).map((entry, i) => (
                                                        <Cell key={i} fill={entry.color} stroke="hsl(var(--border))" strokeWidth={2} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(val: any) => `${currency}${val.toLocaleString()}`} contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex-1 space-y-3 pl-4">
                                            {(pieView === 'person' ? personAllocationData : allocationData).map((entry) => (
                                                <div key={entry.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="h-3 w-3 rounded-full" style={{ background: entry.color }} />
                                                        <span className="text-sm font-medium">{entry.name}</span>
                                                    </div>
                                                    <span className="text-sm font-mono">{currency}{entry.value.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* CTA to Simulation */}
                            {totalNetWorth > 0 && (
                                <Card className="bg-primary/5 border-primary/20">
                                    <CardContent className="p-6 flex items-center justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg">See your future</h3>
                                            <p className="text-sm text-muted-foreground">Project how {currency}{totalNetWorth.toLocaleString()} grows over time.</p>
                                        </div>
                                        <Button onClick={() => navigate('/simulation')} className="gap-2">
                                            <TrendingUp className="h-4 w-4" /> Open Simulation
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    ) : currentAccount ? (
                        <>
                            {/* Account Header */}
                            <div>
                                <h2 className="text-3xl font-bold flex items-center gap-3">
                                    {getAccountIcon(currentAccount.type, 'h-7 w-7')}
                                    {currentAccount.name}
                                </h2>
                                <p className={`font-mono text-4xl font-bold mt-2 ${currentAccount.type === 'Liability' ? 'text-red-600' : 'text-foreground'}`}>
                                    {currentAccount.type === 'Liability' ? '-' : ''}{getAccCurrencySymbol(currentAccount)}{currentAccount.current_balance?.toLocaleString()}
                                </p>
                                {currentAccount.currency && exchangeRates[currentAccount.currency] && (
                                    <p className="text-sm font-mono text-muted-foreground mt-1">
                                        ≈ {currency}{convertToMain(currentAccount.current_balance || 0, currentAccount.currency).toLocaleString(undefined, { maximumFractionDigits: 0 })} (converted)
                                    </p>
                                )}
                                {currentAccount.description && <p className="text-sm text-muted-foreground mt-1">{currentAccount.description}</p>}
                                {currentAccount.person_name && <p className="text-xs text-muted-foreground mt-1">👤 {currentAccount.person_name}</p>}
                            </div>

                            {/* Debt Payoff Progress for Liabilities */}
                            {currentAccount.type === 'Liability' && debtFirstEntry && debtPctPaid > 0 && (
                                <Card className="border-emerald-500/30">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium">Debt Payoff Progress</span>
                                            <span className="font-bold text-emerald-600">{debtPctPaid.toFixed(0)}%</span>
                                        </div>
                                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${debtPctPaid}%` }} />
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Started at {currency}{debtFirstEntry.amount.toLocaleString()} → Now {currency}{currentAccount.current_balance?.toLocaleString()}
                                        </p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Account Target Progress */}
                            {currentAccount.target_balance != null && currentAccount.target_balance > 0 && (
                                <Card className="border-primary/30">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="flex items-center gap-1 font-medium"><Target className="h-3.5 w-3.5" /> Goal: {currency}{currentAccount.target_balance.toLocaleString()}</span>
                                            <span className="font-bold">{Math.min(100, ((currentAccount.current_balance || 0) / currentAccount.target_balance * 100)).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-3 bg-muted rounded-full overflow-hidden">
                                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, ((currentAccount.current_balance || 0) / currentAccount.target_balance * 100))}%` }} />
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Balance Update Form */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Update Balance: <span className="text-primary">{currentAccount.name}</span></CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex gap-4 items-end">
                                        <div className="space-y-2 flex-grow">
                                            <label className="text-sm font-medium">Date</label>
                                            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                                        </div>
                                        <div className="space-y-2 flex-grow">
                                            <label className="text-sm font-medium">Balance {currentAccount.type === 'Liability' && '(Outstanding Debt)'}{currentAccount.currency ? ` (${currentAccount.currency})` : ''}</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-2 text-muted-foreground">{getAccCurrencySymbol(currentAccount)}</span>
                                                <Input type="number" className="pl-8" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                                            </div>
                                        </div>
                                        <Button onClick={handleAddEntry} disabled={!amount || isSubmitting}>{isSubmitting ? 'Saving...' : 'Log Update'}</Button>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Note (optional)</label>
                                        <Input placeholder="e.g. Monthly deposit" value={note} onChange={(e) => setNote(e.target.value)} />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Chart & History Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card className="min-h-[500px] flex flex-col">
                                    <CardHeader><CardTitle>Account History</CardTitle></CardHeader>
                                    <CardContent className="flex-1">
                                        {filteredHistory.length === 0 ? (
                                            <div className="h-[450px] flex flex-col items-center justify-center text-muted-foreground gap-3">
                                                <Wallet className="h-12 w-12 opacity-30" />
                                                <p className="text-lg font-medium">No data yet</p>
                                                <p className="text-sm">Log your first balance update above.</p>
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={450}>
                                                <AreaChart data={filteredHistory} margin={{ top: 20, right: 30, left: 20, bottom: 25 }}>
                                                    <defs>
                                                        <linearGradient id="colorAcct" x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={TYPE_META[currentAccount.type]?.color || '#3b82f6'} stopOpacity={0.3} />
                                                            <stop offset="95%" stopColor={TYPE_META[currentAccount.type]?.color || '#3b82f6'} stopOpacity={0} />
                                                        </linearGradient>
                                                    </defs>
                                                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                                    <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), 'MMM d')} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}>
                                                        <Label value="Date" position="insideBottom" offset={-20} style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                                                    </XAxis>
                                                    <YAxis tickFormatter={(val) => `${val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}>
                                                        <Label value="Balance" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                                                    </YAxis>
                                                    <Tooltip
                                                        labelFormatter={(val) => format(new Date(val), 'MMM d, yyyy')}
                                                        formatter={(val: any) => [`${currency}${val.toLocaleString()}`, 'Balance']}
                                                        contentStyle={{ borderRadius: '0.75rem', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))' }}
                                                    />
                                                    <Area type="monotone" dataKey="amount" stroke={TYPE_META[currentAccount.type]?.color || '#3b82f6'} fill="url(#colorAcct)" strokeWidth={3} />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle>Log Entries</CardTitle></CardHeader>
                                    <CardContent>
                                        <div className="max-h-[420px] overflow-y-auto space-y-2">
                                            {displayHistory.map((entry, idx) => (
                                                <div key={entry.id || idx} className="flex justify-between items-center p-2 border rounded text-sm group">
                                                    <div className="flex flex-col">
                                                        <span>{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                                                        {entry.note && <span className="text-xs text-muted-foreground">{entry.note}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {editingEntryId === entry.id ? (
                                                            <>
                                                                <Input type="number" className="w-24 h-7 text-xs" value={editAmount}
                                                                    onChange={e => setEditAmount(e.target.value)}
                                                                    onKeyDown={e => { if (e.key === 'Enter') handleEditEntry(entry.id, entry.account_id); if (e.key === 'Escape') setEditingEntryId(null) }}
                                                                    autoFocus
                                                                />
                                                                <Button size="sm" className="h-7 text-xs" onClick={() => handleEditEntry(entry.id, entry.account_id)}>Save</Button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <span className="font-bold font-mono">{currency}{entry.amount.toLocaleString()}</span>
                                                                <Button variant="ghost" size="icon"
                                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                                                                    onClick={(e) => { e.stopPropagation(); setEditingEntryId(entry.id); setEditAmount(String(entry.amount)) }}
                                                                ><Pencil className="h-3 w-3" /></Button>
                                                                <Button variant="ghost" size="icon"
                                                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteEntry(entry.id) }}
                                                                ><Trash2 className="h-3.5 w-3.5" /></Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Account Settings */}
                            <Card className="bg-muted/30">
                                <CardContent className="p-4 space-y-4">
                                    {/* Row 1: Name + Type */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Input
                                            defaultValue={currentAccount.name}
                                            onBlur={(e) => {
                                                if (e.target.value !== currentAccount.name) {
                                                    updateAccount(currentAccount.id, { name: e.target.value, type: currentAccount.type })
                                                }
                                            }}
                                            className="flex-1 min-w-[140px] h-9 font-bold"
                                        />
                                        <div className="flex gap-1">
                                            {Object.keys(TYPE_META).map((t) => (
                                                <Button key={t}
                                                    variant={currentAccount.type === t ? 'default' : 'outline'}
                                                    size="sm" className="text-xs h-9"
                                                    onClick={() => updateAccount(currentAccount.id, { name: currentAccount.name, type: t })}
                                                >{t}</Button>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Row 2: Subtype */}
                                    <div className="flex flex-wrap gap-1">
                                        {(TYPE_META[currentAccount.type]?.subtypes || []).map(s => (
                                            <Button key={s}
                                                variant={currentAccount.subtype === s ? 'default' : 'ghost'}
                                                size="sm" className="text-xs h-7"
                                                onClick={() => updateAccount(currentAccount.id, {
                                                    name: currentAccount.name, type: currentAccount.type,
                                                    subtype: currentAccount.subtype === s ? undefined : s
                                                })}
                                            >{s}</Button>
                                        ))}
                                    </div>
                                    {/* Row 3: Currency */}
                                    {Object.keys(exchangeRates).length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            <span className="text-xs text-muted-foreground self-center mr-1">Currency:</span>
                                            <Button variant={!currentAccount.currency ? 'default' : 'ghost'} size="sm" className="text-xs h-7"
                                                onClick={() => updateAccount(currentAccount.id, { name: currentAccount.name, type: currentAccount.type, currency: undefined as any })}>{currency} (Main)</Button>
                                            {Object.keys(exchangeRates).map(code => (
                                                <Button key={code} variant={currentAccount.currency === code ? 'default' : 'ghost'} size="sm" className="text-xs h-7 font-mono"
                                                    onClick={() => updateAccount(currentAccount.id, { name: currentAccount.name, type: currentAccount.type, currency: code })}>{code}</Button>
                                            ))}
                                        </div>
                                    )}
                                    {/* Row 4: Person + Description + Target */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        {persons.length > 0 && (
                                            <div className="flex gap-1">
                                                <Button variant={!currentAccount.person_id ? 'default' : 'ghost'} size="sm" className="text-xs h-7"
                                                    onClick={() => updateAccount(currentAccount.id, { name: currentAccount.name, type: currentAccount.type, person_id: undefined as any })}>
                                                    No owner
                                                </Button>
                                                {persons.map(p => (
                                                    <Button key={p.id} variant={currentAccount.person_id === p.id ? 'default' : 'ghost'} size="sm" className="text-xs h-7"
                                                        onClick={() => updateAccount(currentAccount.id, { name: currentAccount.name, type: currentAccount.type, person_id: p.id })}>
                                                        <span className="h-2 w-2 rounded-full mr-1" style={{ background: p.color }} />{p.name}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                        <Input
                                            defaultValue={currentAccount.description || ''}
                                            placeholder="Description (optional)"
                                            className="flex-1 min-w-[120px] h-7 text-xs"
                                            onBlur={(e) => updateAccount(currentAccount.id, { name: currentAccount.name, type: currentAccount.type, description: e.target.value || undefined })}
                                        />
                                        <div className="relative">
                                            <Target className="absolute left-2 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                                            <Input
                                                type="number"
                                                defaultValue={currentAccount.target_balance || ''}
                                                placeholder="Target"
                                                className="pl-7 w-28 h-7 text-xs"
                                                onBlur={(e) => updateAccount(currentAccount.id, {
                                                    name: currentAccount.name, type: currentAccount.type,
                                                    target_balance: e.target.value ? parseFloat(e.target.value) : undefined
                                                })}
                                            />
                                        </div>
                                    </div>
                                    <Button variant="destructive" size="sm" disabled={isDeleting} onClick={() => handleDeleteAccount(currentAccount.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" /> {isDeleting ? 'Deleting...' : 'Delete Account'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-xl p-12">
                            Select or create an account to start tracking.
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Update Dialog */}
            <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>📋 Monthly Check-In</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">Quickly update all your account balances at once.</p>
                    <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {accounts.map(acc => {
                            return (
                                <div key={acc.id} className="flex items-center gap-3 p-2 rounded-lg border">
                                    {getAccountIcon(acc.type)}
                                    <div className="flex-1">
                                        <span className="font-bold text-sm">{acc.name}</span>
                                        <span className="text-xs text-muted-foreground ml-2">({currency}{acc.current_balance?.toLocaleString()})</span>
                                    </div>
                                    <div className="relative">
                                        <span className="absolute left-2 top-1.5 text-xs text-muted-foreground">{currency}</span>
                                        <Input type="number" className="w-32 h-8 pl-6 text-sm"
                                            placeholder={String(acc.current_balance || 0)}
                                            value={bulkAmounts[acc.id] || ''}
                                            onChange={e => setBulkAmounts(prev => ({ ...prev, [acc.id]: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <Button onClick={handleBulkSubmit} className="w-full" disabled={Object.values(bulkAmounts).every(v => !v)}>
                        Save All Updates
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}
