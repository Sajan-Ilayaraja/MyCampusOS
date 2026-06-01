# Deployment Guide & Production Checklist

This guide provides step-by-step instructions for deploying the MyCampusOS stack to production platforms (Vercel, Render/Railway, and MongoDB Atlas) and configuring environment secrets.

---

## 1. Production Architecture Summary
- **Frontend**: React (Vite) hosted on **Vercel** CDN.
- **Backend**: Express Server hosted on **Render** (Web Service) or **Railway**.
- **Database**: MongoDB hosted on **MongoDB Atlas** (Shared Free/M1 tier).
- **Security**: Forced SSL, CORS whitelist filtering, Helmet headers, Rate limiting, and NoSQL query validations.

---

## 2. Step-by-Step Setup Guide

### Step A: MongoDB Atlas Setup
1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new Shared Cluster named `MyCampusOS`.
3. In **Database Access**, create a production database user (e.g. `mycampus-prod`) with a strong generated password.
4. In **Network Access**, whitelist `0.0.0.0/0` (required for serverless/dynamic IPs like Render and Vercel) or add your server instance IP.
5. Copy your connection URL: `mongodb+srv://<username>:<password>@cluster.mongodb.net/mycampusos?retryWrites=true&w=majority`.

### Step B: Backend Deployment (Render)
1. Register on [Render.com](https://render.com).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository and set the Root Directory to `server`.
4. Configure these options:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
5. Click **Advanced** and add the Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render binds this automatically)
   - `MONGO_URI`: *[Your Atlas connection string with password replaced]*
   - `JWT_SECRET`: *[A cryptographically secure random string]*
   - `GEMINI_API_KEY`: *[Your Google Gemini API Key]*
   - `CLIENT_URL`: *[Your frontend Vercel URL once deployed]*
6. Save and deploy.

### Step C: Frontend Deployment (Vercel)
1. Register on [Vercel.com](https://vercel.com).
2. Click **Add New** -> **Project** and import your repository.
3. Configure these options:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add the Environment Variables:
   - `VITE_API_URL`: *[Your Render Backend URL, e.g. `https://mycampusos-api.onrender.com/api`]*
5. Click **Deploy**. Vercel will process and output a clean production URL.

---

## 3. Production Health Checks & Verification
Verify deployment stability using:
- **Health Check Endpoint**: Query `GET https://<your-backend-url>/api/health` to confirm connection status, MongoDB connectivity, and uptime metrics.
- **Security Header Checks**: Inspect headers in your browser network tab. Make sure `Strict-Transport-Security`, `Content-Security-Policy`, and Helmet headers are present.

---

## 4. Rollback & Failover Strategy
If a production deploy fails:
1. **Frontend Rollback (Vercel)**:
   - Open the Vercel dashboard deployments list.
   - Select the last stable commit build deployment.
   - Click the three dots -> **Promote to Production** to roll back instantly.
2. **Backend Rollback (Render)**:
   - Open your Web Service settings.
   - Select the Deployments page.
   - Find the last stable deployed revision and click **Rollback to this deploy**.
