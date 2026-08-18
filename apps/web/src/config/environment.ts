// Checked against MODE not DEV: Vitest also reports DEV === true, and the
// devtools throw "Devtools is not mounted" on teardown under jsdom.
export const isDev = (): boolean => import.meta.env.MODE === "development";
