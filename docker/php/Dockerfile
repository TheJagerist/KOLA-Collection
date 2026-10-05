# ---------------------------------------------------------------
# Kōlā API — PHP-FPM 8.3 + extensions Laravel / PostgreSQL
# ---------------------------------------------------------------
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
        bash git unzip icu-libs libzip libpng libjpeg-turbo libwebp freetype postgresql-libs \
    && apk add --no-cache --virtual .build-deps \
        $PHPIZE_DEPS icu-dev libzip-dev libpng-dev libjpeg-turbo-dev libwebp-dev freetype-dev postgresql-dev linux-headers \
    && docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql pgsql intl zip gd bcmath opcache pcntl exif \
    && apk del .build-deps

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php/php.ini /usr/local/etc/php/conf.d/zz-kola.ini
COPY docker/php/entrypoint.sh /usr/local/bin/kola-entrypoint
# Supprime d'éventuels retours chariot Windows (CRLF) du script
RUN sed -i 's/\r$//' /usr/local/bin/kola-entrypoint && chmod +x /usr/local/bin/kola-entrypoint

WORKDIR /var/www/html

ENTRYPOINT ["kola-entrypoint"]
CMD ["php-fpm"]
