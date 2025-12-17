# Deploying Cats Gallery to Render 🚀

This guide will help you deploy your Node.js application to **Render** (for the website) and **TiDB Cloud** (for the free MySQL database).

## Prerequisites

1.  **GitHub Account**: You need a GitHub account to host your code.
2.  **Render Account**: Sign up at [render.com](https://render.com/) (Login with GitHub).
3.  **TiDB Cloud Account**: Sign up at [tidbcloud.com](https://tidbcloud.com/) (Login with Google/GitHub) for a free MySQL database.

---

## Step 1: Push Code to GitHub

1.  Log in to [GitHub](https://github.com).
2.  Click the **+** icon in the top right and select **New repository**.
3.  Name it `cats-gallery` and click **Create repository**.
4.  Copy the commands under "…or push an existing repository from the command line".
5.  Run them in your terminal (VS Code):

    ```bash
    git remote add origin https://github.com/YOUR_USERNAME/cats-gallery.git
    git branch -M main
    git push -u origin main
    ```

---

## Step 2: Set Up Free MySQL Database (TiDB Cloud)

1.  Log in to [TiDB Cloud](https://tidbcloud.com/).
2.  Click **Create Cluster**.
3.  Select **Serverless** (Free).
4.  Choose a region and click **Create**.
5.  Once created, click **Connect** (top right).
6.  Select **"Connect with General Client"**.
7.  **Generate a Password** if asked.
8.  **Copy the Connection String**. It will look something like this:
    `mysql://2k3j4k2j34.us-east-1.prod.aws.tidbcloud.com:4000/test?user=...&password=...`

    *Note: You might need to construct the URL manually if they give you separate fields:*
    `mysql://USER:PASSWORD@HOST:4000/test?ssl={"rejectUnauthorized":true}`

---

## Step 3: Create Tables in the Database

You need to run your SQL setup script on this new database.

1.  You can use a tool like **DBeaver**, **MySQL Workbench**, or the **TiDB SQL Editor** on their website.
2.  Open the SQL Editor in TiDB Cloud.
3.  Copy the contents of your `database_setup.sql` file.
4.  Paste it into the SQL Editor and run it to create the `users`, `cats`, and `contact_messages` tables.

---

## Step 4: Deploy to Render

1.  Log in to [Render](https://render.com/).
2.  Click **New +** and select **Web Service**.
3.  Connect your GitHub account and select the `cats-gallery` repository.
4.  **Configure the service**:
    *   **Name**: `cats-gallery`
    *   **Region**: Choose one close to you.
    *   **Branch**: `main`
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node app.js`
    *   **Plan**: Free

5.  **Environment Variables** (Crucial!):
    Scroll down to "Environment Variables" and add the following:

    | Key | Value |
    | dist | dist |
    | --- | --- |
    | `NODE_ENV` | `production` |
    | `SESSION_SECRET` | (Enter a long random string) |
    | `JAWSDB_URL` | (Paste your TiDB Connection String here) |

    *Note: We reuse `JAWSDB_URL` because your code is already set up to look for it!*

6.  Click **Create Web Service**.

---

## Step 5: Done!

Render will start building your app. It might take a few minutes. Once finished, you will see a URL (e.g., `https://cats-gallery.onrender.com`).

Click it to see your live app! 🐱
