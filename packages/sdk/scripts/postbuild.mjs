import { writeFileSync } from "node:fs";

// The package is "type": "module", so *.js under dist/cjs would be parsed as ESM
// and choke on require/exports. This marker overrides that dir back to CommonJS.
writeFileSync(new URL("../dist/cjs/package.json", import.meta.url), JSON.stringify({ type: "commonjs" }) + "\n");
