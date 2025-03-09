/**
 * QR Code Generator for Cloudflare Workers using qrcode-generator library
 * Accepts parameters:
 * - url: The URL to encode in the QR code (default: https://example.com)
 * - size: Size of the QR code image (default: 300)
 * - fgColor: Foreground color in hex (default: 000000)
 * - bgColor: Background color in hex (default: FFFFFF)
 * - ecLevel: Error correction level (L, M, Q, H) (default: M)
 * - borderWidth: Width of the quiet zone border in modules (default: 4)
 * - format: Output format (svg or png) (default: svg)
 * 
 * Example usage: https://qrcode.achneerov.workers.dev?url=https://example.com&size=400&fgColor=FF0000&bgColor=FFFFFF&ecLevel=H&borderWidth=2&format=png
 */

// Import the QR code generator library
import qrcode from 'qrcode-generator';

export interface Env {
  // Add environment variables here if needed
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Extract and validate parameters
    const qrUrl = url.searchParams.get('url') || 'https://example.com';
    
    // Parse size parameter (default: 300)
    const sizeParam = url.searchParams.get('size');
    const size = sizeParam ? parseInt(sizeParam) : 300;
    if (isNaN(size) || size < 100 || size > 1000) {
      return new Response('Error: Size must be between 100 and 1000', { status: 400 });
    }
    
    // Parse color parameters (default: black on white)
    const fgColor = url.searchParams.get('fgColor') || '000000';
    const bgColor = url.searchParams.get('bgColor') || 'FFFFFF';
    
    // Validate hex colors
    if (!isValidHexColor(fgColor) || !isValidHexColor(bgColor)) {
      return new Response('Error: Invalid color format. Use hex format without #', { status: 400 });
    }
    
    // Parse error correction level (default: M)
    const ecLevelParam = url.searchParams.get('ecLevel') || 'M';
    if (!['L', 'M', 'Q', 'H'].includes(ecLevelParam)) {
      return new Response('Error: Error correction level must be L, M, Q, or H', { status: 400 });
    }
    
    // Parse border width parameter (default: 4)
    const borderWidthParam = url.searchParams.get('borderWidth');
    const borderWidth = borderWidthParam ? parseInt(borderWidthParam) : 4;
    if (isNaN(borderWidth) || borderWidth < 0 || borderWidth > 20) {
      return new Response('Error: Border width must be between 0 and 20', { status: 400 });
    }
    
    // Parse format parameter (default: svg)
    const format = url.searchParams.get('format')?.toLowerCase() || 'svg';
    if (!['svg', 'png'].includes(format)) {
      return new Response('Error: Format must be svg or png', { status: 400 });
    }
    
    // Map string to the correct type expected by the library
    const ecLevelMap: Record<string, string> = {
      'L': 'L',
      'M': 'M',
      'Q': 'Q',
      'H': 'H'
    };
    
    try {
      // Generate QR code using the library
      // @ts-ignore - Ignore type checking for the ecLevel parameter
      const qr = qrcode(0, ecLevelMap[ecLevelParam]);
      qr.addData(qrUrl);
      qr.make();
      
      // Generate response based on format
      if (format === 'svg') {
        // Generate SVG
        const svg = generateSVG(qr, size, fgColor, bgColor, borderWidth);
        
        // Return the SVG image with CORS headers
        return new Response(svg, {
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Content-Disposition': `attachment; filename="qrcode.svg"`,
          },
        });
      } else {
        // For PNG format, we'll use a data URL that the frontend can download
        // Generate SVG
        const svg = generateSVG(qr, size, fgColor, bgColor, borderWidth);
        
        // Create a data URL that the frontend can download
        const dataUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
        
        // Return a JSON response containing the data URL
        return new Response(JSON.stringify({ dataUrl }), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=86400',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
          },
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      return new Response(`Error generating QR code: ${errorMessage}`, { status: 500 });
    }
  },
};

/**
 * Validates if a string is a valid hex color (without the #)
 */
function isValidHexColor(color: string): boolean {
  return /^[0-9A-Fa-f]{6}$/.test(color);
}

/**
 * Generates an SVG representation of the QR code
 */
function generateSVG(qr: any, size: number, fgColor: string, bgColor: string, borderWidth: number): string {
  const moduleCount = qr.getModuleCount();
  const quietZone = borderWidth; // Use the custom border width instead of fixed value
  
  // Calculate module size to fit the specified output size
  const moduleSize = size / (moduleCount + 2 * quietZone);
  
  // Generate SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  
  // Add background
  svg += `<rect width="100%" height="100%" fill="#${bgColor}"/>`;
  
  // Add QR code modules
  for (let row = 0; row < moduleCount; row++) {
    for (let col = 0; col < moduleCount; col++) {
      if (qr.isDark(row, col)) {
        const x = (col + quietZone) * moduleSize;
        const y = (row + quietZone) * moduleSize;
        svg += `<rect x="${x}" y="${y}" width="${moduleSize}" height="${moduleSize}" fill="#${fgColor}"/>`;
      }
    }
  }
  
  // Close SVG
  svg += '</svg>';
  
  return svg;
}