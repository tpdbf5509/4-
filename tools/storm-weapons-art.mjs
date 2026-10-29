/* 새 무기 원화. 실행: ART_NODE_MODULES에 sharp가 있는 node_modules 경로를 지정한다. */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require=createRequire(import.meta.url);
const sharp=require(process.env.ART_NODE_MODULES?path.join(process.env.ART_NODE_MODULES,'sharp'):'sharp');
const out=new URL('../public/assets/game/rpg/weapons/',import.meta.url);
await mkdir(out,{recursive:true});
const defs=`<defs>
<linearGradient id="metal" x1="0" x2="1"><stop stop-color="#131c43"/><stop offset=".4" stop-color="#6777ab"/><stop offset=".56" stop-color="#c4e9ff"/><stop offset=".67" stop-color="#263956"/><stop offset="1" stop-color="#11172b"/></linearGradient>
<linearGradient id="blade" x1="0" x2="1"><stop stop-color="#15798e"/><stop offset=".45" stop-color="#3dd7eb"/><stop offset=".51" stop-color="#f0ffff"/><stop offset=".7" stop-color="#8cfaef"/><stop offset="1" stop-color="#358bba"/></linearGradient>
<linearGradient id="purple" x1="0" y1="1" x2=".4" y2="0"><stop stop-color="#372c6d"/><stop offset=".5" stop-color="#9480f4"/><stop offset="1" stop-color="#dcf9ff"/></linearGradient>
<filter id="glow" x="-.8" y="-.8" width="2.6" height="2.6"><feGaussianBlur stdDeviation="2.1"/></filter>
</defs>`;
const wrap=(body,w=128)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="128" viewBox="0 0 ${w} 128">${defs}${body}</svg>`;
const staff=`<path d="M61 116L60 46L55 40L61 28L68 28L73 40L68 47L67 116Z" fill="url(#metal)" stroke="#182140" stroke-width="2"/>
<path d="M64 112L64 47" stroke="#9bb8ff" stroke-width="2"/><path d="M58 92L70 95M58 98L70 101M58 104L70 107" stroke="#28233f" stroke-width="3"/>
<path d="M63 49L43 32L47 12L55 20L52 30L64 36L76 27L72 15L80 8L87 30L67 49Z" fill="url(#metal)" stroke="#9cafff" stroke-width="1.4"/>
<path d="M64 9L74 24L64 37L55 24Z" fill="#6774ff" filter="url(#glow)"/>
<path d="M64 9L74 24L64 37L55 24Z" fill="url(#purple)" stroke="#e1ffff"/>
<path d="M65 13L61 23L67 23L61 33" fill="none" stroke="#edffff" stroke-width="2"/>
<path d="M43 43L39 32L46 35L43 20M83 45L91 35L85 32L90 22" fill="none" stroke="#878bff" stroke-width="1.5"/>
<circle cx="64" cy="49" r="4" fill="#d9ecff"/>`;
const bow=`<path d="M44 13Q102 26 78 56L72 64L78 72Q102 102 44 115L58 99Q79 88 62 73L58 64L62 55Q79 40 58 29Z" fill="url(#metal)" stroke="#25203f" stroke-width="2"/>
<path d="M45 13Q93 30 72 56M72 72Q93 98 45 115" fill="none" stroke="#a9a5ff" stroke-width="3"/>
<path d="M44 13L52 64L44 115" fill="none" stroke="#c6b5ff" stroke-width="1"/>
<path d="M57 53L73 53L73 76L57 76Z" fill="#262039" stroke="#ad8cce"/><path d="M57 58L73 61M57 64L73 67M57 70L73 73" stroke="#9b82b0"/>
<path d="M42 12L67 12L54 25L57 18Z M42 116L67 116L54 103L57 110Z" fill="url(#purple)" stroke="#ddceff"/>
<path d="M88 34L93 48L84 47L90 58M88 92L94 80L84 81L89 69" fill="none" stroke="#8161ff" stroke-width="2"/>
<path d="M42 64L96 64L87 59M96 64L87 69" fill="none" stroke="#ddeaff" stroke-width="1.5"/>`;
const blade=`<path d="M60 116L59 94L69 94L68 116Z" fill="url(#metal)" stroke="#151e34"/>
<path d="M58 101L69 104M58 107L69 110" stroke="#0b2330" stroke-width="3"/>
<path d="M48 93L55 86L72 86L81 93L75 98L67 93L59 93L52 98Z" fill="url(#metal)" stroke="#5cc7d9"/>
<path d="M60 87L51 40L64 8L77 40L68 87Z" fill="url(#blade)" stroke="#12364a" stroke-width="1.5"/>
<path d="M64 10L64 86" stroke="#e4ffff" stroke-width="1.5"/>
<path d="M57 47L61 55L58 61L63 71M71 37L66 45L69 52" fill="none" stroke="#f4ffff"/>
<path d="M51 38L49 57L54 63M77 39L80 57L74 67" fill="none" stroke="#47e6f6" stroke-width="1.4"/>
<circle cx="64" cy="90" r="3" fill="#b5ffff"/>`;
const assets={storm_staff:wrap(staff),violet_bow:wrap(bow),azure_dual:wrap(`<g transform="translate(8 -3) rotate(-27 64 64) scale(.84)">${blade}</g><g transform="translate(13 6) rotate(27 64 64) scale(.84)">${blade}</g>`),'azure-dual-held':wrap(`${blade}<g transform="translate(128 0)">${blade}</g>`,256)};
for(const [id,svg] of Object.entries(assets)){
  const original=new URL(`../design/weapons/${id}.svg`,import.meta.url);
  await writeFile(original,svg);await sharp(Buffer.from(svg)).webp({lossless:true}).toFile(fileURLToPath(new URL(`${id}.webp`,out)));
}
