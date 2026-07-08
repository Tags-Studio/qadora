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
    let category = 'tuckend'; // fallback default

    if (lowerName.includes('pillow')) {
      category = 'pillow';
    } else if (lowerName.includes('gable') || lowerName.includes('handle') || lowerName.includes('carrier')) {
      category = 'gable';
    } else if (lowerName.includes('sleeve')) {
      category = 'sleeve';
    } else if (lowerName.includes('window') || lowerName.includes('cutout') || lowerName.includes('cut-out')) {
      category = 'window';
    } else if (lowerName.includes('hanger') || lowerName.includes('hanging')) {
      category = 'hanger';
    } else if (lowerName.includes('polygon') || lowerName.includes('hexagon') || lowerName.includes('cone') || lowerName.includes('tube')) {
      category = 'hexagonal';
    } else if (lowerName.includes('auto lock') || lowerName.includes('snap lock') || lowerName.includes('crash lock') || lowerName.includes('1-2-3')) {
      category = 'autolock';
    } else if (lowerName.includes('mailer') || lowerName.includes('hinged') || lowerName.includes('fefco 0427') || lowerName.includes('fefco 0426')) {
      category = 'mailer';
    } else if (lowerName.includes('tray') || lowerName.includes('display') || lowerName.includes('counter') || lowerName.includes('pos')) {
      category = 'tray';
    } else if (lowerName.includes('lid') || lowerName.includes('base') || lowerName.includes('telescope') || lowerName.includes('two-piece') || lowerName.includes('two piece') || lowerName.includes('board game')) {
      category = 'twopiece';
    } else if (lowerName.includes('tuck')) {
      category = 'tuckend';
    } else {
      category = 'tuckend'; // default fallback to tuckend
    }

    // Assign styles dynamically
    let style = 'Folding Carton';
    if (lowerName.includes('rigid') || lowerName.includes('magnetic') || lowerName.includes('drawer') || lowerName.includes('slide')) {
      style = 'Rigid Box';
    } else if (lowerName.includes('fefco') || lowerName.includes('rsc') || lowerName.includes('corrugated') || lowerName.includes('shipping')) {
      style = 'Corrugated';
    } else if (lowerName.includes('tube') || lowerName.includes('cone') || lowerName.includes('cylinder') || lowerName.includes('core')) {
      style = 'Tube & Core';
    }

    // Assign closure type dynamically
    let closure = 'Tuck End';
    if (lowerName.includes('auto') || lowerName.includes('1-2-3')) {
      closure = 'Auto Lock';
    } else if (lowerName.includes('snap')) {
      closure = 'Snap Lock';
    } else if (lowerName.includes('hinged') || lowerName.includes('mailer')) {
      closure = 'Hinged Lid';
    } else if (lowerName.includes('magnetic')) {
      closure = 'Magnetic';
    }

    dielines.push({
      id: id++,
      name,
      category,
      style,
      closure,
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
  console.log(`Successfully converted ${dielines.length} items to pacdora_dielines.json with styled SaaS category fields`);
}

processLineByLine();
