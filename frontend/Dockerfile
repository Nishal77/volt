FROM oven/bun:1.2 AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.2
WORKDIR /app
COPY --from=build /app ./
EXPOSE 3000
ENTRYPOINT ["bun", "run", "start"]
