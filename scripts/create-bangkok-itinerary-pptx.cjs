const pptxgen = require("pptxgenjs");
const path = require("path");
const fs = require("fs");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "outputs", "bangkok-itinerary-canva-fallback");
fs.mkdirSync(outDir, { recursive: true });

const pptx = new pptxgen();
pptx.layout = "LAYOUT_WIDE";
pptx.author = "Keliling Thailand";
pptx.subject = "Itinerary City Tour Bangkok 3 Hari";
pptx.title = "Bangkok City Tour 3 Hari | 10-13 Juli 2026";
pptx.company = "Keliling Thailand";
pptx.lang = "id-ID";
pptx.theme = {
  headFontFace: "Aptos Display",
  bodyFontFace: "Aptos",
  lang: "id-ID",
};
pptx.defineLayout({ name: "CUSTOM_WIDE", width: 13.333, height: 7.5 });
pptx.layout = "CUSTOM_WIDE";

const C = {
  gold: "FFD030",
  black: "111111",
  dark: "242424",
  gray: "6B7280",
  light: "F7F7F3",
  white: "FFFFFF",
  line: "E7E2D1",
};

const logo = path.join(root, "public", "Full logo.png");

function addChrome(slide, title, kicker) {
  slide.background = { color: C.light };
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 13.333,
    h: 0.18,
    fill: { color: C.gold },
    line: { color: C.gold },
  });
  if (fs.existsSync(logo)) {
    slide.addImage({ path: logo, x: 11.78, y: 0.28, w: 0.72, h: 0.72 });
  } else {
    slide.addText("Keliling Thailand", {
      x: 10.55,
      y: 0.42,
      w: 2.2,
      h: 0.3,
      fontFace: "Aptos Display",
      fontSize: 11,
      bold: true,
      color: C.black,
      align: "right",
    });
  }
  slide.addText(kicker, {
    x: 0.72,
    y: 0.38,
    w: 5.6,
    h: 0.24,
    fontSize: 8.5,
    bold: true,
    color: C.gray,
    margin: 0,
    breakLine: false,
  });
  slide.addText(title, {
    x: 0.68,
    y: 0.7,
    w: 10.25,
    h: 0.52,
    fontFace: "Aptos Display",
    fontSize: 22,
    bold: true,
    color: C.black,
    margin: 0,
    fit: "shrink",
  });
}

function chip(slide, text, x, y, w, fill = C.gold, color = C.black) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x,
    y,
    w,
    h: 0.32,
    rectRadius: 0.06,
    fill: { color: fill },
    line: { color: fill },
  });
  slide.addText(text, {
    x: x + 0.09,
    y: y + 0.075,
    w: w - 0.18,
    h: 0.16,
    fontSize: 7.5,
    bold: true,
    color,
    margin: 0,
    align: "center",
    fit: "shrink",
  });
}

function photoGrid(slide, labels) {
  const startX = 8.0;
  const startY = 1.55;
  const w = 2.05;
  const h = 1.35;
  const gapX = 0.22;
  const gapY = 0.28;
  labels.forEach((label, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = startX + col * (w + gapX);
    const y = startY + row * (h + gapY);
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y,
      w,
      h,
      fill: { color: "FFFFFF", transparency: 12 },
      line: { color: C.line, width: 1.1, dash: "dash" },
    });
    slide.addText("PHOTO", {
      x,
      y: y + 0.42,
      w,
      h: 0.18,
      fontSize: 7,
      bold: true,
      color: C.gray,
      margin: 0,
      align: "center",
    });
    slide.addText(label, {
      x: x + 0.12,
      y: y + 0.72,
      w: w - 0.24,
      h: 0.3,
      fontSize: 9,
      bold: true,
      color: C.black,
      margin: 0,
      align: "center",
      fit: "shrink",
    });
  });
}

function addTimeline(slide, items, x = 0.78, y = 1.42, w = 6.75) {
  const rowH = 0.46;
  slide.addShape(pptx.ShapeType.line, {
    x: x + 0.52,
    y: y + 0.1,
    w: 0,
    h: rowH * items.length - 0.22,
    line: { color: C.gold, width: 1.5 },
  });
  items.forEach((item, i) => {
    const yy = y + i * rowH;
    slide.addShape(pptx.ShapeType.ellipse, {
      x: x + 0.44,
      y: yy + 0.09,
      w: 0.18,
      h: 0.18,
      fill: { color: item.meal ? C.gold : C.white },
      line: { color: C.gold, width: 1.2 },
    });
    slide.addText(item.time, {
      x,
      y: yy,
      w: 0.88,
      h: 0.28,
      fontSize: 8,
      bold: true,
      color: C.black,
      margin: 0,
    });
    slide.addText(item.text, {
      x: x + 1.0,
      y: yy - 0.015,
      w,
      h: 0.34,
      fontSize: 8.6,
      color: C.dark,
      bold: !!item.meal,
      margin: 0,
      fit: "shrink",
    });
  });
}

