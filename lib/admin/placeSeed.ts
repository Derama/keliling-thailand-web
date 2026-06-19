// Placeholder attractions derived from the public tour data (lib/tours.ts).
// Imported once into the `places` table so the owner can replace the stock
// photos with real ones. Public /tours pages keep reading tours.ts directly;
// these DB rows feed the admin gallery + itinerary builder.

import { cities } from "@/lib/tours";
import { cityNames, attractionNames } from "@/lib/translations";

export interface SeedPlace {
  city: string;
  name: string;
  image_url: string | null;
  description: string | null;
}

// Short Indonesian blurbs per attraction id. Used to pre-fill descriptions on
// import. Keep ~1 sentence, factual marketing tone.
const DESCRIPTIONS: Record<string, string> = {
  // Bangkok
  "grand-palace":
    "Istana kerajaan ikonik Bangkok dengan kuil Wat Phra Kaew dan Buddha Zamrud.",
  "wat-pho": "Kuil Buddha berbaring raksasa dan pusat pijat tradisional Thailand.",
  "wat-arun": "Kuil Fajar di tepi Sungai Chao Phraya, indah saat matahari terbenam.",
  chatuchak: "Pasar akhir pekan terbesar di Asia dengan ribuan kios beragam barang.",
  asiatique: "Kawasan tepi sungai untuk belanja, kuliner, dan kincir ria malam hari.",
  "icon-siam": "Mal mewah tepi sungai dengan pasar terapung dalam ruangan dan air mancur menari.",
  chinatown: "Yaowarat, surga kuliner jalanan dengan toko emas dan suasana ramai.",
  "jim-thompson-house":
    "Rumah museum kayu jati milik raja sutra Thailand dengan koleksi seni Asia.",
  "wat-saket": "Gunung Emas dengan stupa keemasan dan panorama kota dari puncaknya.",
  "erawan-shrine": "Kuil Brahma populer di pusat kota, terkenal akan doa dan tarian persembahan.",
  "khaosan-road": "Jalan backpacker legendaris yang hidup dengan bar, jajanan, dan musik.",
  "lumpini-park": "Taman kota hijau untuk jogging, perahu bebek, dan melihat biawak liar.",
  "wat-benchamabophit":
    "Kuil Marmer bergaya megah dari marmer Carrara putih, ikon di uang koin Thailand.",
  "safari-world": "Taman safari dan marine park dengan satwa lepas serta pertunjukan lumba-lumba.",
  "siam-paragon": "Mal mewah pusat kota dengan akuarium Sea Life dan deretan butik kelas atas.",
  // Pattaya
  "sanctuary-of-truth": "Istana kayu ukir raksasa di tepi laut, mahakarya seni dan religi.",
  "nong-nooch": "Taman botani luas dengan kebun bergaya Prancis dan pertunjukan gajah.",
  "walking-street": "Jalan hiburan malam paling terkenal di Pattaya, penuh bar dan kelab.",
  "coral-island": "Koh Larn, pulau berpasir putih untuk snorkeling dan watersport.",
  "floating-market": "Pasar terapung empat wilayah dengan kuliner dan kerajinan khas Thailand.",
  "big-buddha-hill": "Bukit Wat Phra Yai dengan patung Buddha emas dan pemandangan teluk Pattaya.",
  "jomtien-beach": "Pantai panjang yang lebih tenang, cocok untuk berenang dan bersantai.",
  "ramayana-water-park": "Taman air terbesar di Thailand dengan seluncuran dan kolam ombak.",
  "cartoon-network-amazone":
    "Taman air bertema (kini Columbia Pictures Aquaverse) dengan wahana seru keluarga.",
  "mini-siam": "Taman miniatur landmark Thailand dan dunia dalam skala mungil.",
  // Ayutthaya
  "wat-mahathat": "Reruntuhan kuil dengan kepala Buddha terbungkus akar pohon yang ikonik.",
  "wat-chaiwatthanaram": "Kompleks kuil megah tepi sungai bergaya Khmer, memukau saat senja.",
  "bang-pa-in-palace": "Istana musim panas kerajaan dengan paviliun cantik di tengah kolam.",
  "wat-phra-si-sanphet": "Kuil kerajaan dengan tiga stupa ikonik di bekas istana Ayutthaya.",
  "ayutthaya-floating-market": "Pasar terapung wisata dengan kuliner, kerajinan, dan pertunjukan budaya.",
  "wat-lokayasutharam": "Patung Buddha berbaring raksasa di udara terbuka, ikon Ayutthaya.",
  "ayutthaya-historical-park": "Taman bersejarah Situs Warisan Dunia UNESCO dengan reruntuhan candi kuno.",
  "wat-yai-chai-mongkhon": "Kuil dengan stupa tinggi dan deretan patung Buddha berjubah kuning.",
  "wat-phanan-choeng": "Kuil tua dengan patung Buddha duduk raksasa yang sangat dihormati.",
  "chao-sam-phraya-museum": "Museum nasional yang menyimpan harta dan artefak emas Ayutthaya.",
  // Kanchanaburi
  "bridge-river-kwai": "Jembatan bersejarah Death Railway dari masa Perang Dunia II.",
  "erawan-falls": "Air terjun tujuh tingkat berair toska di Taman Nasional Erawan.",
  "death-railway": "Jalur kereta bersejarah menyusuri tebing dan Sungai Kwai.",
  "hellfire-pass": "Jalur kenangan dan museum yang menghormati pekerja paksa Death Railway.",
  "tiger-cave-temple": "Wat Tham Suea, kuil di bukit dengan Buddha besar dan panorama sawah.",
  "jeath-museum": "Museum perang yang merekam sejarah tawanan dan Death Railway.",
  "war-cemetery": "Pemakaman perang tertata rapi untuk para tawanan Sekutu PD II.",
  "sai-yok-national-park": "Taman nasional dengan air terjun, gua, dan rakit menyusuri sungai.",
  "mon-bridge": "Jembatan kayu buatan tangan terpanjang di Thailand di Sangkhla Buri.",
  // Hua Hin
  "cicada-market": "Pasar seni malam dengan kerajinan, kuliner, dan pertunjukan musik.",
  "huahin-beach": "Pantai resor klasik kerajaan, lembut dan cocok untuk keluarga.",
  "vana-nava": "Taman air bertema hutan dengan seluncuran tertinggi di Thailand.",
  "santorini-park": "Taman hiburan bertema Yunani yang ceria dan instagramable.",
  "monsopra-vineyard": "Kebun anggur Monsoon Valley dengan wisata wine dan pemandangan perbukitan.",
  "huahin-railway-station": "Stasiun kereta bersejarah dengan paviliun kerajaan bergaya klasik.",
  "phraya-nakhon-cave": "Gua dengan paviliun kerajaan Kuha Karuhas yang disinari cahaya matahari.",
  "mrigadayavan-palace": "Istana kayu jati tepi pantai bergaya kolonial milik Raja Rama VI.",
  "khao-sam-roi-yot": "Taman nasional pesisir dengan tebing kapur, rawa, dan gua indah.",
  // Khao Yai
  "khao-yai-national-park": "Taman nasional warisan dunia dengan satwa liar, air terjun, dan hutan hujan.",
  "pb-valley-winery": "Kebun anggur perintis Khao Yai dengan tur dan cicip wine.",
  "primo-piazza": "Desa bergaya Toskana Italia dengan menara, alpaka, dan domba.",
  "the-bloom": "Taman bunga dan anggrek warna-warni yang asri di Khao Yai.",
  "farm-chokchai": "Peternakan sapi legendaris dengan tur, susu segar, dan steak.",
  "midwinter-green": "Restoran dan taman bertema Eropa dengan suasana sejuk pegunungan.",
  "muak-lek-waterfall": "Air terjun sejuk dikelilingi hutan rindang, cocok untuk piknik.",
};

// Curated photos downloaded to public/places/<cityId>/<attractionId>.jpg.
// Remote (Unsplash) tours.ts URLs map to the local copy; already-local
// images (e.g. /huahin-station.jpg) are kept as-is.
function seedImage(cityId: string, attractionId: string, src: string): string {
  return src.startsWith("http") ? `/places/${cityId}/${attractionId}.jpg` : src;
}

/** Flatten tours.ts attractions into placeholder place rows. */
export function seedPlaces(): SeedPlace[] {
  const out: SeedPlace[] = [];
  for (const c of cities) {
    const cityName = cityNames[c.id] ?? c.id;
    for (const a of c.attractions) {
      out.push({
        city: cityName,
        name: attractionNames[a.id] ?? a.id,
        image_url: seedImage(c.id, a.id, a.image),
        description: DESCRIPTIONS[a.id] ?? null,
      });
    }
  }
  return out;
}
