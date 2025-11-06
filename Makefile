# ========================================
# Variables
# ========================================
DOCKER_COMPOSE := docker compose
IMAGE_NAME := cer-notify-api
CONTAINER_NAME := cer-notify-api
PORT := 3000

# ========================================
# Comandos
# ========================================

## 🧱 Construye la imagen (usa caché)
build:
	$(DOCKER_COMPOSE) build

## 🔥 Construye la imagen SIN caché (limpia completamente)
build-nc:
	$(DOCKER_COMPOSE) build --no-cache

## 🚀 Levanta los contenedores
up:
	$(DOCKER_COMPOSE) up -d

## 🧰 Construye y levanta en una sola línea
rebuild:
	$(DOCKER_COMPOSE) up -d --build

## 🧹 Detiene y elimina contenedores
down:
	$(DOCKER_COMPOSE) down

## 🔁 Reinicia la API
restart:
	$(DOCKER_COMPOSE) restart $(CONTAINER_NAME)

## 🪶 Muestra los logs en vivo
logs:
	$(DOCKER_COMPOSE) logs -f $(CONTAINER_NAME)

## 🧪 Ejecuta tests unitarios
test:
	npm run test

## 🧪 Ejecuta tests end-to-end
test-e2e:
	npm run test:e2e

## 🧼 Limpia TODO (contenedores, volúmenes e imágenes)
clean:
	$(DOCKER_COMPOSE) down -v --rmi all --remove-orphans

## 🧑‍💻 Entorno de desarrollo (hot reload, Nest watch mode)
dev:
	npm run start:dev
C:\Users\juans\OneDrive\Documentos\Portafolio\whatsapp-notify\Makefile