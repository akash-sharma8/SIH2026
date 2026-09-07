from pydantic import BaseModel, Field


class TrainSearchResult(BaseModel):
    train_number: str
    train_name: str

    source_code: str | None = None
    source_name: str | None = None

    destination_code: str | None = None
    destination_name: str | None = None

    train_type: str | None = None
    popularity: int | None = None


class TrainSearchResponse(BaseModel):
    success: bool = True

    results: list[
        TrainSearchResult
    ] = Field(
        default_factory=list
    )