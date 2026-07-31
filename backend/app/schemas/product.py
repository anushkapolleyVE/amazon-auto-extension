from typing import Optional
from uuid import UUID
from pydantic import BaseModel, HttpUrl


class ProductCreate(BaseModel):
    product_url: HttpUrl
    product_title: str
    last_price: str
    availability: str
    target_price: Optional[str] = None


class ProductUpdate(BaseModel):
    product_title: Optional[str] = None
    last_price: Optional[str] = None
    availability: Optional[str] = None
    target_price: Optional[str] = None


class ProductResponse(BaseModel):
    id: UUID
    product_url: HttpUrl
    product_title: str
    last_price: str
    availability: str
    target_price: Optional[str] = None

    class Config:
        from_attributes = True