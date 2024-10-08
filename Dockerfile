# BUILDER
FROM node:lts-alpine3.19 AS builder

WORKDIR /app/

# Build deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# TS
COPY ./ ./
RUN yarn build


# PROD ENV
FROM node:lts-alpine3.19 AS runner

WORKDIR /app/

# Prod deps
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --prod

# Built files
COPY --from=builder /app/build/ ./build/

# Start the program
CMD [ "yarn", "start" ]
