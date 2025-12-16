# Deploying Cats Gallery to Heroku 🚀

This guide will help you deploy your Node.js application to Heroku with a MySQL database.

## Prerequisites

1.  **Heroku Account**: Sign up at [heroku.com](https://signup.heroku.com/).
2.  **Heroku CLI**: Install the [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli).
3.  **Git**: Ensure Git is installed and your project is a Git repository.

## Step 1: Login to Heroku

Open your terminal and run:

```bash
heroku login
```

## Step 2: Create a Heroku App

Create a new app on Heroku:

```bash
heroku create your-app-name
# Example: heroku create my-cats-gallery
```

## Step 3: Add MySQL Database

We will use **JawsDB MySQL**, a popular free MySQL add-on for Heroku.

```bash
heroku addons:create jawsdb:kite
```

*Note: `kite` is the free tier plan.*

## Step 4: Configure Environment Variables

Set your session secret (use a long random string):

```bash
heroku config:set SESSION_SECRET=your_secure_random_string_here
heroku config:set NODE_ENV=production
```

## Step 5: Deploy Your Code

1.  Initialize Git (if not already done):
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    ```

2.  Deploy to Heroku:
    ```bash
    git push heroku master
    # OR if your branch is main:
    git push heroku main
    ```

## Step 6: Set Up the Database Tables

Since Heroku is a fresh environment, you need to create the tables there.

1.  Get your JawsDB connection string:
    ```bash
    heroku config:get JAWSDB_URL
    ```
    *It will look like: `mysql://user:password@host:port/database`*

2.  Connect to the remote database using your local MySQL client or a tool like MySQL Workbench / DBeaver using the credentials from the URL.

3.  Run the SQL commands from `database_setup.sql` to create the `users`, `cats`, and `contact_messages` tables.

    **Alternatively**, you can use the Heroku CLI to run the SQL (if you have mysql installed locally):

    ```bash
    # Parse the JAWSDB_URL to get credentials
    # mysql -h <host> -u <user> -p<password> <database> < database_setup.sql
    ```

## Step 7: Open Your App

```bash
heroku open
```

## Troubleshooting

-   **Check Logs**: If something goes wrong, check the logs:
    ```bash
    heroku logs --tail
    ```
-   **Database Connection**: Ensure `JAWSDB_URL` is set correctly in Heroku Config Vars.
-   **Port**: Ensure your app listens on `process.env.PORT` (already configured in `app.js`).

## Notes

-   **Images**: Currently, cat images are stored as URLs. If you implement file uploads later, you'll need cloud storage like AWS S3 or Cloudinary, as Heroku's filesystem is ephemeral (files are deleted on restart).
-   **Session Store**: For production, it's recommended to use a database-backed session store (like `connect-session-sequelize` or `connect-redis`) instead of the default MemoryStore, to prevent memory leaks and keep users logged in across restarts.

Enjoy your deployed Cats Gallery! 🐱
