# Deploying to Vercel (Production) 🚀

This guide provides instructions for deploying your Node.js Cat Management application to **Vercel**.

## Prerequisites
- A **GitHub**, **GitLab**, or **Bitbucket** account.
- A **Vercel** account (sign up at [vercel.com](https://vercel.com)).
- An external **MySQL Database** (e.g., TiDB Cloud, Aiven, or PlanetScale).

---

## Step 1: Prepare Your External Database
Vercel is a serverless platform, so you cannot run a local MySQL database there. You need a hosted one. 

1. **Create a Database**: Sign up for a free tier at [TiDB Cloud](https://tidbcloud.com/) or [Aiven](https://aiven.io/).
2. **Get the Connection String**: It should look like this:
   `mysql://username:password@hostname:3306/database_name`

---

## Step 2: Push Your Code to GitHub
1. Initialize git (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Prepare for Vercel deployment"
   ```
2. Create a repository on GitHub and push your code:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 3: Deploy to Vercel
1. Go to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New** > **Project**.
3. Import your GitHub repository.
4. **Configure Project Settings**:
   - **Framework Preset**: Other (it will detect Node.js).
   - **Environment Variables**: Add the following:
     - `JAWSDB_URL`: Paste your full database connection string here.
     - `SESSION_SECRET`: Enter a secure random string.
     - `NODE_ENV`: set to `production`.
5. Click **Deploy**.

---

## Step 4: Initialize the Database Tables
After the deployment is finished and your site is live:
1. Navigate to your app's URL + `/api/setup-db` (e.g., `https://nodejs-projets-n8nt.vercel.app//api/setup-db`).
2. You should see a message saying **"Database Setup Complete! ✅"**.
3. (Optional) Navigate to `/api/update-schema` to ensure all latest columns are added.

---

## Step 5: Verify Your Deployment
1. Visit your homepage.
2. Sign up for a new account.
3. Try adding a cat! 🐾

---

## Troubleshooting
- **500 Internal Server Error**: Check the **Function Logs** in the Vercel dashboard. This usually means the database connection string is incorrect or the database is rejecting the connection.
- **Unauthorized Errors**: Ensure your `SESSION_SECRET` is set and that you are accessing the site via `https`.
- **Database Connection**: Your `app.js` is already configured to use SSL for TiDB Cloud (`rejectUnauthorized: true`). Check if your database provider requires specific SSL settings.

---

**Happy Deploying!** 🐱✨
