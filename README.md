# Prayer Companion

A beautiful prayer management app built with Next.js, TypeScript, and Supabase.

## Features

- **Prayer Management**: Organize your prayers into topics and add prayer points
- **Prayer Sessions**: Guided prayer sessions with text-to-speech
- **User Authentication**: Secure login/signup with Supabase
- **Swipe Menu**: Easy navigation from the top-left corner
- **Responsive Design**: Works on desktop and mobile devices

## Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd prayer-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to Settings > API
   - Copy your Project URL and anon public key
   - Create a `.env.local` file in the root directory:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. **Access the Menu**: Click the hamburger menu icon in the top-left corner
2. **Login/Signup**: Click the "Login" button to create an account or sign in
3. **Manage Prayers**: Add prayer points and organize them by topics
4. **Start Praying**: Use the prayer session feature for guided prayer time

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, Radix UI
- **Authentication**: Supabase Auth
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React

## Project Structure

```
├── app/
│   ├── login/          # Login page
│   ├── layout.tsx      # Root layout with auth provider
│   └── page.tsx        # Main prayer app page
├── components/
│   ├── ui/             # Reusable UI components
│   ├── manage-prayers-tab.tsx
│   ├── prayer-session-tab.tsx
│   └── swipe-menu.tsx  # Top-left navigation menu
├── lib/
│   ├── auth-context.tsx # Authentication context
│   ├── supabase.ts     # Supabase client
│   └── types.ts        # TypeScript type definitions
└── public/             # Static assets
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

