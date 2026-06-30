// Company reference data for invoices/quotes — single source of truth.
// Keliling Thailand always issues; Love Bangkok is the tour-operator partner.

export interface Contact {
  name: string;
  phone: string;
}

export const KELILING_THAILAND = {
  name: "Keliling Thailand",
  tagline: "Gampang, Aman, dan Nyaman | Sewa Mobil + Supir",
  website: "WWW.KELILINGTHAILAND.COM",
  role: "Tour Agency Service",
  location: "Bangkok, Thailand",
  email: "sales@kelilingthailand.com",
  instagram: "@kelilingthailand",
  facebook: "Keliling Thailand",
  whatsapp: "+62 857-5092-3934",
  contacts: [
    { name: "Riddhan Fawwaz", phone: "+62 857-5092-3934" },
    { name: "Deva Rama", phone: "+66 647646597" },
  ] as Contact[],
} as const;

// Personal account — used only for personal-draft invoices.
export const PERSONAL_PAYMENT = {
  bank: "Kasikorn Bank",
  account: "0691789756",
  holder: "Deva Adithya Rama",
} as const;

export const LOVE_BANGKOK = {
  name: "Love Bangkok.Co.Ltd",
  role: "Tour Agency Service (Partner of Keliling Thailand)",
  address: "49/21 Moo 10, Nong Prue, Bang Lamung, Chonburi 20150",
  whatsapp: "+66954511582",
  whatsappName: "Mr. Kevin",
  bank: {
    bank: "Kasikorn Bank",
    account: "0339317873",
    holder: "Ekarat Tanawatsakul",
  },
} as const;
