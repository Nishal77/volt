FROM golang:1.26-alpine AS build
WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/. .
RUN CGO_ENABLED=0 go build -o /volt-server ./cmd/server

FROM alpine:3.20
COPY --from=build /volt-server /volt-server
COPY docs/prompts /docs/prompts
EXPOSE 8080
ENTRYPOINT ["/volt-server"]
