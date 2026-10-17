# Image Directus SIDESAH = Directus 11.17.4 + extension logic bisnis (di-build otomatis).
# Build context = root repo (extension memakai ulang web/src/lib/calc dan directus/access).
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
WORKDIR /repo
COPY web/src/lib ./web/src/lib
COPY directus/access ./directus/access
COPY directus/extensions/sidesah/package.json directus/extensions/sidesah/pnpm-lock.yaml ./directus/extensions/sidesah/
RUN cd directus/extensions/sidesah && pnpm install --frozen-lockfile
COPY directus/extensions/sidesah ./directus/extensions/sidesah
RUN cd directus/extensions/sidesah && rm -rf dist && pnpm build

FROM directus/directus:11.17.4
COPY --from=build --chown=node:node /repo/directus/extensions/sidesah/package.json /directus/extensions/sidesah/package.json
COPY --from=build --chown=node:node /repo/directus/extensions/sidesah/dist /directus/extensions/sidesah/dist
