// Writes lib/world/starcat.js and lib/world/starnames.js, the real stars the night sky is drawn from, from the Yale
// Bright Star Catalogue (5th revised edition, public domain), with the IAU's constellation boundaries (Roman 1987) for
// the few stars the catalogue doesn't put in a constellation. Download them once and pass their paths:
//
//   curl -o bsc5.gz https://cdsarc.cds.unistra.fr/ftp/V/50/catalog.gz
//   curl -o bounds.dat https://cdsarc.cds.unistra.fr/ftp/VI/42/data.dat
//   node scripts/make-starcat.mjs bsc5.gz bounds.dat
//
// Every star down to magnitude 4.5 goes in, brightest first: its right ascension and declination for J2000 to a
// twentieth of a degree and its magnitude to a tenth, five characters a star. Each also gets a name and a constellation
// for the label, in starnames.js, which the page loads without the positions.

import { readFileSync, writeFileSync } from "node:fs";
import { format, resolveConfig } from "prettier";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { rootDir } from "./world-harness.mjs";

const FAINTEST = 4.5;

// The IAU's abbreviation of each constellation, its Latin genitive and its English name.
const CONS = {
  And: ["Andromedae", "Andromeda"],
  Ant: ["Antliae", "the Air Pump"],
  Aps: ["Apodis", "the Bird of Paradise"],
  Aqr: ["Aquarii", "the Water Bearer"],
  Aql: ["Aquilae", "the Eagle"],
  Ara: ["Arae", "the Altar"],
  Ari: ["Arietis", "the Ram"],
  Aur: ["Aurigae", "the Charioteer"],
  Boo: ["Bootis", "the Herdsman"],
  Cae: ["Caeli", "the Chisel"],
  Cam: ["Camelopardalis", "the Giraffe"],
  Cnc: ["Cancri", "the Crab"],
  CVn: ["Canum Venaticorum", "the Hunting Dogs"],
  CMa: ["Canis Majoris", "the Great Dog"],
  CMi: ["Canis Minoris", "the Little Dog"],
  Cap: ["Capricorni", "the Sea Goat"],
  Car: ["Carinae", "the Keel"],
  Cas: ["Cassiopeiae", "Cassiopeia"],
  Cen: ["Centauri", "the Centaur"],
  Cep: ["Cephei", "Cepheus"],
  Cet: ["Ceti", "the Whale"],
  Cha: ["Chamaeleontis", "the Chameleon"],
  Cir: ["Circini", "the Compasses"],
  Col: ["Columbae", "the Dove"],
  Com: ["Comae Berenices", "Berenice’s Hair"],
  CrA: ["Coronae Australis", "the Southern Crown"],
  CrB: ["Coronae Borealis", "the Northern Crown"],
  Crv: ["Corvi", "the Crow"],
  Crt: ["Crateris", "the Cup"],
  Cru: ["Crucis", "the Southern Cross"],
  Cyg: ["Cygni", "the Swan"],
  Del: ["Delphini", "the Dolphin"],
  Dor: ["Doradus", "the Swordfish"],
  Dra: ["Draconis", "the Dragon"],
  Equ: ["Equulei", "the Little Horse"],
  Eri: ["Eridani", "the River"],
  For: ["Fornacis", "the Furnace"],
  Gem: ["Geminorum", "the Twins"],
  Gru: ["Gruis", "the Crane"],
  Her: ["Herculis", "Hercules"],
  Hor: ["Horologii", "the Clock"],
  Hya: ["Hydrae", "the Water Snake"],
  Hyi: ["Hydri", "the Little Water Snake"],
  Ind: ["Indi", "the Indian"],
  Lac: ["Lacertae", "the Lizard"],
  Leo: ["Leonis", "the Lion"],
  LMi: ["Leonis Minoris", "the Little Lion"],
  Lep: ["Leporis", "the Hare"],
  Lib: ["Librae", "the Scales"],
  Lup: ["Lupi", "the Wolf"],
  Lyn: ["Lyncis", "the Lynx"],
  Lyr: ["Lyrae", "the Lyre"],
  Men: ["Mensae", "the Table Mountain"],
  Mic: ["Microscopii", "the Microscope"],
  Mon: ["Monocerotis", "the Unicorn"],
  Mus: ["Muscae", "the Fly"],
  Nor: ["Normae", "the Carpenter’s Square"],
  Oct: ["Octantis", "the Octant"],
  Oph: ["Ophiuchi", "the Serpent Bearer"],
  Ori: ["Orionis", "the Hunter"],
  Pav: ["Pavonis", "the Peacock"],
  Peg: ["Pegasi", "Pegasus"],
  Per: ["Persei", "Perseus"],
  Phe: ["Phoenicis", "the Phoenix"],
  Pic: ["Pictoris", "the Painter’s Easel"],
  Psc: ["Piscium", "the Fishes"],
  PsA: ["Piscis Austrini", "the Southern Fish"],
  Pup: ["Puppis", "the Stern"],
  Pyx: ["Pyxidis", "the Compass Box"],
  Ret: ["Reticuli", "the Net"],
  Sge: ["Sagittae", "the Arrow"],
  Sgr: ["Sagittarii", "the Archer"],
  Sco: ["Scorpii", "the Scorpion"],
  Scl: ["Sculptoris", "the Sculptor"],
  Sct: ["Scuti", "the Shield"],
  Ser: ["Serpentis", "the Serpent"],
  Sex: ["Sextantis", "the Sextant"],
  Tau: ["Tauri", "the Bull"],
  Tel: ["Telescopii", "the Telescope"],
  Tri: ["Trianguli", "the Triangle"],
  TrA: ["Trianguli Australis", "the Southern Triangle"],
  Tuc: ["Tucanae", "the Toucan"],
  UMa: ["Ursae Majoris", "the Great Bear"],
  UMi: ["Ursae Minoris", "the Little Bear"],
  Vel: ["Velorum", "the Sails"],
  Vir: ["Virginis", "the Maiden"],
  Vol: ["Volantis", "the Flying Fish"],
  Vul: ["Vulpeculae", "the Little Fox"],
};

