// Fictional brands and items for the demo warehouse. Weights are in pounds.
// OP1 lifts about 10 lb per arm, so every item stays light.

export type GraspClass =
  | "rigid"
  | "bottle"
  | "pouch"
  | "flat"
  | "fragile"
  | "apparel"
  | "soft";

export const GRASP_CLASSES: GraspClass[] = [
  "rigid",
  "bottle",
  "pouch",
  "flat",
  "fragile",
  "apparel",
  "soft",
];

// Starting policy skill for each item class.
// regrasp: chance that the robot drops the item and tries again alone.
// pilot: chance that the robot cannot finish and needs a remote pilot.
// time: base seconds to grasp one item and place it in the mailer.
export const CLASS_BASE: Record<
  GraspClass,
  { label: string; regrasp: number; pilot: number; time: number }
> = {
  rigid: { label: "Rigid", regrasp: 0.05, pilot: 0.02, time: 34 },
  bottle: { label: "Bottle", regrasp: 0.08, pilot: 0.04, time: 38 },
  pouch: { label: "Pouch", regrasp: 0.1, pilot: 0.06, time: 40 },
  flat: { label: "Flat", regrasp: 0.14, pilot: 0.09, time: 44 },
  fragile: { label: "Fragile", regrasp: 0.1, pilot: 0.08, time: 52 },
  apparel: { label: "Apparel", regrasp: 0.15, pilot: 0.12, time: 48 },
  soft: { label: "Plush", regrasp: 0.2, pilot: 0.24, time: 50 },
};

export interface Item {
  sku: string;
  name: string;
  lb: number;
  cls: GraspClass;
}

export interface Brand {
  code: string;
  name: string;
  theme: string;
  share: number; // share of all orders
  items: Item[];
}

type Row = [string, number, GraspClass];

function brand(
  code: string,
  name: string,
  theme: string,
  share: number,
  rows: Row[],
): Brand {
  return {
    code,
    name,
    theme,
    share,
    items: rows.map(([itemName, lb, cls], i) => ({
      sku: `${code}-${String(i + 1).padStart(2, "0")}`,
      name: itemName,
      lb,
      cls,
    })),
  };
}

