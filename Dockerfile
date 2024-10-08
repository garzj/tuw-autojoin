# BUILDER
FROM node:latest AS builder

WORKDIR /app/

# Build deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# TS
COPY ./ ./
RUN yarn build


# PROD ENV
FROM ghcr.io/puppeteer/puppeteer:latest AS runner

WORKDIR /app/

# Prod deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --prod

# Built files
COPY --from=builder /app/build/ ./build/

# Start the program
CMD [ "yarn", "start" ]
