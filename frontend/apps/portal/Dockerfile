FROM node:24.18.1-bookworm AS build
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@10.34.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY frontend/packages ./frontend/packages
COPY frontend/apps/portal ./frontend/apps/portal
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @smart-business/portal build

FROM nginx:1.31.3-alpine
COPY frontend/apps/portal/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/frontend/apps/portal/dist /usr/share/nginx/html
EXPOSE 80
