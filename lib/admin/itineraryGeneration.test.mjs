import assert from "node:assert/strict";
import test from "node:test";

import {
  composeItineraryPrompt,
  resolveGeneratedPlaces,
} from "./itineraryGeneration.ts";

test("omits the separate duration when the request specifies one", () => {
  const prompt = composeItineraryPrompt({
    customer: "Budi",
    pax: "4 orang",
    days: 3,
    destinations: ["BANGKOK"],
    request: "Bangkok 1 day untuk belanja",
  });

  assert.equal(
    prompt,
    "Customer: Budi. Jumlah: 4 orang. Tujuan: BANGKOK. Bangkok 1 day untuk belanja"
  );
  assert.doesNotMatch(prompt, /Durasi: 3 hari\./);
});

test("includes the selected duration when the request does not specify one", () => {
  assert.equal(
    composeItineraryPrompt({
      customer: "Budi",
      pax: "4 orang",
      days: 3,
      destinations: ["BANGKOK"],
      request: "Bangkok untuk belanja",
    }),
    "Customer: Budi. Jumlah: 4 orang. Durasi: 3 hari. Tujuan: BANGKOK. Bangkok untuk belanja"
  );
});

test("recognizes Indonesian, English plural, and compact durations", () => {
  for (const request of ["Trip 2 days", "Trip 1 hari", "Trip 3 hari", "Trip 4D3N"]) {
    assert.doesNotMatch(
      composeItineraryPrompt({
        customer: "",
        pax: "",
        days: 7,
        destinations: [],
        request,
      }),
      /Durasi: 7 hari\./
    );
  }
});

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

test("uses canonical catalog text when the matched place has no image", () => {
  assert.deepEqual(
    resolveGeneratedPlaces(
      [{ name: "  wat pho  ", activity: "  Melihat Buddha berbaring.  " }],
      [
        {
          city: "Bangkok",
          name: "Wat Pho",
          image_url: null,
          description: "Kuil bersejarah dengan Buddha berbaring.",
        },
      ],
      "Bangkok"
    ),
    [
      {
        name: "Wat Pho",
        image: "",
        desc: "Kuil bersejarah dengan Buddha berbaring.",
        activity: "Melihat Buddha berbaring.",
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
