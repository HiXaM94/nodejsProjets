# How to Deploy to Vercel 🚀

Follow these steps to deploy your **Cat Management Node.js App** to Vercel and connect it to a MySQL database (TiDB Cloud, PlanScale, or JawsDB).

---

## 1. Prepare Your Database
Since Vercel is "Serverless", you need an external MySQL database.
- **Recommended Free Option**: [TiDB Cloud (Serverless)](https://tidbcloud.com/) or a MySQL instance on Aiven.
- **Connection String**: Ensure you have a connection URL that looks like:
  `mysql://user:password@host:port/database`

---

## 2. Vercel Configuration Check
Your project already includes:
- `vercel.json`: Handles routing so that Vercel knows `app.js` is the entry point.
- `package.json`: Contains the necessary dependencies.

---

## 3. Deploy Steps

### Option A: Using the Vercel Dashboard (Recommended)
1. **Push your code** to GitHub, GitLab, or Bitbucket.
2. Go to [Vercel.com](https://vercel.com) and click **"Add New"** > **"Project"**.
3. Import your repository.
4. **Environment Variables**: This is the most important step. Expand the "Environment Variables" section and add:
   - `JAWSDB_URL`: Your full database connection string (even if it's not JawsDB).
   - `SESSION_SECRET`: A long random string for security (e.g., `cat-secret-99-abc`).
   - `NODE_ENV`: Set this to `production`.
5. Click **Deploy**.

### Option B: Using Vercel CLI
If you have the Vercel CLI installed:
```bash
vercel login
vercel
```
Then go to the Vercel Dashboard to set the Environment Variables listed above.

---

## 4. Initialize the Database
Once the site is live (e.g., `https://nodejs-projets-n8nt.vercel.app`), the tables won't exist yet!
1. Visit: `https://nodejs-projets-n8nt.vercel.app/api/setup-db`
2. You should see: **"Database Setup Complete! ✅"**
3. (Optional) Visit: `https://nodejs-projets-n8nt.vercel.app/api/update-schema` to ensure all columns are present.

---

## 5. Troubleshooting
- **Database Connection Error**: Double-check that your database allows external connections. TiDB Cloud requires `rejectUnauthorized: true` (which is already configured in your `app.js`).
- **Mixed Content**: Ensure all images/links use `https`.
- **Session Issues**: Vercel handles cookies correctly because `app.js` has `app.set('trust proxy', 1)` and `secure: true` for production.

---

**Deployed successfully?** You can now manage your cats from anywhere! 🐾
