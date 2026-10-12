import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const src = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (f: string) => readFileSync(join(src, f), "utf8");

describe("layouts largos têm classe para 768px", () => {
  it.each([
    [ "modules/Overview.tsx", /className="kpi-grid"/ ],
    [ "modules/Overview.tsx", /className="ov-split"[^>]*gridTemplateColumns: "1\.5fr 1fr"/ ],
    [ "modules/Overview.tsx", /className="ov-split"[^>]*gridTemplateColumns: "1fr 1\.4fr"/ ],
    [ "modules/Overview.tsx", /className="[^"]*ov-kv3/ ],
    [ "modules/Overview.tsx", /className="[^"]*ov-event/ ],
    [ "modules/setup/ProvisionCity.tsx", /className="form-2col"/ ],
    [ "modules/setup/MfaEnroll.tsx", /className="form-2col"/ ]
  ])("%s %s", (file, re) => expect(read(file)).toMatch(re));

  it("global.css importa responsive.css logo depois dos tokens", () => {
    expect(read("theme/global.css")).toMatch(/@import "\.\/vendor\/tokens\.css";\s*@import "\.\/responsive\.css";/);
  });
});
