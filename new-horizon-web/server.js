import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const dist = join(__dirname, "dist");

app.use(express.static(dist));

// SPA fallback — navigation routes serve index.html so client-side routing works.
// Missing static assets must remain 404s instead of receiving HTML.
app.use((req, res) => {
  if (req.path.includes(".")) {
    res.sendStatus(404);
    return;
  }
  res.sendFile(join(dist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
