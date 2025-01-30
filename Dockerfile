# Используем официальный Node.js образ
FROM node:22-alpine

# Устанавливаем pnpm
RUN npm install -g pnpm

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и pnpm-lock.yaml в контейнер
COPY package.json pnpm-lock.yaml ./

# Устанавливаем зависимости через pnpm
RUN pnpm install

# Копируем весь код проекта в контейнер
COPY . .

RUN pnpm build

# Запускаем приложение
CMD ["node", "build/src/index.js"]
