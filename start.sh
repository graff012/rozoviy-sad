#!/bin/sh
# Wait for Postgres
./wait-for-it.sh postgres.railway.internal 5432 -- \
# Wait for Redis
./wait-for-it.sh redis.railway.internal 6379 -- \
npx prisma db push && \
node -r tsconfig-paths/register dist/src/main.js

