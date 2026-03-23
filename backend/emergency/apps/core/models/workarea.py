from django.contrib.gis.db import models as gis_models
from django.db import models
from .incident import Incidente as Incident

class AreaTrabajo(models.Model):

    """
    Modelo de área de trabajo dentro de un incidente.

    Representa una zona geográfica delimitada en la que los operativos realizan
    sus tareas durante un incidente. Esta área puede definirse como un círculo
    o como un polígono, permitiendo establecer límites espaciales para el
    seguimiento de personal, análisis de cobertura y generación de alertas
    automáticas (por ejemplo, salida del perímetro).

    Attributes:
    id: Identificador único del área de trabajo.
    
    incident: Relación con el incidente al que pertenece el área.
        Permite asociar múltiples áreas de trabajo a un mismo incidente.

    name: Nombre descriptivo del área de trabajo.
        Se utiliza para identificar visualmente la zona en el sistema.

    area_type: Tipo de geometría que define el área.
        Puede ser:
        - CIRCLE: área definida por un punto central y un radio.
        - POLYGON: área definida por un polígono geoespacial.

    center: Punto geográfico central del área (solo para áreas tipo CIRCLE).
        Se almacena como coordenadas geoespaciales.

    radius_m: Radio del área en metros (solo para áreas tipo CIRCLE).
        Define el alcance del perímetro circular.

    polygon: Geometría poligonal que define el área (solo para áreas tipo POLYGON).
        Permite delimitar zonas complejas mediante coordenadas geoespaciales.

    active: Indica si el área de trabajo está activa.
        Permite habilitar o deshabilitar la zona sin eliminarla del sistema.

    created_at: Fecha y hora de creación del área de trabajo.
        Se establece automáticamente al crear el registro.
    """
    AREA_TYPE = [
        ('CIRCLE', 'Circle'),
        ('POLYGON', 'Polygon'),
    ]

    incident = models.ForeignKey(
        Incident,
        on_delete=models.CASCADE,
        related_name="work_areas"
    )

    name = models.CharField(max_length=100)

    area_type = models.CharField(
        max_length=10,
        choices=AREA_TYPE
    )

    # Para círculos
    center = gis_models.PointField(null=True, blank=True)
    radius_m = models.FloatField(null=True, blank=True)

    # Para polígonos
    polygon = gis_models.PolygonField(null=True, blank=True)

    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        db_table = "core_workarea"

    def __str__(self):
        return f"{self.name} - {self.incident}"