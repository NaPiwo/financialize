
import { memo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface AllocationChartProps {
    data: {
        name: string
        value: number
        color: string
    }[]
}

const RADIAN = Math.PI / 180
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    if (percent < 0.05) return null

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-sm font-bold drop-shadow-md">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    )
}

export const AllocationChart = memo(function AllocationChart({ data }: AllocationChartProps) {
    return (
        <div className="w-full h-[500px] flex flex-col">
            <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={170}
                        innerRadius={85}
                        fill="#8884d8"
                        dataKey="value"
                        paddingAngle={2}
                        cornerRadius={5}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--border))" strokeWidth={2} />
                        ))}
                    </Pie>
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            color: 'hsl(var(--card-foreground))',
                            borderColor: 'hsl(var(--border))',
                            borderWidth: '2px',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                            borderRadius: '0.5rem'
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-4">
                {data.map((entry, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-xs font-medium">
                        <span className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: entry.color }} />
                        {entry.name}
                    </span>
                ))}
            </div>
        </div>
    )
})
