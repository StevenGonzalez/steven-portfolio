# Steven Gonzalez Portfolio

Personal portfolio and writing site for Steven Gonzalez, a senior software engineer focused on reliable systems, pragmatic architecture, and software other engineers can safely change.

Live site: [stevengonzalez.dev](https://stevengonzalez.dev)

## Overview

This repo powers my portfolio site built with Next.js, TypeScript, and MDX. It is where I showcase project case studies, write about software delivery and architecture, and open with a small painted world: a sky island drawn live in Canvas 2D with no images or libraries.

The goal was not to ship a generic portfolio template. I wanted something that felt deliberate, fast, and personal while still being easy to maintain.

## What You Will Find Here

- A homepage hero that paints a living sky island in layered canvases, with the static layers painted in a Web Worker
- Project case studies covering mobile, SaaS, desktop, and platform engineering work
- An Insights section for longer-form writing on architecture, delivery, and engineering tradeoffs
- Data-driven content structures for projects and writing

## Stack

- Next.js 16
- React 19
- TypeScript
- MDX
- Yarn

## Local Development

```bash
yarn
yarn dev
```

Open `http://localhost:3000`.

## Scripts

- `yarn dev` - start the local dev server
- `yarn build` - create a production build
- `yarn start` - run the production build locally
- `yarn lint` - run ESLint
- `yarn type-check` - run TypeScript checks
- `yarn validate:content` - validate project and insight content
- `yarn validate:theme` - check that the theme's colour tokens agree
- `yarn validate` - run lint, type-check, and the content and theme checks
- `yarn bench:world` - time the world's frames in headless Firefox against a git revision
- `yarn check:world` - check that the world draws exactly what a git revision drew, canvas by canvas
- `yarn check:sound` - check that the world's sound is exactly what a git revision made, rendered offline

## Content Structure

- `app/` - route-level pages and MDX insight entries
- `components/` - reusable UI and interaction components
- `lib/world/` - the painted world engine behind the homepage hero
- `data/projects.ts` - project case study metadata and long-form content
- `data/insights.ts` - insight metadata
- `scripts/validate-content.mjs` - guards against missing or inconsistent content

## About Me

I work primarily in C# and .NET on the backend, and React, Next.js, and TypeScript on the frontend. I also build mobile experiences with React Native and reach for Python, SQL, and automation when they are the right tools for the job.

I care about readable code, maintainable systems, and practical decisions that hold up in production.

## Connect

- Portfolio: [stevengonzalez.dev](https://stevengonzalez.dev)
- GitHub: [@StevenGonzalez](https://github.com/StevenGonzalez)
- LinkedIn: [sgonzalez-dev](https://www.linkedin.com/in/sgonzalez-dev/)
