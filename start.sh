#!/bin/sh
./wait-for-it.sh postgres 5432 -- \
npx prisma db push && \
node -r tsconfig-paths/register dist/src/main.js
