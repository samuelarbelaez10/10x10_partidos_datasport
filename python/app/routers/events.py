from fastapi import APIRouter, HTTPException
from app.database import supabase
from app.models import EventCreate

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("/", response_model=list[dict])
def get_events(match_id: str = None):
    query = supabase.table("match_events").select("*")
    if match_id:
        query = query.eq("match_id", match_id)
    res = query.execute()
    return res.data or []


@router.get("/{event_id}")
def get_event(event_id: str):
    res = supabase.table("match_events").select("*").eq("id", event_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return res.data


@router.post("/", status_code=201)
def create_event(event: EventCreate):
    data = event.model_dump(exclude_none=True)
    try:
        res = supabase.table("match_events").insert(data).execute()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al crear evento: {str(e)}")
    if not res.data:
        raise HTTPException(status_code=400, detail="Error al crear evento")
    return res.data[0]


@router.delete("/{event_id}", status_code=204)
def delete_event(event_id: str):
    supabase.table("match_events").delete().eq("id", event_id).execute()
