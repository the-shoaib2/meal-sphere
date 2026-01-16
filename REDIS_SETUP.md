# Redis Setup Guide

This guide explains how to configure Redis for caching in both local development and production environments.

## 🏠 Local Development Setup

### Option 1: Using Docker (Recommended)

The easiest way to run Redis locally is using Docker:

```bash
# Pull and run Redis container
docker run -d --name meal-sphere-redis -p 6379:6379 redis:7-alpine

# Verify it's running
docker ps | grep redis
```

Then add to your `.env` file:
```env
REDIS_URL=redis://localhost:6379
```

**Docker Commands:**
```bash
# Start Redis container
docker start meal-sphere-redis

# Stop Redis container
docker stop meal-sphere-redis

# View Redis logs
docker logs meal-sphere-redis

# Remove container (if needed)
docker rm -f meal-sphere-redis
```

### Option 2: Install Redis Locally (macOS)

Using Homebrew:

```bash
# Install Redis
brew install redis

# Start Redis service
brew services start redis

# Or run Redis manually
redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

Then add to your `.env` file:
```env
REDIS_URL=redis://localhost:6379
```

**Redis Commands:**
```bash
# Start Redis
brew services start redis

# Stop Redis
brew services stop redis

# Restart Redis
brew services restart redis

# Check Redis status
brew services info redis
```

### Option 3: Disable Caching (Development Only)

If you don't want to use Redis in development:

```env
DISABLE_CACHE=true
```

This will disable all caching and suppress the warnings.

---

## 🚀 Production Setup

### Option 1: Upstash (Recommended - Free Tier Available)

[Upstash](https://upstash.com/) provides serverless Redis with a generous free tier, perfect for Next.js deployments.

**Steps:**

1. **Sign up** at [upstash.com](https://upstash.com/)
2. **Create a new Redis database**
   - Choose a region close to your deployment
   - Select "Global" for multi-region support (optional)
3. **Copy the connection string**
   - Go to your database → "Details" tab
   - Copy the "UPSTASH_REDIS_REST_URL" or connection string
4. **Add to your production environment variables:**

```env
REDIS_URL=rediss://default:YOUR_PASSWORD@YOUR_ENDPOINT.upstash.io:6379
```

**Upstash Features:**
- ✅ Free tier: 10,000 commands/day
- ✅ Serverless (pay per use)
- ✅ Global replication
- ✅ TLS/SSL by default
- ✅ REST API support

### Option 2: Redis Cloud (Redis Labs)

[Redis Cloud](https://redis.com/try-free/) offers managed Redis hosting.

**Steps:**

1. **Sign up** at [redis.com](https://redis.com/try-free/)
2. **Create a subscription** (free tier available)
3. **Create a database**
4. **Get connection details:**
   - Endpoint
   - Port
   - Password
5. **Add to production environment:**

```env
REDIS_URL=redis://default:YOUR_PASSWORD@YOUR_ENDPOINT:PORT
```

### Option 3: AWS ElastiCache

For AWS deployments:

1. **Create ElastiCache cluster** in AWS Console
2. **Configure security groups** to allow access from your app
3. **Get the endpoint** from the cluster details
4. **Add to environment:**

```env
REDIS_URL=redis://YOUR_ELASTICACHE_ENDPOINT:6379
```

### Option 4: Railway / Render / Fly.io

Most cloud platforms offer Redis add-ons:

**Railway:**
```bash
railway add redis
# Connection string automatically added to environment
```

**Render:**
- Add Redis service from dashboard
- Copy connection string to environment variables

**Fly.io:**
```bash
flyctl redis create
# Follow prompts and copy connection string
```

---

## 🔧 Configuration

### Environment Variables

Add to your `.env` file (local) or deployment platform (production):

```env
# Required: Redis connection URL
REDIS_URL=redis://localhost:6379

# Optional: Disable caching entirely
# DISABLE_CACHE=true
```

### Vercel Deployment

1. Go to your project settings on Vercel
2. Navigate to **Environment Variables**
3. Add `REDIS_URL` with your production Redis URL
4. Redeploy your application

### Other Platforms

Similar process for other platforms:
- **Netlify**: Site settings → Environment variables
- **Railway**: Variables tab in your project
- **Render**: Environment tab in your service
- **AWS Amplify**: Environment variables in app settings

---

## ✅ Testing Your Setup

### Test Local Connection

```bash
# Start your dev server
pnpm dev

# You should see in the terminal:
# ✅ Redis connected successfully

# If you see warnings, Redis is not configured
```

### Test Redis Manually

```bash
# Connect to Redis CLI
redis-cli

# Or for remote Redis
redis-cli -u redis://your-redis-url

# Test commands
127.0.0.1:6379> PING
PONG
127.0.0.1:6379> SET test "Hello Redis"
OK
127.0.0.1:6379> GET test
"Hello Redis"
127.0.0.1:6379> DEL test
(integer) 1
```

### Monitor Cache in Your App

Once Redis is configured, your app will automatically cache:
- API responses
- Database queries
- Session data
- Analytics data

---

## 🎯 Recommended Setup

**For Development:**
- Use Docker Redis (easiest) or local Redis via Homebrew
- Connection: `redis://localhost:6379`

**For Production:**
- Use **Upstash** (free tier, serverless, perfect for Next.js)
- Connection: `rediss://default:PASSWORD@ENDPOINT.upstash.io:6379`

---

## 🐛 Troubleshooting

### Warning: "REDIS_URL not configured"

**Solution:** Add `REDIS_URL` to your `.env` file or set `DISABLE_CACHE=true`

### Error: "Connection refused"

**Solution:** 
- Make sure Redis is running: `redis-cli ping`
- Check if Docker container is running: `docker ps`
- Verify the port (default: 6379)

### Error: "Authentication failed"

**Solution:**
- Check your password in the connection string
- Format: `redis://default:PASSWORD@host:port`

### Slow Performance

**Solution:**
- Check Redis memory usage: `redis-cli INFO memory`
- Clear cache if needed: `redis-cli FLUSHALL`
- Increase memory limits in Redis config

---

## 📚 Additional Resources

- [Redis Documentation](https://redis.io/docs/)
- [Upstash Documentation](https://docs.upstash.com/)
- [ioredis (Node.js client)](https://github.com/redis/ioredis)
- [Next.js Caching Guide](https://nextjs.org/docs/app/building-your-application/caching)

---

## 🔄 Quick Start Commands

```bash
# Local Development (Docker)
docker run -d --name meal-sphere-redis -p 6379:6379 redis:7-alpine
echo "REDIS_URL=redis://localhost:6379" >> .env
pnpm dev

# Or disable caching
echo "DISABLE_CACHE=true" >> .env
pnpm dev
```

That's it! Your Redis cache should now be configured and working. 🎉
