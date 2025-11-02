// ui/menu.ts
import type { Building } from "./data";
import { buildings } from "./data";
import { startPlacement } from "../placementManager";

let selectedBuilding: Building | null = null;
let menuOpen = false;
let openCategory: string | null = null;

export function initBuildMenu() {
  const container = document.createElement("div");
  container.id = "build-menu";
  container.innerHTML = `
    <button id="build-toggle" class="build-button">BUILD</button>
    <div id="menu-categories" class="menu-categories hidden"></div>
    <div id="menu-buildings" class="menu-buildings hidden"></div>
  `;
  document.body.appendChild(container);

  const buildButton = document.getElementById("build-toggle")!;
  buildButton.onclick = () => {
  // trigger light burst
  buildButton.classList.remove("burst");
  void buildButton.offsetWidth; // restart animation
  buildButton.classList.add("burst");

  // open/close categories
  toggleCategories();
};

  renderCategories();
}

function toggleCategories() {
  menuOpen = !menuOpen;
  const catContainer = document.getElementById("menu-categories")!;
  const buildContainer = document.getElementById("menu-buildings")!;
  const allButtons = document.querySelectorAll("#menu-categories button");

  if (menuOpen) {
    catContainer.classList.remove("hidden");
    catContainer.classList.add("show");
  } else {
    catContainer.classList.remove("show");
    catContainer.classList.add("hidden");
    buildContainer.classList.add("hidden");
    openCategory = null;

    // 🔹 clear all active category buttons
    allButtons.forEach(b => b.classList.remove("active"));
  }
}


function renderCategories() {
  const categories = [...new Set(buildings.map(b => b.category))];
  const catContainer = document.getElementById("menu-categories")!;
  catContainer.innerHTML = "";

  categories.forEach(cat => {
    const btn = document.createElement("button");
    btn.textContent = cat;
    btn.onclick = () => toggleCategory(cat, btn);
    catContainer.appendChild(btn);
  });
}

function toggleCategory(category: string, btn: HTMLElement) {
  const buildContainer = document.getElementById("menu-buildings")!;
  const allButtons = document.querySelectorAll("#menu-categories button");

  if (openCategory === category) {
    // close submenu
    openCategory = null;
    buildContainer.classList.add("hidden");
    allButtons.forEach(b => b.classList.remove("active"));
    return;
  }

  openCategory = category;
  renderBuildings(category, btn);
  buildContainer.classList.remove("hidden");
  buildContainer.classList.add("show");

  // highlight the active category button
  allButtons.forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}


function renderBuildings(category: string, btn: HTMLElement) {
  const buildContainer = document.getElementById("menu-buildings")!;
  buildContainer.innerHTML = "";

  // position buildings bar above the clicked category button
  const btnRect = btn.getBoundingClientRect();
  buildContainer.style.left = `${btnRect.left}px`;

  buildings
    .filter(b => b.category === category && b.unlocked)
    .forEach(b => {
      const card = document.createElement("div");
      card.className = "building-card";
      card.innerHTML = `
        <img src="${b.image}" alt="${b.name}">
        <span>${b.name}</span>
      `;
      card.onclick = () => selectBuilding(b);
      buildContainer.appendChild(card);
    });
}

function selectBuilding(building: Building) {
  selectedBuilding = building;
  console.log("Selected building:", building.name);
  startPlacement(building.glbPath); // your model filename

  // Collapse menus so only BUILD button remains
  const catContainer = document.getElementById("menu-categories")!;
  const buildContainer = document.getElementById("menu-buildings")!;
  const allButtons = document.querySelectorAll("#menu-categories button");

  catContainer.classList.remove("show");
  catContainer.classList.add("hidden");
  buildContainer.classList.remove("show");
  buildContainer.classList.add("hidden");

  // clear any active category button highlight
  allButtons.forEach(b => b.classList.remove("active"));
  // reset menuOpen flag if you have it
  menuOpen = false;
  openCategory = null;
}

export function getSelectedBuilding(): Building | null {
  return selectedBuilding;
}

export function updateMenuUI() {
  renderCategories();
}
