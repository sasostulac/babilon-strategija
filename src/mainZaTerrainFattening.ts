// main.ts — works inside your Babylon/Vite (browser) project
// No npm installs needed — uses only built-in browser APIs.
import { Jimp } from "jimp";

async function convertBlueToMask(inputUrl: string): Promise<HTMLImageElement> {
  // 1️⃣ Load the image
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous"; // allow local/remote loading
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = inputUrl;
  });

  // 2️⃣ Create a canvas to process pixels
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // 3️⃣ Access pixel data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // 4️⃣ Convert colors (blue → black, others → white)
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    if (r === 0 && g === 0 && b === 255) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
    } else {
      data[i] = 50;
      data[i + 1] = 50;
      data[i + 2] = 50;
    }
  }

  // 5️⃣ Put modified pixels back on canvas
  ctx.putImageData(imageData, 0, 0);

  // 6️⃣ Create an <img> element for display
  const result = new Image();
  result.src = canvas.toDataURL("image/png");

  // 7️⃣ Trigger download automatically
  const link = document.createElement("a");
  link.href = result.src;
  link.download = "converted.png";
  link.click();

  return result;
}

// 8️⃣ Run it once page is ready
window.addEventListener("DOMContentLoaded", async () => {
  // Path can be relative to /public or /src/assets
  const converted = await convertBlueToMask("/teren.bmp");

  // Show result on page
  document.body.style.background = "#222";
  document.body.appendChild(converted);

  const label = document.createElement("div");
  label.textContent = "Converted image (blue → black, others → white)";
  label.style.color = "white";
  label.style.marginTop = "10px";
  document.body.appendChild(label);
});