function addNotes(slide, notes) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 8.0,
    y: 5.05,
    w: 4.32,
    h: 1.34,
    rectRadius: 0.08,
    fill: { color: C.black },
    line: { color: C.black },
  });
  slide.addText(notes, {
    x: 8.24,
    y: 5.24,
    w: 3.86,
    h: 0.86,
    fontSize: 8.5,
    color: C.white,
    margin: 0,
    breakLine: false,
    fit: "shrink",
  });
}

function cover() {
  const slide = pptx.addSlide();
  slide.background = { color: C.black };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 7.5, fill: { color: C.black }, line: { color: C.black } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.28, fill: { color: C.gold }, line: { color: C.gold } });
  if (fs.existsSync(logo)) slide.addImage({ path: logo, x: 0.78, y: 0.66, w: 0.92, h: 0.92 });
  slide.addText("BANGKOK CITY TOUR", {
    x: 0.78,
    y: 2.0,
    w: 8.0,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: C.gold,
    margin: 0,
  });
  slide.addText("Itinerary 3 Hari", {
    x: 0.74,
    y: 2.55,
    w: 7.7,
    h: 0.72,
    fontFace: "Aptos Display",
    fontSize: 34,
    bold: true,
    color: C.white,
    margin: 0,
  });
  slide.addText("10-13 Juli 2026", {
    x: 0.78,
    y: 3.35,
    w: 4.2,
    h: 0.36,
    fontSize: 16,
    color: C.white,
    margin: 0,
  });
  slide.addText("City tour nyaman untuk tamu Indonesia: old town, kuil ikonik, market, kanal, shopping, dan kuliner malam.", {
    x: 0.78,
    y: 4.05,
    w: 6.0,
    h: 0.78,
    fontSize: 14,
    color: "EDEDED",
    margin: 0,
    breakLine: false,
    fit: "shrink",
  });
  ["Grand Palace", "Wat Arun", "IconSiam", "Yaowarat"].forEach((t, i) => {
    slide.addShape(pptx.ShapeType.rect, {
      x: 8.0 + (i % 2) * 2.2,
      y: 1.05 + Math.floor(i / 2) * 1.68,
      w: 1.95,
      h: 1.38,
      fill: { color: i % 2 ? "2A2A2A" : "353535" },
      line: { color: C.gold, width: 0.8 },
    });
    slide.addText(t, {
      x: 8.12 + (i % 2) * 2.2,
      y: 1.95 + Math.floor(i / 2) * 1.68,
      w: 1.7,
      h: 0.22,
      fontSize: 8.5,
      bold: true,
      color: C.white,
      margin: 0,
      align: "center",
      fit: "shrink",
    });
  });
}

function summary() {
  const slide = pptx.addSlide();
  addChrome(slide, "Ringkasan Alur Perjalanan", "ITINERARY OVERVIEW");
  const cards = [
    ["10 Juli", "Old Town Bangkok", "Grand Palace, Wat Pho, Wat Arun, Chao Phraya, Asiatique"],
    ["11 Juli", "Market & Modern Bangkok", "Floating market, canal tour, IconSiam, Jodd Fairs / Chocolate Ville"],
    ["12 Juli", "Heritage, Shopping & Chinatown", "Jim Thompson/Museum Siam, Siam area, Erawan Shrine, Yaowarat"],
    ["13 Juli", "Departure", "Breakfast, check-out, oleh-oleh singkat, transfer airport"],
  ];
  cards.forEach((c, i) => {
    const y = 1.55 + i * 1.15;
    slide.addShape(pptx.ShapeType.roundRect, {
      x: 0.82,
      y,
      w: 11.62,
      h: 0.82,
      rectRadius: 0.08,
      fill: { color: i === 0 ? "FFFFFF" : "FBFAF4" },
      line: { color: C.line, width: 0.8 },
    });
    chip(slide, c[0], 1.08, y + 0.24, 0.9);
    slide.addText(c[1], { x: 2.25, y: y + 0.17, w: 3.2, h: 0.22, fontSize: 12, bold: true, color: C.black, margin: 0 });
    slide.addText(c[2], { x: 5.65, y: y + 0.16, w: 6.25, h: 0.3, fontSize: 9.5, color: C.dark, margin: 0, fit: "shrink" });
  });
  slide.addText("Meal plan: breakfast hotel/local cafe, lunch restoran Thai nyaman, dinner area riverside/night market/Chinatown.", {
    x: 0.88,
    y: 6.35,
    w: 10.5,
    h: 0.28,
    fontSize: 10,
    color: C.gray,
    margin: 0,
  });
}

