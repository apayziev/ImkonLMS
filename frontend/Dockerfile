FROM node:22-alpine AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM nginxinc/nginx-unprivileged:1.27-alpine

USER root
RUN rm /etc/nginx/conf.d/default.conf
COPY --chown=nginx:nginx --from=build-stage /app/dist /usr/share/nginx/html
COPY ./nginx/index.conf /etc/nginx/conf.d/default.conf
USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
