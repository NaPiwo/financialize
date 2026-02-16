
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from . import models, schemas
from .database import get_db

router = APIRouter(
    prefix="/scenarios",
    tags=["scenarios"]
)

@router.get("/saved", response_model=List[schemas.ScenarioResponse])
def list_scenarios(db: Session = Depends(get_db)):
    return db.query(models.UserScenario).all()

@router.get("/saved/{scenario_id}", response_model=schemas.ScenarioResponse)
def get_scenario(scenario_id: int, db: Session = Depends(get_db)):
    scenario = db.query(models.UserScenario).filter(models.UserScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    return scenario

@router.post("/saved", response_model=schemas.ScenarioResponse)
def create_scenario(payload: schemas.ScenarioCreate, db: Session = Depends(get_db)):
    scenario = models.UserScenario(name=payload.name, data=payload.data)
    db.add(scenario)
    db.commit()
    db.refresh(scenario)
    return scenario

@router.put("/saved/{scenario_id}", response_model=schemas.ScenarioResponse)
def update_scenario(scenario_id: int, payload: schemas.ScenarioCreate, db: Session = Depends(get_db)):
    scenario = db.query(models.UserScenario).filter(models.UserScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    scenario.name = payload.name
    scenario.data = payload.data
    db.commit()
    db.refresh(scenario)
    return scenario

@router.delete("/saved/{scenario_id}")
def delete_scenario(scenario_id: int, db: Session = Depends(get_db)):
    scenario = db.query(models.UserScenario).filter(models.UserScenario.id == scenario_id).first()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    db.delete(scenario)
    db.commit()
    return {"ok": True}
