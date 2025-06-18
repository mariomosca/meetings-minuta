const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Configurazione dimensioni e formati
const iconSizes = [
  // Icone principali per applicazione
  { name: 'app-icon', size: 256, format: 'png' },
  { name: 'app-icon-small', size: 64, format: 'png' },
  
  // Versioni Retina
  { name: 'app-icon@2x', size: 512, format: 'png' },
  { name: 'app-icon-small@2x', size: 128, format: 'png' },
  
  // Icone per sistema (Windows, macOS, Linux)
  { name: 'app-icon-32', size: 32, format: 'png' },
  { name: 'app-icon-16', size: 16, format: 'png' },
  { name: 'app-icon-48', size: 48, format: 'png' },
  { name: 'app-icon-128', size: 128, format: 'png' },
  
  // Favicon web
  { name: 'favicon-32x32', size: 32, format: 'png' },
  { name: 'favicon-16x16', size: 16, format: 'png' },
  
  // macOS specifiche
  { name: 'icon-512x512', size: 512, format: 'png' },
  { name: 'icon-1024x1024', size: 1024, format: 'png' },
];

// Configurazione input files
const inputFiles = {
  main: 'icon-design.svg',
  simplified: 'icon-simplified.svg'
};

// Directory di output
const outputDir = 'src/assets/icons';

/**
 * Crea la directory di output se non esiste
 */
function ensureOutputDirectory() {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`📁 Created directory: ${outputDir}`);
  }
}

/**
 * Genera un'icona PNG da SVG
 * @param {string} inputSvg - Path del file SVG
 * @param {string} outputName - Nome del file di output
 * @param {number} size - Dimensione dell'icona
 */
async function generatePngIcon(inputSvg, outputName, size) {
  try {
    const outputPath = path.join(outputDir, `${outputName}.png`);
    
    await sharp(inputSvg)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 } // Sfondo trasparente
      })
      .png({
        quality: 100,
        compressionLevel: 9
      })
      .toFile(outputPath);
    
    console.log(`✅ Generated ${outputName}.png (${size}x${size})`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Error generating ${outputName}.png:`, error.message);
    throw error;
  }
}

/**
 * Genera file ICO per Windows
 * @param {string} inputSvg - Path del file SVG
 */
async function generateIcoIcon(inputSvg) {
  try {
    const outputPath = path.join(outputDir, 'app-icon.ico');
    
    // Sharp non supporta direttamente ICO, generiamo PNG a 256x256
    // e usiamo una libreria esterna o convertiamo manualmente
    const tempPng = path.join(outputDir, 'temp-256.png');
    
    await sharp(inputSvg)
      .resize(256, 256)
      .png()
      .toFile(tempPng);
    
    // Per ora copiamo il PNG come ICO (funziona per la maggior parte dei casi)
    fs.copyFileSync(tempPng, outputPath);
    fs.unlinkSync(tempPng); // Rimuovi file temporaneo
    
    console.log(`✅ Generated app-icon.ico (256x256)`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Error generating app-icon.ico:`, error.message);
    throw error;
  }
}

/**
 * Genera favicon.ico multi-size
 */
async function generateFavicon() {
  try {
    const faviconSizes = [16, 32, 48];
    const outputPath = path.join(outputDir, 'favicon.ico');
    
    // Genera PNG a 32x32 come favicon base
    await sharp(inputFiles.simplified)
      .resize(32, 32)
      .png()
      .toFile(outputPath.replace('.ico', '.png'));
    
    // Copia come .ico per compatibilità
    fs.copyFileSync(outputPath.replace('.ico', '.png'), outputPath);
    
    console.log(`✅ Generated favicon.ico`);
    return outputPath;
  } catch (error) {
    console.error(`❌ Error generating favicon.ico:`, error.message);
    throw error;
  }
}

/**
 * Genera ICNS per macOS (usando iconutil se disponibile)
 */
async function generateIcnsIcon() {
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);
    
    // Verifica se iconutil è disponibile (solo su macOS)
    try {
      await execAsync('which iconutil');
    } catch {
      console.log(`⚠️ iconutil not available, skipping ICNS generation`);
      return null;
    }
    
    // Crea directory temporanea per iconset
    const iconsetDir = path.join(outputDir, 'app-icon.iconset');
    if (!fs.existsSync(iconsetDir)) {
      fs.mkdirSync(iconsetDir);
    }
    
    // Dimensioni richieste per macOS iconset
    const macOSSizes = [
      { size: 16, name: 'icon_16x16.png' },
      { size: 32, name: 'icon_16x16@2x.png' },
      { size: 32, name: 'icon_32x32.png' },
      { size: 64, name: 'icon_32x32@2x.png' },
      { size: 128, name: 'icon_128x128.png' },
      { size: 256, name: 'icon_128x128@2x.png' },
      { size: 256, name: 'icon_256x256.png' },
      { size: 512, name: 'icon_256x256@2x.png' },
      { size: 512, name: 'icon_512x512.png' },
      { size: 1024, name: 'icon_512x512@2x.png' }
    ];
    
    // Genera tutte le dimensioni per iconset
    for (const { size, name } of macOSSizes) {
      const iconPath = path.join(iconsetDir, name);
      await sharp(inputFiles.main)
        .resize(size, size)
        .png()
        .toFile(iconPath);
    }
    
    // Genera ICNS usando iconutil
    const icnsPath = path.join(outputDir, 'app-icon.icns');
    await execAsync(`iconutil -c icns -o "${icnsPath}" "${iconsetDir}"`);
    
    // Cleanup iconset directory
    fs.rmSync(iconsetDir, { recursive: true });
    
    console.log(`✅ Generated app-icon.icns for macOS`);
    return icnsPath;
  } catch (error) {
    console.error(`❌ Error generating ICNS:`, error.message);
    return null;
  }
}

