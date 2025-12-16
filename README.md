
# Momentum POS UI

React 18 + TypeScript + Tailwind CSS single-page experience for the Momentum POS flows. The layout is adapted from the original Figma exploration: https://www.figma.com/design/aDFJEoQykprmzCeC32sY27/Login---Authentication-Screen.

## Project Setup

- `npm install` to install dependencies
- `npm run dev` to start Vite on http://localhost:3000 (auto-opens by default)
- `npm run build` to create a production bundle in `build`
- `npm run preview` to serve the production build locally at http://localhost:4173

The toolchain includes:

- React 18 + React DOM 18
- TypeScript 5 with strict compiler settings
- Vite 6 using the SWC React plugin
- Tailwind CSS 3 with `tailwindcss-animate` for transition primitives

## Deploying to Vercel

1. Push this project to a Git repository (GitHub, GitLab, or Bitbucket).
2. In Vercel, create a **New Project** and import the repository.
3. Use the defaults except:
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. Deploy — Vercel will cache `node_modules` automatically on subsequent builds.

Optional environment configuration:

- Set `NODE_VERSION` to match your local Node release if you rely on features newer than Vercel’s default.
- Configure environment variables in Vercel if you later connect live APIs.

After deployment, Vercel previews will spin up automatically for every pull request; production deploys occur when you merge into the chosen production branch (default `main`).
  