const GREEK = {
  Alp: "Alpha",
  Bet: "Beta",
  Gam: "Gamma",
  Del: "Delta",
  Eps: "Epsilon",
  Zet: "Zeta",
  Eta: "Eta",
  The: "Theta",
  Iot: "Iota",
  Kap: "Kappa",
  Lam: "Lambda",
  Mu: "Mu",
  Nu: "Nu",
  Xi: "Xi",
  Omi: "Omicron",
  Pi: "Pi",
  Rho: "Rho",
  Sig: "Sigma",
  Tau: "Tau",
  Ups: "Upsilon",
  Phi: "Phi",
  Chi: "Chi",
  Psi: "Psi",
  Ome: "Omega",
};

// The names the IAU has approved for the brighter stars, by Bayer letter and constellation as the catalogue writes them.
const NAMES = {
  "Alp CMa": "Sirius",
  "Alp Car": "Canopus",
  "Alp Boo": "Arcturus",
  Alp1Cen: "Rigil Kentaurus",
  "Alp Lyr": "Vega",
  "Alp Aur": "Capella",
  "Bet Ori": "Rigel",
  "Alp CMi": "Procyon",
  "Alp Eri": "Achernar",
  "Alp Ori": "Betelgeuse",
  "Bet Cen": "Hadar",
  "Alp Aql": "Altair",
  "Alp Tau": "Aldebaran",
  "Alp Sco": "Antares",
  "Alp Vir": "Spica",
  "Bet Gem": "Pollux",
  "Alp PsA": "Fomalhaut",
  "Bet Cru": "Mimosa",
  "Alp Cyg": "Deneb",
  Alp1Cru: "Acrux",
  Alp2Cen: "Toliman",
  "Alp Leo": "Regulus",
  "Eps CMa": "Adhara",
  "Alp Gem": "Castor",
  "Gam Cru": "Gacrux",
  "Lam Sco": "Shaula",
  "Gam Ori": "Bellatrix",
  "Bet Tau": "Elnath",
  "Bet Car": "Miaplacidus",
  "Eps Ori": "Alnilam",
  "Alp Gru": "Alnair",
  "Zet Ori": "Alnitak",
  "Eps UMa": "Alioth",
  "Alp Per": "Mirfak",
  "Alp UMa": "Dubhe",
  "Del CMa": "Wezen",
  "Eps Sgr": "Kaus Australis",
  "Eta UMa": "Alkaid",
  "The Sco": "Sargas",
  "Eps Car": "Avior",
  "Bet Aur": "Menkalinan",
  "Alp TrA": "Atria",
  "Gam Gem": "Alhena",
  "Alp Pav": "Peacock",
  "Del Vel": "Alsephina",
  "Bet CMa": "Mirzam",
  "Alp Hya": "Alphard",
  "Alp UMi": "Polaris",
  Gam1Leo: "Algieba",
  "Alp Ari": "Hamal",
  "Bet Cet": "Diphda",
  "Sig Sgr": "Nunki",
  "The Cen": "Menkent",
  "Alp And": "Alpheratz",
  "Bet And": "Mirach",
  "Kap Ori": "Saiph",
  "Bet UMi": "Kochab",
  "Bet Gru": "Tiaki",
  "Alp Oph": "Rasalhague",
  "Bet Per": "Algol",
  Gam1And: "Almach",
  "Bet Leo": "Denebola",
  "Gam Cen": "Muhlifain",
  "Zet Pup": "Naos",
  "Iot Car": "Aspidiske",
  "Alp CrB": "Alphecca",
  "Lam Vel": "Suhail",
  "Zet UMa": "Mizar",
  "Gam Cyg": "Sadr",
  "Alp Cas": "Schedar",
  "Gam Dra": "Eltanin",
  "Del Ori": "Mintaka",
  "Bet Cas": "Caph",
  "Del Sco": "Dschubba",
  "Eps Sco": "Larawag",
  "Bet UMa": "Merak",
  "Eps Boo": "Izar",
  "Eps Peg": "Enif",
  "Kap Sco": "Girtab",
  "Alp Phe": "Ankaa",
  "Gam UMa": "Phecda",
  "Eta Oph": "Sabik",
  "Bet Peg": "Scheat",
  "Eta CMa": "Aludra",
  "Alp Cep": "Alderamin",
  "Kap Vel": "Markeb",
  "Eps Cyg": "Aljanah",
  "Alp Peg": "Markab",
  "Alp Cet": "Menkar",
  "Del Leo": "Zosma",
  Bet1Sco: "Acrab",
  "Alp Ser": "Unukalhai",
  "Bet Ari": "Sheratan",
  "Gam Peg": "Algenib",
  "Del Cas": "Ruchbah",
  "Bet Lib": "Zubeneschamali",
  Alp2Lib: "Zubenelgenubi",
  "Bet Oph": "Cebalrai",
  "Bet Dra": "Rastaban",
  "Bet Lep": "Nihal",
  "Alp Lep": "Arneb",
  "Gam Aql": "Tarazed",
  "Del Cap": "Deneb Algedi",
  "Alp Col": "Phact",
  "Bet Aqr": "Sadalsuud",
  "Alp Aqr": "Sadalmelik",
  "Bet Crv": "Kraz",
  "Gam Crv": "Gienah",
  "Del Crv": "Algorab",
  Alp1Her: "Rasalgethi",
  "Bet Her": "Kornephoros",
  "Eps Gem": "Mebsuta",
  "Mu Gem": "Tejat",
  "Eta Gem": "Propus",
  "Eps Vir": "Vindemiatrix",
  "Alp Tri": "Mothallah",
  "Bet Lyr": "Sheliak",
  "Gam Lyr": "Sulafat",
  Bet1Cyg: "Albireo",
  "Del Cyg": "Fawaris",
  "Zet Aql": "Okab",
  "Bet Cap": "Dabih",
  "Eta Peg": "Matar",
  "Eta Tau": "Alcyone",
  "Bet Boo": "Nekkar",
  "Gam Boo": "Seginus",
  "Eta Dra": "Athebyne",
  "Bet CMi": "Gomeisa",
  "Lam Sgr": "Kaus Borealis",
  "Del Sgr": "Kaus Media",
  "Zet Sgr": "Ascella",
  "Tau Sco": "Paikauhale",
  "Sig Sco": "Alniyat",
  "Ups Sco": "Lesath",
  "Pi Sco": "Fang",
  "Eta Boo": "Muphrid",
  "Gam UMi": "Pherkad",
  "Bet Cep": "Alfirk",
  "Gam Cep": "Errai",
  "Del UMa": "Megrez",
  "Mu UMa": "Tania Australis",
  "Iot UMa": "Talitha",
};

