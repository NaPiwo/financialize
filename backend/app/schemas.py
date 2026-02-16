
from pydantic import BaseModel
from typing import List, Optional

# --- Shared Base Models ---
class IncomeBase(BaseModel):
    name: str
    amount: float

class ExpenseBase(BaseModel):
    name: str
    percentage: float
    is_fixed: bool = False

class LifeEvent(BaseModel):
    name: str
    year: int
    amount: float # Positive = Income/Windfall, Negative = Expense/Cost
    is_recurring: bool = False
    duration: int = 1 # If recurring, for how many years?

# --- API Request Models ---

class ProjectionRequest(BaseModel):
    """Payload sent by Frontend to calculate future"""
    current_savings: float
    incomes: List[IncomeBase]
    expenses: List[ExpenseBase]
    events: List[LifeEvent] = []
    years: int = 30
    annual_raise: float = 2.0 # Percent
    market_return: float = 7.0 # Percent
    inflation: float = 2.5 # Percent
    current_age: int = 30
    currency: str = "$"

class ReversePlanRequest(BaseModel):
    """Payload to calculate required monthly savings to hit a target"""
    current_savings: float
    target_net_worth: float
    years: int
    annual_raise: float = 2.0
    market_return: float = 7.0
    inflation: float = 2.5

class ReversePlanResponse(BaseModel):
    required_monthly_contribution: float
    is_possible: bool
    message: str

class FIRERequest(BaseModel):
    current_net_worth: float
    annual_spend: float
    safe_withdrawal_rate: float = 4.0 # Percent
    return_rate: float = 7.0
    inflation: float = 2.5

class FIREResponse(BaseModel):
    fire_number: float
    current_swr: float # Current Safe Withdrawal Rate based on Net Worth
    years_to_fire: float # Estimate
    message: str

# --- API Response Models ---
class YearProjection(BaseModel):
    year: int
    age: int
    net_worth: float
    contribution: float
    interest_earned: float
    buying_power: float # Real value adjusted for inflation
    events_value: float = 0.0


class Milestone(BaseModel):
    name: str # "Debt Free", "$100k", etc.
    year: int
    net_worth: float
    message: str

class ProjectionResponse(BaseModel):
    data: List[YearProjection]
    final_net_worth: float
    final_buying_power: float
    milestones: List[Milestone] = []

# --- Person Models ---

class PersonBase(BaseModel):
    name: str
    age: Optional[int] = None
    color: str = "#818cf8"

class PersonCreate(PersonBase):
    pass

class PersonResponse(PersonBase):
    id: int

    class Config:
        from_attributes = True

# --- Tracker Models ---

class AccountBase(BaseModel):
    name: str
    type: str = "General"
    subtype: Optional[str] = None
    description: Optional[str] = None
    target_balance: Optional[float] = None
    currency: Optional[str] = None
    person_id: Optional[int] = None

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    current_balance: Optional[float] = 0.0
    person_name: Optional[str] = None

    class Config:
        from_attributes = True

class BalanceEntryBase(BaseModel):
    account_id: int
    date: str
    amount: float
    note: Optional[str] = None

class BalanceEntryCreate(BalanceEntryBase):
    pass

class BalanceEntryResponse(BalanceEntryBase):
    id: int

    class Config:
        from_attributes = True

# --- Scenarios ---

class ScenarioCreate(BaseModel):
    name: str
    data: str  # JSON string of full client state snapshot

class ScenarioResponse(BaseModel):
    id: int
    name: str
    data: Optional[str] = None

    class Config:
        from_attributes = True

# --- Forecast ---
class ForecastRequest(BaseModel):
    years: int = 30
    current_age: int = 30
    inflation: float = 2.5
    currency: str = "$"
    
class ForecastResponse(BaseModel):
    monthly_growth: float
    annual_growth_rate: float
    r_squared: float # Confidence
    forecast_data: List[YearProjection]
    message: str
