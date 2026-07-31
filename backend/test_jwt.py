from app.core.security import create_access_token, decode_access_token

token = create_access_token(
    {"sub": "anushka@example.com"}
)

print(token)

print()

payload = decode_access_token(token)

print(payload)