// And for a few with only a Flamsteed number.
const FLAMSTEED_NAMES = {
  "41 Ari": "Bharani",
  "17 Tau": "Electra",
  "20 Tau": "Maia",
  "27 Tau": "Atlas",
  "46 LMi": "Praecipua",
  "53 Eri": "Sceptrum",
};

// Bright southern stars the catalogue gives no Bayer letter, with the Latin letter Lacaille gave each.
const LACAILLE = { 3659: "a", 3803: "N", 4050: "q", 4140: "p", 6630: "G" };
// T Coronae Borealis, a nova the catalogue lists at its brightest; most of the time it is far too faint to see.
const SKIP = new Set([5958]);

// Ninety characters that need no escaping in a string in double quotes, and the number each stands for.
const DIGITS = [...Array(92)].map((_, i) => String.fromCharCode(35 + i)).filter((ch) => ch !== "\\" && ch !== "`");
const enc = (n, width) => {
  let out = "";
  for (let i = 0; i < width; i++, n = Math.floor(n / 90)) out = DIGITS[n % 90] + out;
  return out;
};

const [file, boundsFile] = process.argv.slice(2);
if (!file || !boundsFile) {
  console.error("Pass the paths of the catalogue and the constellation boundaries: see the top of this script.");
  process.exit(2);
}

