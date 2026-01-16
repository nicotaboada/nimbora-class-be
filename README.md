# NestJS + Apollo Server + Prisma

Proyecto básico con NestJS, GraphQL (Apollo Server) y Prisma.

## 🚀 Tecnologías

- **NestJS** - Framework progresivo de Node.js
- **Apollo Server** - Servidor GraphQL
- **Prisma** - ORM moderno para TypeScript
- **TypeScript** - Superset tipado de JavaScript
- **PostgreSQL** - Base de datos (configurable)

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu configuración de base de datos
```

## 🗄️ Configuración de Base de Datos

1. Edita el archivo `.env` con tu URL de conexión a PostgreSQL:
```
DATABASE_URL="postgresql://user:password@localhost:5432/mydb?schema=public"
```

2. Genera el cliente de Prisma:
```bash
npm run prisma:generate
```

3. Ejecuta las migraciones:
```bash
npm run prisma:migrate
```

## 🏃‍♂️ Ejecutar la Aplicación

```bash
# Modo desarrollo
npm run start:dev

# Modo producción
npm run build
npm run start:prod
```

La aplicación estará disponible en `http://localhost:3000`

GraphQL Playground: `http://localhost:3000/graphql`

## 📝 Ejemplos de Queries y Mutations

### Crear un usuario
```graphql
mutation {
  createUser(createUserInput: { 
    email: "test@example.com", 
    name: "Test User" 
  }) {
    id
    email
    name
    createdAt
  }
}
```

### Obtener todos los usuarios
```graphql
query {
  users {
    id
    email
    name
    createdAt
  }
}
```

### Obtener un usuario por ID
```graphql
query {
  user(id: 1) {
    id
    email
    name
    createdAt
  }
}
```

### Eliminar un usuario
```graphql
mutation {
  removeUser(id: 1) {
    id
    email
  }
}
```

## 📂 Estructura del Proyecto

```
nest-graphql-prisma/
├── prisma/
│   └── schema.prisma          # Schema de Prisma
├── src/
│   ├── prisma/
│   │   └── prisma.service.ts  # Servicio de Prisma
│   ├── users/
│   │   ├── dto/
│   │   │   └── create-user.input.ts
│   │   ├── entities/
│   │   │   └── user.entity.ts
│   │   ├── users.module.ts
│   │   ├── users.resolver.ts
│   │   └── users.service.ts
│   ├── app.module.ts          # Módulo principal
│   ├── main.ts                # Entry point
│   └── schema.gql            # Schema GraphQL (autogenerado)
├── .env.example
├── .gitignore
├── nest-cli.json
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Scripts Disponibles

- `npm run start` - Inicia la aplicación
- `npm run start:dev` - Inicia en modo desarrollo con hot-reload
- `npm run build` - Compila el proyecto
- `npm run prisma:generate` - Genera el cliente de Prisma
- `npm run prisma:migrate` - Ejecuta migraciones de base de datos
- `npm run prisma:studio` - Abre Prisma Studio (GUI para base de datos)

## 📄 Licencia

MIT

