# Bun as package manager

We chose Bun over pnpm/Yarn/npm for console-next. Bun ships native Windows binaries (no WSL2 caveat), a git-diffable text-based `bun.lock` since 1.2, and avoids the Corepack/PnP configuration overhead that Yarn Berry carries. Yarn Berry is still maintained but its ecosystem footprint has shrunk relative to pnpm/Bun, and PnP remains a source of tooling friction.
