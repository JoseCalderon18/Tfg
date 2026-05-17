import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import UntypedToken
import jwt
from typing import Optional

from .models import UltimaPosicion

User = get_user_model()


class LocationConsumer(AsyncJsonWebsocketConsumer):
    """Consumer WS para enviar/recibir posiciones por incidente.

    Protocolo sencillo:
    - Cliente conecta y envía mensaje { action: 'auth', token: '...' }
    - Cliente puede enviar { action: 'subscribe', incident_id: 'ID' }
    - Cliente puede enviar { action: 'position.publish', payload: { ... } }
    - Servidor emite mensajes tipo 'position.update' a todos los suscriptores del incidente
    """

    async def connect(self):
        await self.accept()
        self.user = None
        self.subscribed_incident = None

    async def receive_json(self, content, **kwargs):
        action = content.get('action')

        if action == 'auth':
            token = content.get('token')
            user = await self._authenticate_token(token)
            if user:
                self.user = user
                await self.send_json({'type': 'auth.ok', 'user_id': str(user.id)})
            else:
                await self.send_json({'type': 'auth.error', 'message': 'Invalid token'})
                await self.close()
            return

        if action == 'subscribe':
            incident_id = content.get('incident_id')
            if not self.user:
                await self.send_json({'type': 'error', 'message': 'Not authenticated'})
                return
            if not incident_id:
                await self.send_json({'type': 'error', 'message': 'incident_id required'})
                return

            # Unsubscribe previous
            if self.subscribed_incident:
                await self.channel_layer.group_discard(self._group_name(self.subscribed_incident), self.channel_name)

            self.subscribed_incident = incident_id
            await self.channel_layer.group_add(self._group_name(incident_id), self.channel_name)
            await self.send_json({'type': 'subscribe.ok', 'incident_id': incident_id})
            return

        if action == 'position.publish':
            payload = content.get('payload') or {}
            if not self.user:
                await self.send_json({'type': 'error', 'message': 'Not authenticated'})
                return
            # Validate minimal payload
            lat = payload.get('latitude')
            lng = payload.get('longitude')
            incident_id = payload.get('incident_id') or self.subscribed_incident
            if lat is None or lng is None or not incident_id:
                await self.send_json({'type': 'error', 'message': 'latitude, longitude and incident_id required'})
                return

            # Persist last position
            await self._update_last_position(self.user.id, incident_id, lat, lng, payload)

            # Broadcast to group
            message = {
                'type': 'position.update',
                'payload': {
                    'user_id': str(self.user.id),
                    'display_name': getattr(self.user, 'username', '') or '',
                    'incident_id': incident_id,
                    'latitude': lat,
                    'longitude': lng,
                    'accuracy': payload.get('accuracy'),
                    'speed': payload.get('speed'),
                    'heading': payload.get('heading'),
                    'timestamp': payload.get('timestamp'),
                }
            }
            await self.channel_layer.group_send(self._group_name(incident_id), message)
            return

        await self.send_json({'type': 'error', 'message': 'Unknown action'})

    async def disconnect(self, code):
        if self.subscribed_incident:
            await self.channel_layer.group_discard(self._group_name(self.subscribed_incident), self.channel_name)

    # Handler for group messages: channels will call position_update for type 'position.update'
    async def position_update(self, event):
        payload = event.get('payload')
        await self.send_json({'type': 'position.update', 'payload': payload})

    @staticmethod
    def _group_name(incident_id: str) -> str:
        return f'incident:{incident_id}:locations'

    @database_sync_to_async
    def _authenticate_token(self, token: Optional[str]):
        if not token:
            return None
        try:
            # Valida token (firma/exp)
            UntypedToken(token)
            # Decodifica para extraer user id
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.SIMPLE_JWT.get('ALGORITHM', 'HS256')])
            user_id_claim = settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id')
            user_id = payload.get(user_id_claim)
            if not user_id:
                return None
            try:
                return User.objects.get(id=user_id)
            except User.DoesNotExist:
                return None
        except Exception:
            return None

    @database_sync_to_async
    def _update_last_position(self, user_id, incident_id, lat, lng, payload):
        # Actualiza o crea la entrada UltimaPosicion
        point = None
        try:
            from django.contrib.gis.geos import Point
            point = Point(lng, lat, srid=4326)
        except Exception:
            point = None

        obj, _ = UltimaPosicion.objects.update_or_create(
            user_id=user_id,
            defaults={
                'incident_id': incident_id,
                'location': point,
                'accuracy_m': payload.get('accuracy'),
                'altitude': payload.get('altitude'),
                'speed': payload.get('speed'),
                'heading': payload.get('heading'),
            }
        )
        return obj
