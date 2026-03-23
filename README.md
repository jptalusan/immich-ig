# Immich IG

An Instagram-style photo gallery that displays randomly sampled images from your self-hosted [Immich](https://immich.app/) instance.

## Features

- Infinite-scroll feed with random photos sorted by date
- Multi-user support with toggleable user filter (cached in browser)
- Click any photo to view full resolution in a lightbox
- "View this day" link opens the photo directly in Immich
- EXIF metadata display (location, camera, date)

## Requirements

- A running Immich instance
- An **admin** API key (required to view photos from all users)

### Getting your API key

In the Immich web UI: click your avatar (top right) > **Account Settings** > **API Keys** > **New API Key**

## Quick start with Docker

```yaml
services:
  immich-ig:
    image: linusmotu/immich-ig:latest
    ports:
      - "3001:3001"
    environment:
      - IMMICH_URL=http://your-immich-server:2283
      - IMMICH_API_KEY=your-api-key-here
    restart: unless-stopped
```

Both `IMMICH_URL` and `IMMICH_API_KEY` are **required**. The container will exit with an error if either is missing.

| Variable | Description | Example |
|---|---|---|
| `IMMICH_URL` | Full URL to your Immich instance | `http://192.168.1.100:2283` |
| `IMMICH_API_KEY` | Admin API key from Immich | `QvIzg0...` |

Then visit `http://your-server:3001`.

## Local development

```bash
cp .env.example .env
# Edit .env with your IMMICH_URL and IMMICH_API_KEY

npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
npm run dev
```

Visit `http://localhost:5173`.

## Immich API endpoints used

All read-only (GET):

| Endpoint | Purpose |
|---|---|
| `/api/users` | List users for the filter panel |
| `/api/timeline/buckets` | Discover monthly photo buckets per user |
| `/api/timeline/bucket` | Get asset IDs from a specific month |
| `/api/assets/{id}` | Get full asset metadata |
| `/api/assets/{id}/thumbnail` | Get thumbnail for the feed |
| `/api/assets/{id}/original` | Get full-res image for lightbox |

No write/delete operations are performed.
