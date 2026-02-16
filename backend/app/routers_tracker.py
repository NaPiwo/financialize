
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas
from .database import get_db

router = APIRouter(
    prefix="/tracker",
    tags=["tracker"]
)

# --- Persons ---

@router.get("/persons", response_model=List[schemas.PersonResponse])
def get_persons(db: Session = Depends(get_db)):
    return db.query(models.Person).all()

@router.post("/persons", response_model=schemas.PersonResponse)
def create_person(person: schemas.PersonCreate, db: Session = Depends(get_db)):
    db_person = models.Person(name=person.name, age=person.age, color=person.color)
    db.add(db_person)
    db.commit()
    db.refresh(db_person)
    return db_person

@router.put("/persons/{person_id}", response_model=schemas.PersonResponse)
def update_person(person_id: int, update: schemas.PersonCreate, db: Session = Depends(get_db)):
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    person.name = update.name
    person.age = update.age
    person.color = update.color
    db.commit()
    db.refresh(person)
    return person

@router.delete("/persons/{person_id}")
def delete_person(person_id: int, db: Session = Depends(get_db)):
    person = db.query(models.Person).filter(models.Person.id == person_id).first()
    if not person:
        raise HTTPException(status_code=404, detail="Person not found")
    # Unlink accounts before deleting
    db.query(models.Account).filter(models.Account.person_id == person_id).update({"person_id": None})
    db.delete(person)
    db.commit()
    return {"ok": True}

# --- Accounts ---

@router.get("/accounts", response_model=List[schemas.AccountResponse])
def get_accounts(db: Session = Depends(get_db)):
    accounts = db.query(models.Account).all()
    result = []
    for acc in accounts:
        latest_entry = db.query(models.BalanceEntry).filter(models.BalanceEntry.account_id == acc.id).order_by(models.BalanceEntry.date.desc()).first()
        acc_data = schemas.AccountResponse.from_orm(acc)
        acc_data.current_balance = latest_entry.amount if latest_entry else 0.0
        if acc.person:
            acc_data.person_name = acc.person.name
        result.append(acc_data)
    return result

@router.post("/accounts", response_model=schemas.AccountResponse)
def create_account(account: schemas.AccountCreate, db: Session = Depends(get_db)):
    db_account = models.Account(
        name=account.name, type=account.type,
        subtype=account.subtype, description=account.description,
        target_balance=account.target_balance, currency=account.currency,
        person_id=account.person_id
    )
    db.add(db_account)
    db.commit()
    db.refresh(db_account)
    resp = schemas.AccountResponse.from_orm(db_account)
    if db_account.person:
        resp.person_name = db_account.person.name
    return resp

@router.put("/accounts/{account_id}", response_model=schemas.AccountResponse)
def update_account(account_id: int, update: schemas.AccountCreate, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    account.name = update.name
    account.type = update.type
    account.subtype = update.subtype
    account.description = update.description
    account.target_balance = update.target_balance
    account.currency = update.currency
    account.person_id = update.person_id
    db.commit()
    db.refresh(account)
    resp = schemas.AccountResponse.from_orm(account)
    if account.person:
        resp.person_name = account.person.name
    return resp

@router.delete("/accounts/{account_id}")
def delete_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(models.Account).filter(models.Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    db.delete(account)
    db.commit()
    return {"ok": True}

# --- Balance Entries ---

@router.post("/entries", response_model=schemas.BalanceEntryResponse)
def add_entry(entry: schemas.BalanceEntryCreate, db: Session = Depends(get_db)):
    db_entry = models.BalanceEntry(
        account_id=entry.account_id,
        date=entry.date,
        amount=entry.amount,
        note=entry.note
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@router.get("/history", response_model=List[schemas.BalanceEntryResponse])
def get_history(account_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.BalanceEntry)
    if account_id:
        query = query.filter(models.BalanceEntry.account_id == account_id)
    return query.order_by(models.BalanceEntry.date.desc()).all()

@router.put("/entries/{entry_id}", response_model=schemas.BalanceEntryResponse)
def update_entry(entry_id: int, update: schemas.BalanceEntryCreate, db: Session = Depends(get_db)):
    entry = db.query(models.BalanceEntry).filter(models.BalanceEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.date = update.date
    entry.amount = update.amount
    entry.note = update.note
    db.commit()
    db.refresh(entry)
    return entry

@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = db.query(models.BalanceEntry).filter(models.BalanceEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    db.delete(entry)
    db.commit()
    return {"ok": True}
