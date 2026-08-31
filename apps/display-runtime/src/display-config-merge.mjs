export function mergeDesignThemeConfig(baseConfig, designConfig) {
  const nextConfig = JSON.parse(JSON.stringify(baseConfig));
  const themeMap = nextConfig.themes ?? {};

  for (const themeName of Object.keys(themeMap)) {
    const theme = themeMap[themeName];
    if (!theme || typeof theme !== 'object') {
      continue;
    }

    const colors = theme.colors ?? {};
    const fonts = theme.fonts ?? {};
    const motion = theme.motion ?? {};

    if (designConfig?.colors?.primary) {
      colors.accent = colors.accent ?? designConfig.colors.primary;
    }
    if (designConfig?.colors?.surface) {
      colors.surface = designConfig.colors.surface;
    }
    if (designConfig?.colors?.text) {
      colors.text = designConfig.colors.text;
    }
    if (designConfig?.typography?.families?.body) {
      fonts.body = designConfig.typography.families.body;
      fonts.heading = designConfig.typography.families.body;
    }
    if (designConfig?.motion?.durations?.normal) {
      const curve = designConfig.motion.curves?.standard ?? 'ease';
      motion.page = `${designConfig.motion.durations.normal}ms ${curve}`;
    }

    theme.colors = colors;
    theme.fonts = fonts;
    theme.motion = motion;
  }

  nextConfig.dsc = {
    ...(nextConfig.dsc ?? {}),
    theme: nextConfig.dsc?.theme ?? 'midnight'
  };

  return nextConfig;
}
