import { Template, waitForPort } from "e2b";

export const template = Template()
  .fromNodeImage("20-slim")
  .aptInstall("curl")
  .setWorkdir("/home/user/app")
  .copy("package.json", "/home/user/app/package.json")
  .copy("package-lock.json", "/home/user/app/package-lock.json")
  .runCmd("npm install")
  .copy("src/", "/home/user/app/src/")
  .copy("index.html", "/home/user/app/index.html")
  .copy("vite.config.ts", "/home/user/app/vite.config.ts")
  .setStartCmd(
    "npx vite --host 0.0.0.0 --port 5173",
    waitForPort(5173),
  );
