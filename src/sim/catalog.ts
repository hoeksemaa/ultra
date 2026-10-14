import type { IconName } from "@/components/icons";

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

// Policy skill for each item class.
// reliability: base chance that the robot packs an item with no pilot,
//   before any training on fleet data. Uneven on purpose: some classes
//   start much better than others.
// learn: samples of this class that halve its pilot rate when the model
//   trains. Big gains take 10 to 20 samples; harder classes need more.
// regrasp: chance that the robot drops the item and tries again alone.
// time: base seconds to grasp one item and place it in the mailer.
export const CLASS_BASE: Record<
  GraspClass,
  { label: string; reliability: number; learn: number; regrasp: number; time: number }
> = {
  rigid: { label: "Rigid", reliability: 0.915, learn: 10, regrasp: 0.05, time: 34 },
  bottle: { label: "Bottle", reliability: 0.705, learn: 12, regrasp: 0.08, time: 38 },
  pouch: { label: "Pouch", reliability: 0.81, learn: 13, regrasp: 0.1, time: 40 },
  flat: { label: "Flat", reliability: 0.57, learn: 16, regrasp: 0.14, time: 44 },
  fragile: { label: "Fragile", reliability: 0.645, learn: 15, regrasp: 0.1, time: 52 },
  apparel: { label: "Apparel", reliability: 0.525, learn: 18, regrasp: 0.15, time: 48 },
  soft: { label: "Plush", reliability: 0.405, learn: 24, regrasp: 0.2, time: 50 },
};

export interface Item {
  sku: string;
  name: string;
  lb: number;
  cls: GraspClass;
  icon: IconName;
}

export interface Brand {
  code: string;
  name: string;
  about: string; // one sentence, shown on hover
  share: number; // share of all orders
  items: Item[];
}

type Row = [string, number, GraspClass, IconName];

function brand(code: string, name: string, about: string, share: number, rows: Row[]): Brand {
  return {
    code,
    name,
    about,
    share,
    items: rows.map(([itemName, lb, cls, icon], i) => ({
      sku: `${code}-${String(i + 1).padStart(2, "0")}`,
      name: itemName,
      lb,
      cls,
      icon,
    })),
  };
}

