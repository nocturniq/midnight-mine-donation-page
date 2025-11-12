import express from "express";
import morgan from "morgan";
import fetch from "node-fetch";
import cors from "cors";

const PORT = process.env.PORT || 4000;
const API_BASE = process.env.API_BASE || "https://scavenger.qa.gd.midnighttge.io";

const app = express();
app.use(morgan("dev"));
app.use(express.json());

app.use(cors({
  origin: [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
  methods: ["POST", "OPTIONS"],
}));

app.post("/api/donate", async (req, res) => {
  try {
    const { destination, origin, signature } = req.body ?? {};
    if (!destination || !origin || !signature) {
      return res.status(400).json({ error: "destination, origin, and signature are required" });
    }

    const base = API_BASE.replace(/\/+$/, "");
    const url = `${base}/donate_to/${encodeURIComponent(destination)}/${encodeURIComponent(origin)}/${encodeURIComponent(signature)}`;

    const upstream = await fetch(url, { method: "POST" });

    const text = await upstream.text();
    res.status(upstream.status).send(text);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Upstream request failed" });
  }
});

app.listen(PORT, () => {
  console.log(`Proxy listening on http://localhost:${PORT}`);
});
