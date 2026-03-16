from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.gis.geos import Point
import random
import logging

from emergency.apps.core.models import LightningStrike

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate fake lightning strikes for testing purposes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of fake lightning strikes to generate'
        )
        parser.add_argument(
            '--lat-range',
            type=str,
            default='-90,90',
            help='Latitude range as min,max'
        )
        parser.add_argument(
            '--lon-range',
            type=str,
            default='-180,180',
            help='Longitude range as min,max'
        )

    def handle(self, *args, **options):
        count = options['count']
        lat_min, lat_max = map(float, options['lat_range'].split(','))
        lon_min, lon_max = map(float, options['lon_range'].split(','))

        self.stdout.write(f'Generating {count} fake lightning strikes...')

        strikes_created = 0
        for i in range(count):
            # Generate random location within Spain/Europe bounds for realism
            lat = random.uniform(35, 45)  # Spain latitude range
            lon = random.uniform(-10, 5)  # Spain longitude range

            # Random timestamp in the last 24 hours
            hours_ago = random.uniform(0, 24)
            timestamp = timezone.now() - timezone.timedelta(hours=hours_ago)

            # Random intensity between 5-50 kA
            intensity = random.uniform(5, 50)

            location = Point(lon, lat, srid=4326)

            # Check if already exists (unlikely for fake data)
            LightningStrike.objects.create(
                location=location,
                timestamp=timestamp,
                intensity=intensity
            )
            strikes_created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {strikes_created} fake lightning strikes'
            )
        )