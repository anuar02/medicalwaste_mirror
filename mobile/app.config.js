const fs = require('fs');
const path = require('path');
const appJson = require('./app.json');

function parseEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    return {};
  }
  const contents = fs.readFileSync(envPath, 'utf8');
  const env = {};
  contents.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) return;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  });
  return env;
}

const env = parseEnv();

module.exports = ({ config }) => ({
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra || {}),
    googleDirectionsApiKey: env.googleDirectionsApiKey || process.env.googleDirectionsApiKey || '',
  },
});
