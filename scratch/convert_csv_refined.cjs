const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:/Users/zahran/Documents/New OpenCode Project/pacdora_dielines.csv');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const dielines = [];
  let isFirstLine = true;
  let id = 1;

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false;
      continue;
    }
    // Simple regex to parse CSV line with quotes: "col1","col2","col3"
    const matches = line.match(/"([^"]*)"/g);
    if (!matches || matches.length < 3) continue;

    const name = matches[0].replace(/^"|"$/g, '').trim();
    let dieline_image = matches[1].replace(/^"|"$/g, '').trim();
    let render_image = matches[2].replace(/^"|"$/g, '').trim();

    // Optimize URLs by adding the Pacdora image-resize prefix for faster loading (300px width)
    if (dieline_image.startsWith('https://cdn.pacdora.com/') && !dieline_image.includes('image-resize')) {
      dieline_image = dieline_image.replace('https://cdn.pacdora.com/', 'https://cdn.pacdora.com/image-resize/300xauto_outside/');
    }
    if (render_image.startsWith('https://cdn.pacdora.com/') && !render_image.includes('image-resize')) {
      render_image = render_image.replace('https://cdn.pacdora.com/', 'https://cdn.pacdora.com/image-resize/300xauto_outside/');
    }

    const lowerName = name.toLowerCase();
    let category = 'folding';

    if (lowerName.includes('window') || lowerName.includes('cutout') || lowerName.includes('cut-out')) {
      category = 'window';
    } else if (lowerName.includes('insert') || lowerName.includes('partition') || lowerName.includes('divider')) {
      category = 'insert';
    } else if (lowerName.includes('bag') || lowerName.includes('pouch') || lowerName.includes('sachet') || lowerName.includes('envelope')) {
      category = 'bags';
    } else if (lowerName.includes('display') || lowerName.includes('counter') || lowerName.includes('showcase') || lowerName.includes('pop-up')) {
      category = 'display';
    } else if (lowerName.includes('storage') || lowerName.includes('organizer') || lowerName.includes('archive') || lowerName.includes('file')) {
      category = 'storage';
    } else if (lowerName.includes('fefco') || lowerName.includes('rsc') || lowerName.includes('0201') || lowerName.includes('0300') || lowerName.includes('0426') || lowerName.includes('0427')) {
      category = 'fefco';
    } else if (lowerName.includes('tuck') && (lowerName.includes('auto') || lowerName.includes('lock') || lowerName.includes('snap') || lowerName.includes('bottom') || lowerName.includes('1-2-3') || lowerName.includes('variation'))) {
      category = 'tuckend_var';
    } else if (lowerName.includes('tuck')) {
      category = 'tuckend';
    } else if (lowerName.includes('rigid') || lowerName.includes('magnetic') || lowerName.includes('drawer') || lowerName.includes('slide') || lowerName.includes('slipcase')) {
      category = 'rigid';
    } else if (lowerName.includes('lid') || lowerName.includes('cover') || lowerName.includes('telescope') || lowerName.includes('cap')) {
      category = 'lid';
    } else if (lowerName.includes('tray') || lowerName.includes('sleeve')) {
      category = 'tray';
    } else {
      category = 'folding'; // fallback/default
    }

    dielines.push({
      id: id++,
      name,
      category,
      formats: ["AI", "PDF", "DXF", "SVG"],
      dieline_image,
      image: render_image
    });
  }

  // Create src/data directory if not exists
  if (!fs.existsSync('C:/Users/zahran/Documents/packwave/src/data')) {
    fs.mkdirSync('C:/Users/zahran/Documents/packwave/src/data', { recursive: true });
  }

  fs.writeFileSync('C:/Users/zahran/Documents/packwave/src/data/pacdora_dielines.json', JSON.stringify(dielines, null, 2));
  console.log(`Successfully converted ${dielines.length} items to pacdora_dielines.json with refined categories`);
}

processLineByLine();
