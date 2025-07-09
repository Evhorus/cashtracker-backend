# CashTracker - Backend

**CashTracker** is the backend API for managing personal or business budgets, built with Node.js, Express, and PostgreSQL. It provides secure endpoints for authentication, budget and expense management, and integrates with email services for notifications.

> **Note:**  
> This project was developed based on the course [Full Stack Node.js React TS NestJS Next.js Creando Proyectos](https://www.udemy.com/course/curso-full-stack-nodejs-react-typescript-nestjs-nextjs/) by Juan Pablo De la Torre Valdez on Udemy, which covers building real-world full stack applications using Node.js, React, TypeScript, NestJS, and Next.js.

## 🛠️ Main Dependencies

- **bcryptjs**: Password hashing
- **colors**: Terminal string styling
- **dotenv**: Environment variable management
- **express**: Web framework
- **express-rate-limit**: Rate limiting middleware
- **express-validator**: Request validation
- **jsonwebtoken**: JWT authentication
- **morgan**: HTTP request logging
- **nodemailer**: Sending emails
- **pg**: PostgreSQL client
- **pg-hstore**: PostgreSQL hstore support
- **sequelize-typescript**: ORM with TypeScript support

## ⚡ Getting Started

Follow these steps to run the backend locally:

1. **Clone the repository**

    `git clone https://github.com/Evhorus/cashtracker-backend`

2. **Install dependencies**

    `npm i`

3. **(Optional) Start PostgreSQL and pgAdmin with Docker**
If you want to run the database and admin interface via Docker, make sure Docker and Docker Compose are installed.
Then, start the services with:

    ``docker compose up -d``

    This will start only the PostgreSQL database and the pgAdmin admin interface as defined in the `docker-compose.yml` file.

4. **Configure environment variables**

Create a `.env` file at the root with environment variables:

| Variable       | Description                          |
| -------------- | ------------------------------------ |
| `DATABASE_URL` | PostgreSQL connection string         |
| `EMAIL_HOST`   | SMTP server host                     |
| `EMAIL_PORT`   | SMTP server port                     |
| `EMAIL_USER`   | SMTP username                        |
| `EMAIL_PASS`   | SMTP password                        |
| `JWT_SECRET`   | Secret key for JWT tokens            |
| `NODE_ENV`     | Environment (development/production) |
| `FRONTEND_URL` | Allowed frontend URL for CORS        |

5. **Run the development server**

The API will be available at your configured port (default: 4000).

## 📝 Scripts

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Start development server with nodemon |
| `npm run dev:api`       | Start dev server with API flag        |
| `npm run build`         | Compile TypeScript to JavaScript      |
| `npm start`             | Start production server               |
| `npm test`              | Run tests with Jest                   |
| `npm run test:coverage` | Run tests with coverage               |
| `npm run pretest`       | Prepare test database                 |


## 📣 Notes

- Make sure PostgreSQL is running and accessible via `DATABASE_URL`.
- The backend should be started before using the frontend.
- For best results, use Node.js 18+ and npm 9+.
- Customize the code and configuration as needed for your deployment.

## 🤝 Contributing

Feel free to open issues or submit pull requests to improve the project!

## 🖼️ License

This project is open source and available under the [MIT License](LICENSE).

