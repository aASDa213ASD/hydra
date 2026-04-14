.DEFAULT_GOAL := help
SHELL := /usr/bin/env bash
MAKEFLAGS += --no-builtin-rules --warn-undefined-variables

VERBOSE ?= 0
NO_COLOR ?= 0

COMPOSE_BASE := docker compose -f docker/compose.yaml
COMPOSE_DEV  := -f docker/compose.dev.yaml
ENV ?= dev
SERVICE ?= backend
CMD ?= list
WAIT_TIMEOUT ?= 300
JWT_FLAGS ?=
JWT_PASSPHRASE ?=

# ---- Colors --------------------------------------------------------------
C_RESET  = \033[0m
C_RED	 = \033[0;31m
C_GREEN	 = \033[0;32m
C_YELLOW = \033[0;33m
C_BLUE	 = \033[0;34m
C_PURPLE = \033[0;35m
C_CYAN	 = \033[0;36m
C_WHITE	 = \033[0;37m

# Grayscale
C_GRAY_1 = "\033[38;5;240m"
C_GRAY_2 = "\033[38;5;244m"
C_GRAY_3 = "\033[38;5;247m"

# Vibrants
C_ORANGE = "\033[38;5;208m"
C_PINK   = "\033[38;5;205m"
C_LIME   = "\033[38;5;154m"
C_TEAL   = "\033[38;5;37m"
C_INDIGO = "\033[38;5;54m"

# Pastels
C_SOFT_BLUE   = "\033[38;5;110m"
C_SOFT_GREEN  = "\033[38;5;151m"
C_SOFT_PURPLE = "\033[38;5;146m"

# Named
C_CRIMSON  = "\033[38;2;220;20;60m"
C_SKYBLUE  = "\033[38;2;135;206;235m"
C_SEAGREEN = "\033[38;2;46;139;87m"
C_GOLD     = "\033[38;2;255;215;0m"
C_VIOLET   = "\033[38;2;138;43;226m"
C_CORAL    = "\033[38;2;255;127;80m"
C_ROSE     = "\033[38;2;255;102;178m"

# ---- Icons -------------------------------------------------------------
S_INFO   := ℹ
S_OK     := ✔
S_WARN   := ⚠
S_ERR    := ✘
S_LINK   := ◌

# ---- Output utils -----------------------------------------------------
info = printf "%b\n" "$(C_CYAN)$(S_INFO) $(1)$(C_RESET)"
ok   = printf "%b\n" "$(C_GREEN)$(S_OK) $(1)$(C_RESET)"
warn = printf "%b\n" "$(C_YELLOW)$(S_WARN) $(1)$(C_RESET)"
err  = printf "%b\n" "$(C_RED)$(S_ERR) $(1)$(C_RESET)"
link = printf "%b\n" "$(C_BLUE)$(S_LINK) $(1)$(C_RESET)"

# ---- Output settings  ---------------------------------------------------
Q := @
ifeq ($(VERBOSE),1)
	Q :=
endif

# ---- User export  ---------------------------------------------------
UID := $(shell id -u 2>/dev/null || echo 1000)
GID := $(shell id -g 2>/dev/null || echo 1000)
export UID GID

# ---- Environment  ---------------------------------------------------
ifeq ($(ENV),dev)
	COMPOSE := $(COMPOSE_BASE) $(COMPOSE_DEV)
	BUILD_TARGET := dev
	BUILD_ARGS := --build-arg APP_ENV=dev --build-arg USER_ID=$(UID) --build-arg GROUP_ID=$(GID)
else ifeq ($(ENV),prod)
	COMPOSE := $(COMPOSE_BASE)
	BUILD_TARGET := prod
	BUILD_ARGS := --build-arg APP_ENV=prod
else
$(error ENV must be 'dev' or 'prod' (got '$(ENV)'))
endif

# ---- Targets ---------------------------------------------------------------
.PHONY: build up down restart status logs in jwt-keypair composer-install

##@ Container
build: ## Build image for ENV=dev|prod (default: dev)
	@$(COMPOSE) build --pull $(BUILD_ARGS) $(SERVICE)

up: ## Start stack for ENV=dev|prod
	@$(COMPOSE) up --detach --wait --wait-timeout=$(WAIT_TIMEOUT)

down: ## Stop stack and remove resources
	@$(COMPOSE) down --remove-orphans

restart: ## Restart stack for ENV=dev|prod
	@$(COMPOSE) down && $(COMPOSE) up --detach --wait --wait-timeout=$(WAIT_TIMEOUT)

status: ## Show container status
	@$(COMPOSE) ps -a --format "table {{.Name}}\t{{.Service}}\t{{.State}}\t{{.Status}}\t{{.Ports}}"

logs: ## Tail logs
	@$(COMPOSE) logs --tail=200 --follow $(SERVICE)

in: ## Container shell
	@$(COMPOSE) exec $(SERVICE) /bin/sh

##@ Secrets
jwt-keypair: ## Generate jwt keys
	@mkdir -p config/jwt
	@$(COMPOSE) exec -T backend sh -c "chown -R $(UID):$(GID) var public/data config/jwt 2>/dev/null || true"
	@$(COMPOSE) exec -T -u $(UID):$(GID) backend \
		sh -c "APP_ENV=$(ENV) php bin/console lexik:jwt:generate-keypair --no-interaction $(JWT_FLAGS)"

##@ Development-only
composer-install: ## Composer deps installation
	@$(COMPOSE_BASE) $(COMPOSE_DEV) exec -T -u $${UID:-1000}:$${GID:-1000} backend \
		composer install --no-interaction --prefer-dist

phpstan: ## PHPStan Static Analysis
	@$(COMPOSE_BASE) $(COMPOSE_DEV) exec backend composer phpstan

##@ Documentation
help: ## Displays this help menu
	@echo ""
	@printf "        ██░ ██ ▓██   ██▓▓█████▄  ██▀███   ▄▄▄            \n"
	@printf "       ▓██░ ██  ▒██  ██▒▒██▀ ██▌▓██ ▒ ██▒▒████▄          \n"
	@printf "       ▒██▀▀██   ▒██ ██░░██   █▌▓██ ░▄█ ▒▒██  ▀█▄        \n"
	@printf "       ░▓█ ░██   ░ ▐██▓░░▓█▄   ▌▒██▀▀█▄  ░██▄▄▄▄██       \n"
	@printf "       ░▓█▒░██▓  ░ ██▒▓░░▒████▓ ░██▓ ▒██▒▒▓█   ▓██       \n"
	@printf "        ▒ ░░▒░▒   ██▒▒▒  ▒▒▓  ▒ ░ ▒▓ ░▒▓░░▒▒   ▓▒█       \n"
	@printf "        ▒ ░▒░ ░ ▓██ ░▒░  ░ ▒  ▒   ░▒ ░ ▒ ░ ░   ▒▒        \n"
	@printf "        ░  ░░ ░ ▒ ▒ ░░   ░ ░  ░   ░░   ░   ░   ▒         \n"
	@printf "        ░  ░  ░ ░ ░        ░       ░           ░         \n"
	@printf "        Backend         https://irc.fsociety.lan         \n"
	@awk 'BEGIN {FS = ":.*##"; pad=18; \
	    b="\033[1m"; r="\033[0m"; command="\033[0;97m"; comment="\033[38;5;247m"; dim="\033[2m"; white="\033[97m"; } \
	  /^##@/ {printf "\n" white " ∅ %s" r "\n" dim " ──────────────────────────────────────────────────────────────────" r "\n", substr($$0,5)} \
	  /^[a-zA-Z0-9_.%-]+:.*##/ {printf "  " command "%-" pad "s" r comment " %s\n", $$1, $$2}' \
	  $(MAKEFILE_LIST)
	@echo ""
