const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3001;

const IMMICH_URL = process.env.IMMICH_URL || "";
const IMMICH_API_KEY = process.env.IMMICH_API_KEY || "";

if (!IMMICH_URL) {
  console.error(
    "ERROR: IMMICH_URL is not set. Set it via environment variable, e.g.:\n" +
      "  IMMICH_URL=http://your-immich-server:2283"
  );
  process.exit(1);
}

if (!IMMICH_API_KEY) {
  console.error(
    "ERROR: IMMICH_API_KEY is not set. Set it via environment variable.\n" +
      "  Generate one in Immich: User Settings → API Keys → New API Key"
  );
  process.exit(1);
}

const immichHeaders = {
  "x-api-key": IMMICH_API_KEY,
  Accept: "application/json",
};

// In production, serve the React build
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/dist")));
}

app.use(cors());

// Cache user map (ownerId -> name) so we don't refetch every time
let usersCache = null;
let usersCacheTime = 0;
const USERS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

let usersListCache = null;

async function getUsers() {
  if (usersCache && Date.now() - usersCacheTime < USERS_CACHE_TTL) {
    return { map: usersCache, list: usersListCache };
  }
  try {
    const res = await fetch(`${IMMICH_URL}/api/users`, {
      headers: immichHeaders,
    });
    if (!res.ok) return { map: usersCache || {}, list: usersListCache || [] };
    const users = await res.json();
    const map = {};
    const list = [];
    for (const u of users) {
      const name = u.name || u.email || "Unknown";
      map[u.id] = name;
      list.push({ id: u.id, name, email: u.email });
    }
    usersCache = map;
    usersListCache = list;
    usersCacheTime = Date.now();
    return { map, list };
  } catch {
    return { map: usersCache || {}, list: usersListCache || [] };
  }
}

// List available users
app.get("/api/users", async (req, res) => {
  try {
    const { list } = await getUsers();
    res.json(list);
  } catch (err) {
    console.error("Failed to fetch users:", err.message);
    res.status(502).json({ error: "Failed to connect to Immich" });
  }
});

// Cache of asset IDs per user from timeline buckets
let assetIndexCache = {}; // userId -> { ids: [...], time: timestamp }
const ASSET_INDEX_TTL = 10 * 60 * 1000; // 10 minutes

// Build an index of image asset IDs for a given user using the timeline API
async function getAssetIndex(userId) {
  const cached = assetIndexCache[userId];
  if (cached && Date.now() - cached.time < ASSET_INDEX_TTL) {
    return cached;
  }

  // Get all monthly buckets for the user
  const bucketsUrl = new URL(`${IMMICH_URL}/api/timeline/buckets`);
  bucketsUrl.searchParams.set("size", "MONTH");
  bucketsUrl.searchParams.set("userId", userId);

  const bucketsRes = await fetch(bucketsUrl.toString(), {
    headers: immichHeaders,
  });
  if (!bucketsRes.ok) return cached || { ids: [], dates: [], time: 0 };
  const buckets = await bucketsRes.json();

  // Pick random buckets to sample from (don't download everything)
  const shuffled = [...buckets].sort(() => Math.random() - 0.5);
  const sampled = shuffled.slice(0, 6); // sample up to 6 months

  const ids = [];
  const dates = [];
  const ownerIds = [];

  for (const bucket of sampled) {
    const bucketUrl = new URL(`${IMMICH_URL}/api/timeline/bucket`);
    bucketUrl.searchParams.set("size", "MONTH");
    bucketUrl.searchParams.set("timeBucket", bucket.timeBucket);
    bucketUrl.searchParams.set("userId", userId);

    const bucketRes = await fetch(bucketUrl.toString(), {
      headers: immichHeaders,
    });
    if (!bucketRes.ok) continue;
    const data = await bucketRes.json();

    // Columnar format: data.id[], data.isImage[], data.fileCreatedAt[], data.ownerId[]
    if (data.id && data.isImage) {
      for (let i = 0; i < data.id.length; i++) {
        if (data.isImage[i]) {
          ids.push(data.id[i]);
          dates.push(data.fileCreatedAt[i]);
          ownerIds.push(data.ownerId[i]);
        }
      }
    }
  }

  const result = { ids, dates, ownerIds, time: Date.now() };
  assetIndexCache[userId] = result;
  return result;
}

// Fetch random assets from Immich using the timeline API (supports all users)
// Optional query param: userIds (comma-separated) to filter by owner
app.get("/api/random", async (req, res) => {
  const count = parseInt(req.query.count) || 12;
  const userIds = req.query.userIds
    ? req.query.userIds.split(",").filter(Boolean)
    : null;

  try {
    const { map: userMap, list: userList } = await getUsers();
    const targetUsers = userIds || userList.map((u) => u.id);

    // Build asset index for each target user in parallel
    const indices = await Promise.all(
      targetUsers.map((uid) => getAssetIndex(uid))
    );

    // Merge all candidate IDs
    const candidates = [];
    for (const idx of indices) {
      for (let i = 0; i < idx.ids.length; i++) {
        candidates.push({
          id: idx.ids[i],
          fileCreatedAt: idx.dates[i],
          ownerId: idx.ownerIds[i],
        });
      }
    }

    if (candidates.length === 0) {
      return res.json([]);
    }

    // Randomly sample
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    // Fetch full asset details for each selected ID
    const assets = await Promise.all(
      selected.map(async (c) => {
        try {
          const r = await fetch(
            `${IMMICH_URL}/api/assets/${c.id}`,
            { headers: immichHeaders }
          );
          if (!r.ok) return null;
          const asset = await r.json();
          return {
            ...asset,
            ownerName: userMap[asset.ownerId] || null,
            immichUrl: `${IMMICH_URL}/photos/${c.id}`,
          };
        } catch {
          return null;
        }
      })
    );

    const images = assets
      .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b.fileCreatedAt).getTime() -
          new Date(a.fileCreatedAt).getTime()
      );

    res.json(images);
  } catch (err) {
    console.error("Failed to fetch random assets:", err.message);
    res.status(502).json({ error: "Failed to connect to Immich" });
  }
});

// Proxy thumbnail requests
app.get("/api/assets/:id/thumbnail", async (req, res) => {
  const { id } = req.params;
  const size = req.query.size || "thumbnail";
  try {
    const response = await fetch(
      `${IMMICH_URL}/api/assets/${encodeURIComponent(id)}/thumbnail?size=${size}`,
      { headers: { "x-api-key": IMMICH_API_KEY } }
    );
    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch thumbnail");
    }
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error("Failed to fetch thumbnail:", err.message);
    res.status(502).send("Failed to connect to Immich");
  }
});

// Proxy original image requests
app.get("/api/assets/:id/original", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(
      `${IMMICH_URL}/api/assets/${encodeURIComponent(id)}/original`,
      { headers: { "x-api-key": IMMICH_API_KEY } }
    );
    if (!response.ok) {
      return res.status(response.status).send("Failed to fetch original");
    }
    const contentType = response.headers.get("content-type");
    if (contentType) res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error("Failed to fetch original:", err.message);
    res.status(502).send("Failed to connect to Immich");
  }
});

// SPA fallback (production)
if (process.env.NODE_ENV === "production") {
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/dist/index.html"));
  });
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
  console.log(`Proxying Immich at ${IMMICH_URL}`);
});
