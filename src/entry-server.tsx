import { createHandler, StartServer } from "@solidjs/start/server";

export default createHandler(() => (
  <StartServer
    document={({ assets, children, scripts }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Flower Power · garden planner for Indiana yards</title>
          <meta name="description" content="Turn photos of your yard into a watercolor garden plan. Place Indiana native plants and watch the beds grow through the seasons and years, in 2D and 3D." />
          <meta name="theme-color" content="#45704f" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="Flower Power · see your garden grow before you plant it" />
          <meta property="og:description" content="Turn photos of your yard into a watercolor garden plan with Indiana native plants, in 2D and 3D." />
          <link
            rel="icon"
            href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Cg fill='%23c06a9f'%3E%3Cellipse cx='32' cy='14' rx='7' ry='12'/%3E%3Cellipse cx='32' cy='50' rx='7' ry='12'/%3E%3Cellipse cx='14' cy='32' rx='12' ry='7'/%3E%3Cellipse cx='50' cy='32' rx='12' ry='7'/%3E%3Cellipse cx='19' cy='19' rx='7' ry='12' transform='rotate(-45 19 19)'/%3E%3Cellipse cx='45' cy='45' rx='7' ry='12' transform='rotate(-45 45 45)'/%3E%3Cellipse cx='45' cy='19' rx='7' ry='12' transform='rotate(45 45 19)'/%3E%3Cellipse cx='19' cy='45' rx='7' ry='12' transform='rotate(45 19 45)'/%3E%3C/g%3E%3Ccircle cx='32' cy='32' r='10' fill='%23f2c14e'/%3E%3C/svg%3E"
          />
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Architects+Daughter&family=Figtree:wght@400;500;600&display=swap" />
          {assets}
        </head>
        <body>
          <div id="app">{children}</div>
          {scripts}
        </body>
      </html>
    )}
  />
));
