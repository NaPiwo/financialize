
from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from .database import Base

class Person(Base):
    __tablename__ = "persons"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer, nullable=True)
    color = Column(String, default="#818cf8")  # avatar/accent color

    accounts = relationship("Account", back_populates="person")

class UserScenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="Default Plan")
    current_savings = Column(Float, default=0.0)
    data = Column(Text, nullable=True)  # JSON snapshot of full client state
    
    # Relationships (legacy — kept for backward compat)
    incomes = relationship("IncomeItem", back_populates="scenario", cascade="all, delete-orphan")
    expenses = relationship("ExpenseItem", back_populates="scenario", cascade="all, delete-orphan")

class IncomeItem(Base):
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    name = Column(String)
    amount = Column(Float)
    
    scenario = relationship("UserScenario", back_populates="incomes")

class ExpenseItem(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    scenario_id = Column(Integer, ForeignKey("scenarios.id"))
    name = Column(String)
    percentage = Column(Float) # Allocation percentage (0-100)
    is_fixed = Column(Boolean, default=False)
    
    scenario = relationship("UserScenario", back_populates="expenses")

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    type = Column(String, default="General") # General, Cash, Investment, Liability
    subtype = Column(String, nullable=True)  # Checking, Savings, Brokerage, 401k, Crypto, Mortgage, etc.
    description = Column(String, nullable=True)
    target_balance = Column(Float, nullable=True)  # Optional goal for this account
    currency = Column(String, nullable=True)  # e.g. 'USD', 'EUR' — null means main currency
    person_id = Column(Integer, ForeignKey("persons.id"), nullable=True)
    
    entries = relationship("BalanceEntry", back_populates="account", cascade="all, delete-orphan")
    person = relationship("Person", back_populates="accounts")

class BalanceEntry(Base):
    __tablename__ = "balance_entries"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"))
    date = Column(String) # ISO Date YYYY-MM-DD
    amount = Column(Float)
    note = Column(String, nullable=True)

    account = relationship("Account", back_populates="entries")
