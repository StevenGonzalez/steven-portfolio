// Ambient declaration for global CSS side-effect imports (e.g. `import "./globals.css"`).
// Next/webpack handles these at build time; this satisfies TypeScript's TS2882 check
// for side-effect imports under "moduleResolution": "bundler".
declare module "*.css";