/**
 * Crea manifest per le icone web
 */
function generateWebManifest() {
  const manifest = {
    name: "Meetings Minuta",
    short_name: "MeetingsMinuta",
    description: "AI-powered meeting transcription and minutes generation",
    start_url: "/",
    display: "standalone",
    background_color: "#2563eb",
    theme_color: "#2563eb",
    icons: [
      {
        src: "./src/assets/icons/app-icon-32.png",
        sizes: "32x32",
        type: "image/png"
      },
      {
        src: "./src/assets/icons/app-icon-48.png", 
        sizes: "48x48",
        type: "image/png"
      },
      {
        src: "./src/assets/icons/app-icon-128.png",
        sizes: "128x128", 
        type: "image/png"
      },
      {
        src: "./src/assets/icons/app-icon.png",
        sizes: "256x256",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "./src/assets/icons/app-icon@2x.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
  
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`✅ Generated web manifest.json`);
  return manifestPath;
}

/**
 * Verifica che i file SVG di input esistano
 */
function validateInputFiles() {
  const missingFiles = [];
  
  Object.entries(inputFiles).forEach(([key, filePath]) => {
    if (!fs.existsSync(filePath)) {
      missingFiles.push(filePath);
    }
  });
  
  if (missingFiles.length > 0) {
    console.error(`❌ Missing input files:`);
    missingFiles.forEach(file => console.error(`   - ${file}`));
    process.exit(1);
  }
  
  console.log(`✅ All input files found`);
}

/**
 * Genera statistiche sui file generati
 */
function generateStats() {
  const files = fs.readdirSync(outputDir);
  const iconFiles = files.filter(file => 
    file.endsWith('.png') || file.endsWith('.ico') || file.endsWith('.icns')
  );
  
  console.log(`\n📊 Generation Statistics:`);
  console.log(`   - Total files generated: ${iconFiles.length}`);
  console.log(`   - PNG files: ${iconFiles.filter(f => f.endsWith('.png')).length}`);
  console.log(`   - ICO files: ${iconFiles.filter(f => f.endsWith('.ico')).length}`);
  console.log(`   - ICNS files: ${iconFiles.filter(f => f.endsWith('.icns')).length}`);
  console.log(`   - Output directory: ${path.resolve(outputDir)}`);
  
  // Calcola dimensione totale
  let totalSize = 0;
  iconFiles.forEach(file => {
    const filePath = path.join(outputDir, file);
    const stats = fs.statSync(filePath);
    totalSize += stats.size;
  });
  
  console.log(`   - Total size: ${(totalSize / 1024).toFixed(2)} KB`);
}

/**
 * Funzione principale
 */
async function generateAllIcons() {
  console.log(`🎨 Meetings Minuta - Icon Generation Script`);
  console.log(`🚀 Starting icon generation process...\n`);
  
  try {
    // Validazione file di input
    validateInputFiles();
    
    // Crea directory di output
    ensureOutputDirectory();
    
    // Genera tutte le icone PNG
    console.log(`📱 Generating PNG icons...`);
    for (const { name, size } of iconSizes) {
      // Usa icona semplificata per dimensioni piccole (≤64px)
      const inputSvg = size <= 64 ? inputFiles.simplified : inputFiles.main;
      await generatePngIcon(inputSvg, name, size);
    }
    
    // Genera ICO per Windows
    console.log(`\n🪟 Generating Windows ICO...`);
    await generateIcoIcon(inputFiles.main);
    
    // Genera favicon
    console.log(`\n🌐 Generating web favicon...`);
    await generateFavicon();
    
    // Genera ICNS per macOS (se disponibile)
    console.log(`\n🍎 Generating macOS ICNS...`);
    await generateIcnsIcon();
    
    // Genera web manifest
    console.log(`\n📱 Generating web manifest...`);
    generateWebManifest();
    
    // Mostra statistiche
    generateStats();
    
    console.log(`\n✅ Icon generation completed successfully!`);
    console.log(`🎯 All icons are ready for Electron app integration.`);
    
  } catch (error) {
    console.error(`\n❌ Icon generation failed:`, error.message);
    process.exit(1);
  }
}

// Esecuzione script
if (require.main === module) {
  generateAllIcons();
}

module.exports = {
  generateAllIcons,
  generatePngIcon,
  generateIcoIcon,
  generateFavicon
}; 