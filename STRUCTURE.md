# Estlem — Project Structure

```
estlem/
├── package.json                    # pnpm workspace root
├── pnpm-workspace.yaml
├── docker-compose.yml              # Full stack: postgres, redis, api, web, dashboard
├── .env.example                    # All env vars documented
│
├── packages/
│   └── shared/                     # @estlem/shared
│       └── src/
│           ├── enums.ts            # OrderStatus, PaymentMethod, StaffRole...
│           └── types/              # Order, Product, Customer, Tenant...
│
└── apps/
    ├── api/                        # @estlem/api — NestJS
    │   └── src/
    │       ├── main.ts             # Bootstrap: helmet, validation, versioning
    │       ├── app.module.ts       # Root module wiring
    │       ├── database/
    │       │   ├── database.config.ts
    │       │   └── entities/       # TypeORM entities (13 tables)
    │       │       ├── tenant.entity.ts
    │       │       ├── store.entity.ts
    │       │       ├── parking-spot.entity.ts
    │       │       ├── customer.entity.ts
    │       │       ├── customer-vehicle.entity.ts
    │       │       ├── product-category.entity.ts
    │       │       ├── product.entity.ts
    │       │       ├── order.entity.ts
    │       │       ├── order-item.entity.ts
    │       │       ├── payment.entity.ts
    │       │       ├── staff.entity.ts
    │       │       └── pos-integration.entity.ts
    │       └── modules/
    │           ├── auth/           # OTP login (customer) + PIN login (staff)
    │           ├── tenants/        # SaaS tenant registration & settings
    │           ├── stores/         # Store CRUD + QR spot management
    │           ├── products/       # Catalog + search + bulk upsert
    │           ├── orders/         # Create, status machine, AI cart parse
    │           ├── payments/       # Checkout.com, webhook, refund
    │           ├── notifications/  # SMS (Twilio) + WhatsApp + Push
    │           ├── staff/          # Staff CRUD + PIN management
    │           ├── analytics/      # Dashboard KPIs + daily sales
    │           ├── pos/            # Adapter pattern: Foodics, CSV, REST
    │           └── realtime/       # Socket.io gateway (store + customer rooms)
    │
    ├── web/                        # @estlem/web — Customer PWA
    │   └── src/
    │       ├── app/
    │       │   ├── scan/[qr]/      # QR scan → resolve → redirect to store
    │       │   ├── store/[id]/     # Store page: catalog + search + cart
    │       │   └── order/[id]/     # Order tracker with live WebSocket
    │       ├── components/
    │       │   ├── ProductCard     # Product tile with Add button
    │       │   ├── CategoryTabs    # Horizontal category filter
    │       │   ├── CartDrawer      # Slide-up cart + checkout form
    │       │   └── FreeTextModal   # AI shopping list input + confirmation
    │       ├── hooks/
    │       │   └── useCart         # Zustand cart state (persisted)
    │       └── lib/
    │           ├── api.ts          # Axios + JWT interceptor
    │           ├── socket.ts       # Socket.io client helpers
    │           └── utils.ts        # cn(), formatPrice(), formatDate()
    │
    └── dashboard/                  # @estlem/dashboard — Staff + Owner
        └── src/
            ├── app/
            │   ├── login/          # Staff PIN login
            │   ├── orders/         # Live order queue (kanban-style cards)
            │   ├── products/       # Product management table + CRUD modal
            │   └── analytics/      # Revenue charts + top products
            ├── components/
            │   ├── OrderCard       # Order card with status action buttons
            │   └── Sidebar         # Navigation sidebar
            ├── hooks/
            │   └── useAuth         # Zustand auth state (persisted)
            └── lib/
                ├── api.ts
                ├── socket.ts
                └── utils.ts
```

## Quick Start

```bash
# 1. Install
pnpm install

# 2. Environment
cp .env.example .env
# Edit .env with your values

# 3. Start infrastructure
docker-compose up postgres redis -d

# 4. Run all apps
pnpm dev

# Or individually:
pnpm dev:api        # http://localhost:3001
pnpm dev:web        # http://localhost:3000
pnpm dev:dashboard  # http://localhost:3002
```

## API Routes Summary

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | /api/v1/auth/otp/send | — | Send OTP |
| POST | /api/v1/auth/otp/verify | — | Verify OTP → JWT |
| POST | /api/v1/auth/staff/login | — | Staff PIN login |
| GET | /api/v1/stores/qr/:code | — | Resolve QR code |
| GET | /api/v1/stores/:id | — | Store profile |
| GET | /api/v1/products/store/:id | — | Product catalog |
| POST | /api/v1/orders | — | Create order |
| POST | /api/v1/orders/ai-parse | — | AI shopping list parse |
| GET | /api/v1/orders/:id | — | Track order |
| PATCH | /api/v1/orders/:id/status | JWT | Update status |
| GET | /api/v1/orders/store/:id | JWT | Staff order list |
| POST | /api/v1/payments/initiate | — | Start payment |
| POST | /api/v1/payments/webhook | — | Payment webhook |
| GET | /api/v1/analytics/store/:id/dashboard | JWT | KPI dashboard |
| POST | /api/v1/pos/:id/sync | JWT | Trigger POS sync |

## WebSocket Events (namespace: /ws)

| Event | Direction | Purpose |
|-------|-----------|---------|
| join:store | Client→Server | Staff joins store room |
| join:customer | Client→Server | Customer joins tracking room |
| order:created | Server→Staff | New order alert |
| order:status_updated | Server→All | Status change broadcast |
