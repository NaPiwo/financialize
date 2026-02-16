
import math
from datetime import datetime

import numpy as np
import pandas as pd
from typing import List, Dict
from .schemas import (
    ProjectionRequest, YearProjection, Milestone,
    FIRERequest, FIREResponse,
    ForecastRequest, ForecastResponse,
)

def calculate_projections(request: ProjectionRequest) -> List[YearProjection]:
    years = request.years
    
    # 1. Calculate Baselines (Monthly)
    total_monthly_income = sum(i.amount for i in request.incomes)
    
    # Calculate Expenses based on percentages
    total_monthly_expense_rate = sum(e.percentage for e in request.expenses) / 100.0
    initial_monthly_expense = total_monthly_income * total_monthly_expense_rate
    initial_monthly_savings = total_monthly_income - initial_monthly_expense
    
    # 2. Vector Setup (Annual)
    n_periods = years + 1
    year_arr = np.arange(n_periods)
    
    # Rates (Scalar)
    raise_rate = request.annual_raise / 100.0
    return_rate = request.market_return / 100.0
    inflation_rate = request.inflation / 100.0
    
    # 3. Growth Logic
    # Annual Income grows by raise_rate
    annual_income_arr = (total_monthly_income * 12) * ((1 + raise_rate) ** year_arr)
    annual_contribution_arr = (initial_monthly_savings * 12) * ((1 + raise_rate) ** year_arr)
    
    # 4. Investment Growth (Iterative for Principal + Interest + Events)
    net_worth_arr = np.zeros(n_periods)
    interest_earned_arr = np.zeros(n_periods)
    events_value_arr = np.zeros(n_periods)
    
    current_balance = request.current_savings
    
    for i in range(n_periods):
        if i == 0:
            net_worth_arr[i] = current_balance
            continue
            
        # Start of year balance
        start_bal = net_worth_arr[i-1]
        
        # Interest earned this year (on start balance)
        interest = start_bal * return_rate
        interest_earned_arr[i] = interest
        
        # Contribution (End of year)
        contribution = annual_contribution_arr[i]
        
        # Process Events for this year
        event_impact = 0.0
        for event in request.events:
            # Simple One-time event check
            if not event.is_recurring and event.year == i:
                event_impact += event.amount
            
            # Recurring check
            if event.is_recurring:
                if event.year <= i < (event.year + event.duration):
                    # Adjust event amount for inflation? Usually events are in "today's dollars" so we might need to inflate cost
                    # But for MVP, let's assume raw amount input is nominal for that time or static.
                    # Let's assume input is "Today's Value", so we inflate it to nominal cost at year i
                    # nominal_event_amt = event.amount * ((1 + inflation_rate) ** i)
                    # For simplicity v1: Raw amount
                    event_impact += event.amount

        events_value_arr[i] = event_impact

        # End of year balance = Start + Interest + Contribution + Events
        # Note: Contribution is usually positive. Events can be negative (cost) or positive (windfall).
        end_bal = start_bal + interest + contribution + event_impact
        
        net_worth_arr[i] = end_bal
        
    # 5. Inflation Adjustment
    buying_power_arr = net_worth_arr / ((1 + inflation_rate) ** year_arr)
    
    # 6. Milestone Calculation
    milestones = []
    
    # Flags to ensure we only capture the *first* time we cross a threshold
    crossed_zero = False
    crossed_100k = False
    crossed_1m = False
    
    cur = getattr(request, 'currency', '$')
    
    # Calculate approx Coast FIRE & FI thresholds (Simplified logic)
    # FI Number is usually 25x annual spend. But we don't know annual spend here directly?
    # We can infer spend = Income - Savings.
    spending_rate = 1.0 - total_monthly_expense_rate # Wait, expense_rate is EXPENSES.
    # Actually: initial_monthly_expense is the spend.
    current_annual_spend = initial_monthly_expense * 12
    # Adjust spend for inflation? Yes.
    
    fi_number_current = current_annual_spend * 25 # Rule of 25
    
    crossed_fi = False
    crossed_coast = False
    
    for i in range(n_periods):
        nw = net_worth_arr[i]
        
        # Debt Free
        if nw >= 0 and not crossed_zero and current_balance < 0:
            crossed_zero = True
            milestones.append(Milestone(name="Debt Free", year=i, net_worth=nw, message="You are back to zero!"))
            
        # 100k (The Hardest Milestone)
        if nw >= 100000 and not crossed_100k:
            crossed_100k = True
            milestones.append(Milestone(name=f"{cur}100k Club", year=i, net_worth=nw, message="The hardest 100k is done."))

        # 1M
        if nw >= 1000000 and not crossed_1m:
            crossed_1m = True
            milestones.append(Milestone(name=f"{cur}1M Club", year=i, net_worth=nw, message="Two comma club."))
            
        # FI (Financial Independence)
        # We need to compare against the inflated FI number for that year
        future_annual_spend = current_annual_spend * ((1 + inflation_rate) ** i)
        future_fi_number = future_annual_spend * 25
        
        if nw >= future_fi_number and not crossed_fi and i > 0:
            crossed_fi = True
            milestones.append(Milestone(name="Financial Independence", year=i, net_worth=nw, message="Passive income covers expenses."))

        # Coast FIRE
        # Complex to calc iteratively without sub-loops. Skip for MVP or add if user insists.
        # User requested it: "Coast FIRE (Investment returns > Contribution)"
        # Definition: Investment Returns > Contribution ? 
        # Or "Assets > Coast Number"? 
        # User definition: "Investment returns > Contribution".
        # Let's check that.
        if interest_earned_arr[i] > annual_contribution_arr[i] and annual_contribution_arr[i] > 0 and not crossed_coast:
            crossed_coast = True
            milestones.append(Milestone(name="Money Machine", year=i, net_worth=nw, message="Investment returns now exceed your contributions."))
    
    # 7. Format Output
    projections = []
    current_age = request.current_age
    
    for i in range(n_periods):
        projections.append(YearProjection(
            year=i,
            age=current_age + i,
            net_worth=round(float(net_worth_arr[i]), 2),
            contribution=round(float(annual_contribution_arr[i]), 2),
            interest_earned=round(float(interest_earned_arr[i]), 2),
            buying_power=round(float(buying_power_arr[i]), 2),
            events_value=round(float(events_value_arr[i]), 2)
        ))
        
    return projections, milestones

