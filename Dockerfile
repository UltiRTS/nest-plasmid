FROM node:lts-alpine as build
WORKDIR /code

RUN npm i -g pnpm

COPY . .

RUN pnpm i
RUN pnpm run build

FROM node:lts-alpine
WORKDIR /app
RUN apk update --no-cache
RUN apk add bash
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml /app/
RUN pnpm i --prod
COPY --from=build /code/dist /app/dist
EXPOSE 8081
CMD ["node", "dist/main"]
