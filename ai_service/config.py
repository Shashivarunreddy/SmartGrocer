from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SERVICE_NAME: str = "SmartGrocer AI Service"
    SERVICE_VERSION: str = "1.0.0"
    HOST: str = "[IP_ADDRESS]"
    PORT: int = 8000
    DEBUG: bool = False
    ENVIRONMENT: str = "development"
    API_V1_STR: str = "/api/v1"
    GEMINI_API_KEY: str = ""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
