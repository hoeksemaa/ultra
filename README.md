# Ultra OP1 fleet console (unofficial demo)

A browser simulation of a fleet console for Ultra's OP1 packing robots at one 3PL warehouse: 10 brands, 20 robots, and remote teleop pilots.

Live: https://ultra-demo-hoeksema.vercel.app

Unofficial demo by [John Hoeksema](https://johnhoeksema.com). Not affiliated with Ultra. All brands, items, and numbers are fictional.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. Press `?` in the app for a short tour. Hover anything for details.

Keys: `Space` pause, `1` `2` `3` speed, `?` help, hold `Alt` for stock counts.

## Deploy

Vercel project `ultra-demo-hoeksema`. Each merge to `main` deploys to production. Next.js app, client-side simulation, no backend.

## Style

See [STYLE.md](STYLE.md).
