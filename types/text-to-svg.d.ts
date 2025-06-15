declare module 'text-to-svg' {
  interface TextToSVGOptions {
    x?: number;
    y?: number;
    fontSize?: number;
    anchor?: string;
    attributes?: {
      fill?: string;
      stroke?: string;
      'stroke-width'?: number;
      [key: string]: any;
    };
  }

  interface TextToSVG {
    loadSync(): TextToSVG;
    getSVG(text: string, options?: TextToSVGOptions): string;
  }

  const TextToSVG: {
    loadSync(): TextToSVG;
  };

  export default TextToSVG;
} 