def _simulate_final_balance(
    monthly_contribution: float,
    current_savings: float,
    years: int,
    annual_raise: float,
    market_return: float,
    inflation: float
) -> float:
    """Helper: Fast scalar loop to find final NOMINAL balance"""
    n_periods = years + 1
    raise_rate = annual_raise / 100.0
    return_rate = market_return / 100.0
    
    net_worth = current_savings
    current_monthly_contribution = monthly_contribution
    
    for i in range(1, n_periods):
        interest = net_worth * return_rate
        contribution = current_monthly_contribution * 12
        net_worth = net_worth + interest + contribution
        current_monthly_contribution *= (1 + raise_rate)
        
    return net_worth

def calculate_required_savings(
    current_savings: float,
    target_net_worth: float,
    years: int,
    annual_raise: float,
    market_return: float,
    inflation: float
) -> float:
    """
    Binary search to find required starting monthly contribution.
    """
    low = 0.0
    high = target_net_worth 
    epsilon = 1.0 
    iterations = 0
    max_iter = 100
    
    if _simulate_final_balance(0, current_savings, years, annual_raise, market_return, inflation) >= target_net_worth:
        return 0.0
        
    while high - low > epsilon and iterations < max_iter:
        mid = (low + high) / 2
        final_bal = _simulate_final_balance(mid, current_savings, years, annual_raise, market_return, inflation)
        
        if final_bal < target_net_worth:
            low = mid
        else:
            high = mid
        iterations += 1
        
    return round(high, 2)


