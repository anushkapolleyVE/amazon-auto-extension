from backend.app.core.security import hash_password, verify_password

password = "Anushka123"

hashed = hash_password(password)

print("Password :", password)
print("Hash     :", hashed)

print(
    verify_password(
        password,
        hashed,
    )
)