export const BRANDS: Brand[] = [
  brand("BLK", "Blockhaus", "Wooden toys", 0.11, [
    ["Maple Cube Set (12)", 1.4, "rigid"],
    ["Walnut Arch Blocks", 1.1, "rigid"],
    ["Stacking Rainbow", 1.6, "rigid"],
    ["Beech Domino Box", 0.9, "rigid"],
    ["Pine Train Car", 0.6, "rigid"],
    ["Wooden Yo-Yo", 0.2, "rigid"],
    ["Peg Puzzle: Farm", 0.8, "flat"],
    ["Peg Puzzle: Ocean", 0.8, "flat"],
    ["Tangram Tray", 0.7, "flat"],
    ["Spinning Tops (3)", 0.3, "rigid"],
    ["Counting Abacus", 1.8, "rigid"],
    ["Block Bag (24)", 2.2, "pouch"],
    ["Magnet Blocks (8)", 1.0, "rigid"],
    ["Shape Sorter Cube", 1.5, "rigid"],
    ["Ring Stacker", 0.9, "rigid"],
    ["Pull-Along Duck", 0.7, "rigid"],
    ["Mini Marble Run", 2.4, "rigid"],
    ["Lacing Beads Tin", 0.5, "rigid"],
    ["Story Dice (9)", 0.2, "rigid"],
    ["Puzzle Cards (30)", 0.4, "flat"],
  ]),
  brand("BRB", "Burrow & Bramble", "Plush animals", 0.1, [
    ["Plush Fox (Small)", 0.4, "soft"],
    ["Plush Fox (Large)", 1.1, "soft"],
    ["Plush Badger", 0.6, "soft"],
    ["Plush Hedgehog", 0.5, "soft"],
    ["Plush Owl", 0.4, "soft"],
    ["Plush Hare", 0.5, "soft"],
    ["Plush Mole", 0.3, "soft"],
    ["Plush Otter", 0.7, "soft"],
    ["Plush Deer", 0.9, "soft"],
    ["Plush Toad", 0.3, "soft"],
    ["Weighted Bear", 2.8, "soft"],
    ["Finger Puppet Set", 0.3, "soft"],
    ["Plush Keychain", 0.1, "soft"],
    ["Burrow Blanket", 1.6, "apparel"],
    ["Fox Slippers", 0.8, "apparel"],
    ["Gift Box", 0.3, "rigid"],
    ["Adoption Cards", 0.1, "flat"],
    ["Plush Snail", 0.3, "soft"],
    ["Plush Robin", 0.2, "soft"],
    ["Plush Bat", 0.3, "soft"],
  ]),
  brand("KTL", "Kettle & Kin", "Loose-leaf tea", 0.09, [
    ["Breakfast Tea Tin", 0.4, "rigid"],
    ["Earl Grey Tin", 0.4, "rigid"],
    ["Sencha Pouch", 0.3, "pouch"],
    ["Chamomile Pouch", 0.2, "pouch"],
    ["Rooibos Pouch", 0.3, "pouch"],
    ["Chai Concentrate", 2.3, "bottle"],
    ["Matcha Tin", 0.2, "rigid"],
    ["Bamboo Whisk", 0.1, "rigid"],
    ["Glass Tea Cup", 0.6, "fragile"],
    ["Glass Teapot", 1.5, "fragile"],
    ["Tea Sampler Box", 0.6, "rigid"],
    ["Honey Sticks (20)", 0.4, "pouch"],
    ["Infuser Ball", 0.1, "rigid"],
    ["Tea Towel", 0.3, "apparel"],
    ["Mint Pouch", 0.2, "pouch"],
    ["Oolong Tin", 0.4, "rigid"],
    ["Cold Brew Bags", 0.3, "pouch"],
    ["Ceramic Mug", 0.9, "fragile"],
    ["Tea Journal", 0.5, "flat"],
    ["Gift Card", 0.05, "flat"],
  ]),
  brand("FLD", "Fieldline", "Socks and knits", 0.11, [
    ["Wool Crew Sock", 0.2, "apparel"],
    ["Merino Hiker Sock", 0.2, "apparel"],
    ["Ankle Sock 3-Pack", 0.3, "apparel"],
    ["Compression Sock", 0.2, "apparel"],
    ["Ski Sock", 0.3, "apparel"],
    ["Kids Sock 5-Pack", 0.4, "apparel"],
    ["Liner Sock", 0.1, "apparel"],
    ["Boot Sock", 0.3, "apparel"],
    ["Rib Beanie", 0.2, "apparel"],
    ["Neck Gaiter", 0.2, "apparel"],
    ["Glove Liners", 0.2, "apparel"],
    ["Sock Gift Box", 0.6, "rigid"],
    ["Toe Sock", 0.1, "apparel"],
    ["Cotton Tee", 0.4, "apparel"],
    ["Sock Bundle (6)", 1.1, "pouch"],
    ["Slipper Sock", 0.3, "apparel"],
    ["Bandana", 0.1, "apparel"],
    ["Wool Wash", 1.1, "bottle"],
    ["Hiker Sock 2-Pack", 0.4, "apparel"],
    ["Run Sock 3-Pack", 0.3, "apparel"],
  ]),
  brand("LMN", "Lumen Wax", "Candles", 0.08, [
    ["Cedar Jar Candle", 1.4, "fragile"],
    ["Fig Jar Candle", 1.4, "fragile"],
    ["Sea Salt Jar Candle", 1.4, "fragile"],
    ["Travel Tin: Cedar", 0.4, "rigid"],
    ["Travel Tin: Fig", 0.4, "rigid"],
    ["Taper Candles (2)", 0.5, "fragile"],
    ["Pillar Candle", 1.2, "rigid"],
    ["Wax Melts", 0.3, "pouch"],
    ["Matchbooks (3)", 0.05, "flat"],
    ["Wick Trimmer", 0.3, "rigid"],
    ["Candle Snuffer", 0.2, "rigid"],
    ["Reed Diffuser", 1.6, "fragile"],
    ["Diffuser Refill", 1.0, "bottle"],
    ["Tea Lights (12)", 0.5, "pouch"],
    ["Room Spray", 0.6, "bottle"],
    ["Votive Holder", 0.5, "fragile"],
    ["Gift Set (3 Tins)", 1.3, "rigid"],
    ["Match Cylinder", 0.2, "rigid"],
    ["Lavender Sachet", 0.1, "pouch"],
    ["Candle Care Card", 0.05, "flat"],
  ]),
  brand("LDQ", "Ledger & Quill", "Stationery", 0.1, [
    ["Dot Grid Notebook", 0.7, "flat"],
    ["Lined Notebook", 0.7, "flat"],
    ["Pocket Notebooks (3)", 0.4, "flat"],
    ["Gel Pen Box (6)", 0.3, "rigid"],
    ["Fountain Pen", 0.2, "rigid"],
    ["Ink Bottle", 0.5, "bottle"],
    ["Sticky Note Cube", 0.3, "rigid"],
    ["Washi Tape (3)", 0.2, "rigid"],
    ["Planner 2027", 1.2, "flat"],
    ["Sticker Sheet", 0.05, "flat"],
    ["Pencil Pouch", 0.2, "pouch"],
    ["Brass Ruler", 0.4, "flat"],
    ["Desk Pad", 0.9, "flat"],
    ["Index Card Box", 0.4, "rigid"],
    ["Letter Set", 0.5, "flat"],
    ["Postcards (10)", 0.2, "flat"],
    ["Highlighters (5)", 0.2, "rigid"],
    ["Paper Clip Tin", 0.3, "rigid"],
    ["Brass Bookmark", 0.05, "flat"],
    ["Sketchbook", 1.3, "flat"],
  ]),
  brand("GRN", "Grainhouse", "Supplements", 0.12, [
    ["Magnesium 120ct", 0.6, "bottle"],
    ["Vitamin D 90ct", 0.3, "bottle"],
    ["Omega-3 60ct", 0.5, "bottle"],
    ["Protein Pouch 2 lb", 2.2, "pouch"],
    ["Electrolyte Sticks", 0.4, "pouch"],
    ["Probiotic 30ct", 0.2, "bottle"],
    ["Collagen Tub", 1.2, "bottle"],
    ["Creatine Tub", 1.3, "bottle"],
    ["Zinc 60ct", 0.2, "bottle"],
    ["Iron 60ct", 0.2, "bottle"],
    ["Sleep Gummies", 0.5, "bottle"],
    ["Greens Powder", 0.9, "pouch"],
    ["Pill Organizer", 0.2, "rigid"],
    ["Shaker Bottle", 0.5, "rigid"],
    ["Sample Sachets (5)", 0.1, "pouch"],
    ["B-Complex 60ct", 0.2, "bottle"],
    ["Ashwagandha 60ct", 0.3, "bottle"],
    ["Fiber Powder", 1.1, "pouch"],
    ["Multivitamin 90ct", 0.4, "bottle"],
    ["Travel Pack (7)", 0.3, "pouch"],
  ]),
  brand("TDP", "Tidepool", "Skincare", 0.11, [
    ["Gel Cleanser", 0.5, "bottle"],
    ["Hydrating Toner", 0.6, "bottle"],
    ["Vitamin C Serum", 0.2, "fragile"],
    ["Retinol Serum", 0.2, "fragile"],
    ["Day Cream Jar", 0.4, "fragile"],
    ["Night Cream Jar", 0.4, "fragile"],
    ["Lip Balm (3)", 0.1, "rigid"],
    ["Sheet Masks (5)", 0.3, "pouch"],
    ["Clay Mask Tube", 0.3, "bottle"],
    ["SPF 50 Tube", 0.3, "bottle"],
    ["Eye Cream", 0.1, "bottle"],
    ["Body Lotion", 1.0, "bottle"],
    ["Face Oil", 0.2, "fragile"],
    ["Cotton Pads", 0.2, "pouch"],
    ["Jade Roller", 0.4, "fragile"],
    ["Travel Kit", 0.6, "pouch"],
    ["Hand Cream", 0.2, "bottle"],
    ["Exfoliant Pads", 0.4, "rigid"],
    ["Micellar Water", 1.1, "bottle"],
    ["Spa Headband", 0.1, "apparel"],
  ]),
  brand("SHB", "Shellback", "Phone gear", 0.09, [
    ["Case 15 Clear", 0.2, "flat"],
    ["Case 15 Black", 0.2, "flat"],
    ["Case 16 Clear", 0.2, "flat"],
    ["Case 16 Sand", 0.2, "flat"],
    ["Screen Glass (2)", 0.1, "flat"],
    ["USB-C Cable 1 m", 0.1, "pouch"],
    ["USB-C Cable 2 m", 0.2, "pouch"],
    ["Wall Charger 20W", 0.3, "rigid"],
    ["Car Mount", 0.4, "rigid"],
    ["Card Wallet", 0.1, "flat"],
    ["Phone Strap", 0.05, "pouch"],
    ["Power Bank", 0.6, "rigid"],
    ["Wireless Pad", 0.4, "rigid"],
    ["Earbud Case", 0.1, "rigid"],
    ["Cable Organizer", 0.1, "pouch"],
    ["Grip Ring", 0.05, "flat"],
    ["Tablet Sleeve", 0.5, "flat"],
    ["Lens Cloths (3)", 0.05, "flat"],
    ["Charger 35W", 0.4, "rigid"],
    ["Desk Stand", 0.9, "rigid"],
  ]),
  brand("TRH", "Trailhead", "Trail snacks", 0.09, [
    ["Beef Jerky 3 oz", 0.2, "pouch"],
    ["Turkey Jerky 3 oz", 0.2, "pouch"],
    ["Trail Mix 8 oz", 0.5, "pouch"],
    ["Protein Bars (12)", 1.8, "rigid"],
    ["Oat Bars 6-Pack", 0.8, "rigid"],
    ["Dried Mango", 0.3, "pouch"],
    ["Nut Butter Packs", 0.6, "pouch"],
    ["Energy Chews", 0.2, "pouch"],
    ["Granola Bag", 0.8, "pouch"],
    ["Seaweed Snacks", 0.1, "pouch"],
    ["Pretzel Bag", 0.5, "pouch"],
    ["Snack Sampler Box", 1.4, "rigid"],
    ["Electrolyte Tabs", 0.1, "rigid"],
    ["Freeze-Dried Meal", 0.4, "pouch"],
    ["Coffee Packets (10)", 0.3, "pouch"],
    ["Camp Mug", 0.6, "rigid"],
    ["Peanut Butter Jar", 1.1, "fragile"],
    ["Chocolate Bars (3)", 0.4, "flat"],
    ["Dried Apricots", 0.3, "pouch"],
    ["Pemmican Bar", 0.2, "pouch"],
  ]),
];
