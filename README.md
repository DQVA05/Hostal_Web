# Hostal_Web

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-4.2.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)
![Thymeleaf](https://img.shields.io/badge/Thymeleaf-Templates-green)

A web platform for managing the **Casita de Tercera “Costamar”** hostel in Havana, Cuba. The project aims to present room availability and rates, accept reservation requests, and support guest, payment, and accommodation management.

> **Project status:** under active development. The current version provides a public home page and Spring MVC configuration; some management features are planned and not yet implemented.

## Features

### Available now

- Spring Boot web application with Java 21
- Server-side rendering with Thymeleaf
- Public hostel landing page
- Basic weather, capacity, and date information displayed dynamically
- Responsive-oriented custom CSS
- PostgreSQL JDBC configuration
- Flyway and JPA dependencies for database migrations and persistence
- Spring Boot Actuator support

### Planned

- Room catalog with prices and availability
- Reservation request workflow
- Guest registration and management
- Check-in and check-out records
- Payment tracking
- Occupancy dashboard
- Administrative authentication and authorization
- Currency and local price support
- Automated tests and deployment configuration

## Technology stack

- **Language:** Java 21
- **Framework:** Spring Boot 4.2.0
- **Web:** Spring MVC and Thymeleaf
- **Persistence:** Spring Data JPA
- **Database migrations:** Flyway
- **Database:** PostgreSQL
- **Frontend:** HTML5 and CSS
- **Build tool:** Maven Wrapper

## Requirements

Before running the project, install:

- Java 21 or newer
- PostgreSQL
- Maven is optional because the repository includes the Maven Wrapper

## Database setup

The default configuration uses a PostgreSQL database named `costamar`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/costamar
spring.datasource.username=hostal
spring.datasource.password=${DB_PASSWORD}
```

Create the PostgreSQL role and database, then export the database password:

```bash
sudo -u postgres psql
```

```sql
CREATE USER hostal WITH PASSWORD 'change-this-password';
CREATE DATABASE costamar OWNER hostal;
```

On Linux or macOS:

```bash
export DB_PASSWORD='change-this-password'
```

On Windows PowerShell:

```powershell
$env:DB_PASSWORD='change-this-password'
```

Adapt the database name, host, port, or credentials in `src/main/resources/application.properties` if necessary.

## Running locally

Clone the repository:

```bash
git clone https://github.com/DQVA05/Hostal_Web.git
cd Hostal_Web
```

Run the application with Maven Wrapper:

```bash
./mvnw spring-boot:run
```

On Windows:

```powershell
.\mvnw.cmd spring-boot:run
```

Open:

- http://localhost:8080/
- http://localhost:8080/public/index

## Project structure

```text
src/
├── main/
│   ├── java/
│   │   └── com/hostal/web/
│   │       ├── HostalWebApplication.java
│   │       └── catalog/
│   │           └── HomeController.java
│   └── resources/
│       ├── static/css/app.css
│       ├── templates/public/index.html
│       ├── application.properties
│       ├── application.yml
│       ├── application-dev.yml
│       └── application-prod.yml
└── test/
    └── java/
```

## Building

Create an executable JAR:

```bash
./mvnw clean package
```

Run the generated JAR:

```bash
java -jar target/hostal-web-0.0.1-SNAPSHOT.jar
```

## Testing

Run the test suite:

```bash
./mvnw test
```

## Configuration

Spring profile files are available for future development and production settings:

- `application.yml`
- `application-dev.yml`
- `application-prod.yml`

Sensitive values should not be committed to the repository. Use environment variables or Spring profiles for passwords and external service credentials.

## Roadmap

- [ ] Complete the hostel room data model
- [ ] Add room availability and rate pages
- [ ] Implement reservation requests
- [ ] Add guest and accommodation management
- [ ] Implement payment records
- [ ] Add authentication and role-based administration
- [ ] Improve automated test coverage
- [ ] Add Docker and deployment documentation
- [ ] Integrate a real weather API

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes with a descriptive message.
4. Open a pull request.

```bash
git switch -c feature/my-feature
```

## License

No license has been specified for this project. Until a license is added, repository contents should be considered protected by default.

## Author

Developed and maintained by [DQVA05](https://github.com/DQVA05).
