from django import forms
from django.contrib.auth import get_user_model
from emergency.apps.core.models import Profile

class SupervisorLoginForm(forms.Form):
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)

    def clean(self):
        cleaned = super().clean()
        email = cleaned.get("email")
        password = cleaned.get("password")

        if not email or not password:
            raise forms.ValidationError("Credenciales incorrectas.")

        User = get_user_model()
        normalized_email = email.strip().lower()
        user = User.objects.filter(email__iexact=normalized_email).first()

        if not user:
            raise forms.ValidationError("Credenciales incorrectas.")

        if not user.check_password(password):
            raise forms.ValidationError("Credenciales incorrectas.")

        if not user.is_active:
            raise forms.ValidationError("Usuario no activo.")

        # Django superusers siempre pueden acceder al panel web.
        if not user.is_superuser:
            profile = Profile.objects.filter(user_id=user.id).first()

            if not profile:
                raise forms.ValidationError("Credenciales incorrectas.")

            if (profile.role or "").strip().upper() != "SUPERVISOR":
                raise forms.ValidationError("Credenciales incorrectas.")

        self.user = user
        return cleaned