export const BRANDS: Brand[] = [
  brand("BLK", "Blockhaus", "Heirloom wooden toys, cut and sanded by hand in Vermont.", 0.11, [
    ["Maple Cube Set", 1.4, "rigid", "Blocks"],
    ["Stacking Rainbow", 1.6, "rigid", "Rainbow"],
    ["Pine Train Car", 0.6, "rigid", "TrainFront"],
    ["Shape Sorter", 1.5, "rigid", "Shapes"],
    ["Peg Puzzle", 0.8, "flat", "Puzzle"],
    ["Story Dice (9)", 0.2, "rigid", "Dice5"],
    ["Toy Sailboat", 0.5, "rigid", "Sailboat"],
    ["Block Castle", 2.2, "rigid", "Castle"],
    ["Toy Drum", 1.2, "rigid", "Drum"],
    ["Wooden Rocket", 0.7, "rigid", "Rocket"],
  ]),
  brand("BRB", "Burrow & Bramble", "Soft woodland animals, stitched to survive years of hugs.", 0.1, [
    ["Plush Hare", 0.5, "soft", "Rabbit"],
    ["Plush Squirrel", 0.4, "soft", "Squirrel"],
    ["Plush Robin", 0.2, "soft", "Bird"],
    ["Plush Barn Cat", 0.6, "soft", "Cat"],
    ["Plush Pup", 0.7, "soft", "Dog"],
    ["Plush Turtle", 0.5, "soft", "Turtle"],
    ["Plush Snail", 0.3, "soft", "Snail"],
    ["Plush Field Mouse", 0.3, "soft", "Rat"],
    ["Moon Pillow", 0.9, "soft", "Moon"],
    ["Paw Slippers", 0.8, "apparel", "PawPrint"],
  ]),
  brand("KTL", "Kettle & Kin", "Loose-leaf teas and simple brewing gear for slow mornings.", 0.09, [
    ["Earl Grey Tin", 0.4, "rigid", "Crown"],
    ["Sencha Pouch", 0.3, "pouch", "Leaf"],
    ["Chamomile Pouch", 0.2, "pouch", "Flower2"],
    ["Mint Pouch", 0.2, "pouch", "Sprout"],
    ["Citrus Rooibos", 0.3, "pouch", "Citrus"],
    ["Chai Concentrate", 2.3, "bottle", "Milk"],
    ["Cold Brew Bags", 0.3, "pouch", "Snowflake"],
    ["Honey Sticks (20)", 0.4, "pouch", "Hexagon"],
    ["Ceramic Mug", 0.9, "fragile", "Coffee"],
    ["Steep Timer", 0.2, "rigid", "Hourglass"],
  ]),
  brand("FLD", "Fieldline", "Merino socks and trail knits made to last a thousand miles.", 0.11, [
    ["Merino Hiker Sock", 0.2, "apparel", "Mountain"],
    ["Ski Sock", 0.3, "apparel", "MountainSnow"],
    ["Run Sock 3-Pack", 0.3, "apparel", "Footprints"],
    ["Trail Crew Sock", 0.2, "apparel", "TreePine"],
    ["Camp Sock", 0.3, "apparel", "Tent"],
    ["Glove Liners", 0.2, "apparel", "Hand"],
    ["Cotton Tee", 0.4, "apparel", "Shirt"],
    ["Neck Gaiter", 0.2, "apparel", "Wind"],
    ["Wool Wash", 1.1, "bottle", "WashingMachine"],
    ["Sock Gift Box", 0.6, "rigid", "Gift"],
  ]),
  brand("LMN", "Lumen Wax", "Hand-poured soy candles that smell like the coast and the woods.", 0.08, [
    ["Sea Salt Candle", 1.4, "fragile", "Waves"],
    ["Cedar Candle", 1.4, "fragile", "Trees"],
    ["Jasmine Candle", 1.4, "fragile", "Flower"],
    ["Taper Candles (2)", 0.5, "fragile", "Flame"],
    ["Pillar Candle", 1.2, "rigid", "Cylinder"],
    ["Wax Melts", 0.3, "pouch", "Droplet"],
    ["Matchbooks (3)", 0.05, "flat", "FlameKindling"],
    ["Wick Trimmer", 0.3, "rigid", "Scissors"],
    ["Room Spray", 0.6, "bottle", "SprayCan"],
    ["Reed Diffuser", 1.6, "fragile", "Sparkles"],
  ]),
  brand("LDQ", "Ledger & Quill", "Notebooks, pens, and desk tools for people who still write by hand.", 0.1, [
    ["Dot Grid Notebook", 0.7, "flat", "Notebook"],
    ["Fountain Pen", 0.2, "rigid", "PenTool"],
    ["Pencil Set (6)", 0.3, "rigid", "Pencil"],
    ["Highlighters (5)", 0.2, "rigid", "Highlighter"],
    ["Brass Ruler", 0.4, "flat", "Ruler"],
    ["Paper Clip Tin", 0.3, "rigid", "Paperclip"],
    ["Sticky Note Cube", 0.3, "rigid", "StickyNote"],
    ["Letter Set", 0.5, "flat", "Mail"],
    ["Planner 2027", 1.2, "flat", "CalendarDays"],
    ["Brass Bookmark", 0.05, "flat", "Bookmark"],
  ]),
  brand("GRN", "Grainhouse", "Plain-label vitamins and daily supplements with nothing extra.", 0.12, [
    ["Vitamin D 90ct", 0.3, "bottle", "Sun"],
    ["Omega-3 60ct", 0.5, "bottle", "Fish"],
    ["Magnesium 120ct", 0.6, "bottle", "PillBottle"],
    ["Sleep Gummies", 0.5, "bottle", "Bed"],
    ["Greens Powder", 0.9, "pouch", "LeafyGreen"],
    ["Electrolyte Sticks", 0.4, "pouch", "Zap"],
    ["Protein Pouch 2 lb", 2.2, "pouch", "Dumbbell"],
    ["Calcium + K2", 0.4, "bottle", "Bone"],
    ["Immune Chews", 0.3, "bottle", "Shield"],
    ["Pill Organizer", 0.2, "rigid", "Pill"],
  ]),
  brand("TDP", "Tidepool", "Gentle skincare made with sea minerals and short ingredient lists.", 0.11, [
    ["Gel Cleanser", 0.5, "bottle", "Droplets"],
    ["Shell Toner", 0.6, "bottle", "Shell"],
    ["Vitamin C Serum", 0.2, "fragile", "Pipette"],
    ["SPF 50 Tube", 0.3, "bottle", "SunMedium"],
    ["Night Cream", 0.4, "fragile", "MoonStar"],
    ["Sheet Masks (5)", 0.3, "pouch", "Smile"],
    ["Jade Roller", 0.4, "fragile", "Gem"],
    ["Hand Cream", 0.2, "bottle", "HandHeart"],
    ["Bath Salts", 1.0, "pouch", "Bath"],
    ["Cotton Pads", 0.2, "pouch", "Cloud"],
  ]),
  brand("SHB", "Shellback", "Tough cases and charging gear for phones that get dropped.", 0.09, [
    ["Rugged Case", 0.2, "flat", "ShieldCheck"],
    ["Clear Case", 0.2, "flat", "Smartphone"],
    ["Screen Glass (2)", 0.1, "flat", "Scan"],
    ["USB-C Cable 2 m", 0.2, "pouch", "Cable"],
    ["Wall Charger 20W", 0.3, "rigid", "PlugZap"],
    ["Power Bank", 0.6, "rigid", "BatteryCharging"],
    ["Earbud Case", 0.1, "rigid", "Headphones"],
    ["Card Wallet", 0.1, "flat", "Wallet"],
    ["Magnet Mount", 0.4, "rigid", "Magnet"],
    ["Phone Lens Kit", 0.3, "rigid", "Camera"],
  ]),
  brand("TRH", "Trailhead", "Jerky, trail mix, and camp food for long days outside.", 0.09, [
    ["Beef Jerky 3 oz", 0.2, "pouch", "Beef"],
    ["Turkey Jerky 3 oz", 0.2, "pouch", "Drumstick"],
    ["Trail Mix 8 oz", 0.5, "pouch", "Nut"],
    ["Oat Cookies (6)", 0.8, "rigid", "Cookie"],
    ["Apple Chips", 0.3, "pouch", "Apple"],
    ["Banana Chips", 0.3, "pouch", "Banana"],
    ["Dried Cherries", 0.3, "pouch", "Cherry"],
    ["Kettle Corn", 0.4, "pouch", "Popcorn"],
    ["Camp Chili", 0.4, "pouch", "Soup"],
    ["Granola Bag", 0.8, "pouch", "Wheat"],
  ]),
];
