# trading-backend

Spring Boot 3 demo:
- WebSocket STOMP endpoint `/ws`
- Quotes broadcast on `/topic/quotes` every second
- REST:
  - `GET /api/symbols`
  - `GET /api/quotes/{ticker}`
  - `POST /api/orders` body: `{ "user":"alice", "ticker":"AAPL", "side":"BUY", "quantity":1, "limitPrice": 100 }`
  - `GET /api/orders`
- Orders are immediately FILLED and also broadcast to `/topic/orders`

## Run
```bash
mvn spring-boot:run
```
