from pydantic import BaseModel
from uuid import UUID


class HistoryCreate(BaseModel):
    product_id: UUID
    status: str
    message: str


class HistoryResponse(BaseModel):
    id: UUID
    product_id: UUID
    status: str
    message: str

    class Config:
        from_attributes = True