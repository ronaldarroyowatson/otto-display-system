function resolveContractTheme(contract, themeName) {
  const themes = contract?.frontend?.themes;
  if (!themes || typeof themes !== 'object') {
    return null;
  }

  if (themeName && themes[themeName]) {
    return themes[themeName];
  }

  if (contract?.defaultTheme && themes[contract.defaultTheme]) {
    return themes[contract.defaultTheme];
  }

  const first = Object.values(themes)[0];
  return first && typeof first === 'object' ? first : null;
}

export function mergeDesignThemeConfig(baseConfig, designConfig, displayControlContract) {
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

    const contractTheme = resolveContractTheme(displayControlContract, themeName);
    if (contractTheme?.colors?.background) {
      colors.background = contractTheme.colors.background;
    }
    if (contractTheme?.colors?.surface) {
      colors.surface = contractTheme.colors.surface;
    }
    if (contractTheme?.colors?.text) {
      colors.text = contractTheme.colors.text;
    }
    if (contractTheme?.colors?.muted) {
      colors.muted = contractTheme.colors.muted;
    }
    if (contractTheme?.colors?.accent) {
      colors.accent = contractTheme.colors.accent;
    }
    if (contractTheme?.colors?.border) {
      colors.border = contractTheme.colors.border;
    }

    if (contractTheme?.fonts?.body) {
      fonts.body = contractTheme.fonts.body;
      fonts.heading = contractTheme.fonts.body;
    }

    if (contractTheme?.motion?.page) {
      motion.page = contractTheme.motion.page;
    }

    if (contractTheme?.backgrounds?.page) {
      theme.backgrounds = {
        ...(theme.backgrounds ?? {}),
        page: contractTheme.backgrounds.page
      };
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
