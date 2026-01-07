# Bond Smart Kenya

Instructions to install dependencies and run the React app with Vite.

## Prerequisites

- Node.js 18+ and npm installed.

## Setup

1. Install dependencies:

```
npm install
```

2. Configure environment variables:

Copy the `.env.example` file to `.env` and add your Google Gemini API key:

```
cp .env.example .env
```

Then edit `.env` and replace `your_api_key_here` with your actual Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey).

## Run the dev server

- Start Vite in dev mode (hot reload enabled):

```
npm run dev
```

Vite will print a local URL (typically http://localhost:5173). Open it in your browser.

## Build for production

```
npm run build
```

## Preview the production build locally

```
npm run preview
```

## Lint

```
npm run lint
```
