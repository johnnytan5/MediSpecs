# RemindAR - Smart Glass Solution for Alzheimer's Care

> "Taking care of my grandfather is hard, because he'll often forget if he'd took his medicine or lunch, let alone remembering our faces" - one of our team members recalled.

RemindAR is an innovative smart glass solution designed to support senior Alzheimer's patients and their caregivers. Developed by Pacific KMPP, RemindAR enables senior citizens to live with dignity while providing caregivers peace of mind by offloading their caregiving burden.

## 🎯 Mission

Alzheimer patients face daily challenges, but the burden that caregivers face is an even tougher challenge. Missed medications, missed meals, aimless strolls forgetting their way back - the list goes on. RemindAR addresses these critical issues through technology that enhances independence and safety.

## ✨ Key Features

### Enhanced Memory and Cognitive Support for Seniors
- **Reminders**: Medication and meal reminders set by caregivers
- **Cognitive Training**: Interactive exercises to maintain cognitive function
- **Family Member Face Recognition**: AI-powered recognition to help identify loved ones

### Proactive Crisis Prevention
- **Geo-Fencing Alerts**: Notifications when the user leaves designated safe zones
- **Fall Detection**: Automatic detection of falls with instant alerts
- **Instant Caregiver Alerts**: Real-time notifications for emergencies

### Efficient Caregiving
- **Timelapse Recording Playback**: Review daily activities and routines
- **Live GPS Tracking**: Real-time location monitoring for safety
- **Live Camera Stream**: Remote monitoring capability for caregivers

## 🛠️ Tech Stack

- **Framework**: Next.js 15.5.5 with App Router
- **Language**: TypeScript
- **UI Library**: React 19.1.0
- **Styling**: Tailwind CSS v4
- **3D Graphics**: Three.js with React Three Fiber (for smart glass visualization)
- **Icons**: Lucide React
- **Build Tool**: Turbopack (for faster development)
- **Backend**: AWS Lambda with API Gateway

## 🚀 Getting Started

### 1. Navigate to the Frontend Directory

```bash
cd frontend
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages including:
- Next.js 15.5.5
- React 19.1.0
- TypeScript
- Tailwind CSS
- Three.js and React Three Fiber
- Lucide React
- And other dependencies

### 3. Environment Variables Setup

Create a `.env.local` file in the `frontend` directory:

```bash
# AWS Lambda API Gateway Base URL
NEXT_PUBLIC_API_BASE_URL=https://your-api-gateway-url.execute-api.region.amazonaws.com/stage
```

**Important**: Replace the placeholder URL with your actual AWS API Gateway endpoint URL. The format typically looks like:
```
https://{api-id}.execute-api.{region}.amazonaws.com/{stage}
```

Example:
```bash
NEXT_PUBLIC_API_BASE_URL=https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod
```

### 4. Run the Development Server

```bash
npm run dev
```

The application will start on [http://localhost:3000](http://localhost:3000)

Open your browser to see the RemindAR interface.

## 📁 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── auth/              # Authentication pages
│   │   ├── calendar/          # Calendar and scheduling
│   │   ├── cognitive/         # Cognitive training exercises
│   │   ├── location/          # GPS tracking and geo-fencing
│   │   ├── reminders/         # Medication and meal reminders
│   │   ├── scan/              # Face recognition scanning
│   │   ├── videos/            # Timelapse playback
│   │   ├── mock-fall/         # Fall detection testing
│   │   ├── profile/            # User profile management
│   │   ├── page.tsx           # Home/dashboard page
│   │   └── layout.tsx         # Root layout with auth provider
│   ├── components/
│   │   ├── BottomNav.tsx      # Bottom navigation bar
│   │   ├── ClientLayout.tsx   # Client-side layout wrapper
│   │   └── Model3D.tsx        # 3D smart glass model viewer
│   ├── context/
│   │   └── AuthContext.tsx    # Authentication context provider
│   ├── lib/
│   │   └── api.ts             # API client for AWS Lambda Gateway
│   └── types/
│       └── googlemaps.d.ts    # Google Maps type definitions
├── public/                    # Static assets (3D models, images)
│   ├── brille.glb            # Smart glass 3D model
│   └── hitem3d.glb           # Additional 3D assets
├── package.json
├── next.config.ts
└── tsconfig.json
```

## 🔧 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## 🌐 AWS Lambda API Gateway Configuration

The frontend communicates with the backend through AWS Lambda functions via API Gateway. The API client is configured in `src/lib/api.ts` and uses the `NEXT_PUBLIC_API_BASE_URL` environment variable.

### API Endpoints

The application uses the following API endpoints:
- `/auth/login` - User authentication
- `/auth/register` - User registration
- `/auth/logout` - User logout
- `/auth/me` - Get current user information

Additional endpoints for reminders, location tracking, cognitive training, and other features are configured through the API Gateway.

### Setting Up API Gateway

1. Deploy your Lambda functions to AWS
2. Create an API Gateway REST API or HTTP API
3. Configure CORS settings to allow requests from your frontend domain
4. Set up API routes that proxy to your Lambda functions
5. Copy the API Gateway endpoint URL to your `.env.local` file

## 🎮 How to Operate

### For Caregivers

1. **Authentication**: Register or log in through the auth page
2. **Set Reminders**: Navigate to the reminders page to set medication and meal reminders
3. **Configure Geo-Fencing**: Set up safe zones in the location page
4. **Monitor Activity**: View timelapse recordings and live camera streams
5. **Track Location**: Monitor real-time GPS location in the location page
6. **Manage Profile**: Update patient information in the profile section

### For Senior Users (Smart Glass Interface)

1. **Receive Reminders**: Visual and audio reminders appear automatically
2. **Cognitive Training**: Access cognitive exercises through the cognitive page
3. **Face Recognition**: The scan feature helps identify family members
4. **Emergency Detection**: Automatic fall detection triggers caregiver alerts

## 🔒 Security Notes

- Authentication tokens are stored in localStorage
- All API requests include Bearer token authentication
- Ensure your API Gateway has proper CORS and authentication configured
- Use HTTPS in production environments

The production build will be optimized and ready for deployment to platforms like Vercel, AWS Amplify, or any Node.js hosting service.

## 🚢 Deployment

### Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme):

1. Push your code to GitHub
2. Import your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy

### Environment Variables in Production

Make sure to set `NEXT_PUBLIC_API_BASE_URL` in your deployment platform's environment variables settings.

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) - 3D graphics in React
- [AWS API Gateway](https://docs.aws.amazon.com/apigateway/) - API Gateway documentation
- [Tailwind CSS](https://tailwindcss.com/docs) - Utility-first CSS framework

## 👥 Team

Developed by **Pacific KMPP** - Committed to improving the lives of Alzheimer's patients and their caregivers through innovative technology.

---

**RemindAR** - Enabling dignity, providing peace of mind.
