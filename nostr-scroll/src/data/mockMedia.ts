function toDataUri(svg: string): string {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createAvatarDataUri(
  initials: string,
  startColor: string,
  endColor: string,
): string {
  return toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
      <defs>
        <linearGradient id="avatarGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="120" height="120" rx="60" fill="url(#avatarGradient)" />
      <text
        x="50%"
        y="54%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="Avenir Next, Helvetica Neue, sans-serif"
        font-size="42"
        font-weight="700"
        fill="#ffffff"
      >
        ${initials}
      </text>
    </svg>
  `);
}

export function createBannerDataUri(
  title: string,
  startColor: string,
  endColor: string,
  accentColor: string,
): string {
  return toDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 500">
      <defs>
        <linearGradient id="bannerGradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${startColor}" />
          <stop offset="100%" stop-color="${endColor}" />
        </linearGradient>
      </defs>
      <rect width="1500" height="500" fill="url(#bannerGradient)" />
      <circle cx="1280" cy="90" r="220" fill="${accentColor}" opacity="0.18" />
      <circle cx="1040" cy="430" r="180" fill="${accentColor}" opacity="0.12" />
      <path d="M0 370 C260 270 530 460 780 360 S1240 210 1500 290 V500 H0 Z" fill="#0a1118" opacity="0.28" />
      <text
        x="72"
        y="410"
        font-family="Avenir Next, Helvetica Neue, sans-serif"
        font-size="48"
        font-weight="700"
        letter-spacing="1.5"
        fill="rgba(255,255,255,0.82)"
      >
        ${title}
      </text>
    </svg>
  `);
}