function day1() {
  const slide = pptx.addSlide();
  addChrome(slide, "Hari 1 - Jumat, 10 Juli 2026", "OLD TOWN & CHAO PHRAYA");
  chip(slide, "Breakfast", 0.82, 1.13, 0.95);
  chip(slide, "Lunch", 1.9, 1.13, 0.75);
  chip(slide, "Dinner", 2.78, 1.13, 0.78);
  addTimeline(slide, [
    { time: "07:30", text: "Breakfast: hotel atau local cafe dekat hotel", meal: true },
    { time: "08:30", text: "Berangkat menuju Grand Palace & Wat Phra Kaew" },
    { time: "09:00", text: "Grand Palace & Wat Phra Kaew, foto landmark dan budaya kerajaan" },
    { time: "11:15", text: "Wat Pho, Reclining Buddha dan kompleks kuil bersejarah" },
    { time: "12:30", text: "Lunch: restoran Thai dekat Tha Tien/Old Town", meal: true },
    { time: "13:45", text: "Ferry singkat menyeberang Chao Phraya" },
    { time: "14:15", text: "Wat Arun, foto pagoda dan riverside" },
    { time: "15:30", text: "Coffee break atau kembali hotel untuk refresh" },
    { time: "17:30", text: "Asiatique The Riverfront untuk sunset walk dan belanja ringan" },
    { time: "19:00", text: "Dinner: Asiatique atau Chao Phraya dinner cruise", meal: true },
  ]);
  photoGrid(slide, ["Grand Palace", "Wat Pho", "Wat Arun", "Chao Phraya / Asiatique"]);
  addNotes(slide, "Catatan: gunakan pakaian sopan untuk area kuil. Juli musim hujan, siapkan payung atau jas hujan ringan.");
}

function day2() {
  const slide = pptx.addSlide();
  addChrome(slide, "Hari 2 - Sabtu, 11 Juli 2026", "MARKET, KANAL & BANGKOK MODERN");
  chip(slide, "Breakfast", 0.82, 1.13, 0.95);
  chip(slide, "Lunch", 1.9, 1.13, 0.75);
  chip(slide, "Dinner", 2.78, 1.13, 0.78);
  addTimeline(slide, [
    { time: "06:30", text: "Breakfast box/hotel lebih pagi", meal: true },
    { time: "07:00", text: "Berangkat ke floating market" },
    { time: "08:30", text: "Floating Market: Damnoen Saduak atau Khlong Lat Mayom" },
    { time: "10:45", text: "Canal tour, suasana kehidupan tepi kanal dan spot foto perahu" },
    { time: "12:15", text: "Lunch: menu Thai lokal dekat market atau kembali ke kota", meal: true },
    { time: "14:30", text: "IconSiam, SookSiam, shopping, dan foto area riverside" },
    { time: "16:30", text: "Coffee/dessert break di IconSiam" },
    { time: "18:30", text: "Dinner: Jodd Fairs street food atau Chocolate Ville", meal: true },
    { time: "20:00", text: "Waktu bebas belanja ringan/foto malam, lalu kembali ke hotel" },
  ]);
  photoGrid(slide, ["Floating Market", "Canal Tour", "IconSiam", "Night Market / Chocolate Ville"]);
  addNotes(slide, "Catatan: jadwal market paling enak pagi. Siapkan opsi indoor di IconSiam bila hujan deras.");
}

function day3() {
  const slide = pptx.addSlide();
  addChrome(slide, "Hari 3 + Departure | 12-13 Juli 2026", "HERITAGE, SHOPPING, CHINATOWN");
  chip(slide, "Breakfast", 0.82, 1.13, 0.95);
  chip(slide, "Lunch", 1.9, 1.13, 0.75);
  chip(slide, "Dinner", 2.78, 1.13, 0.78);
  addTimeline(slide, [
    { time: "07:30", text: "12 Juli - Breakfast: hotel", meal: true },
    { time: "09:30", text: "Jim Thompson House atau Museum Siam, pilih sesuai minat tamu" },
    { time: "11:15", text: "Singgah Erawan Shrine dan area Ratchaprasong" },
    { time: "12:15", text: "Lunch: Siam/CentralWorld area", meal: true },
    { time: "13:30", text: "Shopping: Siam Paragon, MBK, CentralWorld, atau Platinum" },
    { time: "16:30", text: "Kembali hotel untuk refresh" },
    { time: "18:00", text: "Yaowarat Chinatown dinner, street food, dessert, foto neon", meal: true },
    { time: "20:30", text: "Optional rooftop mocktail/city view atau kembali hotel" },
    { time: "08:00", text: "13 Juli - Breakfast hotel, check-out, oleh-oleh singkat", meal: true },
    { time: "10:30", text: "Transfer airport, sesuaikan dengan jadwal penerbangan" },
  ], 0.78, 1.42, 6.65);
  photoGrid(slide, ["Jim Thompson / Museum Siam", "Siam Shopping Area", "Erawan Shrine", "Yaowarat Chinatown"]);
  addNotes(slide, "Catatan: 13 Juli dibuat fleksibel. Jam transfer airport perlu disesuaikan dengan airport dan jam penerbangan.");
}

cover();
summary();
day1();
day2();
day3();

const output = path.join(outDir, "bangkok-city-tour-3-hari-10-13-juli-2026.pptx");
pptx.writeFile({ fileName: output });
console.log(output);
