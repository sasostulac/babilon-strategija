// ui/data.ts
export interface Building {
  id: string;
  name: string;
  category: string;
  image: string;   // thumbnail path
  glbPath: string; // model to instantiate
  unlocked: boolean;
}

export const buildings: Building[] = [
  { id: "farm", name: "Farm", category: "Resources", image: "/ui/farm.png", glbPath: "/models/farm.glb", unlocked: true },
  { id: "mine", name: "Mine", category: "Resources", image: "/ui/mine.png", glbPath: "/models/mine.glb", unlocked: true },
  { id: "library", name: "Library", category: "Civil", image: "/ui/library.png", glbPath: "/models/library.glb", unlocked: true },
  { id: "wall", name: "Wall", category: "Military", image: "/ui/wall3.png", glbPath: "Tower.glb", unlocked: true },
  { id: "outpost", name: "Outpost", category: "Military", image: "/ui/outpost.png", glbPath: "smreka1.glb", unlocked: true },
  { id: "barracks", name: "Barracks", category: "Military", image: "/ui/barracks.png", glbPath: "/models/barracks.glb", unlocked: true },
  { id: "castle", name: "Castle", category: "Military", image: "/ui/castle.png", glbPath: "/models/castle.glb", unlocked: true },

];
