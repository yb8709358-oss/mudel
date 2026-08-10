from pydantic import BaseModel, Field, model_validator

ALLOWED_SETTINGS_KEYS = {
    'site_name',
    'site_tagline',
    'contact_email',
    'contact_phone',
    'support_phone',
    'address',
    'whatsapp_number',
    'facebook_url',
    'instagram_url',
    'working_hours',
}


class SettingsMapOut(BaseModel):
    success: bool = True
    data: dict[str, str]


class SettingsUpdate(BaseModel):
    data: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode='after')
    def _validate_keys(self) -> 'SettingsUpdate':
        unknown = set(self.data.keys()) - ALLOWED_SETTINGS_KEYS
        if unknown:
            raise ValueError(f'Unknown settings keys: {", ".join(sorted(unknown))}')
        return self
