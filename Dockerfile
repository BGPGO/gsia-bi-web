FROM nginx:alpine

# Node 20 + cron + ferramentas minimas pro ETL diario
RUN apk add --no-cache nodejs npm dcron tini ca-certificates curl \
 && mkdir -p /app /var/log

WORKDIR /app

# Deps Node primeiro (cache layer)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Scripts ETL
COPY build-data.cjs build-jsx.cjs ./
COPY app.jsx ./

# Site estatico servido pelo nginx
COPY index.html styles.css /usr/share/nginx/html/
COPY assets/ /usr/share/nginx/html/assets/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Seed inicial dos artefatos buildados (sobrescritos pelo cron)
COPY data.js app.bundle.js /usr/share/nginx/html/

# Cron + entrypoint
COPY crontab /etc/crontabs/root
COPY refresh.sh entrypoint.sh download-xlsx.sh sync-supabase.sh /app/
RUN sed -i 's/\r$//' /app/*.sh /etc/crontabs/root \
 && chmod +x /app/refresh.sh /app/entrypoint.sh /app/download-xlsx.sh /app/sync-supabase.sh

EXPOSE 80
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/entrypoint.sh"]
