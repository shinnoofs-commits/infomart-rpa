import fs from 'fs';

function normalize(s: string) {
  if (!s) return '';
  return s
    .normalize('NFKC')
    .replace(/[！-～]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0))
    .replace(/[ー―‐‑–—−〜~]/g, '-')
    .replace(/【.*?】|\[.*?\]/g, '')
    .replace(/^[a-z0-9][\)）]/gi, '')
    .replace(/すき焼(?!き)/g, 'すき焼き')
    .replace(/唐揚(?!げ)/g, '唐揚げ')
    .replace(/油揚(?!げ)/g, '油揚げ')
    .replace(/厚揚(?!げ)/g, '厚揚げ')
    .replace(/串焼(?!き)/g, '串焼き')
    .replace(/蒲焼(?!き)/g, '蒲焼き')
    .replace(/照焼(?!き)/g, '照焼き')
    .replace(/塩焼(?!き)/g, '塩焼き')
    .replace(/角切(?!り)/g, '角切り')
    .replace(/薄切(?!り)/g, '薄切り')
    .replace(/[\s　]+/g, '')
    .toLowerCase();
}

function extractModelTokens(str: string) {
  const norm = normalize(str);
  const tokens = norm.match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [];
  return tokens.filter(t => !/^\d{3,}$/.test(t));
}

function extractColor(str: string) {
  const norm = normalize(str);
  const colors = ['赤', '黒', '金', '白', '青', '緑', '茶', '黄'];
  return colors.filter(c => norm.includes(c.toLowerCase()));
}

function extractPartType(str: string) {
  const norm = normalize(str);
  const isLid = /蓋|oc/.test(norm);
  const isBase = /本体|底|身/.test(norm);
  const isInner = /内装|中皿/.test(norm);
  return { isLid, isBase, isInner };
}

const BRAND_REGEX = /創味|ベストシェフ|ベスト|京果食品|ケンコー|キユーピー|味の素|ニッスイ|マルちゃん|ヤマサ|サンジルシ|マヨネーズ|アグリトラスト|スミダパッケージ|ワン折重|ジョイフーズ|ユニフーズ|ヤマガタ|東洋水産|マルハニチロ|日本食研|タイヨー|オーロラ|aurora|j-オイル|jオイル|ワイエムフーズ|フーディーズ/gi;

function extractCoreNouns(str: string) {
  const norm = normalize(str).replace(BRAND_REGEX, '');
  const nouns = norm.match(/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]{2,}/g) || [];
  return nouns;
}

function calcSimilarity(target: string, candidate: string) {
  const normTarget = normalize(target);
  const normCand = normalize(candidate);

  // 1. Strict Part Type Check (Lid vs Base)
  const partT = extractPartType(target);
  const partC = extractPartType(candidate);
  if (partT.isLid && partC.isBase) return 0;
  if (partT.isBase && partC.isLid) return 0;

  // 2. Strict Color Check
  const colorT = extractColor(target);
  const colorC = extractColor(candidate);
  if (colorT.length > 0 && colorC.length > 0) {
    const hasCommonColor = colorT.some(c => colorC.includes(c));
    if (!hasCommonColor) return 0;
  }

  // 3. Strict Model Token Check (e.g. 10b vs 10-oc)
  const modelsT = extractModelTokens(target);
  const modelsC = extractModelTokens(candidate);
  if (modelsT.length > 0 && modelsC.length > 0) {
    for (const mT of modelsT) {
      if (mT.length >= 2 && !modelsC.some(mC => mC.includes(mT) || mT.includes(mC))) {
        return 0;
      }
    }
  }

  // 4. Strict Core Specific Noun Check (Candidate must contain at least one core noun of Target)
  const nounsT = extractCoreNouns(target);
  if (nounsT.length > 0) {
    const hasAnyCoreNoun = nounsT.some(n => normCand.includes(n));
    if (!hasAnyCoreNoun) {
      return 0;
    }
  }

  const cleanT = normTarget.replace(/高(?=嵌合蓋)/g, '').replace(/\d+(?:入り|入|枚|本|個|g|kg|ml)/gi, '');
  const cleanC = normCand.replace(/高(?=嵌合蓋)/g, '').replace(/\d+(?:入り|入|枚|本|個|g|kg|ml)/gi, '');

  if (cleanC.includes(cleanT) || cleanT.includes(cleanC)) return 1.0;

  const bgT = new Set<string>();
  for (let i = 0; i < cleanT.length - 1; i++) bgT.add(cleanT.slice(i, i + 2));
  const bgC = new Set<string>();
  for (let i = 0; i < cleanC.length - 1; i++) bgC.add(cleanC.slice(i, i + 2));

  let intersection = 0;
  for (const b of bgT) if (bgC.has(b)) intersection++;
  const dice = (2 * intersection) / (bgT.size + bgC.size);

  return dice;
}

const testCases = [
  {
    target: 'あじかん　博多明太マヨソース',
    candidate: 'あじかん　博多明太マヨソース'
  },
  {
    target: 'ベスト　北海道産黒毛和牛すき焼の具',
    candidate: 'ベスト　北海道産黒毛和牛すき焼きの具'
  },
  {
    target: 'ベスト　北海道産黒毛和牛すき焼の具',
    candidate: 'B）北海道産黒毛和牛すき焼きの具【取寄品平日中２日】'
  },
  {
    target: '比叡ゆば本京生麩青もみじ麩（合着）スライス500G',
    candidate: '比叡ゆば本京生麩　青もみじ麩（合着）ｽﾗｲｽ500G'
  }
];

for (const tc of testCases) {
  const score = calcSimilarity(tc.target, tc.candidate);
  console.log(`Target: "${tc.target}"`);
  console.log(`Cand:   "${tc.candidate}"`);
  console.log(`Score:  ${score}\n`);
}
