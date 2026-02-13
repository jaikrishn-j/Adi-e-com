FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

ENV DATABASE_URL=postgresql://build:build@localhost:5432/build?schema=public
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_placeholder
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG ALLOW_LOCAL_IMAGE_IP=false
ENV ALLOW_LOCAL_IMAGE_IP=$ALLOW_LOCAL_IMAGE_IP

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build -- --webpack

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start -- -H 0.0.0.0 -p 3000"]
