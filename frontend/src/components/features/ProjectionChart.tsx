import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Label } from 'recharts'
import { Card } from '@/components/ui/card'

interface ProjectionChartProps {
    data: {
        year: number
        age: number
        net_worth: number
        contribution: number
        interest_earned: number
        buying_power: number
        events_value?: number
    }[]
    currency?: string
    goalValue?: number
    goalYear?: number
    milestones?: {
        name: string
        year: number
        net_worth: number
        message: string
    }[]
    events?: { name: string; year: number; amount: number }[]
}

const CustomTooltip = ({ active, payload, currency = '$' }: any) => {
    if (active && payload && payload.length) {
        const d = payload[0].payload
        return (
            <Card className="p-4 bg-background/90 backdrop-blur border-2 border-border shadow-neobrutal min-w-[200px]">
                <div className="flex justify-between items-baseline mb-2">
                    <p className="font-bold">Year {d.year}</p>
                    <span className="text-xs text-muted-foreground">Age {d.age}</span>
                </div>
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Net Worth</span>
                        <span className="font-mono font-bold text-primary">{currency}{d.net_worth?.toLocaleString()}</span>
                    </div>
                    {d.buying_power > 0 && d.buying_power !== d.net_worth && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Buying Power</span>
                            <span className="font-mono text-amber-500">{currency}{d.buying_power?.toLocaleString()}</span>
                        </div>
                    )}
                    {d.contribution > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Contribution</span>
                            <span className="font-mono text-emerald-600">+{currency}{d.contribution?.toLocaleString()}</span>
                        </div>
                    )}
                    {d.interest_earned > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Interest</span>
                            <span className="font-mono text-blue-500">+{currency}{d.interest_earned?.toLocaleString()}</span>
                        </div>
                    )}
                    {d.events_value !== 0 && d.events_value != null && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Events</span>
                            <span className={`font-mono ${d.events_value > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {d.events_value > 0 ? '+' : ''}{currency}{d.events_value?.toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>
            </Card>
        )
    }
    return null
}

export function ProjectionChart({ data, currency = '$', goalValue, goalYear, milestones, events }: ProjectionChartProps) {
    const [showBuyingPower, setShowBuyingPower] = useState(false)
    const [showAge, setShowAge] = useState(false)
    const [showBreakdown, setShowBreakdown] = useState(false)

    // Build cumulative contribution/interest for stacked view
    const stackedData = showBreakdown ? data.map((d, i) => {
        const cumContrib = data.slice(0, i + 1).reduce((s, p) => s + (p.contribution || 0), 0)
        const cumInterest = data.slice(0, i + 1).reduce((s, p) => s + (p.interest_earned || 0), 0)
        return { ...d, cum_contribution: Math.round(cumContrib), cum_interest: Math.round(cumInterest) }
    }) : data

    const hasContribData = data.some(d => d.contribution > 0)

    return (
        <div className="w-full h-[500px] space-y-2">
            {/* Controls row */}
            <div className="flex flex-wrap justify-between items-center gap-2">
                <div className="flex gap-3">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                        <input type="checkbox" checked={showBuyingPower} onChange={(e) => setShowBuyingPower(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 accent-amber-500" />
                        Buying Power
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                        <input type="checkbox" checked={showAge} onChange={(e) => setShowAge(e.target.checked)}
                            className="h-3.5 w-3.5 rounded border-gray-300 accent-primary" />
                        Show Age
                    </label>
                    {hasContribData && (
                        <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground cursor-pointer select-none">
                            <input type="checkbox" checked={showBreakdown} onChange={(e) => setShowBreakdown(e.target.checked)}
                                className="h-3.5 w-3.5 rounded border-gray-300 accent-emerald-500" />
                            Breakdown
                        </label>
                    )}
                </div>
                {/* Legend */}
                <div className="flex flex-wrap gap-3 text-[10px] font-medium">
                    <span className="flex items-center gap-1"><span className="h-2 w-6 rounded-full bg-[#8884d8] inline-block" /> Net Worth</span>
                    {showBuyingPower && <span className="flex items-center gap-1"><span className="h-0.5 w-6 border-t-2 border-dashed border-amber-500 inline-block" /> Buying Power</span>}
                    {showBreakdown && <>
                        <span className="flex items-center gap-1"><span className="h-2 w-6 rounded-full bg-emerald-500 inline-block" /> Contributions</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-6 rounded-full bg-blue-500 inline-block" /> Interest</span>
                    </>}
                    {goalValue && <span className="flex items-center gap-1"><span className="h-0.5 w-6 border-t-2 border-dashed border-emerald-500 inline-block" /> Goal</span>}
                    {milestones && milestones.length > 0 && <span className="flex items-center gap-1"><span className="h-0.5 w-6 border-t-2 border-dashed border-violet-500 inline-block" /> Milestones</span>}
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                    data={stackedData}
                    margin={{ top: 20, right: 30, left: 30, bottom: 20 }}
                >
                    <defs>
                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorBuyingPower" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorContrib" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorInterest" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                        dataKey={showAge ? "age" : "year"}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                        padding={{ left: 10, right: 10 }}
                    >
                        <Label value={showAge ? "Age" : "Year"} position="insideBottom" offset={-15} style={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                    </XAxis>
                    <YAxis
                        tickFormatter={(value) => `${currency}${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
                        tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    >
                        <Label value="Net Worth" angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontWeight: 'bold' }} />
                    </YAxis>
                    <Tooltip content={<CustomTooltip currency={currency} />} />

                    {/* Main net worth area */}
                    {!showBreakdown && (
                        <Area type="monotone" dataKey="net_worth" stroke="#8884d8" fillOpacity={1} fill="url(#colorValue)" strokeWidth={3} name="Net Worth" />
                    )}

                    {/* Stacked breakdown view */}
                    {showBreakdown && (
                        <>
                            <Area type="monotone" dataKey="cum_interest" stackId="breakdown" stroke="#3b82f6" fill="url(#colorInterest)" strokeWidth={2} name="Interest" />
                            <Area type="monotone" dataKey="cum_contribution" stackId="breakdown" stroke="#10b981" fill="url(#colorContrib)" strokeWidth={2} name="Contributions" />
                        </>
                    )}

                    {showBuyingPower && (
                        <Area type="monotone" dataKey="buying_power" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBuyingPower)" strokeWidth={2} strokeDasharray="6 3" name="Buying Power" />
                    )}

                    {/* Goal Lines */}
                    {goalValue && goalValue > 0 && (
                        <ReferenceLine y={goalValue} stroke="#10b981" strokeDasharray="3 3" strokeWidth={2}
                            label={{ value: `Goal: ${currency}${goalValue >= 1000 ? (goalValue / 1000).toFixed(0) + 'k' : goalValue}`, position: 'insideTopLeft', fill: '#10b981', fontSize: 12, fontWeight: 'bold' }} />
                    )}

                    {goalYear && goalYear > 0 && (
                        <ReferenceLine x={goalYear} stroke="#f59e0b" strokeDasharray="3 3" strokeWidth={2}
                            label={{ value: `Target Yr`, position: 'insideTopRight', fill: '#f59e0b', fontSize: 11, fontWeight: 'bold' }} />
                    )}

                    {/* Milestone Lines - fixed labels */}
                    {milestones && milestones.map((m, idx) => (
                        <ReferenceLine key={`ms-${idx}`} x={showAge ? m.year + (data[0]?.age || 30) : m.year}
                            stroke="#8b5cf6" strokeDasharray="4 4"
                            label={{ value: m.name, position: 'insideTopLeft', fill: '#8b5cf6', fontSize: 10, fontWeight: 'bold' }} />
                    ))}

                    {/* Event Markers */}
                    {events && events.map((ev, idx) => (
                        <ReferenceLine key={`ev-${idx}`} x={showAge ? ev.year + (data[0]?.age || 30) : ev.year}
                            stroke={ev.amount >= 0 ? '#10b981' : '#ef4444'} strokeDasharray="2 4" strokeWidth={1.5}
                            label={{ value: ev.name, position: 'insideBottomLeft', fill: ev.amount >= 0 ? '#10b981' : '#ef4444', fontSize: 9 }} />
                    ))}
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}
