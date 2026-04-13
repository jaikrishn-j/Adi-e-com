# GreenNest E-Commerce Platform

A modern e-commerce platform built with Next.js 16, Prisma, and Clerk authentication.

## Features

- 🛍️ Product catalog with variations (sizes)
- 🛒 Shopping cart functionality
- 🔐 Admin dashboard for product and order management
- 📸 Image upload with local file storage
- 🔒 Secure authentication with Clerk
- 📦 Order management with shipment tracking
- 📱 Responsive design

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Clerk account (for authentication)

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
# Database
DATABASE_URL="postgresql://leafcart:leafcart@localhost:5432/leafcart"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_publishable_key
CLERK_SECRET_KEY=sk_test_your_secret_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Set Up Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## Project Structure

```
├── app/
│   ├── (auth)/          # Authentication pages
│   ├── admin/           # Admin dashboard
│   ├── api/             # API routes
│   ├── cart/            # Shopping cart
│   ├── checkout/        # Checkout flow
│   ├── components/      # React components
│   ├── orders/          # Order history
│   └── shop/            # Product catalog
├── lib/
│   ├── auth.ts          # Authentication utilities
│   ├── storage.ts       # File storage (local)
│   ├── prisma.ts        # Database client
│   ├── security.ts      # Security utilities
│   └── catalog.ts       # Catalog utilities
├── prisma/
│   └── schema.prisma    # Database schema
└── public/
    └── uploads/         # Uploaded images
```

## Image Storage

Images are stored locally in `public/uploads/products/` and served directly by Next.js. No external storage service (like MinIO or S3) is required.

### Configuration

- **Default location**: `public/uploads/products/`
- **Custom location**: Set `UPLOAD_DIR` environment variable
- **Public URL**: Set `NEXT_PUBLIC_APP_URL` for production

## Deployment

### Production Requirements

1. Set `NEXT_PUBLIC_APP_URL` to your production domain
2. Ensure the `public/uploads` directory is writable
3. Configure PostgreSQL connection string
4. Set up Clerk for production

### Building for Production

```bash
npm run build
npm start
```

## API Endpoints

### Public
- `GET /api/products` - List all products
- `GET /api/cart` - Get cart contents
- `POST /api/cart` - Add item to cart
- `POST /api/checkout/create-order` - Create checkout order
- `POST /api/checkout/verify` - Verify payment

### Admin (requires authentication)
- `GET /api/admin/products` - List products
- `POST /api/admin/products` - Create product
- `PATCH /api/admin/products/:id` - Update product
- `DELETE /api/admin/products/:id` - Delete product
- `GET /api/admin/orders` - List orders
- `PATCH /api/admin/orders/:id` - Update order
- `POST /api/admin/uploads` - Upload images

## Security Features

- Rate limiting on admin endpoints
- Origin validation for API requests
- Input sanitization
- Secure file upload validation (MIME type checking)
- Clerk-based authentication

## License

MIT
