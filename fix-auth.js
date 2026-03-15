const fs=require('fs');
const f='./src/lib/auth.ts';
let c=fs.readFileSync(f,'utf8');
c=c.replace(
  `const clientIp =
          (req?.headers?.get("x-forwarded-for")?.split(",")[0]) ||
          (req?.headers?.get("x-real-ip")) ||
          "unknown";`,
  `let clientIp = "unknown";
        try {
          const h = req?.headers;
          const fwd = typeof h?.get === "function" ? h.get("x-forwarded-for") : (h as any)?.["x-forwarded-for"];
          const real = typeof h?.get === "function" ? h.get("x-real-ip") : (h as any)?.["x-real-ip"];
          clientIp = (typeof fwd === "string" ? fwd.split(",")[0] : real) || "unknown";
        } catch { /* ignore */ }`
);
fs.writeFileSync(f,c);
console.log('auth.ts patched');
