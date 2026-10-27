// Generate the static footprint map from Alibaba Cloud DataV provincial GeoJSON.
// Download https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json first,
// then: node scripts/build-travel-map.mjs /path/to/100000_full.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

if (!process.argv[2]) throw new Error('Pass a DataV provincial GeoJSON file.');
const data = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const visited = new Set([110000, 120000, 140000, 150000, 210000, 320000,
  330000, 350000, 360000, 370000, 410000, 420000, 430000, 440000, 450000,
  500000, 510000, 520000, 620000]);
const toXY = ([lon, lat]) => [lon, -180 / Math.PI * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))];
const width = 900, height = 690;
// Preserve the full coastline, islands and maritime boundary geometries.
const rings = (geometry) => geometry.type === 'MultiPolygon' ? geometry.coordinates.flat() : geometry.coordinates;
const all = data.features.flatMap(f => rings(f.geometry).flatMap(r => r.map(toXY)));
const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
const left = Math.min(...xs), right = Math.max(...xs), top = Math.min(...ys), bottom = Math.max(...ys);
const scale = Math.min((width - 48) / (right - left), (height - 56) / (bottom - top));
const offsetX = (width - scale * (right - left)) / 2;
const offsetY = (height - scale * (bottom - top)) / 2;
const project = (coord) => { const [x,y] = toXY(coord); return [offsetX+(x-left)*scale, offsetY+(y-top)*scale]; };
const escape = s => String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const paths = data.features.map(feature => {
  const code = feature.properties.adcode;
  const name = feature.properties.name || '南海诸岛及海域界线';
  const fill = code === 610000 ? '#c35c35' : visited.has(code) ? '#a9c67c' : '#e0e3d5';
  const path = rings(feature.geometry).map(ring => {
    let last;
    const compact = ring.map(project).filter((p, i) => {
      if (!last || i === ring.length-1 || Math.hypot(p[0]-last[0],p[1]-last[1]) > 0.4) { last=p; return true; }
      return false;
    });
    return compact.map((p,i) => `${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join('')+'Z';
  }).join('');
  return `<path d="${path}" fill="${fill}" stroke="#f1f1e8" stroke-width="1" stroke-linejoin="round"><title>${escape(name)}${code===610000?' · 家乡':visited.has(code)?' · 已到访':''}</title></path>`;
}).join('\n');
const labels = data.features.filter(f => visited.has(f.properties.adcode) || f.properties.adcode === 610000).map(f => {
  const coord = f.properties.centroid || f.properties.center;
  const [x,y] = project(coord);
  const name = f.properties.name.replace(/自治区|壮族|回族|维吾尔|省|市/g,'');
  const isTiny = [110000,120000].includes(f.properties.adcode);
  const dx = f.properties.adcode === 110000 ? -29 : f.properties.adcode===120000 ? 25 : 0;
  const dy = f.properties.adcode === 110000 ? -15 : f.properties.adcode===120000 ? 10 : 0;
  return `${isTiny?`<path d="M${x},${y}l${dx},${dy}" fill="none" stroke="#667752" stroke-width=".8"/>`:''}<text x="${x+dx}" y="${y+dy}" text-anchor="middle" font-size="${isTiny?10:11}" fill="${f.properties.adcode===610000?'#fff8e8':'#34452a'}">${name}</text>`;
}).join('\n');
const [homeX,homeY]=project([108.9398,34.3416]);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
<title id="title">黄腾的旅行足迹</title><desc id="desc">以真实省界绘制，绿色为已到访地区，橙色为家乡陕西，标记为西安。</desc>
<rect width="900" height="690" fill="#f1f1e8"/>
<g>${paths}</g>
<g font-family="-apple-system,PingFang SC,Microsoft YaHei,sans-serif">${labels}
<circle cx="${homeX}" cy="${homeY}" r="4" fill="#fff8e8" stroke="#7c321b" stroke-width="1.5"/>
<path d="M${homeX+5},${homeY}h36" stroke="#7c321b" fill="none"/>
<text x="${homeX+44}" y="${homeY+4}" fill="#7c321b" font-size="12" font-weight="600">西安</text>
<text x="30" y="35" fill="#69755d" font-size="10" letter-spacing="2">PLACES / CHINA</text>
</g></svg>`;
const output = fileURLToPath(new URL('../images/travel-china.svg', import.meta.url));
writeFileSync(output, svg);
console.log(`Map generated: ${visited.size} visited regions + Shaanxi home; ${data.features.length} boundary features.`);
