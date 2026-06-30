import assert from "node:assert/strict";
import test from "node:test";

import { mergeAiSchedule } from "./itinerary.ts";

test("applies AI times to visual places and preserves the complete AI schedule", () => {
  const places = [
    {
      id: "wat-pho",
      name: "Wat Pho",
      image: "wat-pho.jpg",
      desc: "Kuil bersejarah di Bangkok.",
      activity:
        "Menjelajahi kompleks Wat Pho sambil mengenal sejarah dan mengagumi Buddha Berbaring.",
    },
  ];
  const aiRows = [
    { time: "09:15", text: "Wat Pho, melihat patung Buddha Berbaring" },
    { time: "12:30", text: "Makan siang kuliner lokal" },
    { time: "17:00", text: "Big C, berburu oleh-oleh dan camilan khas Thailand" },
  ];

  const schedule = mergeAiSchedule(places, aiRows);

  assert.equal(schedule.length, 3);
  assert.deepEqual(
    schedule.map(({ time, text }) => ({ time, text })),
    [
      {
        time: "09:15",
        text: places[0].activity,
      },
      {
        time: "12:30",
        text: "Makan siang kuliner lokal",
      },
      {
        time: "17:00",
        text: "Big C, berburu oleh-oleh dan camilan khas Thailand",
      },
    ]
  );
  assert.equal(schedule[0].id, "wat-pho");
  assert.match(schedule[1].id, /^[0-9a-f-]{36}$/);
  assert.match(schedule[2].id, /^[0-9a-f-]{36}$/);
  assert.notEqual(schedule[1].id, schedule[2].id);
});

test("matches a Thai visual place name without adding a duplicate row", () => {
  const places = [
    {
      id: "wat-arun",
      name: "วัดอรุณ",
      image: "wat-arun.jpg",
      desc: "Kuil Fajar di tepi Sungai Chao Phraya.",
      activity: "Mengagumi arsitektur Wat Arun dan panorama tepi sungai.",
    },
  ];

  const schedule = mergeAiSchedule(places, [
    { time: "10:30", text: "วัดอรุณ ชมพระปรางค์ริมแม่น้ำเจ้าพระยา" },
  ]);

  assert.deepEqual(schedule, [
    {
      id: "wat-arun",
      time: "10:30",
      text: places[0].activity,
    },
  ]);
});

test("matches the longest visual place name while preserving visual order", () => {
  const places = [
    {
      id: "big-buddha",
      name: "Big Buddha",
      image: "big-buddha.jpg",
      desc: "Patung Buddha besar.",
      activity: "Mengunjungi Big Buddha.",
    },
    {
      id: "big-buddha-temple",
      name: "Big Buddha Temple",
      image: "big-buddha-temple.jpg",
      desc: "Kompleks kuil di atas bukit.",
      activity: "Menjelajahi kompleks Big Buddha Temple.",
    },
  ];

  const schedule = mergeAiSchedule(places, [
    {
      time: "08:00",
      text: "Big Buddha Temple, menikmati panorama dari kompleks kuil",
    },
  ]);

  assert.deepEqual(schedule, [
    {
      id: "big-buddha",
      time: "09:00",
      text: places[0].activity,
    },
    {
      id: "big-buddha-temple",
      time: "08:00",
      text: places[1].activity,
    },
  ]);
});
