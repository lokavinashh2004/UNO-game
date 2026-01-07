# Deployment Guide: Railway (Backend) + Netlify (Frontend)

## 📋 Overview

| Component | Platform | URL Pattern |
|-----------|----------|-------------|
| Backend (Server) | Railway | `https://uno-server-xxx.up.railway.app` |
| Frontend (React) | Netlify | `https://your-uno-game.netlify.app` |
| Database | Clever Cloud | Already configured |

---

## 🚂 Part 1: Deploy Backend to Railway

### Step 1: Prepare the Server

The server needs a few adjustments for Railway:

1. **Build script** - Railway will run `npm run build` then `npm start`
2. **Environment variables** - Set via Railway dashboard
3. **Dynamic PORT** - Railway assigns a port dynamically

### Step 2: Push to GitHub

If not already done:
```bash
cd c:\Users\T.Lok Avinashh\Desktop\UNO-game
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 3: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `UNO-game` repository
4. **IMPORTANT**: Set the root directory to `server`
   - Go to Settings → General → Root Directory → Enter: `server`

### Step 4: Configure Environment Variables

In Railway Dashboard → Your Project → Variables tab, add:

| Variable | Value |
|----------|-------|
| `PORT` | `3000` (Railway will override this, but good to have) |
| `DB_USER` | `uzfc1mh4l4qgmnwwbptc` |
| `DB_HOST` | `bvlh9mwchro4u5uckh80-postgresql.services.clever-cloud.com` |
| `DB_NAME` | `bvlh9mwchro4u5uckh80` |
| `DB_PASSWORD` | `QwTQxUL3N0QcrWBawFH0r6rEVA5oBE` |
| `DB_PORT` | `50013` |
| `CORS_ORIGIN` | `https://your-uno-game.netlify.app` (update after Netlify deploy) |

### Step 5: Verify Deployment

After Railway deploys, you'll get a URL like:
```
https://uno-game-server-production.up.railway.app
```

Test the health endpoint:
```
https://your-railway-url.up.railway.app/health
```

---

## 🌐 Part 2: Deploy Frontend to Netlify

### Step 1: Create Netlify Configuration

Create `netlify.toml` in the root of your project (already created for you).

### Step 2: Set Environment Variable

Create `.env.production` in the root (already created for you) with:
```
VITE_SOCKET_URL=https://your-railway-url.up.railway.app
```

### Step 3: Deploy to Netlify

**Option A: Via Netlify CLI**
```bash
npm install -g netlify-cli
netlify login
netlify init
netlify deploy --prod
```

**Option B: Via Netlify Dashboard**
1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect GitHub and select your repo
4. Configure build settings:
   - **Base directory**: (leave empty or `/`)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

### Step 4: Set Environment Variables in Netlify

In Netlify Dashboard → Site Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `VITE_SOCKET_URL` | `https://your-railway-url.up.railway.app` |

### Step 5: Trigger Redeploy

After adding environment variables, trigger a redeploy:
- Deploys → Trigger deploy → Deploy site

---

## 🔄 Part 3: Connect Everything

### Update Railway CORS

Once you have your Netlify URL:
1. Go to Railway Dashboard → Variables
2. Update `CORS_ORIGIN` to your Netlify URL:
   ```
   CORS_ORIGIN=https://your-uno-game.netlify.app
   ```

### Update Netlify Socket URL

1. Go to Netlify Dashboard → Environment Variables
2. Ensure `VITE_SOCKET_URL` points to your Railway URL
3. Redeploy

---

## ✅ Verification Checklist

- [ ] Railway server is running (check `/health` endpoint)
- [ ] Netlify site loads without errors
- [ ] Browser console shows "🔌 Connected to server"
- [ ] Can create a room
- [ ] Can join a room with link
- [ ] Game starts and syncs between players

---

## 🐛 Troubleshooting

### "Failed to connect to server"
- Check Railway logs for errors
- Verify `VITE_SOCKET_URL` in Netlify matches Railway URL
- Ensure CORS_ORIGIN in Railway matches Netlify URL exactly

### Database connection errors
- Verify all DB_* variables in Railway
- Check if Clever Cloud database is accessible

### Socket.io connection issues
- Railway may need WebSocket support enabled (usually automatic)
- Check browser Network tab for WebSocket connection attempts

---

## 📁 File Summary

Files created/modified for deployment:
- `netlify.toml` - Netlify build configuration
- `.env.production` - Frontend production environment
- `server/package.json` - Already has correct scripts
