import json
from urllib.parse import urlencode
from urllib.request import Request, urlopen


def obtener_direccion_legible(latitud: float, longitud: float) -> str:
    url = "https://nominatim.openstreetmap.org/reverse"
    parametros = {
        "lat": latitud,
        "lon": longitud,
        "format": "jsonv2",
        "addressdetails": 1,
    }
    consulta = urlencode(parametros)
    peticion = Request(
        f"{url}?{consulta}",
        headers={"User-Agent": "emergency-panel/1.0"},
    )

    with urlopen(peticion, timeout=10) as respuesta:
        datos = json.loads(respuesta.read().decode("utf-8"))

    return str(datos.get("display_name", "") or "")
