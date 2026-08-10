class AppError(Exception):
    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code


class NotFoundError(AppError):
    def __init__(self, entity: str, entity_id: str):
        super().__init__(
            code=f'{entity.upper()}_NOT_FOUND',
            message=f'{entity} not found with id: {entity_id}',
            status_code=404,
        )


class ValidationError(AppError):
    def __init__(self, message: str, details: list | None = None):
        super().__init__(
            code='VALIDATION_ERROR',
            message=message,
            status_code=422,
        )
        self.details = details or []


class RateLimitError(AppError):
    def __init__(self):
        super().__init__(
            code='RATE_LIMIT_EXCEEDED',
            message='Too many requests. Please try again later.',
            status_code=429,
        )
