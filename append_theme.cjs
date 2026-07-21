const fs = require('fs');

const theme = {
    colors: {
        'on-primary-fixed': '#001a42', 'error-container': '#93000a', 'surface-bright': '#31394d',
        'tertiary-fixed-dim': '#ffb2b7', 'on-tertiary-fixed': '#40000d', 'error': '#ffb4ab',
        'secondary': '#4edea3', 'surface-variant': '#2d3449', 'inverse-surface': '#dae2fd',
        'on-secondary': '#003824', 'primary-container': '#4d8eff', 'surface-dim': '#0b1326',
        'on-primary-container': '#00285d', 'surface-container': '#171f33', 'surface-panel': '#1e293b',
        'on-surface': '#dae2fd', 'outline': '#8c909f', 'tertiary': '#ffb2b7', 'on-tertiary': '#67001b',
        'surface': '#0b1326', 'on-secondary-container': '#00311f', 'primary-fixed': '#d8e2ff',
        'led-display': '#000000', 'primary': '#adc6ff', 'on-error': '#690005',
        'surface-container-highest': '#2d3449', 'on-primary-fixed-variant': '#004395',
        'on-background': '#dae2fd', 'on-secondary-fixed': '#002113', 'surface-tint': '#adc6ff',
        'on-tertiary-container': '#5b0017', 'secondary-fixed-dim': '#4edea3',
        'primary-fixed-dim': '#adc6ff', 'outline-variant': '#424754', 'on-surface-variant': '#c2c6d6',
        'inverse-primary': '#005ac2', 'surface-container-lowest': '#060e20',
        'on-error-container': '#ffdad6', 'on-secondary-fixed-variant': '#005236',
        'secondary-fixed': '#6ffbbe', 'tertiary-fixed': '#ffdadb', 'on-tertiary-fixed-variant': '#92002a',
        'tertiary-container': '#ff516a', 'surface-container-high': '#222a3d',
        'inverse-on-surface': '#283044', 'surface-border': '#334155', 'surface-container-low': '#131b2e',
        'background': '#0b1326', 'text-muted': '#94a3b8', 'secondary-container': '#00a572',
        'on-primary': '#002e6a'
    },
    spacing: {
        'sidebar-width': '25vw', 'panel-padding': '2rem', 'main-width': '75vw',
        'touch-xl': '96px', 'touch-min': '64px', 'gutter': '1.5rem'
    },
    fontFamily: {
        'headline-lg': 'Hanken Grotesk', 'headline-lg-mobile': 'Hanken Grotesk',
        'button-text': 'Hanken Grotesk', 'body-lg': 'Hanken Grotesk',
        'label-caps': 'JetBrains Mono', 'display-num': 'Hanken Grotesk'
    }
};

let css = '\n@theme {\n';
for (let key in theme.colors) { css += `  --color-${key}: ${theme.colors[key]};\n`; }
for (let key in theme.spacing) { css += `  --spacing-${key}: ${theme.spacing[key]};\n`; }
for (let key in theme.fontFamily) { css += `  --font-${key}: ${theme.fontFamily[key]};\n`; }
css += `  --text-headline-lg: 32px;
  --text-headline-lg--line-height: 40px;
  --text-headline-lg--font-weight: 700;
  --text-headline-lg-mobile: 24px;
  --text-headline-lg-mobile--line-height: 32px;
  --text-headline-lg-mobile--font-weight: 700;
  --text-button-text: 20px;
  --text-button-text--line-height: 24px;
  --text-button-text--letter-spacing: 0.02em;
  --text-button-text--font-weight: 700;
  --text-body-lg: 18px;
  --text-body-lg--line-height: 28px;
  --text-body-lg--font-weight: 500;
  --text-label-caps: 14px;
  --text-label-caps--line-height: 20px;
  --text-label-caps--letter-spacing: 0.1em;
  --text-label-caps--font-weight: 700;
  --text-display-num: 84px;
  --text-display-num--line-height: 90px;
  --text-display-num--letter-spacing: -0.04em;
  --text-display-num--font-weight: 800;
`;
css += '}\n';

fs.appendFileSync('src/style.css', css);
console.log('Appended theme to src/style.css');
