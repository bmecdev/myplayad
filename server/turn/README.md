**Servidor TURN rápido (coturn) — instrucciones rápidas**

- Copiar el ejemplo y editar credenciales/public IP:

  cp config/.env.example config/.env
  # editar config/.env, cambiar TURN_PASS y EXTERNAL_IP

- Abrir puertos en el firewall/NAT: `3478` (UDP/TCP) y `5349` (TCP TLS).

- Levantar con Docker Compose (desde `server/turn/`):

```
docker compose up -d
```

- Uso en WebRTC (ejemplo):

iceServers: [
  { urls: ["turn:YOUR_PUBLIC_IP:3478?transport=udp", "turn:YOUR_PUBLIC_IP:3478?transport=tcp"], username: "game", credential: "<TURN_PASS>" }
]

- Notas:
  - Reemplace `YOUR_PUBLIC_IP` por la IP pública del servidor (o el DNS).
  - Si su servidor está detrás de NAT, ponga la IP pública en `EXTERNAL_IP`.
  - Asegúrese de que el proveedor permita conexiones UDP en 3478; si no, use TCP/5349.
