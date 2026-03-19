from pydantic import BaseModel


class VencimientoCheckResult(BaseModel):
    fecha: str
    vencidos: int
    proximos_a_vencer: int
