#!/usr/bin/env python3
"""Fetch lead photos for curated attractions from Wikipedia REST API.

Saves to public/places/<cityId>/<attrId>.jpg and prints a JSON summary of
which succeeded (with the resolved title) so we only wire code for winners.
"""
import json
import os
import sys
import urllib.parse
import urllib.request

UA = "KelilingThailand/1.0 (admin gallery seed; contact devaa.adithya@gmail.com)"
OUT = "public/places"

# cityId, attrId, hours, Wikipedia title
CANDIDATES = [
    # Bangkok
    ("bangkok", "jim-thompson-house", 1.5, "Jim Thompson House"),
    ("bangkok", "wat-saket", 1, "Wat Saket"),
    ("bangkok", "erawan-shrine", 0.5, "Erawan Shrine"),
    ("bangkok", "khaosan-road", 1.5, "Khaosan Road"),
    ("bangkok", "lumpini-park", 1, "Lumphini Park"),
    ("bangkok", "wat-benchamabophit", 1, "Wat Benchamabophit"),
    ("bangkok", "safari-world", 4, "Safari World"),
    ("bangkok", "siam-paragon", 2, "Siam Paragon"),
    # Pattaya
    ("pattaya", "jomtien-beach", 2, "Jomtien"),
    ("pattaya", "art-in-paradise", 1.5, "Art in Paradise"),
    ("pattaya", "ramayana-water-park", 4, "Ramayana Water Park"),
    ("pattaya", "cartoon-network-amazone", 4, "Cartoon Network Amazone"),
    ("pattaya", "mini-siam", 1.5, "Mini Siam"),
    ("pattaya", "underwater-world-pattaya", 1.5, "Underwater World Pattaya"),
    # Ayutthaya
    ("ayutthaya", "ayutthaya-historical-park", 3, "Ayutthaya Historical Park"),
    ("ayutthaya", "wat-yai-chai-mongkhon", 1, "Wat Yai Chai Mongkhon"),
    ("ayutthaya", "wat-ratchaburana", 1, "Wat Ratchaburana (Ayutthaya)"),
    ("ayutthaya", "wat-phanan-choeng", 1, "Wat Phanan Choeng"),
    ("ayutthaya", "chao-sam-phraya-museum", 1.5, "Chao Sam Phraya National Museum"),
    # Kanchanaburi
    ("kanchanaburi", "war-cemetery", 1, "Kanchanaburi War Cemetery"),
    ("kanchanaburi", "sai-yok-national-park", 3, "Sai Yok National Park"),
    ("kanchanaburi", "muang-sing-historical-park", 1.5, "Muang Sing Historical Park"),
    ("kanchanaburi", "mon-bridge", 1, "Mon Bridge"),
    # Hua Hin
    ("huahin", "phraya-nakhon-cave", 3, "Phraya Nakhon Cave"),
    ("huahin", "mrigadayavan-palace", 1.5, "Mrigadayavan Palace"),
    ("huahin", "wat-huay-mongkol", 1, "Wat Huay Mongkol"),
    ("huahin", "khao-sam-roi-yot", 4, "Khao Sam Roi Yot National Park"),
    ("huahin", "klai-kangwon-palace", 1, "Klai Kangwon Palace"),
    # Khao Yai
    ("khaoyai", "haew-narok-waterfall", 2, "Haew Narok Waterfall"),
    ("khaoyai", "haew-suwat-waterfall", 1.5, "Haew Suwat Waterfall"),
    ("khaoyai", "wat-theppitak-punnaram", 1, "Wat Theppitak Punnaram"),
    ("khaoyai", "thai-italian", 1.5, "Palio Khao Yai"),
]


def summary(title):
    url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + urllib.parse.quote(title, safe="")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def download(src, dest):
    req = urllib.request.Request(src, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = r.read()
    with open(dest, "wb") as f:
        f.write(data)
    return len(data)


winners = []
for city, attr, hours, title in CANDIDATES:
    try:
        s = summary(title)
        img = (s.get("originalimage") or {}).get("source") or (s.get("thumbnail") or {}).get("source")
        if not img or img.lower().endswith(".svg"):
            print(f"SKIP {city}/{attr}: no usable image ({title})", file=sys.stderr)
            continue
        os.makedirs(os.path.join(OUT, city), exist_ok=True)
        dest = os.path.join(OUT, city, attr + ".jpg")
        n = download(img, dest)
        winners.append({"city": city, "attr": attr, "hours": hours, "title": s.get("title", title)})
        print(f"OK   {city}/{attr}: {n//1024}K  <- {s.get('title', title)}", file=sys.stderr)
    except Exception as e:  # noqa
        print(f"FAIL {city}/{attr}: {e} ({title})", file=sys.stderr)

print(json.dumps(winners, ensure_ascii=False))
