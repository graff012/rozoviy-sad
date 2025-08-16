FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache bash netcat-openbsd

COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile && yarn cache clean
RUN yarn add tsconfig-paths

COPY tsconfig*.json ./
COPY src ./src
COPY prisma ./prisma

COPY wait-for-it.sh /app/wait-for-it.sh
RUN chmod +x /app/wait-for-it.sh

COPY start.sh ./
RUN chmod +x start.sh

RUN npx prisma generate
RUN yarn build

EXPOSE 4000
ENTRYPOINT ["/app/start.sh"]
