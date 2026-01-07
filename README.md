# Bond Smart Kenya

<img width="3018" height="1640" alt="image" src="https://github.com/user-attachments/assets/448812ef-b439-4387-8161-65fb6012f32e" />

A tool to analyse treasury bonds offered by the [Central Bank of Kenya](https://www.centralbank.go.ke/securities/treasury-bonds/)

This tool takes the information published on the bond prospectus and surfaces crucial information like:
- Yield
- Net returns %
- Taxable amount
- Z-Scores to compare performance with the rest of the market
- Yield History (W.I.P requires historical data)
- AI Powered analysis breakdown
- Learning center to debunk all the terminology

## Installation
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
