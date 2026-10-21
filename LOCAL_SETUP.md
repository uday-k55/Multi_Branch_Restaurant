# Local Development Setup Guide: Beef With Chef Melbin

This document explains how to run **Beef With Chef Melbin – Multi-Branch Restaurant Ordering and Management System** locally on Windows alongside the existing online deployment.

Both environments operate completely independently and simultaneously:
* **Online Environment**: Netlify Frontend $\rightarrow$ Render Spring Boot Backend $\rightarrow$ Aiven MySQL Cloud Database.
* **Local Environment**: Local Angular Dev Server (`localhost:4200`) $\rightarrow$ Local Spring Boot Backend (`localhost:8080`) $\rightarrow$ Local WAMP Server MySQL Database (`localhost:3306/restaurant_db`).

---

## 1. How to Start WAMP Server Manually

1. Launch **WampServer** from the Windows Start menu or Desktop shortcut (`wampmanager.exe`, typically located at `C:\wamp64\wampmanager.exe`).
2. Watch the WAMP icon in the Windows notification area (system tray):
   * **Red**: Services stopped.
   * **Orange / Yellow**: Partially started.
   * **Green**: All services (Apache and MySQL / MariaDB) are running normally.
3. Verify that MySQL is running on port **3306** (default). You can confirm database status by opening phpMyAdmin at `http://localhost/phpmyadmin` in your browser.

---

## 2. Local Database Details

Based on project configuration and historical settings:
* **Database Management System**: MySQL (managed via WAMP Server)
* **Host**: `localhost` (or `127.0.0.1`)
* **Port**: `3306`
* **Database Name**: `restaurant_db`
* **Default Username**: `root`
* **Default Password**: *(blank / empty string, standard WAMP default)*
* **JDBC URL**: `jdbc:mysql://localhost:3306/restaurant_db?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true&createDatabaseIfNotExist=false`

> **Note on Data Preservation**:
> In the `local` profile, Hibernate's schema update mechanism is configured to `ddl-auto=none` (`LOCAL_DDL_AUTO:none`). This guarantees that Spring Boot will **never** alter, drop, recreate, or reset your existing tables, schemas, or records in WAMP MySQL.

---

## 3. How to Provide Local Credentials Securely

If your local WAMP MySQL setup uses the standard default `root` user with no password, no extra configuration is required—the application will automatically connect using the defaults.

If your local MySQL instance has a custom password or username, provide them via environment variables in your terminal session before starting the backend:

### PowerShell (Windows)
```powershell
# Set custom local DB password (if applicable)
$env:LOCAL_DB_PASSWORD="your_wamp_mysql_password"

# Optional overrides (if non-default)
$env:LOCAL_DB_USERNAME="root"
$env:LOCAL_DB_PORT="3306"
$env:LOCAL_DB_NAME="restaurant_db"
```

### Windows Command Prompt (cmd.exe)
```cmd
set LOCAL_DB_PASSWORD=your_wamp_mysql_password
```

> **Security Rule**: Never commit passwords, API keys, or credentials to configuration files or Git repositories.

---

## 4. How to Start the Spring Boot Backend (Local Mode)

The backend requires explicitly activating the `local` profile. When this profile is active:
* The datasource is configured via `application-local.properties` to connect to `localhost:3306/restaurant_db`.
* The built-in `LocalDatasourceGuardConfig` validates the JDBC URL before opening connections. If an unexpected remote database URL (such as an Aiven host) is detected, startup is refused immediately.
* Existing JPA/Hibernate schema is untouched (`ddl-auto=none`).

### Step 1: Open a terminal in the backend directory
```powershell
cd restaurant-backend
```

### Step 2: Start Spring Boot with the `local` profile
```powershell
.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

*(Alternatively, if running a packaged JAR file:)*
```powershell
java -jar target/restaurant-backend-0.0.1-SNAPSHOT.jar --spring.profiles.active=local
```

### Safety Features Active in Local Backend:
1. **Startup Guard**: `LocalDatasourceGuardConfig` confirms that the target database host is strictly `localhost` or `127.0.0.1`.
2. **Profile Isolation**: If started without `-Dspring-boot.run.profiles=local` and without production environment variables, the backend halts immediately with a missing variable error, ensuring it cannot accidentally fall back to any remote database.

---

## 5. How to Start Angular in Local Development Mode

The Angular frontend uses Angular environment files configured with `fileReplacements` in `angular.json`:
* `src/environments/environment.development.ts` sets `apiUrl: 'http://localhost:8080/api'`.
* `src/environments/environment.ts` retains `apiUrl: 'https://multi-branch-restaurant.onrender.com/api'`.

### Step 1: Open a second terminal in the frontend directory
```powershell
cd restaurant
```

### Step 2: Start Angular development server
```powershell
npm run start:local
```
*(or simply `npm start` / `ng serve`, which defaults to the development configuration)*

---

## 6. Expected URLs

| Environment | Component | URL | Notes |
|---|---|---|---|
| **Local** | Frontend UI | `http://localhost:4200` | Served by Angular CLI dev server |
| **Local** | Backend REST API | `http://localhost:8080/api` | Served by Spring Boot (`local` profile) |
| **Online** | Frontend UI | `https://whimsical-sopapillas-78c574.netlify.app` | Hosted on Netlify |
| **Online** | Backend REST API | `https://multi-branch-restaurant.onrender.com/api` | Hosted on Render |

