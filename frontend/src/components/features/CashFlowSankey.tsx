import { memo, useMemo } from 'react'
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts'

const CATEGORY_COLORS: Record<string, string> = {
    'Housing': '#6366f1',
    'Food & Dining': '#f59e0b',
    'Transportation': '#3b82f6',
    'Savings/Investments': '#10b981',
    'Lifestyle': '#ec4899',
    'Healthcare': '#ef4444',
    'Education': '#8b5cf6',
    'Entertainment': '#f97316',
    'Insurance': '#14b8a6',
    'Debt': '#dc2626',
}

interface CashFlowSankeyProps {
    incomes: any[]
    expenses: any[]
    totalIncome: number
    currency?: string
}

const CustomTooltip = ({ active, payload, currency = '$' }: any) => {
    if (active && payload && payload.length) {
        const { name, value } = payload[0].payload
        return (
            <div className="bg-card text-card-foreground p-2 border rounded shadow text-sm">
                <strong>{name}</strong>: {currency}{value?.toLocaleString()}
            </div>
        )
    }
    return null
}

const SankeyNodeRenderer = ({ x, y, width, height, payload, ...rest }: any) => {
    const isOut = x + width + 6 > (rest.containerWidth || 800) / 2;
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill="hsl(var(--primary))"
                fillOpacity="1"
            />
            <text
                x={x + width / 2}
                y={y + height / 2}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#fff"
                style={{ pointerEvents: 'none', textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
            >
            </text>
            <text
                x={isOut ? x - 6 : x + width + 6}
                y={y + height / 2}
                textAnchor={isOut ? 'end' : 'start'}
                dy="0.35em"
                fontSize="16"
                fill="hsl(var(--foreground))"
                fontWeight="600"
            >
                {payload.name}
            </text>
        </g>
    );
};

const SankeyLinkRenderer = ({ sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, payload }: any) => {
    const color = payload?.color || 'hsl(var(--primary))'
    return (
        <path
            d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
            fill="none"
            stroke={color}
            strokeWidth={linkWidth}
            strokeOpacity={0.4}
        />
    )
}

export const CashFlowSankey = memo(function CashFlowSankey({ incomes, expenses, totalIncome, currency = '$' }: CashFlowSankeyProps) {

    const sankeyData = useMemo(() => {
        const incomeNodes = incomes.map(i => ({ name: i.name }))
        const budgetNodeIndex = incomeNodes.length
        const nodes = [...incomeNodes, { name: "Total Budget" }]

        const expenseNodes = expenses.map(e => ({ name: e.name }))
        const expenseStartIndex = nodes.length
        nodes.push(...expenseNodes)

        const links: { source: number; target: number; value: number; color?: string }[] = []

        incomes.forEach((inc, idx) => {
            links.push({
                source: idx,
                target: budgetNodeIndex,
                value: inc.amount,
                color: 'hsl(var(--primary))'
            })
        })

        expenses.forEach((exp, idx) => {
            const amount = totalIncome * (exp.percentage / 100)
            if (amount > 0) {
                links.push({
                    source: budgetNodeIndex,
                    target: expenseStartIndex + idx,
                    value: amount,
                    color: CATEGORY_COLORS[exp.name] || `hsl(${(idx * 47) % 360}, 70%, 55%)`
                })
            }
        })

        const totalAllocated = expenses.reduce((sum: number, e: any) => sum + (totalIncome * (e.percentage / 100)), 0)
        const unallocated = totalIncome - totalAllocated

        if (unallocated > 1) {
            nodes.push({ name: "💰 Free Cash" })
            links.push({
                source: budgetNodeIndex,
                target: nodes.length - 1,
                value: unallocated,
                color: '#10b981'
            })
        }

        return { nodes, links }
    }, [incomes, expenses, totalIncome])

    if (totalIncome === 0) {
        return (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground text-lg">
                Add income to see the flow.
            </div>
        )
    }

    return (
        <div className="w-full h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <Sankey
                    data={sankeyData}
                    node={SankeyNodeRenderer}
                    nodePadding={50}
                    margin={{ left: 20, right: 20, top: 20, bottom: 20 }}
                    link={<SankeyLinkRenderer />}
                >
                    <Tooltip content={<CustomTooltip currency={currency} />} />
                </Sankey>
            </ResponsiveContainer>
        </div>
    )
})
