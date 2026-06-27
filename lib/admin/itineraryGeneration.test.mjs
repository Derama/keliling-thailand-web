import assert from "node:assert/strict";
import test from "node:test";

import { resolveGeneratedPlaces } from "./itineraryGeneration.ts";

test("enriches a case-insensitive Bangkok match while preserving its AI activity", () => {
  const catalog = [
    {
      city: "Pattaya",
      name: "Wat Arun",
      image_url: "pattaya-wat-arun.jpg",
      description: "Entri kota lain.",
    },
    {
      city: "Bangkok",
      name: "Wat Arun",
      image_url: "wat-arun.jpg",
      description: "Kuil ikonis di tepi Sungai Chao Phraya.",
    },
  ];

  assert.deepEqual(
    resolveGeneratedPlaces(
      [{ name: "  wAt ArUn  ", activity: "  Berfoto bersama keluarga.  " }],
      catalog,
      " bangkok "
    ),
    [
      {
        name: "Wat Arun",
        image: "wat-arun.jpg",
        desc: "Kuil ikonis di tepi Sungai Chao Phraya.",
        activity: "Berfoto bersama keluarga.",
      },
    ]
  );
});

test("keeps an unmatched requested place with its AI activity", () => {
  assert.deepEqual(
    resolveGeneratedPlaces(
      [{ name: "  Big C  ", activity: "  Belanja oleh-oleh khas Thailand.  " }],
      [],
      "Bangkok"
    ),
    [
      {
        name: "Big C",
        image: "",
        desc: "",
        activity: "Belanja oleh-oleh khas Thailand.",
      },
    ]
  );
});

test("preserves generated order, removes duplicate names, and caps results at four", () => {
  const generated = [
    { name: "Grand Palace", activity: "Istana" },
    { name: "big c", activity: "Belanja" },
    { name: " GRAND PALACE ", activity: "Duplikat" },
    { name: "Wat Pho", activity: "Budaya" },
    { name: "Iconsiam", activity: "Kuliner" },
    { name: "Asiatique", activity: "Malam" },
  ];
  const catalog = [
    {
      city: "Bangkok",
      name: "Grand Palace",
      image_url: "grand-palace.jpg",
      description: "Istana kerajaan.",
    },
    {
      city: "Bangkok",
      name: "Wat Pho",
      image_url: "wat-pho.jpg",
      description: "Kuil Buddha berbaring.",
    },
    {
      city: "Bangkok",
      name: "Iconsiam",
      image_url: "iconsiam.jpg",
      description: "Pusat belanja tepi sungai.",
    },
    {
      city: "Bangkok",
      name: "Asiatique",
      image_url: "asiatique.jpg",
      description: "Pasar malam tepi sungai.",
    },
  ];

  const result = resolveGeneratedPlaces(generated, catalog, "BANGKOK");

  assert.deepEqual(
    result.map((place) => place.name),
    ["Grand Palace", "big c", "Wat Pho", "Iconsiam"]
  );
  assert.equal(result.length, 4);
  assert.equal(result[0].activity, "Istana");
});
