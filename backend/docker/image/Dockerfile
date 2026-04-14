# syntax=docker/dockerfile:1.7

ARG PHP_VERSION=8.4
ARG COMPOSER_VERSION=2.9.1

FROM composer:${COMPOSER_VERSION} AS composer

# -----------------------------------------------------------------------
# Base PHP + runtime packages
# -----------------------------------------------------------------------
FROM php:${PHP_VERSION}-fpm-alpine AS base

ARG USER_ID=1000
ARG GROUP_ID=1000

ENV APP_DIR=/var/www/html \
    COMPOSER_ALLOW_SUPERUSER=1 \
    PHP_OPCACHE_VALIDATE_TIMESTAMPS=0

RUN apk add --no-cache \
      bash \
      ca-certificates \
      curl \
      tzdata \
      nginx \
      icu-libs \
      oniguruma \
      libzip \
      postgresql-libs \
  && addgroup -g ${GROUP_ID} app \
  && adduser -D -G app -u ${USER_ID} app \
  && mkdir -p /run/nginx /var/log/nginx /var/lib/nginx/tmp ${APP_DIR} \
  && chown -R app:app /run/nginx /var/log/nginx /var/lib/nginx ${APP_DIR}

RUN apk add --no-cache --virtual .build-deps \
      $PHPIZE_DEPS \
      icu-dev \
      oniguruma-dev \
      libzip-dev \
      postgresql-dev \
  && docker-php-ext-install intl pdo_pgsql zip opcache \
  && apk del .build-deps \
  && rm -rf /tmp/pear

COPY docker/config/php/php.ini /usr/local/etc/php/conf.d/app.ini
COPY docker/config/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

WORKDIR ${APP_DIR}

# -----------------------------------------------------------------------
# Dependencies + source (APP_ENV driven)
# -----------------------------------------------------------------------
FROM base AS deps
ARG APP_ENV=prod
ENV APP_ENV=${APP_ENV} \
    APP_DEBUG=${APP_DEBUG:-0}

COPY --from=composer /usr/bin/composer /usr/local/bin/composer

COPY composer.json composer.lock symfony.lock ./
RUN if [ "$APP_ENV" = "prod" ]; then \
        composer install \
            --no-dev \
            --prefer-dist \
            --no-interaction \
            --no-progress \
            --no-scripts \
            --optimize-autoloader; \
    else \
        composer install \
            --prefer-dist \
            --no-interaction \
            --no-progress \
            --no-scripts; \
    fi \
    && rm -rf /root/.composer/cache

COPY . .
RUN if [ "$APP_ENV" = "prod" ]; then \
        composer dump-autoload --classmap-authoritative --no-dev --optimize; \
    else \
        composer dump-autoload; \
    fi \
    && mkdir -p var public/data config/jwt \
    && chown -R app:app var public/data config/jwt

# -----------------------------------------------------------------------
# Production runtime image
# -----------------------------------------------------------------------
FROM base AS prod
ENV APP_ENV=prod \
    APP_DEBUG=0

COPY --from=deps /var/www/html ${APP_DIR}
COPY docker/config/nginx/nginx.main.conf /etc/nginx/nginx.conf
COPY docker/config/nginx/nginx.conf /etc/nginx/http.d/default.conf

EXPOSE 8080 9000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://127.0.0.1:8080/healthz || exit 1

USER app
CMD ["sh", "-c", "php-fpm -R & nginx -g 'daemon off;'"]

# -----------------------------------------------------------------------
# Developer image
# -----------------------------------------------------------------------
FROM deps AS dev
ENV APP_ENV=dev \
    APP_DEBUG=1

RUN echo "opcache.enable=0" > /usr/local/etc/php/conf.d/opcache.ini

COPY docker/config/nginx/nginx.main.conf /etc/nginx/nginx.conf
COPY docker/config/nginx/nginx.conf /etc/nginx/http.d/default.conf

EXPOSE 8080 9000
CMD ["sh", "-c", "php-fpm -R & nginx -g 'daemon off;'"]
