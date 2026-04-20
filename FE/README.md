# HANGUL Learning App - Frontend

A Next.js 14 application for learning the Korean language (Hangul) with interactive features.

## Features

- 📷 **Camera Vocabulary Detection** - Detect objects and learn Korean words
- ✏️ **Handwriting Practice** - Practice writing Hangul characters
- 🎤 **Pronunciation Training** - Record and get feedback on pronunciation
- 🎮 **Interactive Games** - Quiz, Listening, Matching, Speed tests
- 📊 **Progress Tracking** - Monitor your learning journey
- 👥 **Community Feed** - Share achievements and compete

## Tech Stack

- **Framework**: Next.js 14
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui
- **State Management**: Zustand
- **Storage**: IndexedDB + localStorage
- **HTTP Client**: Axios

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Main application pages
├── layouts/        # Page layouts
├── routes/         # Route configuration
├── services/       # API service calls
├── store/          # Zustand state management
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── types/          # TypeScript type definitions
├── assets/         # Images, icons, fonts
└── styles/         # Global styles
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
cd FE
npm install
```

### Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_FLASK_API_URL=http://localhost:5001
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Key Files

- **`src/store/`** - Zustand stores for auth, vocabulary, and progress
- **`src/services/api.ts`** - API service wrapper
- **`src/pages/`** - Main feature pages (home, quiz, handwriting, etc.)
- **`next.config.js`** - Next.js configuration

## API Documentation

See the Backend README for API endpoints documentation.

## Contributing

Follow the project structure and TypeScript conventions.

## License

MIT