// The constellation a place in the sky is in. The boundaries run along lines of right ascension and declination for
// the equinox of 1875, so the place is precessed back to then (Meeus, Astronomical Algorithms, 21.4), and the first
// strip in the table, from the north down, that holds it names it.
const bounds = readFileSync(boundsFile, "latin1")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => [Number(l.slice(1, 8)) * 15, Number(l.slice(9, 16)) * 15, Number(l.slice(17, 25)), l.slice(26, 29)]);
const RAD = Math.PI / 180;
function conAt(ra, dec) {
  const t = (2405889.258550475 - 2451545) / 36525,
    zeta = ((2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) / 3600) * RAD,
    z = ((2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) / 3600) * RAD,
    th = ((2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) / 3600) * RAD;
  const a = ra * RAD + zeta,
    d = dec * RAD;
  const A = Math.cos(d) * Math.sin(a),
    B = Math.cos(th) * Math.cos(d) * Math.cos(a) - Math.sin(th) * Math.sin(d),
    C = Math.sin(th) * Math.cos(d) * Math.cos(a) + Math.cos(th) * Math.sin(d);
  const ra0 = ((((Math.atan2(A, B) + z) / RAD) % 360) + 360) % 360,
    dec0 = Math.asin(C) / RAD;
  return bounds.find(([lo, hi, south]) => dec0 >= south && ra0 >= lo && ra0 < hi)[3];
}
const raw = readFileSync(file);
const text = (file.endsWith(".gz") ? gunzipSync(raw) : raw).toString("latin1");

