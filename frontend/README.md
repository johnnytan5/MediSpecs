# Remind AR - Your Daily AI Companion

This is a [Next.js](https://nextjs.org) project for Remind AR, a daily AI companion app with reminders, family tracking, and cognitive health monitoring.

## Prerequisites

Before you begin, ensure you have the following installed:

### 1. Install Node.js

**Option A: Download from Official Website**

1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version (recommended)
3. Run the installer and follow the setup wizard
4. Verify installation by running:
   ```bash
   node --version
   npm --version
   ```

**Option B: Using Package Managers**

**On macOS (using Homebrew):**

```bash
brew install node
```

**On Ubuntu/Debian:**

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**On Windows (using Chocolatey):**

```bash
choco install nodejs
```

## Getting Started

### 1. Go into Repo

cd RemindAR/frontend

````

### 2. Install Dependencies
```bash
npm install
````

This will install all required packages including:

- Next.js 15.5.5
- React 19.1.0
- TypeScript
- Tailwind CSS
- Lucide React (for icons)
- And other dependencies

### 3. Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Chat page with Dr. Whiskers
│   │   ├── scan/
│   │   │   └── page.tsx      # Food scanner
│   │   ├── calendar/
│   │   │   └── page.tsx      # Food calendar
│   │   ├── profile/
│   │   │   └── page.tsx      # User profile
│   │   └── layout.tsx        # Root layout
│   └── components/
│       └── BottomNav.tsx     # Bottom navigation
├── public/                   # Static assets
└── package.json             # Dependencies
```

## Features

- **Chat with Dr. Whiskers**: AI-powered medical cat assistant
- **Food Scanner**: Camera-based food recognition and calorie tracking
- **Food Calendar**: Daily nutrition tracking and meal planning
- **User Profile**: Medical information and settings management
- **Responsive Design**: Mobile-first approach with Tailwind CSS

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Troubleshooting

### Common Issues

**1. Node.js not found:**

```bash
# Check if Node.js is installed
node --version
# If not installed, follow the Node.js installation steps above
```

**2. npm install fails:**

```bash
# Clear npm cache
npm cache clean --force
# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json
# Reinstall
npm install
```

**3. Port 3000 already in use:**

```bash
# Kill process using port 3000
npx kill-port 3000
# Or use a different port
npm run dev -- -p 3001
```

## Tech Stack

- **Framework**: Next.js 15.5.5 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Linting**: ESLint with Next.js config
- **Build Tool**: Turbopack (for faster development)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
