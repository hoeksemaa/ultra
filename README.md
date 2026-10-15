# Ultra OP1 fleet console (unofficial demo)

A browser simulation of a fleet console for Ultra's OP1 packing robots at one 3PL warehouse: 10 brands, 20 robots, and remote teleop pilots.

Live: https://ultra-demo-hoeksema.vercel.app

Unofficial demo by [John Hoeksema](https://johnhoeksema.com). Not affiliated with Ultra. All brands, items, and numbers are fictional.

## Use

- A red robot needs a human. Add pilots with + and − under the belt.
- Train the model when new samples come in. Point to the button to see the gain first.
- Click a tote to follow its order.
- Press ? for the short tutorial. Keys: Space (pause), 1/2/3 (speed), +/- (pilots), T (train), R (reset), Cmd/Ctrl+Z (undo a reset), Esc.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy

Vercel project `ultra-demo-hoeksema`. Each merge to `main` deploys to production. Next.js app, client-side simulation, no backend.

## Style

See [STYLE.md](STYLE.md).