const stars = [];
for (const line of text.split("\n")) {
  // A few entries are novae and galaxies the catalogue keeps a number for, with no position or magnitude.
  if (line.length < 107 || !line.slice(75, 77).trim() || !line.slice(102, 107).trim()) continue;
  const mag = Number(line.slice(102, 107));
  if (mag > FAINTEST) continue;
  const ra = (Number(line.slice(75, 77)) + Number(line.slice(77, 79)) / 60 + Number(line.slice(79, 83)) / 3600) * 15;
  const dec =
    (line[83] === "-" ? -1 : 1) *
    (Number(line.slice(84, 86)) + Number(line.slice(86, 88)) / 60 + Number(line.slice(88, 90)) / 3600);
  const hr = Number(line.slice(0, 4));
  if (SKIP.has(hr)) continue;
  // A star with no Bayer letter or Flamsteed number has no constellation in the catalogue either, so the boundaries
  // place it. They agree with the catalogue for every star it does place.
  const given = line.slice(11, 14).trim(),
    con = conAt(ra, dec);
  if (given && given !== con) throw new Error(`HR ${hr} is in ${given}, not ${con} as the boundaries have it`);
  const bayer = line.slice(7, 11);
  if (!CONS[con]) throw new Error(`No constellation called ${con}, in: ${line.slice(0, 14)}`);
  stars.push({ ra, dec, mag, con, bayer, flamsteed: line.slice(4, 7).trim(), hr });
}
stars.sort((a, b) => a.mag - b.mag || a.hr - b.hr);

const packed = stars
  .map(
    (s) =>
      enc(Math.round(s.ra * 20) % 7200, 2) +
      enc(Math.round((s.dec + 90) * 20), 2) +
      enc(Math.round((s.mag + 1.5) * 10), 1),
  )
  .join("");

// The label's two lines for each star: its Bayer or Flamsteed name, as "Alpha Lyrae", and the name the IAU gave it, or
// which constellation it is in.
const used = new Set();
const labels = stars.map((s) => {
  const key = `${s.bayer.slice(0, 4)}${s.con}`.replace(/^(\w+) {1,2}/, "$1 ");
  const letter = GREEK[s.bayer.slice(0, 3).trim()];
  const index = s.bayer[3].trim();
  const latin = letter
    ? `${letter}${index ? "⁰¹²³⁴⁵⁶⁷⁸⁹"[index] : ""} ${CONS[s.con][0]}`
    : LACAILLE[s.hr]
      ? `${LACAILLE[s.hr]} ${CONS[s.con][0]}`
      : s.flamsteed
        ? `${s.flamsteed} ${CONS[s.con][0]}`
        : `HR ${s.hr}`;
  const name =
    NAMES[key] ??
    NAMES[`${s.bayer.slice(0, 3).trim()} ${s.con}`] ??
    (letter ? undefined : FLAMSTEED_NAMES[`${s.flamsteed} ${s.con}`]);
  if (name) used.add(name);
  return [latin, name ?? null, s.con];
});
const missing = [...Object.values(NAMES), ...Object.values(FLAMSTEED_NAMES)].filter((n) => !used.has(n));

const head = (what) =>
  `// ${what}\n// Written by scripts/make-starcat.mjs from the Yale Bright Star Catalogue (5th revised edition, public domain). Don't\n// edit it by hand: run the script again.\n`;
const write = async (file, text) => {
  const at = path.join(rootDir, file);
  writeFileSync(at, await format(text, { ...(await resolveConfig(at)), filepath: at }));
};
await write(
  "lib/world/starcat.js",
  `${head("Every star down to magnitude 4.5, brightest first.")}
// Five characters a star, each a digit in base 90 counting from "#": right ascension in twentieths of a degree (two
// digits), declination in twentieths of a degree north of the south pole (two) and magnitude in tenths above -1.5.
export const STARS =
  "${packed}";

// The digit each character stands for.
export const digit = (s, i) => s.charCodeAt(i) - (s.charCodeAt(i) > 96 ? 37 : s.charCodeAt(i) > 92 ? 36 : 35);
`,
);
const conNames = Object.fromEntries([...new Set(labels.map((l) => l[2]))].map((c) => [c, CONS[c][1]]));
await write(
  "lib/world/starnames.js",
  `${head("What the label says about each star, in the order of STARS in starcat.js.")}
// Each is its Bayer or Flamsteed name, the name the IAU gave it if it has one, and its constellation.
export const STAR_NAMES = ${JSON.stringify(labels)};

// The English name of each of those constellations.
export const CON_NAMES = ${JSON.stringify(conNames)};
`,
);
console.log(`${stars.length} stars, ${labels.length} named for the label, ${packed.length} characters.`);
if (missing.length) console.log(`Names never matched: ${missing.join(", ")}`);
