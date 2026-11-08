import fs from 'fs';
import path from 'path';

export interface StoreCredential {
  storeName: string;
  storeId: string;
  userId: string;
  password: string;
}

export function normalizeStoreId(storeName: string): string {
  const clean = storeName.replace(/[\s　]+/g, '').replace(/店$/, '');
  if (clean.includes('本厚木') || clean === 'hon-atsugi') return 'hon-atsugi';
  if (clean.includes('港南台') || clean === 'konandai') return 'konandai';
  if (clean.includes('横須賀') || clean === 'yokosuka') return 'yokosuka';
  if (clean.includes('西川口') || clean === 'nishikawaguchi') return 'nishikawaguchi';
  return clean;
}

export function readEnvMap(): Record<string, string> {
  const envMap: Record<string, string> = {};
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const idx = trimmed.indexOf('=');
          if (idx > 0) {
            envMap[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
          }
        }
      });
    }
  } catch (e) {
    console.error('Error reading .env.local:', e);
  }
  return envMap;
}

export function getStoreCredentials(storeName: string): { userId?: string; password?: string } {
  const envMap = readEnvMap();
  const cleanStoreName = storeName.replace(/[\s　]+/g, '');
  const storeBaseName = cleanStoreName.replace(/店$/, '');

  const userId =
    envMap[`INFOMART_USER_ID_${cleanStoreName}`] ||
    envMap[`INFOMART_USER_ID_${storeBaseName}店`] ||
    envMap[`INFOMART_USER_ID_${storeBaseName}`] ||
    process.env[`INFOMART_USER_ID_${cleanStoreName}`] ||
    process.env[`INFOMART_USER_ID_${storeBaseName}店`] ||
    process.env[`INFOMART_USER_ID_${storeBaseName}`] ||
    envMap['INFOMART_USER_ID'] ||
    process.env.INFOMART_USER_ID;

  const password =
    envMap[`INFOMART_PASSWORD_${cleanStoreName}`] ||
    envMap[`INFOMART_PASSWORD_${storeBaseName}店`] ||
    envMap[`INFOMART_PASSWORD_${storeBaseName}`] ||
    process.env[`INFOMART_PASSWORD_${cleanStoreName}`] ||
    process.env[`INFOMART_PASSWORD_${storeBaseName}店`] ||
    process.env[`INFOMART_PASSWORD_${storeBaseName}`] ||
    envMap['INFOMART_PASSWORD'] ||
    process.env.INFOMART_PASSWORD;

  return { userId: userId?.trim(), password: password?.trim() };
}

export function getConfiguredStores(): StoreCredential[] {
  const envMap = readEnvMap();
  const stores: StoreCredential[] = [];
  const knownKeys = Object.keys(envMap);

  for (const key of knownKeys) {
    if (key.startsWith('INFOMART_USER_ID_')) {
      const storeName = key.replace('INFOMART_USER_ID_', '');
      const pwdKey = `INFOMART_PASSWORD_${storeName}`;
      const userId = envMap[key];
      const password = envMap[pwdKey];
      if (userId && password) {
        stores.push({
          storeName: storeName.endsWith('店') ? storeName : `${storeName}店`,
          storeId: normalizeStoreId(storeName),
          userId,
          password
        });
      }
    }
  }

  // If none found with prefix but default exists
  if (stores.length === 0 && (envMap['INFOMART_USER_ID'] || process.env.INFOMART_USER_ID)) {
    const userId = (envMap['INFOMART_USER_ID'] || process.env.INFOMART_USER_ID)!;
    const password = (envMap['INFOMART_PASSWORD'] || process.env.INFOMART_PASSWORD)!;
    stores.push({
      storeName: '本厚木店',
      storeId: 'hon-atsugi',
      userId,
      password
    });
  }

  return stores;
}