def calculate_fire_numbers(request: FIRERequest) -> FIREResponse:
    swr = request.safe_withdrawal_rate / 100.0
    annual_spend = request.annual_spend
    
    # 1. Fire Number
    # annual_spend = NetWorth * SWR => NetWorth = annual_spend / SWR
    fire_number = annual_spend / swr if swr > 0 else 0
    
    # 2. Current SWR Status
    current_net_worth = request.current_net_worth
    current_swr = (annual_spend / current_net_worth * 100) if current_net_worth > 0 else 0
    
    # 3. Years to FIRE
    # Solving for n in FV formula is hard with growing contributions.
    # We will simulate loop until we hit fire_number.
    # Assumption: User saves everything above spend? 
    # Or do we strictly base it on current logic? 
    # The Request doesn't include income, so we can't know savings rate for this specific calc.
    # WE NEED SAVINGS RATE or CONTRIBUTION. 
    # If we don't have it, we return -1 or estimate based on investment growth only?
    # BUT, the FE usually has access to savings.
    # For this function, let's assume we can't calculate years perfectly without Income data.
    # OR, we might just project based on "Growth Only" if no contribution provided?
    # Actually, let's assume the user is saving *something*. 
    # Let's say we assume NO further contributions for a "Coast FIRE" check, OR we need more inputs.
    
    # For now, let's return 0 years if already there. 
    # If we lack inputs, we'll return a placeholder message or update schema.
    # Re-reading Plan: "Add FIRE Station... Inputs: SWR, Annual Spend. Display: Freedom Number, Time to Freedom"
    # To get "Time to Freedom", we NEED current savings rate. 
    # I'll update schema implicitly or just return "N/A" for years if not enough info, 
    # BUT I can pass 'current_savings_rate' or 'monthly_contribution' in FIRERequest to make it useful.
    # I'll stick to schema for now (no extra inputs there yet).
    # I'll return -1 or calculate based on Compounding only (Coast FIRE).
    
    years_to_fire = 0.0
    if current_net_worth >= fire_number:
        years_to_fire = 0
        msg = "You are Financially Independent!"
    else:
        # Calculate purely on investment growth (Coast FIRE scenario - no more savings)
        # Future = PV * (1+r)^n
        # fire_number = current * (1+r)^n
        # (1+r)^n = fire / current
        # n * ln(1+r) = ln(fire/current)
        # n = ln(fire/current) / ln(1+r)
        
        r = request.return_rate / 100.0
        # Inflation adjusted return usually used for FIRE.
        real_r = (1 + r) / (1 + (request.inflation / 100.0)) - 1
        
        if real_r <= 0:
             years_to_fire = 999
             msg = "With 0% or negative real return, you'll never coast there."
        else:
            if current_net_worth > 0:
                years_to_fire = math.log(fire_number / current_net_worth) / math.log(1 + real_r)
                msg = "Years to Coast FIRE (no further contributions)"
            else:
                 years_to_fire = 999
                 msg = "Start saving to see a date."

    return FIREResponse(
        fire_number=round(fire_number, 2),
        current_swr=round(current_swr, 2),
        years_to_fire=round(years_to_fire, 1),
        message=msg
    )


