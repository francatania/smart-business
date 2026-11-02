FROM node:24.18.1-bookworm AS build
WORKDIR /workspace
ARG VITE_PUBLIC_KEYCLOAK_ACCOUNT_URL
ENV VITE_PUBLIC_KEYCLOAK_ACCOUNT_URL=$VITE_PUBLIC_KEYCLOAK_ACCOUNT_URL
RUN corepack enable && corepack prepare pnpm@10.34.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY frontend/packages ./frontend/packages
COPY frontend/apps/admin ./frontend/apps/admin
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @smart-business/admin build

FROM nginx:1.31.8-alpine
COPY frontend/apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend/apps/admin/dist /usr/share/nginx/html
EXPOSE 80
