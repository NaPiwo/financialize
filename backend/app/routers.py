
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .database import get_db
from .models import BalanceEntry
from .schemas import ProjectionRequest, ProjectionResponse, ReversePlanRequest, ReversePlanResponse, FIRERequest, FIREResponse, ForecastRequest, ForecastResponse
from .logic import calculate_projections, calculate_required_savings, calculate_fire_numbers, calculate_history_forecast

router = APIRouter()

@router.post("/scenarios/reverse", response_model=ReversePlanResponse)
def compute_reverse_plan(request: ReversePlanRequest):
    required = calculate_required_savings(
        current_savings=request.current_savings,
        target_net_worth=request.target_net_worth,
        years=request.years,
        annual_raise=request.annual_raise,
        market_return=request.market_return,
        inflation=request.inflation
    )
    
    return ReversePlanResponse(
        required_monthly_contribution=required,
        is_possible=True,
        message="Optimization successful"
    )

@router.post("/scenarios/calculate", response_model=ProjectionResponse)
def compute_scenario(request: ProjectionRequest):
    projections, milestones = calculate_projections(request)
    
    # Get final values using -1 index check saftey
    final_net_worth = 0.0
    final_buying_power = 0.0
    
    if projections:
        final_net_worth = projections[-1].net_worth
        final_buying_power = projections[-1].buying_power
        
    return ProjectionResponse(
        data=projections,
        final_net_worth=final_net_worth,
        final_buying_power=final_buying_power,
        milestones=milestones
    )

@router.post("/scenarios/fire", response_model=FIREResponse)
def compute_fire(request: FIRERequest):
    return calculate_fire_numbers(request)

@router.post("/scenarios/forecast", response_model=ForecastResponse)
def compute_forecast(request: ForecastRequest, db: Session = Depends(get_db)):
    from .models import Account
    entries = db.query(BalanceEntry).all()
    
    history_points = [
        {"date": e.date, "amount": e.amount, "account_id": e.account_id}
        for e in entries
    ]
    
    # Build account type lookup for liability-aware net worth
    accounts = db.query(Account).all()
    account_types = {a.id: a.type for a in accounts}
    
    return calculate_history_forecast(request, history_points, account_types)

@router.post("/coach/analyze")
def coach_analyze(request: ProjectionRequest):
    """
    Generate smart nudges based on the user's situation.
    """
    nudges = []
    
    # Logic 1: The "Power of $50"
    # Calculate current baseline
    current_proj, _ = calculate_projections(request)
    final_nw_current = current_proj[-1].net_worth if current_proj else 0
    
    # Calculate with +50 monthly contribution
    # We need to hack the request logic or just add a 'Savings' item?
    # Actually, calculate_projections derives savings from Income - Expenses.
    # To simulate +50 savings, we can DECREASE expenses or INCREASE income.
    # Let's pretend we decrease 'Living' expense by equivalent percentage? 
    # Hard to map $50 to %. 
    # Alternative: Logic.py helper that accepts raw 'monthly_contribution_override'.
    # For now, let's just do a rough approximation using scalar formula for speed.
    
    # Current Monthly Savings
    total_income = sum(i.amount for i in request.incomes)
    if total_income <= 0:
        return nudges
    expense_rate = sum(e.percentage for e in request.expenses) / 100.0
    current_savings = total_income * (1 - expense_rate)
    
    # Scenario A: Current
    # Scenario B: Current + 50
    
    # We use a simplified Future Value calc for just the "delta" to see the impact?
    # Impact = FutureValue($50/mo) at r% for N years.
    # FV = P * (((1+r)^n - 1) / r)
    
    r = request.market_return / 100.0
    n_months = request.years * 12
    monthly_r = r / 12
    
    extra_50_val = 50 * (((1 + monthly_r)**n_months - 1) / monthly_r)
    
    nudges.append({
        "title": "The Power of $50",
        "message": f"If you save just $50 more per month, you could have an extra ${round(extra_50_val):,} in {request.years} years.",
        "icon": "🚀"
    })
    
    # Logic 2: Savings Rate Check
    savings_rate = (current_savings / total_income * 100) if total_income > 0 else 0
    if savings_rate < 20:
        nudges.append({
            "title": "Savings Boost",
            "message": f"Your savings rate is {round(savings_rate)}%. Experts recommend aiming for 20%.",
            "icon": "⚠️"
        })
    elif savings_rate > 50:
         nudges.append({
            "title": "Super Saver",
            "message": "You are saving over 50% of your income! You are on the fast track to FIRE.",
            "icon": "🔥"
        })
        
    return nudges
