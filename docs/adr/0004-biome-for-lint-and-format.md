# Biome for linting, formatting, and import ordering

We chose Biome over ESLint+Prettier and over the Oxc toolchain (oxlint+oxfmt). For a from-scratch project with no legacy ESLint plugin dependencies to preserve, Biome's single Rust binary and single config file win on speed and simplicity; the smaller plugin ecosystem is the accepted trade-off. Biome's `assist.actions.source.organizeImports` is enabled, giving automatic import ordering on format.
