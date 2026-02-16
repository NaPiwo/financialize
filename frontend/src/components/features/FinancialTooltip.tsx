
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

const glossary: Record<string, string> = {
    'net-worth': 'The total value of everything you own (assets) minus everything you owe (liabilities). A single number that represents your financial health.',
    'savings-rate': 'The percentage of your income that you save or invest each month. A 20%+ savings rate is considered healthy.',
    'compound-interest': 'Earning returns on your returns. Over time, your money grows exponentially because interest earns interest.',
    'fire-number': 'The amount of money you need invested so that withdrawals cover your annual spending forever. Typically 25× your annual expenses.',
    'swr': 'Safe Withdrawal Rate — the percentage you can withdraw from your portfolio each year without running out of money. The classic rule is 4%.',
    'coast-fire': 'The point where your existing investments will grow to your FIRE number by retirement age without any additional contributions.',
    'inflation': 'The rate at which prices rise over time, eroding your purchasing power. Historically averages 2-3% per year.',
    'buying-power': 'What your money can actually buy after adjusting for inflation. $1M in 20 years won\'t buy as much as $1M today.',
    'market-return': 'The average annual growth rate of the stock market. The S&P 500 has historically returned ~10% nominally, ~7% after inflation.',
    'annual-raise': 'The yearly percentage increase in your salary. This helps offset inflation and grow your savings capacity over time.',
    'gap-analysis': 'The difference between what you need to save and what you currently save. Green means on track, red means you have a shortfall.',
    'reverse-planning': 'Working backward from a financial goal to determine the monthly savings needed today to reach it.',
    'linear-regression': 'A statistical method that fits a straight line to your historical data to predict future trends.',
    'r-squared': 'A confidence score (0-1) for the trend line. Higher values mean the trend is more reliable. Above 0.7 is strong.',
    'liability': 'Money you owe — credit cards, loans, mortgages. These subtract from your net worth.',
    'allocation': 'How you divide your income across spending categories. A balanced allocation prevents overspending in any one area.',
}

interface FinancialTooltipProps {
    term: keyof typeof glossary | string
    children?: React.ReactNode
    className?: string
}

export function FinancialTooltip({ term, children, className = '' }: FinancialTooltipProps) {
    const [show, setShow] = useState(false)
    const explanation = glossary[term]

    if (!explanation) return <>{children}</>

    return (
        <span
            className={`relative inline-flex items-center gap-1 ${className}`}
            onMouseEnter={() => setShow(true)}
            onMouseLeave={() => setShow(false)}
        >
            {children}
            <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help flex-shrink-0" />
            {show && (
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-foreground text-background text-xs rounded-lg shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-none">
                    {explanation}
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
                </span>
            )}
        </span>
    )
}
