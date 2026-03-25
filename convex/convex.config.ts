import rag from "@convex-dev/rag/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();
app.use(rag);

export default app;