---

## 7. How the Online Environment Continues Operating

The online application is completely unaffected by local changes:
* **Production Angular Build**: Netlify executes `npm run build` (`ng build`), which uses the default `production` configuration in `angular.json` and loads `src/environments/environment.ts` with `https://multi-branch-restaurant.onrender.com/api`.
* **Production Backend**: Render runs the container entrypoint `java -jar app.jar` without the `local` profile. It reads `application.properties` and connects to Aiven MySQL using Render environment variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USERNAME`, `DB_PASSWORD`) with `sslMode=REQUIRED`.
* **Database Isolation**: The local WAMP database and Aiven cloud database are entirely independent. Local orders, inventory changes, and reservations remain only on your laptop.

---

## 8. External Integrations and Network Traffic

When running locally, the following third-party internet services may still be contacted by the client's browser:

1. **OpenStreetMap Tile Server**:
   * The Leaflet map component in delivery address picking and employee delivery tracking fetches map tiles from `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`.
2. **Third-Party CDNs (in `index.html`)**:
   * Bootstrap 5 CSS & JS (`cdn.jsdelivr.net`)
   * FontAwesome 6 Icons (`cdnjs.cloudflare.com`)
   * Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)
   * Leaflet CSS & JS (`unpkg.com`)
3. **Risu Mail Integration (Password Reset / OTP Delivery)**:
   * To send real email OTPs via Risu Mail (`https://risu.in`), provide your API key via environment variable:
     ```powershell
     $env:RISU_API_KEY="your_risu_api_key_here"
     $env:RISU_FROM_EMAIL="noreply@beefwithchefmelbin.com"  # Optional override
     ```
   * If `RISU_API_KEY` is not set, the backend safely reports an error when an OTP send request is made without crashing the server.
4. **Demo Payment Processing**:
   * The payment system uses a simulated demo workflow implemented directly in the backend (`/api/payments/initiate` and `/api/payments/{id}/process`). It does **not** call external payment gateways (e.g. Stripe, Razorpay).
5. **Email / SMS**:
   * Order status updates do not send external emails. Only the Password Reset feature communicates with Risu Mail (`https://api.risu.in/v1/send`).

---

## 9. WAMP MySQL Table Creation for Password Reset (Optional for Local)

In production on Render, Hibernate automatically generates the `password_reset_otps` table because `ddl-auto=update`.
For local WAMP execution with `ddl-auto=none`, run this SQL statement in phpMyAdmin (`restaurant_db`) if you wish to use the OTP feature locally:

```sql
CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(255) NOT NULL,
  `otp_hash` VARCHAR(128) NOT NULL,
  `otp_expires_at` DATETIME(6) NOT NULL,
  `failed_attempts` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(20) NOT NULL,
  `reset_token_hash` VARCHAR(128) NULL,
  `token_expires_at` DATETIME(6) NULL,
  `created_at` DATETIME(6) NOT NULL,
  `updated_at` DATETIME(6) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `idx_reset_email` (`email`),
  INDEX `idx_reset_token_hash` (`reset_token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 10. Manual Checklist Before Running

Before starting both applications locally, verify:

- [ ] **WAMP Server is running** and the icon in your system tray is **green**.
- [ ] The `restaurant_db` database exists in WAMP MySQL with existing tables and data intact.
- [ ] (Optional for OTP testing) Table `password_reset_otps` is created in WAMP MySQL using the SQL above.
- [ ] Set `$env:RISU_API_KEY="your_key"` in Terminal 1 if testing live email delivery.
- [ ] Port `3306` is open for MySQL, port `8080` is free for Spring Boot, and port `4200` is free for Angular.
- [ ] In Terminal 1: run `.\mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local` in `restaurant-backend`.
- [ ] In Terminal 2: run `npm run start:local` in `restaurant`.
- [ ] Navigate to `http://localhost:4200` in your browser.