def calculate_history_forecast(request: ForecastRequest, history_points: List[Dict], account_types: Dict[int, str] = None) -> ForecastResponse:
    """
    history_points: List[ {'date': 'YYYY-MM-DD', 'amount': float} ]
    Must be sorted by date ideally, or we sort here.
    """
    if len(history_points) < 2:
        return ForecastResponse(
            monthly_growth=0,
            annual_growth_rate=0,
            r_squared=0,
            forecast_data=[],
            message="Not enough data history to forecast. Need at least 2 entries."
        )

    # 1. Prepare Data
    # Convert dates to ordinals (integers)
    # Group by date to get daily total net worth?
    # history_points is usually BalanceEntry which is per account. 
    # We need aggregated Net Worth per Date.
    
    # Sort and build DataFrame from sorted data for correct replay order
    sorted_points = sorted(history_points, key=lambda x: x['date'])
    df = pd.DataFrame(sorted_points)
    
    if account_types is None:
        account_types = {}
    
    # Replay Logic - track each account's latest balance
    all_account_ids = df['account_id'].unique()
    account_states = {aid: 0.0 for aid in all_account_ids}
    
    timeline = []
    grouped = df.groupby('date')
    
    for date_str, group in grouped:
        for _, row in group.iterrows():
            account_states[row['account_id']] = row['amount']
        
        # Calculate net worth: subtract liabilities
        total_nw = 0.0
        for aid, bal in account_states.items():
            if account_types.get(aid) == 'Liability':
                total_nw -= bal
            else:
                total_nw += bal
        timeline.append({'date': datetime.strptime(date_str, "%Y-%m-%d"), 'value': total_nw})
        
    if not timeline:
        return ForecastResponse(monthly_growth=0, annual_growth_rate=0, r_squared=0, forecast_data=[], message="No valid timeline.")
        
    # Regression
    # X = Days since start
    start_date = timeline[0]['date']
    
    X = np.array([(p['date'] - start_date).days for p in timeline])
    y = np.array([p['value'] for p in timeline])
    
    # Linear Fit
    if len(X) > 1:
        # A = np.vstack([X, np.ones(len(X))]).T
        # m, c = np.linalg.lstsq(A, y, rcond=None)[0]
        
        # Using simple polyfit
        slope, intercept = np.polyfit(X, y, 1) # slope = growth per day
        
        # Stats
        # Correlation coeff
        correlation_matrix = np.corrcoef(X, y)
        correlation_xy = correlation_matrix[0,1]
        r_squared = correlation_xy**2
        
    else:
        slope, intercept = 0, y[0]
        r_squared = 0

    # Project Future
    # Current Value (Last known)
    current_val = y[-1]
    
    # Growth Rates
    daily_growth = slope
    monthly_growth = daily_growth * 30.44
    annual_growth = monthly_growth * 12
    
    # Generate Forecast Data
    annual_growth_rate_percent = 0.0
    if current_val != 0:
        annual_growth_rate_percent = (annual_growth / current_val) * 100
        
    forecast_data = []
    current_age = request.current_age
    
    for i in range(request.years + 1):
        # Future Value = Current + (slope * days)
        # Days = i * 365.25
        future_days = i * 365.25
        # Note: We project from the END of the history line (intercept should be current_val effectively for visualization continuity, 
        # BUT mathematically we should project the trend line).
        # User wants "Reality Check". If trend line is lower than current actual, it shows they are over-performing trend recently. 
        # Let's project from the Last Actual Point, adding the 'slope' growth? 
        # Or project the pure regression line?
        # Usually "Forecasting" implies continuing the Trend.
        # Let's stick to: Future(t) = LastActual + (DailyGrowth * t)
        
        future_nw = current_val + (daily_growth * future_days)
        
        # Apply inflation adjustment for buying power
        inflation_rate = getattr(request, 'inflation', 2.5) / 100.0
        buying_power_val = future_nw / ((1 + inflation_rate) ** i) if i > 0 else future_nw
        
        forecast_data.append(YearProjection(
            year=i,
            age=current_age + i,
            net_worth=round(float(future_nw), 2),
            contribution=0,
            interest_earned=0,
            buying_power=round(float(buying_power_val), 2),
            events_value=0
        ))
        
    return ForecastResponse(
        monthly_growth=round(monthly_growth, 2),
        annual_growth_rate=round(annual_growth_rate_percent, 2),
        r_squared=round(r_squared, 4),
        forecast_data=forecast_data,
        message=f"Based on {len(timeline)} historical data points."
    )
